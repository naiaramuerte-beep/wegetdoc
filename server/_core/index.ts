import "dotenv/config";
console.log("SESSION_SECRET presente:", !!process.env.SESSION_SECRET, "longitud:", process.env.SESSION_SECRET?.length ?? 0);
import express from "express";
import { createServer } from "http";
import net from "net";
import multer from "multer";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerGoogleOAuthRoutes } from "./googleOauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getBlogPosts, createDocument, userHasActiveSubscription, getDocumentById } from "../db";
import { storagePut, storageGet } from "../storage";
import { sdk } from "./sdk";
import { convertToPdf, isConvertibleType, ACCEPTED_EXTENSIONS } from "../convertToPdf";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 8080): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Apple Pay domain verification ──────────────────────────────────────────
  // Sipay (the PSP that fronts our Apple Pay merchant ID) provided the
  // editorpdf.net domain-association file. We embed the content as a TS
  // constant rather than reading from disk because Vite was not copying the
  // .well-known/ dotfile path into the production build output.
  const { APPLE_PAY_DOMAIN_FILE } = await import("./applePayDomain");
  const sendApplePayDomain = (_req: any, res: any) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(APPLE_PAY_DOMAIN_FILE);
  };
  app.get("/.well-known/apple-developer-merchantid-domain-association", sendApplePayDomain);
  app.get("/.well-known/apple-developer-merchantid-domain-association.txt", sendApplePayDomain);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── HTTPS Redirect (production only) ──────────────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      if (req.headers["x-forwarded-proto"] === "http") {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });
  }

  // ── Security Headers ─────────────────────────────────────────────────────────
  // Comprehensive security headers
  app.use((_req, res, next) => {
    // Prevent clickjacking (both legacy header and CSP frame-ancestors)
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Enable XSS protection
    res.setHeader("X-XSS-Protection", "1; mode=block");
    // Referrer policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // Permissions policy — disable unnecessary browser features (payment allowed for Stripe)
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    // Strict Transport Security (HSTS) — force HTTPS for 1 year
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    // Content Security Policy
    res.setHeader("Content-Security-Policy", [
      "frame-ancestors 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.gstatic.com https://translate.googleapis.com https://static.hotjar.com https://script.hotjar.com https://sandbox.sipay.es https://live.sipay.es https://pay.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com https://translate.googleapis.com https://sandbox.sipay.es https://live.sipay.es",
      "font-src 'self' https://fonts.gstatic.com https://script.hotjar.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-src 'self' https://www.googletagmanager.com https://vars.hotjar.com https://sandbox.sipay.es https://live.sipay.es https://pay.google.com",
      "img-src 'self' data: https://www.googletagmanager.com https://www.google.com https://script.hotjar.com https://sandbox.sipay.es https://live.sipay.es https://pay.google.com https://www.gstatic.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://*.doubleclick.net",
      "connect-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://www.google.com https://google.com https://*.hotjar.com https://*.hotjar.io wss://*.hotjar.com https://sandbox.sipay.es https://live.sipay.es https://pay.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://*.doubleclick.net https://apple-pay-gateway.apple.com https://apple-pay-gateway-cert.apple.com",
    ].join("; "));
    next();
  });
  // Geo endpoint — reads Cloudflare headers, falls back to ipapi.co
  const geoCache = new Map<string, { data: { country: string; postalCode: string; city: string }; expires: number }>();

  app.get("/api/geo", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    const country = (req.headers["cf-ipcountry"] as string) || "";
    let postalCode = (req.headers["cf-ippostal-code"] as string) || "";
    let city = (req.headers["cf-ipcity"] as string) || "";

    if (!postalCode) {
      const ip = (req.headers["cf-connecting-ip"] as string)
        || (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
        || "";
      if (ip && ip !== "127.0.0.1" && ip !== "::1") {
        const cached = geoCache.get(ip);
        if (cached && cached.expires > Date.now()) {
          res.json(cached.data);
          return;
        }
        try {
          const resp = await fetch(`https://ipapi.co/${ip}/json/`);
          if (resp.ok) {
            const geo = await resp.json();
            postalCode = geo.postal || "";
            if (!city) city = geo.city || "";
            const result = { country: (country || geo.country_code || "").toUpperCase(), postalCode, city };
            geoCache.set(ip, { data: result, expires: Date.now() + 3600_000 });
            res.json(result);
            return;
          }
        } catch (e) {
          console.warn("[geo] ipapi.co fallback failed:", e);
        }
      }
    }

    res.json({ country: country.toUpperCase(), postalCode, city });
  });

  // Google OAuth direct routes: /api/auth/google and /api/auth/google/callback
  registerGoogleOAuthRoutes(app);

  // Sitemap.xml — dynamic, includes blog posts
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const posts = await getBlogPosts(true);
      const base = "https://editorpdf.net";
      const staticUrls: Array<{ loc: string; priority: string; changefreq: string; lastmod?: string }> = [
        { loc: `${base}/es`, priority: "1.0", changefreq: "weekly" },
        { loc: `${base}/en`, priority: "1.0", changefreq: "weekly" },
        { loc: `${base}/es/pricing`, priority: "0.8", changefreq: "monthly" },
        { loc: `${base}/es/blog`, priority: "0.9", changefreq: "weekly" },
        { loc: `${base}/en/blog`, priority: "0.9", changefreq: "weekly" },
        { loc: `${base}/es/tools`, priority: "0.7", changefreq: "monthly" },
      ];
      const blogUrls = (posts as Array<{slug: string; updatedAt: Date}>).flatMap((p) => [
        { loc: `${base}/es/blog/${p.slug}`, priority: "0.8", changefreq: "monthly", lastmod: new Date(p.updatedAt).toISOString().split("T")[0] },
        { loc: `${base}/en/blog/${p.slug}`, priority: "0.8", changefreq: "monthly", lastmod: new Date(p.updatedAt).toISOString().split("T")[0] },
      ]);
      const allUrls = [...staticUrls, ...blogUrls];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${u.lastmod ? `
    <lastmod>${u.lastmod}</lastmod>` : ""}
  </url>`).join("\n")}
</urlset>`;
      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch {
      res.status(500).send("Error generating sitemap");
    }
  });

  // ── REST endpoint for TEMP PDF upload (pre-login, no auth required) ─────────────
  // Stores the edited PDF in S3 under a temp key. The key is returned and stored
  // in sessionStorage (small string, no quota issues). After login + payment,
  // the server moves it to the user's permanent folder.
  const tempUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
  app.post("/api/documents/temp-upload", tempUpload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) { res.status(400).json({ error: "No file" }); return; }
      const name = (req.body.name as string) || file.originalname || "document.pdf";
      // Store under temp/ with a random key — expires conceptually after 24h
      const randomId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const key = `temp/${randomId}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { url } = await storagePut(key, file.buffer, "application/pdf");
      res.json({ success: true, tempKey: key, tempUrl: url, name });
    } catch (err) {
      console.error("[TempUpload] Error:", err);
      res.status(500).json({ error: "Temp upload failed" });
    }
  });

  // ── Download a temp PDF by key (for generating previews after OAuth redirect) ──
  app.get("/api/documents/temp-download/:key(*)", async (req, res) => {
    try {
      const tempKey = req.params.key;
      if (!tempKey || !tempKey.startsWith("temp/")) { res.status(400).json({ error: "Invalid key" }); return; }
      const { url } = await storageGet(tempKey, 300);
      const response = await fetch(url);
      if (!response.ok) { res.status(404).json({ error: "File not found" }); return; }
      const buffer = Buffer.from(await response.arrayBuffer());
      res.setHeader("Content-Type", "application/pdf");
      res.send(buffer);
    } catch (err) {
      console.error("[TempDownload] Error:", err);
      res.status(500).json({ error: "Download failed" });
    }
  });

  // ── REST endpoint for claiming a temp PDF after login + payment ────────────────
  // Moves the temp PDF to the user's permanent folder and creates a DB record.
  app.post("/api/documents/claim-temp", async (req, res) => {
    try {
      let userId: number;
      try {
        const user = await sdk.authenticateRequest(req as any);
        userId = user.id;
      } catch {
        res.status(401).json({ error: "Unauthorized" }); return;
      }
      const { tempKey, name } = req.body as { tempKey: string; name: string };
      if (!tempKey || !name) { res.status(400).json({ error: "Missing tempKey or name" }); return; }
      // Validate tempKey is under temp/ to prevent path traversal
      if (!tempKey.startsWith("temp/")) { res.status(400).json({ error: "Invalid tempKey" }); return; }
      // Re-download from S3 via the temp URL and re-upload under user's folder
      const { url: signedUrl } = await storageGet(tempKey);
      const fileResp = await fetch(signedUrl);
      if (!fileResp.ok) { res.status(404).json({ error: "Temp file not found" }); return; }
      const buffer = Buffer.from(await fileResp.arrayBuffer());
      const permanentKey = `docs/${userId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { url: permanentUrl } = await storagePut(permanentKey, buffer, "application/pdf");
      const paymentStatus = (req.body.paymentStatus === "paid") ? "paid" as const : "pending" as const;
      const doc = await createDocument({
        userId,
        name,
        fileKey: permanentKey,
        fileUrl: permanentUrl,
        fileSize: buffer.length,
        paymentStatus,
      });
      res.json({ success: true, doc });
    } catch (err) {
      console.error("[ClaimTemp] Error:", err);
      res.status(500).json({ error: "Claim failed" });
    }
  });

  // ── REST endpoint for file conversion + upload (any supported type → PDF) ──────
  const convertUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
  app.post("/api/documents/convert-upload", convertUpload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) { res.status(400).json({ error: "No file" }); return; }
      const mimeType = file.mimetype || "application/octet-stream";
      // Also detect type from extension if mimetype is generic
      const ext = (file.originalname || "").split(".").pop()?.toLowerCase() ?? "";
      const extMimeMap: Record<string, string> = {
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
        gif: "image/gif", webp: "image/webp", bmp: "image/bmp", tiff: "image/tiff",
        html: "text/html", txt: "text/plain",
      };
      const resolvedMime = (mimeType === "application/octet-stream" && extMimeMap[ext]) ? extMimeMap[ext] : mimeType;
      if (!isConvertibleType(resolvedMime)) {
        res.status(415).json({ error: `Unsupported file type: ${resolvedMime}` }); return;
      }
      const { pdfBuffer } = await convertToPdf(file.buffer, resolvedMime, file.originalname);
      // Return the PDF as binary blob — more efficient than base64 JSON (avoids 33% overhead + atob memory issues on mobile)
      const originalName = file.originalname.replace(/\.[^.]+$/, ".pdf");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${originalName}"`);
      res.setHeader("X-Converted-Name", encodeURIComponent(originalName));
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[ConvertUpload] Error:", err);
      res.status(500).json({ error: `Conversion failed: ${(err as Error).message}` });
    }
  });

  // ── REST endpoint for PDF → Office/Image conversion via CloudConvert ───────────
  const pdfFromUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
  const PDF_TO_FORMAT_MAP: Record<string, { ext: string; mime: string }> = {
    docx: { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    xlsx: { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    pptx: { ext: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
    jpg:  { ext: "jpg",  mime: "image/jpeg" },
  };
  app.post("/api/convert/pdf-to/:format", pdfFromUpload.single("file"), async (req, res) => {
    const target = (req.params.format || "").toLowerCase();
    const cfg = PDF_TO_FORMAT_MAP[target];
    if (!cfg) { res.status(400).json({ error: `Unsupported target format: ${target}` }); return; }

    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) { res.status(500).json({ error: "CLOUDCONVERT_API_KEY not configured" }); return; }

    const file = req.file;
    if (!file) { res.status(400).json({ error: "No file" }); return; }
    if (file.mimetype !== "application/pdf" && !file.originalname.toLowerCase().endsWith(".pdf")) {
      res.status(415).json({ error: "Only PDF input is supported" }); return;
    }

    try {
      const { default: CloudConvertCtor } = await import("cloudconvert");
      const cloudConvert = new (CloudConvertCtor as any)(apiKey);

      const job = await cloudConvert.jobs.create({
        tasks: {
          "import-pdf": { operation: "import/upload" },
          "convert": {
            operation: "convert",
            input: "import-pdf",
            input_format: "pdf",
            output_format: cfg.ext,
          },
          "export-result": { operation: "export/url", input: "convert" },
        },
      });

      const importTask = job.tasks.find((t: any) => t.name === "import-pdf");
      await cloudConvert.tasks.upload(importTask, file.buffer, file.originalname);

      const completedJob = await cloudConvert.jobs.wait(job.id);
      const exportTask = completedJob.tasks.find((t: any) => t.name === "export-result" && t.status === "finished");
      const fileResult = exportTask?.result?.files?.[0];
      if (!fileResult?.url) throw new Error("CloudConvert did not return a download URL");

      const downloaded = await fetch(fileResult.url);
      if (!downloaded.ok) throw new Error(`Download failed: ${downloaded.status}`);
      const arrayBuffer = await downloaded.arrayBuffer();

      const outName = file.originalname.replace(/\.pdf$/i, "") + "." + cfg.ext;
      res.setHeader("Content-Type", cfg.mime);
      res.setHeader("Content-Disposition", `attachment; filename="${outName}"`);
      res.setHeader("X-Converted-Name", encodeURIComponent(outName));
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error("[PdfTo] CloudConvert error:", err);
      res.status(500).json({ error: `Conversion failed: ${(err as Error).message}` });
    }
  });

  // ── REST endpoint for PDF upload (avoids tRPC base64 size limits) ─────────────
  const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
  app.post("/api/documents/upload", pdfUpload.single("file"), async (req, res) => {
    try {
      // Authenticate via session cookie using the same SDK as tRPC
      let userId: number;
      try {
        const user = await sdk.authenticateRequest(req as any);
        userId = user.id;
      } catch {
        res.status(401).json({ error: "Unauthorized" }); return;
      }
      const file = req.file;
      if (!file) { res.status(400).json({ error: "No file" }); return; }
      const name = (req.body.name as string) || file.originalname || "document.pdf";
      const folderId = req.body.folderId ? parseInt(req.body.folderId) : undefined;
      const key = `docs/${userId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { url } = await storagePut(key, file.buffer, "application/pdf");
      const paymentStatus = (req.body.paymentStatus === "paid") ? "paid" as const : "pending" as const;
      const doc = await createDocument({
        userId,
        name,
        fileKey: key,
        fileUrl: url,
        fileSize: file.size,
        folderId,
        paymentStatus,
      });
      res.json({ success: true, doc });
    } catch (err) {
      console.error("[Upload] Error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // ── REST endpoint for auto-saving document on first download click ────────────
  // This saves the document to the user's panel with paymentStatus=pending
  // Called when authenticated user clicks download and doc is not yet saved
  app.post("/api/documents/auto-save", pdfUpload.single("file"), async (req, res) => {
    try {
      let userId: number;
      try {
        const user = await sdk.authenticateRequest(req as any);
        userId = user.id;
      } catch {
        res.status(401).json({ error: "Unauthorized" }); return;
      }
      const file = req.file;
      if (!file) { res.status(400).json({ error: "No file" }); return; }
      const name = (req.body.name as string) || file.originalname || "document.pdf";
      const key = `docs/${userId}/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { url } = await storagePut(key, file.buffer, "application/pdf");
      // Check if user has active subscription
      const isPremium = await userHasActiveSubscription(userId);
      const doc = await createDocument({
        userId,
        name,
        fileKey: key,
        fileUrl: url,
        fileSize: file.size,
        paymentStatus: isPremium ? "paid" : "pending",
      });
      res.json({ success: true, doc, isPremium });
    } catch (err) {
      console.error("[AutoSave] Error:", err);
      res.status(500).json({ error: "Auto-save failed" });
    }
  });

  // ── Download document by ID (fetches from R2 using fileKey) ──────────────
  app.get("/api/documents/download/:id", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req as any);
      const docId = parseInt(req.params.id, 10);
      if (!docId) { res.status(400).json({ error: "Invalid id" }); return; }
      // Trial usage gate: blocks the 3rd distinct PDF download during trial.
      const { canDownloadForUser, recordDocumentDownload } = await import("../db");
      const gate = await canDownloadForUser(user.id, docId);
      if (!gate.allowed) {
        res.status(403).json({
          error: (gate as any).reason ?? "blocked",
          usage: (gate as any).usage,
          limit: (gate as any).limit,
        });
        return;
      }
      const doc = await getDocumentById(docId, user.id);
      if (!doc || !doc.fileKey) { res.status(404).json({ error: "Document not found" }); return; }
      const { url } = await storageGet(doc.fileKey, 300);
      const response = await fetch(url);
      if (!response.ok) { res.status(500).json({ error: "Failed to fetch from storage" }); return; }
      const buffer = Buffer.from(await response.arrayBuffer());
      // Record the download (stamps firstDownloadedAt on the first hit only).
      await recordDocumentDownload(user.id, docId);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${doc.name || "document.pdf"}"`);
      res.send(buffer);
    } catch (err) {
      console.error("[Download] Error:", err);
      res.status(500).json({ error: "Download failed" });
    }
  });

  // ── REST endpoint for proxying R2 file downloads (avoids CORS) ──────────────
  app.get("/api/documents/proxy", async (req, res) => {
    try {
      const fileUrl = req.query.url as string;
      if (!fileUrl) { res.status(400).json({ error: "Missing url parameter" }); return; }
      // Only allow proxying from R2 bucket domains for security
      const parsedUrl = new URL(fileUrl);
      const hostname = parsedUrl.hostname;
      const isR2Domain = hostname.endsWith(".r2.dev") || hostname.endsWith(".r2.cloudflarestorage.com");
      if (!isR2Domain) {
        res.status(403).json({ error: "Domain not allowed" }); return;
      }
      const response = await fetch(fileUrl);
      if (!response.ok) { res.status(response.status).json({ error: "Failed to fetch file" }); return; }
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const contentLength = response.headers.get("content-length");
      res.setHeader("Content-Type", contentType);
      if (contentLength) res.setHeader("Content-Length", contentLength);
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (err) {
      console.error("[Proxy] Error:", err);
      res.status(500).json({ error: "Proxy failed" });
    }
  });

  // ── REST endpoint for PDF password protection (uses pikepdf via Python) ────────
  const protectUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
  app.post("/api/documents/protect", protectUpload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) { res.status(400).json({ error: "No file" }); return; }
      const password = req.body.password as string;
      const algo = (req.body.algo as string) || "256-AES";
      if (!password) { res.status(400).json({ error: "Password required" }); return; }

      // Map algorithm to pikepdf R value:
      // R=4 → 128-bit AES, R=6 → 256-bit AES, R=3 → 128-bit RC4 (ARC-FOUR)
      let R: number;
      if (algo === "128-AES") R = 4;
      else if (algo === "256-AES") R = 6;
      else R = 3; // 128-ARC4

      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const { tmpdir } = await import("os");
      const { join } = await import("path");
      const { writeFile, readFile, unlink } = await import("fs/promises");
      const execFileAsync = promisify(execFile);

      const tmpIn = join(tmpdir(), `protect_in_${Date.now()}.pdf`);
      const tmpOut = join(tmpdir(), `protect_out_${Date.now()}.pdf`);
      const tmpPy = join(tmpdir(), `protect_${Date.now()}.py`);

      await writeFile(tmpIn, file.buffer);
      await writeFile(tmpPy, [
        "import pikepdf, sys",
        "pdf = pikepdf.open(sys.argv[1])",
        "pdf.save(sys.argv[2], encryption=pikepdf.Encryption(owner=sys.argv[3] + '_owner', user=sys.argv[3], R=int(sys.argv[4])))",
        "pdf.close()",
      ].join("\n"));

      // Build a clean environment without PYTHONHOME/PYTHONPATH so that
      // the system python3 (/usr/bin/python3.11) uses its own site-packages
      // where pikepdf is installed (not the build agent's Python 3.13 venv).
      const cleanEnv = { ...process.env };
      delete cleanEnv.PYTHONHOME;
      delete cleanEnv.PYTHONPATH;
      delete cleanEnv.NUITKA_PYTHONPATH;
      try {
        await execFileAsync("python3", [tmpPy, tmpIn, tmpOut, password, String(R)], { timeout: 30000, env: cleanEnv });
        const protectedBytes = await readFile(tmpOut);
        const originalName = (req.body.filename as string) || file.originalname || "document.pdf";
        const protectedName = originalName.replace(/\.pdf$/i, "") + "_protected.pdf";
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${protectedName}"`);
        res.send(protectedBytes);
      } finally {
        unlink(tmpIn).catch(() => {});
        unlink(tmpOut).catch(() => {});
        unlink(tmpPy).catch(() => {});
      }
    } catch (err) {
      console.error("[Protect] Error:", err);
      res.status(500).json({ error: "Failed to protect PDF" });
    }
  });

  // ── REST endpoint for PDF text blocks extraction via MuPDF ──────────────────────
  const blocksUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
  app.post("/api/pdf/blocks", blocksUpload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) { res.status(400).json({ error: "No file" }); return; }
      const pageNum = parseInt(req.body.page ?? "0", 10); // 0-indexed

      const mupdf = await import("mupdf");
      const doc = mupdf.Document.openDocument(file.buffer, "application/pdf");
      const pageCount = doc.countPages();
      if (pageNum < 0 || pageNum >= pageCount) {
        doc.destroy();
        res.status(400).json({ error: "Invalid page number" });
        return;
      }

      const page = doc.loadPage(pageNum);
      const stext = page.toStructuredText("preserve-whitespace");

      // Walk structured text to extract characters with full style info
      interface CharInfo {
        c: string;
        x: number; y: number;
        fontSize: number;
        fontName: string;
        isBold: boolean;
        isItalic: boolean;
        isSerif: boolean;
        color: string;
      }
      const chars: CharInfo[] = [];

      stext.walk({
        onChar(c: string, origin: any, font: any, size: number, quad: any, color: any) {
          let r = 0, g = 0, b = 0;
          if (Array.isArray(color)) {
            if (color.length === 1) { r = g = b = color[0]; }
            else if (color.length === 3) { [r, g, b] = color; }
            else if (color.length === 4) {
              const [cc, mm, yy, kk] = color;
              r = (1 - cc) * (1 - kk); g = (1 - mm) * (1 - kk); b = (1 - yy) * (1 - kk);
            }
          }
          const hex = `#${Math.round(r * 255).toString(16).padStart(2, "0")}${Math.round(g * 255).toString(16).padStart(2, "0")}${Math.round(b * 255).toString(16).padStart(2, "0")}`;
          chars.push({
            c,
            x: origin[0],
            y: origin[1],
            fontSize: size,
            fontName: font.getName?.() || "unknown",
            isBold: font.isBold?.() ?? false,
            isItalic: font.isItalic?.() ?? false,
            isSerif: font.isSerif?.() ?? false,
            color: hex,
          });
        },
      });

      // Group consecutive chars with same style into line-level blocks
      interface LineBlock {
        str: string;
        x: number; y: number;
        fontSize: number;
        fontName: string;
        isBold: boolean;
        isItalic: boolean;
        fontFamily: string;
        color: string;
        width: number;
      }
      const lineBlocks: LineBlock[] = [];
      let cur: { chars: string[]; x: number; y: number; fontSize: number; fontName: string; isBold: boolean; isItalic: boolean; isSerif: boolean; color: string; lastX: number } | null = null;

      for (const ch of chars) {
        if (cur && cur.fontName === ch.fontName && cur.color === ch.color
          && Math.abs(cur.fontSize - ch.fontSize) < 0.5
          && Math.abs(cur.y - ch.y) < ch.fontSize * 0.5) {
          cur.chars.push(ch.c);
          cur.lastX = ch.x;
        } else {
          if (cur && cur.chars.length > 0) {
            const str = cur.chars.join("");
            if (str.trim()) {
              lineBlocks.push({
                str, x: cur.x, y: cur.y, fontSize: cur.fontSize,
                fontName: cur.fontName, isBold: cur.isBold, isItalic: cur.isItalic,
                fontFamily: cur.isSerif ? "serif" : "sans-serif",
                color: cur.color,
                width: Math.max(cur.lastX - cur.x + cur.fontSize * 0.6, str.length * cur.fontSize * 0.5),
              });
            }
          }
          cur = { chars: [ch.c], x: ch.x, y: ch.y, fontSize: ch.fontSize, fontName: ch.fontName, isBold: ch.isBold, isItalic: ch.isItalic, isSerif: ch.isSerif, color: ch.color, lastX: ch.x };
        }
      }
      if (cur && cur.chars.length > 0) {
        const str = cur.chars.join("");
        if (str.trim()) {
          lineBlocks.push({
            str, x: cur.x, y: cur.y, fontSize: cur.fontSize,
            fontName: cur.fontName, isBold: cur.isBold, isItalic: cur.isItalic,
            fontFamily: cur.isSerif ? "serif" : "sans-serif",
            color: cur.color,
            width: Math.max(cur.lastX - cur.x + cur.fontSize * 0.6, str.length * cur.fontSize * 0.5),
          });
        }
      }

      // Group line blocks into paragraphs (same X alignment, consecutive Y, same font)
      interface ParagraphBlock {
        str: string;
        x: number; y: number;
        width: number; height: number;
        fontSize: number;
        fontName: string;
        fontFamily: string;
        isBold: boolean;
        isItalic: boolean;
        color: string;
        lineHeight: number;
      }
      const paragraphs: ParagraphBlock[] = [];
      let paraLines: LineBlock[] = [];

      for (const lb of lineBlocks) {
        if (paraLines.length > 0) {
          const prev = paraLines[paraLines.length - 1];
          const sameFont = Math.abs(lb.fontSize - prev.fontSize) < 1;
          const sameX = Math.abs(lb.x - paraLines[0].x) < 20;
          const yGap = lb.y - prev.y;
          const normalGap = yGap > 0 && yGap < prev.fontSize * 2.5;
          if (sameFont && sameX && normalGap) {
            paraLines.push(lb);
            continue;
          }
        }
        // Flush previous paragraph
        if (paraLines.length > 0) {
          const first = paraLines[0];
          const last = paraLines[paraLines.length - 1];
          const lh = paraLines.length > 1 ? (last.y - first.y) / (paraLines.length - 1) : first.fontSize * 1.4;
          paragraphs.push({
            str: paraLines.map(l => l.str).join("\n"),
            x: Math.min(...paraLines.map(l => l.x)),
            y: first.y,
            width: Math.max(...paraLines.map(l => l.width)),
            height: last.y - first.y + last.fontSize * 1.4,
            fontSize: first.fontSize,
            fontName: first.fontName,
            fontFamily: first.fontFamily,
            isBold: first.isBold,
            isItalic: first.isItalic,
            color: first.color,
            lineHeight: lh,
          });
        }
        paraLines = [lb];
      }
      // Flush last paragraph
      if (paraLines.length > 0) {
        const first = paraLines[0];
        const last = paraLines[paraLines.length - 1];
        const lh = paraLines.length > 1 ? (last.y - first.y) / (paraLines.length - 1) : first.fontSize * 1.4;
        paragraphs.push({
          str: paraLines.map(l => l.str).join("\n"),
          x: Math.min(...paraLines.map(l => l.x)),
          y: first.y,
          width: Math.max(...paraLines.map(l => l.width)),
          height: last.y - first.y + last.fontSize * 1.4,
          fontSize: first.fontSize,
          fontName: first.fontName,
          fontFamily: first.fontFamily,
          isBold: first.isBold,
          isItalic: first.isItalic,
          color: first.color,
          lineHeight: lh,
        });
      }

      stext.destroy();
      page.destroy();
      doc.destroy();

      res.json({ blocks: paragraphs, pageCount });
    } catch (err) {
      console.error("[PDF Blocks] Error:", err);
      res.status(500).json({ error: "Failed to extract text blocks" });
    }
  });

  // ── REST endpoint for PDF export (PDF → Word/Excel/PPT) ─────────────────────────
  const exportUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
  app.post("/api/documents/export", exportUpload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) { res.status(400).json({ error: "No file" }); return; }
      const format = (req.body.format as string) || "docx";
      if (!["docx", "xlsx", "pptx"].includes(format)) {
        res.status(400).json({ error: "Unsupported format" }); return;
      }
      const originalName = (req.body.filename as string) || file.originalname || "document.pdf";
      const baseName = originalName.replace(/\.pdf$/i, "");
      const mimeTypes: Record<string, string> = {
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      };

      // Use LibreOffice WASM converter for all formats
      const { createWorkerConverter } = await import("@matbee/libreoffice-converter/server");
      const converter = await createWorkerConverter();
      try {
        const result = await converter.convert(file.buffer, { outputFormat: format as any });
        res.setHeader("Content-Type", mimeTypes[format]);
        res.setHeader("Content-Disposition", `attachment; filename="${baseName}.${format}"`);
        res.send(Buffer.from(result.data));
      } finally {
        await converter.destroy();
      }
    } catch (err) {
      console.error("[Export] Error:", err);
      res.status(500).json({ error: `Export to ${req.body.format} failed. Please try again.` });
    }
  });

  // Inbound email webhook — Cloudflare Email Worker POSTs here when a
  // user replies to an admin email. Body is JSON with the parsed
  // sender/subject/body. Auth is a shared secret in the X-Inbound-Secret
  // header so randoms can't forge fake contact messages.
  app.post("/api/inbound-email", express.json({ limit: "5mb" }), async (req, res) => {
    try {
      const expected = process.env.INBOUND_EMAIL_SECRET ?? "";
      const got = req.header("x-inbound-secret") ?? "";
      if (!expected || got !== expected) {
        return res.status(401).json({ error: "unauthorized" });
      }
      const { fromName, fromEmail, subject, body } = req.body ?? {};
      if (!fromEmail || !body) {
        return res.status(400).json({ error: "missing fields" });
      }
      const { createInboundEmailMessage } = await import("../db");
      await createInboundEmailMessage({
        fromName: String(fromName ?? "").slice(0, 128),
        fromEmail: String(fromEmail).slice(0, 320).toLowerCase(),
        subject: String(subject ?? "").slice(0, 256),
        body: String(body).slice(0, 50000),
      });
      console.log("[Inbound] email saved as contact message:", fromEmail, "subject:", subject);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Inbound] error:", err?.message ?? err);
      res.status(500).json({ error: "internal" });
    }
  });

  // Sipay 3DS callbacks. After the customer authenticates in Redsys MPI,
  // Sipay redirects them back here with ?request_id=… (plus ?error=… on KO).
  // We confirm the auth server-side and bounce the user to /payment/success
  // or to the homepage with a banner on failure. No DB writes yet — that
  // comes in Fase 2 when we wire the cron + subscription row.
  app.get("/api/sipay/callback/ok", async (req, res) => {
    const requestId = String(req.query.request_id ?? "");
    if (!requestId) return res.redirect("/?sipay=missing_request_id");
    const startedAt = Date.now();
    try {
      const { confirmPayment } = await import("./sipay");
      const result = await confirmPayment(requestId);
      const data = result.data as any;
      if (!result.ok || data?.code !== "0") {
        console.error("[Sipay] confirm failed:", data ?? result.raw);
        const { recordWebhookEvent } = await import("../db");
        await recordWebhookEvent({
          provider: "sipay",
          eventType: "fastpay_confirm_failed",
          eventId: requestId,
          status: "error",
          errorMessage: data?.detail ?? "unknown",
          durationMs: Date.now() - startedAt,
          payload: data ?? result.raw,
        });
        return res.redirect(`/?sipay=confirm_failed&detail=${encodeURIComponent(data?.detail ?? "unknown")}`);
      }
      const sipayTxn = data?.payload?.transaction_id ?? "";
      const order = data?.payload?.order ?? requestId;
      const txn = sipayTxn || order;
      const masked = data?.payload?.masked_card ?? "";
      // custom_01 is what sipayCheckoutInit passes through with the user id
      // so we can correlate the 3DS callback back to a user without a session
      // (the Redsys MPI redirect drops cookies on the floor in some browsers).
      const customUserId = Number(data?.payload?.custom_01 ?? 0);
      // FastPay returns `token` (vault tokenization on raw PAN); wallet
      // flows return `cof_id`. Prefer whichever Sipay actually sent so this
      // helper works for any future flow that uses the same callback path.
      const sipayToken = data?.payload?.cof_id ?? data?.payload?.token ?? "";
      console.log(`[Sipay] auth OK: userId=${customUserId} txn=${sipayTxn || "(empty)"} order=${order} card=${masked}`);

      if (customUserId > 0) {
        const { upsertSubscription, markDocumentsPaid, recordWebhookEvent, recordCharge } = await import("../db");
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await upsertSubscription({
          userId: customUserId,
          sipayToken,
          sipayOrder: order,
          sipayTransactionId: sipayTxn,
          sipayMaskedCard: masked,
          sipayProvider: "fastpay",
          plan: "trial",
          status: "trialing",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        });
        await markDocumentsPaid(customUserId);
        // Intro charge is 0,50 € — the amount we asked Sipay to authorize.
        // If Sipay echoed back a different amount we use theirs instead.
        const amountCents = Number(data?.payload?.amount ?? 50);
        await recordCharge({
          userId: customUserId,
          provider: "fastpay",
          amountCents,
          sipayTransactionId: sipayTxn,
          sipayOrder: order,
          sipayMaskedCard: masked,
          status: "ok",
        });
        await recordWebhookEvent({
          provider: "sipay",
          eventType: "fastpay_intro_charge",
          eventId: sipayTxn || order,
          status: "ok",
          durationMs: Date.now() - startedAt,
          payload: data,
        });

        // Welcome email — non-blocking, lang detected from Accept-Language.
        try {
          const acceptLang = String(req.headers["accept-language"] ?? "").split(",")[0]?.split("-")[0] ?? "es";
          const { sendTrialWelcomeEmail } = await import("../email");
          const { getUserById } = await import("../db");
          const u = await getUserById(customUserId);
          if (u?.email) {
            sendTrialWelcomeEmail({ to: u.email, name: u.name ?? u.email, lang: acceptLang, trialEndDate: periodEnd })
              .catch((err: any) => console.warn("[Sipay] welcome email failed:", err?.message ?? err));
          }
        } catch (err: any) {
          console.warn("[Sipay] welcome email setup failed:", err?.message ?? err);
        }
      }

      return res.redirect(`/payment/success?txn=${encodeURIComponent(txn)}&provider=sipay`);
    } catch (err: any) {
      console.error("[Sipay] callback/ok exception:", err?.message ?? err);
      try {
        const { recordWebhookEvent } = await import("../db");
        await recordWebhookEvent({
          provider: "sipay",
          eventType: "fastpay_callback_exception",
          eventId: requestId,
          status: "error",
          errorMessage: err?.message ?? String(err),
          durationMs: Date.now() - startedAt,
        });
      } catch {}
      return res.redirect("/?sipay=server_error");
    }
  });

  app.get("/api/sipay/callback/ko", (req, res) => {
    const error = String(req.query.error ?? "unknown");
    console.warn("[Sipay] callback ko:", req.query);
    return res.redirect(`/?sipay_error=${encodeURIComponent(error)}`);
  });

  // ── Sipay MIT-R recurring billing cron ─────────────────────────────────
  // Called by an external scheduler (Railway cron, Pingdom, etc.) once a day.
  // Auth via shared `X-Cron-Secret` header — anything else returns 401. Runs
  // in foreground (no queue) because the active sub set is small (<5k for
  // the foreseeable future) and Sipay's all-in-one MIT-R is ~300 ms each.
  app.post("/api/cron/sipay-renew", async (req, res) => {
    const secret = String(req.headers["x-cron-secret"] ?? "");
    const { ENV } = await import("./env");
    if (!ENV.cronSecret || secret !== ENV.cronSecret) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const dryRun = req.query.dry === "1";
    const startedAt = Date.now();
    try {
      const db = await import("../db");
      const { createMITRecurring } = await import("./sipay");
      const due = await db.getSubsDueForRenewal();
      // Read price from site_settings so the A/B test toggle still drives
      // recurring charges. Default to 19.99 € if the row was deleted.
      const priceStr = await db.getSiteSetting?.("subscription_price_eur").catch(() => null);
      const priceEur = Number(priceStr ?? "19.99");
      const amountCents = Math.round(priceEur * 100);
      const results: { userId: number; ok: boolean; reason?: string }[] = [];
      for (const sub of due) {
        if (dryRun) {
          results.push({ userId: sub.userId, ok: true, reason: "dry-run" });
          continue;
        }
        const order = `mit-${sub.userId}-${Date.now()}`;
        const chargeStart = Date.now();
        try {
          const result = await createMITRecurring({
            amountCents,
            token: sub.sipayToken!,
            order,
            custom_01: String(sub.userId),
          });
          const data = result.data as any;
          const code = data?.payload?.code ?? data?.code;
          const ok = result.ok && code === "0";
          const txn = data?.payload?.transaction_id ?? "";
          const masked = data?.payload?.masked_card ?? sub.sipayMaskedCard ?? "";
          if (ok) {
            // Extend the period 30 days and bump status -> active. Past-due
            // subs that paid now become active again.
            const newPeriodStart = sub.currentPeriodEnd ?? new Date();
            const newPeriodEnd = new Date(newPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
            await db.upsertSubscription({
              userId: sub.userId,
              plan: "monthly",
              status: "active",
              currentPeriodStart: newPeriodStart,
              currentPeriodEnd: newPeriodEnd,
              sipayTransactionId: txn,
              sipayOrder: order,
              sipayMaskedCard: masked,
            });
            await db.recordCharge({
              userId: sub.userId,
              provider: "mit",
              amountCents,
              sipayTransactionId: txn,
              sipayOrder: order,
              sipayMaskedCard: masked,
              status: "ok",
            });
            await db.recordWebhookEvent({
              provider: "sipay",
              eventType: "mit_charge_ok",
              eventId: txn || order,
              status: "ok",
              durationMs: Date.now() - chargeStart,
              payload: data,
            });
            results.push({ userId: sub.userId, ok: true });
          } else {
            // Dunning audit — log the FULL Sipay response on every decline so
            // we can see the exact field name + format used for the response
            // code ("116", "0116", "R116", separate `error_code` field, etc).
            // This drives the per-code retry policy in the dunning refactor;
            // remove the log once the mapping is locked in. Marker prefix
            // makes it grep-friendly in Railway logs.
            const candidateCodes = {
              code: data?.payload?.code ?? data?.code,
              error_code: data?.payload?.error_code ?? data?.error_code,
              errorCode: data?.payload?.errorCode ?? data?.errorCode,
              response_code: data?.payload?.response_code ?? data?.response_code,
              responseCode: data?.payload?.responseCode ?? data?.responseCode,
              status_code: data?.payload?.status_code ?? data?.status_code,
              return_code: data?.payload?.return_code ?? data?.return_code,
              reason_code: data?.payload?.reason_code ?? data?.reason_code,
              // Token-like fields: in MIT failure responses Sipay sometimes
              // returns the cof_id that DID work or hints at why the stored
              // credentials are no longer usable. Logging both helps us
              // diagnose token drift across renewals.
              cof_id: data?.payload?.cof_id ?? data?.cof_id,
              token: data?.payload?.token ?? data?.token,
            };
            console.warn(
              "[MIT-DUNNING-RAW]",
              JSON.stringify({
                userId: sub.userId,
                order,
                candidateCodes,
                payload: data,
                rawTail: typeof result.raw === "string" ? result.raw.slice(0, 2000) : null,
              }),
            );
            // Mark sub past_due so admin sees it in the panel.
            await db.upsertSubscription({
              userId: sub.userId,
              status: "past_due",
              currentPeriodEnd: sub.currentPeriodEnd ?? new Date(),
            });
            const detail = data?.payload?.detail ?? data?.detail ?? "unknown";
            await db.recordCharge({
              userId: sub.userId,
              provider: "mit",
              amountCents,
              sipayOrder: order,
              status: "failed",
              errorDetail: String(detail).slice(0, 500),
            });
            await db.recordWebhookEvent({
              provider: "sipay",
              eventType: "mit_charge_failed",
              eventId: order,
              status: "error",
              errorMessage: String(detail),
              durationMs: Date.now() - chargeStart,
              payload: data ?? result.raw,
            });
            results.push({ userId: sub.userId, ok: false, reason: String(detail) });
          }
        } catch (err: any) {
          const msg = err?.message ?? String(err);
          await db.recordWebhookEvent({
            provider: "sipay",
            eventType: "mit_cron_exception",
            eventId: order,
            status: "error",
            errorMessage: msg,
            durationMs: Date.now() - chargeStart,
          });
          results.push({ userId: sub.userId, ok: false, reason: msg });
        }
      }
      const succeeded = results.filter((r) => r.ok).length;
      const failed = results.length - succeeded;
      console.log(`[MIT-R cron] processed=${results.length} ok=${succeeded} fail=${failed} duration=${Date.now() - startedAt}ms dryRun=${dryRun}`);
      return res.json({
        processed: results.length,
        succeeded,
        failed,
        durationMs: Date.now() - startedAt,
        dryRun,
        results,
      });
    } catch (err: any) {
      console.error("[MIT-R cron] fatal:", err?.message ?? err);
      return res.status(500).json({ error: "cron_exception", detail: err?.message ?? String(err) });
    }
  });

  // Apple Pay merchant validation. Apple's JS API calls our backend with the
  // validationURL it expects us to authenticate against. We forward it to
  // Sipay (who holds the merchant identity cert) and return the opaque
  // session payload to the browser. Can't be a tRPC procedure because the
  // browser calls this via fetch from inside session.onvalidatemerchant
  // and we want the raw response — no tRPC envelope.
  app.post("/api/sipay/applepay/validate-merchant", express.json(), async (req, res) => {
    const validationURL = String(req.body?.validationURL ?? "");
    const domain = String(req.body?.domain ?? "");
    if (!validationURL || !domain) {
      return res.status(400).json({ error: "missing_validation_url_or_domain" });
    }
    try {
      const { validateApplePaySession } = await import("./sipay");
      const result = await validateApplePaySession({
        validationURL,
        domain,
        title: "EditorPDF",
      });
      const data = result.data as any;
      if (!result.ok || data?.code !== "0") {
        console.error("[Sipay] Apple Pay validate-merchant failed:", data ?? result.raw);
        return res.status(502).json({ error: "sipay_rejected", detail: data ?? result.raw });
      }
      // Sipay's response carries TWO things we need to keep:
      //   data.payload     → the merchant session Apple expects
      //                       (session.completeMerchantValidation needs this)
      //   data.request_id  → Sipay's session token. We MUST echo it back in
      //                       the catcher of /mdwr/v1/authorization or Sipay
      //                       rejects with no_card_data (it can't correlate
      //                       our charge to the validated Apple session).
      const requestId = data?.request_id ?? data?.payload?.request_id ?? "";
      console.log(`[Sipay] Apple Pay merchant validated, sipay request_id=${requestId || "(missing)"}`);
      return res.json({
        merchantSession: data.payload,
        requestId,
      });
    } catch (err: any) {
      console.error("[Sipay] Apple Pay validate-merchant exception:", err?.message ?? err);
      return res.status(500).json({ error: "server_error" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = parseInt(process.env.PORT || "8080", 10);
  const port = await findAvailablePort(PORT);

  if (port !== PORT) {
    console.log(`Port ${PORT} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });

  // Seed legal pages if they don't exist (retry after 5s if DB not ready yet)
  const runSeed = async (attempt = 1) => {
    try {
      const { seedLegalPages } = await import("../seed-legal-pages");
      await seedLegalPages();
      console.log("[Seed] Legal pages seeding completed (attempt " + attempt + ")");
    } catch (err) {
      console.error("[Seed] Legal pages failed (attempt " + attempt + "):", err);
      if (attempt < 3) {
        console.log("[Seed] Retrying in 5 seconds...");
        setTimeout(() => runSeed(attempt + 1), 5000);
      }
    }
  };
  runSeed();
}

startServer().catch(console.error);
