import "dotenv/config";
// Sentry MUST be initialized before any module that could throw — the
// SDK auto-instruments Node's http module and Express the moment its
// import is evaluated, so anything that comes later (db, routers,
// middleware) is automatically traced. If SENTRY_DSN is missing, init
// is a no-op and the rest of the app boots normally.
import { initSentry, Sentry } from "./sentry";
initSentry();
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

  // Build identifier — the commit SHA this server was deployed from. The client
  // bundle bakes in the SHA it was built from (__BUILD_ID__); when they differ
  // the client knows it's stale and reloads (see installVersionAutoReload).
  app.get("/api/version", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ id: process.env.RAILWAY_GIT_COMMIT_SHA || "dev" });
  });

  // Direct, uncached session check. The post-OAuth auto-resume flow polls this
  // instead of trusting the React Query `auth.me` cache, which on mobile can
  // stay stale after the cross-origin redirect and strand the user on an empty
  // editor. Reads the session cookie straight off the request — so it also
  // tells us (via the log) whether the browser is even sending the cookie.
  app.get("/api/auth/status", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const hasCookie = /(?:^|;\s*)app_session_id=/.test(req.headers.cookie || "");
    try {
      const { sdk } = await import("./sdk");
      const user = await sdk.authenticateRequest(req);
      let premium = false;
      try {
        const db = await import("../db");
        const sub = await db.getActiveSubscription(user.id);
        premium = !!sub && (sub.status === "active" || sub.status === "trialing") &&
          (sub.plan === "monthly" || sub.plan === "annual");
      } catch { /* premium best-effort */ }
      console.log(`[auth-status] cookie=${hasCookie} authed=true userId=${user.id} premium=${premium}`);
      res.json({ authenticated: true, premium });
    } catch {
      console.log(`[auth-status] cookie=${hasCookie} authed=false`);
      res.json({ authenticated: false, premium: false });
    }
  });

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

  // ── Canonical host: apex → www (production only) ──────────────────────────────
  // Google Pay is only approved on www.editorpdf.net — Google's console refuses
  // to register the bare apex, forcing www. So funnel every page load to www,
  // where Google Pay (and Apple Pay + card) all work. EXCLUDE /api/* so the
  // Google OAuth callback (registered redirect_uri is the apex) and the Sipay
  // callbacks keep processing on whatever host they land on, and /.well-known/*
  // so domain-verification files (Apple Pay) stay reachable on the apex.
  if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      const host = String(req.headers.host || "").toLowerCase();
      if (
        host === "editorpdf.net" &&
        !req.url.startsWith("/api/") &&
        !req.url.startsWith("/.well-known/")
      ) {
        return res.redirect(301, `https://www.editorpdf.net${req.url}`);
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
    // Google Ads fires its conversion ping to the buyer's LOCAL Google domain
    // (www.google.<tld>), which varies by locale. CSP can't wildcard the TLD,
    // so we enumerate the country domains for our supported languages + the
    // main Spanish-speaking markets. Without these, the conversion ping is
    // blocked by connect-src (seen as OR_BIBED-style console errors on
    // /payment/success) and Google Ads never records the sale.
    const googleAds = "https://www.google.es https://www.google.co.uk https://www.google.fr https://www.google.de https://www.google.pt https://www.google.it https://www.google.nl https://www.google.pl https://www.google.ru https://www.google.com.ua https://www.google.ro https://www.google.com.br https://www.google.com.mx https://www.google.com.ar https://www.google.cl https://www.google.com.co";
    res.setHeader("Content-Security-Policy", [
      "frame-ancestors 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.gstatic.com https://translate.googleapis.com https://static.hotjar.com https://script.hotjar.com https://sandbox.sipay.es https://live.sipay.es https://pay.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com https://translate.googleapis.com https://sandbox.sipay.es https://live.sipay.es",
      "font-src 'self' https://fonts.gstatic.com https://script.hotjar.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-src 'self' https://www.googletagmanager.com https://vars.hotjar.com https://sandbox.sipay.es https://live.sipay.es https://pay.google.com",
      `img-src 'self' data: https://www.googletagmanager.com https://www.google.com ${googleAds} https://script.hotjar.com https://sandbox.sipay.es https://live.sipay.es https://pay.google.com https://www.gstatic.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://*.doubleclick.net`,
      // Sentry ingest goes to *.ingest.<region>.sentry.io (we're on de = EU).
      // Allow both the regional ingest endpoint and sentry.io for the
      // API/dashboard pings the SDK does for release health.
      `connect-src 'self' data: https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://www.google.com https://google.com ${googleAds} https://*.hotjar.com https://*.hotjar.io wss://*.hotjar.com https://sandbox.sipay.es https://live.sipay.es https://pay.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://*.doubleclick.net https://apple-pay-gateway.apple.com https://apple-pay-gateway-cert.apple.com https://*.ingest.de.sentry.io https://*.sentry.io`,
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
      // www is the canonical host (apex 301s to www — Google Pay is only
      // approved on www), so list www URLs to avoid sitemap entries that redirect.
      const base = "https://www.editorpdf.net";
      const staticUrls: Array<{ loc: string; priority: string; changefreq: string; lastmod?: string }> = [
        { loc: `${base}/es`, priority: "1.0", changefreq: "weekly" },
        { loc: `${base}/en`, priority: "1.0", changefreq: "weekly" },
        { loc: `${base}/es/pricing`, priority: "0.8", changefreq: "monthly" },
        { loc: `${base}/es/blog`, priority: "0.9", changefreq: "weekly" },
        { loc: `${base}/en/blog`, priority: "0.9", changefreq: "weekly" },
        { loc: `${base}/es/tools`, priority: "0.7", changefreq: "monthly" },
        { loc: `${base}/es/heic-to-pdf`, priority: "0.7", changefreq: "monthly" },
        { loc: `${base}/en/heic-to-pdf`, priority: "0.7", changefreq: "monthly" },
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

  // Wrap a multer middleware so upload failures return a clean HTTP status
  // instead of an unhandled error (which 500s the request + spams Sentry):
  //  • too-large file  → 413 (100 MB matches the cap advertised on the site)
  //  • client aborted the upload mid-POST (closed tab, lost network) → swallow
  //    quietly; the socket is already gone so there's nothing to send and no
  //    bug to report. Multer surfaces this as `Error: Request aborted`.
  //  • anything else   → 400
  const handleUpload = (mw: any) => (req: any, res: any, next: any) => {
    mw(req, res, (err: any) => {
      if (err) {
        if (err?.message === "Request aborted" || req.aborted || !res.writable) {
          return; // client disconnected — no response possible, don't report
        }
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({ error: "file-too-large", maxMb: 100 });
          return;
        }
        res.status(400).json({ error: "upload-error" });
        return;
      }
      next();
    });
  };

  // ── REST endpoint for TEMP PDF upload (pre-login, no auth required) ─────────────
  // Stores the edited PDF in S3 under a temp key. The key is returned and stored
  // in sessionStorage (small string, no quota issues). After login + payment,
  // the server moves it to the user's permanent folder.
  const tempUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
  app.post("/api/documents/temp-upload", handleUpload(tempUpload.single("file")), async (req, res) => {
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
  app.post("/api/documents/convert-upload", handleUpload(convertUpload.single("file")), async (req, res) => {
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
        html: "text/html", txt: "text/plain", csv: "text/csv",
      };
      // CSV often arrives labelled as Excel (or octet-stream); normalise by
      // extension so LibreOffice opens it as a spreadsheet, not a broken xls.
      const csvExt = ext === "csv";
      const resolvedMime = csvExt
        ? "text/csv"
        : (mimeType === "application/octet-stream" && extMimeMap[ext]) ? extMimeMap[ext] : mimeType;
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
    png:  { ext: "png",  mime: "image/png" },
  };
  app.post("/api/convert/pdf-to/:format", handleUpload(pdfFromUpload.single("file")), async (req, res) => {
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

  // ── Image → image conversion (HEIC/WEBP → JPG/PNG) via CloudConvert ───────────
  // input_format is omitted so CloudConvert auto-detects HEIC, WEBP, etc.
  app.post("/api/convert/image-to/:format", handleUpload(pdfFromUpload.single("file")), async (req, res) => {
    const target = (req.params.format || "").toLowerCase();
    const OUT: Record<string, { ext: string; mime: string }> = {
      jpg: { ext: "jpg", mime: "image/jpeg" },
      png: { ext: "png", mime: "image/png" },
      // HEIC→PDF: CloudConvert decodes iPhone HEIC (Sharp's build can't) and
      // outputs a PDF directly.
      pdf: { ext: "pdf", mime: "application/pdf" },
    };
    const cfg = OUT[target];
    if (!cfg) { res.status(400).json({ error: `Unsupported target format: ${target}` }); return; }
    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) { res.status(500).json({ error: "CLOUDCONVERT_API_KEY not configured" }); return; }
    const file = req.file;
    if (!file) { res.status(400).json({ error: "No file" }); return; }
    try {
      const { default: CloudConvertCtor } = await import("cloudconvert");
      const cloudConvert = new (CloudConvertCtor as any)(apiKey);
      const job = await cloudConvert.jobs.create({
        tasks: {
          "import-img": { operation: "import/upload" },
          "convert": { operation: "convert", input: "import-img", output_format: cfg.ext },
          "export-result": { operation: "export/url", input: "convert" },
        },
      });
      const importTask = job.tasks.find((t: any) => t.name === "import-img");
      await cloudConvert.tasks.upload(importTask, file.buffer, file.originalname);
      const completedJob = await cloudConvert.jobs.wait(job.id);
      const exportTask = completedJob.tasks.find((t: any) => t.name === "export-result" && t.status === "finished");
      const fileResult = exportTask?.result?.files?.[0];
      if (!fileResult?.url) throw new Error("CloudConvert did not return a download URL");
      const downloaded = await fetch(fileResult.url);
      if (!downloaded.ok) throw new Error(`Download failed: ${downloaded.status}`);
      const arrayBuffer = await downloaded.arrayBuffer();
      const outName = file.originalname.replace(/\.[^.]+$/, "") + "." + cfg.ext;
      res.setHeader("Content-Type", cfg.mime);
      res.setHeader("Content-Disposition", `attachment; filename="${outName}"`);
      res.setHeader("X-Converted-Name", encodeURIComponent(outName));
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error("[ImageTo] CloudConvert error:", err);
      res.status(500).json({ error: `Conversion failed: ${(err as Error).message}` });
    }
  });

  // ── REST endpoint for PDF upload (avoids tRPC base64 size limits) ─────────────
  const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });
  app.post("/api/documents/upload", handleUpload(pdfUpload.single("file")), async (req, res) => {
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
  app.post("/api/documents/auto-save", handleUpload(pdfUpload.single("file")), async (req, res) => {
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
  app.post("/api/documents/protect", handleUpload(protectUpload.single("file")), async (req, res) => {
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
  app.post("/api/pdf/blocks", handleUpload(blocksUpload.single("file")), async (req, res) => {
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
  app.post("/api/documents/export", handleUpload(exportUpload.single("file")), async (req, res) => {
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

  // ── Presence ping (live visitors counter) ───────────────────────────────
  // Client pings every ~25 s with a sessionId + current path. Body is tiny
  // JSON, never authenticated — anyone visiting the site counts as a
  // visitor (which is the whole point). We swallow errors silently because
  // a failed ping must never spam the user's console.
  app.post("/api/presence/ping", express.json({ limit: "2kb" }), async (req, res) => {
    try {
      const { recordPing } = await import("./presence");
      const sessionId = String(req.body?.sessionId ?? "").slice(0, 128);
      const path = typeof req.body?.path === "string" ? req.body.path.slice(0, 256) : undefined;
      if (sessionId) recordPing(sessionId, path);
      res.status(204).end();
    } catch {
      res.status(204).end();
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
  // Sipay redirects them back here with request_id=… (plus error=… on KO).
  // CRITICAL: Redsys/Sipay returns to url_ok via an auto-submitted FORM POST
  // (application/x-www-form-urlencoded), NOT a GET — so request_id arrives in
  // the BODY, not the query string. We register BOTH verbs and read from both
  // places. Registering GET-only was leaving every card payment as an orphan
  // (Sipay collected the 0,50 €, the POST 404'd, the sub was never created),
  // while Apple Pay / Google Pay worked because they never 3DS-redirect.
  const handleSipayCallbackOk = async (req: any, res: any) => {
    const requestId = String(req.query.request_id ?? req.body?.request_id ?? "");
    if (!requestId) return res.redirect("/?sipay=missing_request_id");
    const startedAt = Date.now();
    try {
      const { finalizeFastpayPayment } = await import("./sipay");
      const { deviceFromUA } = await import("./telegram");
      const acceptLang = String(req.headers["accept-language"] ?? "");
      const deviceType = deviceFromUA(String(req.headers["user-agent"] ?? ""));
      const result = await finalizeFastpayPayment({ requestId, source: "callback", acceptLang, deviceType });
      if (!result.ok) {
        return res.redirect(`/?sipay=confirm_failed&detail=${encodeURIComponent(result.errorMessage ?? "unknown")}`);
      }
      // Capture the payer's country from Cloudflare's geo header for
      // revenue-by-country analytics (first payment wins).
      if (result.userId) {
        try {
          const { setUserCountryIfEmpty } = await import("../db");
          await setUserCountryIfEmpty(result.userId, String(req.headers["cf-ipcountry"] ?? ""));
        } catch {}
      }
      const txn = result.txn || requestId;
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
  };
  app.get("/api/sipay/callback/ok", handleSipayCallbackOk);
  app.post("/api/sipay/callback/ok", handleSipayCallbackOk);

  // Reconciliation cron — recovers orphan FastPay charges where Sipay
  // collected money but the redirect to /api/sipay/callback/ok never fired
  // (closed tab during 3DS, network drop, Redsys MPI redirect failure, etc.)
  // Scans fastpay_3ds_pending events from the last 24h without a matching
  // fastpay_intro_charge, then re-confirms each with Sipay and writes the
  // subscription + charge rows. Idempotent via findIntroChargeForRequest.
  //
  // Schedule on Railway every 5 minutes:
  //   curl -X POST https://editorpdf.net/api/cron/sipay-finalize-pending \
  //        -H "X-Cron-Secret: $CRON_SECRET"
  app.post("/api/cron/sipay-finalize-pending", async (req, res) => {
    const secret = String(req.headers["x-cron-secret"] ?? "");
    const { ENV } = await import("./env");
    if (!ENV.cronSecret || secret !== ENV.cronSecret) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const dry = String(req.query.dry ?? "") === "1";
    const hoursBack = Number(req.query.hours ?? 24);
    try {
      const { findPendingFastpayPayments } = await import("../db");
      const { finalizeFastpayPayment } = await import("./sipay");
      const pending = await findPendingFastpayPayments({ hoursBack, limit: 50 });

      const outcomes: Array<{ requestId: string; userId: number; result: string; error?: string }> = [];
      if (!dry) {
        for (const p of pending) {
          try {
            const r = await finalizeFastpayPayment({
              requestId: p.requestId,
              fallbackUserId: p.userId,
              source: "cron",
            });
            outcomes.push({
              requestId: p.requestId,
              userId: p.userId,
              result: r.alreadyFinalized ? "already_finalized" : r.ok ? "recovered" : "failed",
              error: r.errorMessage,
            });
          } catch (err: any) {
            outcomes.push({
              requestId: p.requestId,
              userId: p.userId,
              result: "exception",
              error: err?.message ?? String(err),
            });
          }
        }
      }
      return res.json({
        ok: true,
        dry,
        scanned: pending.length,
        outcomes,
      });
    } catch (err: any) {
      console.error("[Sipay] cron finalize-pending error:", err?.message ?? err);
      return res.status(500).json({ error: err?.message ?? String(err) });
    }
  });

  const handleSipayCallbackKo = (req: any, res: any) => {
    const error = String(req.query.error ?? req.body?.error ?? "unknown");
    console.warn("[Sipay] callback ko:", { query: req.query, body: req.body });
    return res.redirect(`/?sipay_error=${encodeURIComponent(error)}`);
  };
  app.get("/api/sipay/callback/ko", handleSipayCallbackKo);
  app.post("/api/sipay/callback/ko", handleSipayCallbackKo);

  // ── Sipay MIT-R recurring billing cron ─────────────────────────────────
  // Called by an external scheduler (Railway cron, Pingdom, etc.) once a day.
  // Auth via shared `X-Cron-Secret` header — anything else returns 401. Runs
  // in foreground (no queue) because the active sub set is small (<5k for
  // the foreseeable future) and Sipay's all-in-one MIT-R is ~300 ms each.
  // ── Recovery emails cron ──────────────────────────────────────────────────
  // "Tu archivo está listo, descárgalo" a los no-pagadores (docs pending).
  // Secuencia +1h / +24h / día-6, 1 email por usuario por corrida, para el doc
  // más reciente. Nunca a quien ya pagó ni a quien se dio de baja. Además borra
  // los docs pending de >7 días (retención real). Corre cada ~20-30 min.
  // Registrar en Railway: POST /api/cron/recovery-emails con X-Cron-Secret.
  //   ?dry=1 → no envía ni borra, solo lista a quién tocaría.
  app.post("/api/cron/recovery-emails", async (req, res) => {
    const secret = String(req.headers["x-cron-secret"] ?? "");
    const { ENV } = await import("./env");
    if (!ENV.cronSecret || secret !== ENV.cronSecret) return res.status(401).json({ error: "unauthorized" });
    const dry = req.query.dry === "1";
    try {
      const db = await import("../db");
      const { sendRecoveryEmail } = await import("../email");
      const crypto = await import("crypto");
      const now = new Date();
      const HOUR = 3600 * 1000, DAY = 24 * HOUR, RETENTION_DAYS = 7;
      const since = new Date(now.getTime() - RETENTION_DAYS * DAY);

      // Throttle: cap sends per run so we drain the backlog gradually instead of
      // blasting hundreds at once (protects domain reputation / deliverability).
      // Override with ?max=N. New daily abandons are few, so this only matters
      // for the first backlog drain.
      const MAX_PER_RUN = Math.max(1, Math.min(500, Number(req.query.max) || 50));

      const [docs, paidUsers] = await Promise.all([db.getPendingRecoveryDocs(since), db.getPaidUserIds()]);
      const seenUser = new Set<number>();
      const results: Array<{ userId: number; docId: number; email: string; stage: number; doc: string }> = [];

      for (const d of docs) {
        if (results.length >= MAX_PER_RUN) break;
        if (paidUsers.has(d.userId) || seenUser.has(d.userId)) continue; // paid / not the latest doc
        seenUser.add(d.userId);
        const age = now.getTime() - new Date(d.createdAt).getTime();
        let stage = 0;
        if (d.recoveryStage === 0 && age >= 1 * HOUR) stage = 1;
        else if (d.recoveryStage === 1 && age >= 24 * HOUR) stage = 2;
        else if (d.recoveryStage === 2 && age >= 6 * DAY) stage = 3;
        if (!stage) continue;
        // Min 12h between emails (catch-up safety so we never send 2 in a row).
        if (d.recoveryLastSentAt && now.getTime() - new Date(d.recoveryLastSentAt).getTime() < 12 * HOUR) continue;

        const lang = (d.language || "es").slice(0, 2);
        const sig = crypto.createHmac("sha256", ENV.cronSecret).update(String(d.userId)).digest("hex").slice(0, 24);
        const unsubscribeUrl = `https://editorpdf.net/api/recovery/unsubscribe?u=${d.userId}&s=${sig}`;
        // One-click auto-login link → drops the user on their documents without a
        // login wall. Signed + expires exactly when the doc is deleted (createdAt
        // + retention), so a stale link just falls back to the manual dashboard.
        const loginNext = `/${lang}/dashboard?tab=documents`;
        const loginExp = new Date(d.createdAt).getTime() + RETENTION_DAYS * DAY;
        const loginSig = crypto.createHmac("sha256", ENV.cronSecret).update(`${d.userId}.${loginExp}.${loginNext}`).digest("hex").slice(0, 32);
        const downloadUrl = `https://www.editorpdf.net/api/recovery/login?u=${d.userId}&exp=${loginExp}&next=${encodeURIComponent(loginNext)}&sig=${loginSig}`;
        const expires = new Date(new Date(d.createdAt).getTime() + RETENTION_DAYS * DAY);
        let expiresDate: string;
        try { expiresDate = new Intl.DateTimeFormat(lang, { day: "numeric", month: "long" }).format(expires); }
        catch { expiresDate = expires.toISOString().slice(0, 10); }

        results.push({ userId: d.userId, docId: d.docId, email: d.email!, stage, doc: d.docName });
        if (!dry) {
          const ok = await sendRecoveryEmail({ to: d.email!, lang, docName: d.docName, downloadUrl, unsubscribeUrl, expiresDate, stage });
          if (ok) await db.markRecoverySent(d.docId, stage, now);
        }
      }

      // Retención: borra los docs pending de >7 días (hace honesta la urgencia).
      let deletedCount = 0;
      if (!dry) { try { deletedCount = (await db.deleteExpiredPendingDocs(since)).length; } catch { /* best-effort */ } }

      console.log(`[recovery cron] ${dry ? "DRY " : ""}sent=${results.length} deleted=${deletedCount}`);
      return res.json({ dry, sent: results.length, deleted: deletedCount, results });
    } catch (err: any) {
      console.error("[recovery cron] fatal:", err?.message ?? err);
      return res.status(500).json({ error: "cron_exception", detail: err?.message ?? String(err) });
    }
  });

  // Unsubscribe from recovery emails (signed link, no auth). Handles GET (user
  // clicks the link) and POST (RFC 8058 one-click via List-Unsubscribe-Post).
  const handleRecoveryUnsub = async (req: any, res: any) => {
    try {
      const u = Number(req.query.u);
      const s = String(req.query.s ?? "");
      const { ENV } = await import("./env");
      const crypto = await import("crypto");
      const expected = crypto.createHmac("sha256", ENV.cronSecret).update(String(u)).digest("hex").slice(0, 24);
      if (!u || !s || s !== expected) { res.status(400).send("Enlace no válido"); return; }
      const db = await import("../db");
      await db.setRecoveryUnsubscribed(u);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:64px 24px;color:#0A0A0B;background:#f4f4f6;"><div style="max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:36px 28px;box-shadow:0 8px 30px rgba(10,10,11,.08);"><div style="font-size:40px;">✅</div><h2 style="margin:12px 0 6px;">Listo</h2><p style="color:#5A5A62;margin:0;">No volverás a recibir recordatorios de <b>editorpdf<span style="color:#E63946;">.net</span></b>.</p></div></body></html>`);
    } catch { res.status(500).send("Error"); }
  };
  app.get("/api/recovery/unsubscribe", handleRecoveryUnsub);
  app.post("/api/recovery/unsubscribe", handleRecoveryUnsub);

  // One-click auto-login from a recovery email (signed, expiring, single user).
  // Logs the user straight into their own account and drops them on their docs,
  // so they don't hit a login wall. Safe: HMAC-signed with CRON_SECRET (can't be
  // forged), time-limited via `exp`, `next` forced to a relative path (no open
  // redirect), timing-safe compare. On ANY failure it just sends them to the
  // dashboard to log in manually — never errors, never breaks normal auth.
  app.get("/api/recovery/login", async (req: any, res: any) => {
    const WWW = "https://www.editorpdf.net";
    const fallback = `${WWW}/es/dashboard?tab=documents`;
    try {
      const { ENV } = await import("./env");
      const crypto = await import("crypto");
      const u = Number(req.query.u);
      const exp = Number(req.query.exp);
      const sig = String(req.query.sig ?? "");
      let next = String(req.query.next ?? "/es/dashboard?tab=documents");
      // No open redirect: only same-site relative paths.
      if (!next.startsWith("/") || next.startsWith("//")) next = "/es/dashboard?tab=documents";
      const dest = `${WWW}${next}`;

      if (!u || !exp || !sig || !ENV.cronSecret) return res.redirect(dest);
      if (Date.now() > exp) return res.redirect(dest); // expired → manual login
      const expected = crypto.createHmac("sha256", ENV.cronSecret).update(`${u}.${exp}.${next}`).digest("hex").slice(0, 32);
      const ok = sig.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      if (!ok) return res.redirect(dest); // bad/tampered sig → just show the page (they log in)

      const db = await import("../db");
      const user = await db.getUserById(u);
      if (!user) return res.redirect(fallback);
      const { sdk } = await import("./sdk");
      const { getSessionCookieOptions } = await import("./cookies");
      const { COOKIE_NAME, ONE_YEAR_MS } = await import("@shared/const");
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: ONE_YEAR_MS });
      res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      return res.redirect(302, dest);
    } catch (err) {
      console.error("[recovery-login] error:", err);
      return res.redirect(fallback);
    }
  });

  // Resumen de ventas del día → Telegram. Registrar en Railway a las 23:00
  // Madrid (= 21:00 UTC en verano: cron "0 21 * * *"). ?dry=1 no envía.
  app.post("/api/cron/daily-summary", async (req, res) => {
    const secret = String(req.headers["x-cron-secret"] ?? "");
    const { ENV } = await import("./env");
    if (!ENV.cronSecret || secret !== ENV.cronSecret) return res.status(401).json({ error: "unauthorized" });
    try {
      const db = await import("../db");
      const { notifyDailySummary } = await import("./telegram");
      const now = new Date();
      const s = await db.getDailySalesSummary(now);
      const dateLabel = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long" }).format(now);
      if (req.query.dry !== "1") await notifyDailySummary({ dateLabel, ...s });
      return res.json({ ok: true, dry: req.query.dry === "1", dateLabel, ...s });
    } catch (err: any) {
      console.error("[daily-summary] error:", err?.message ?? err);
      return res.status(500).json({ error: "exception", detail: err?.message ?? String(err) });
    }
  });

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
      const { decideNextRetry, classifyDecline } = await import("./dunning");
      const now = new Date();

      // ── Barrido de bajas vencidas ─────────────────────────────────────────
      // Subs con cancelAtPeriodEnd=true cuyo periodo ya terminó → status=canceled.
      // El loop de reintentos ya las excluye (nunca se cobran); esto solo finaliza
      // su estado para que no queden colgadas en past_due/active. Respeta ?dry=1.
      const sweptCanceled = await db.sweepExpiredCancellations(now, dryRun);
      if (sweptCanceled.length) {
        console.log(`[dunning cron] bajas vencidas finalizadas → canceled (${sweptCanceled.length}): ${sweptCanceled.join(",")}`);
      }

      const due = await db.getSubsDueForRetry(now);
      // Price from site_settings so the A/B toggle drives recurring charges too.
      const priceStr = await db.getSiteSetting?.("subscription_price_eur").catch(() => null);
      const priceEur = Number(priceStr ?? "19.95");
      const amountCents = Math.round(priceEur * 100);
      const results: Array<{ userId: number; subId: number; ok: boolean; action?: string; code?: string; nextRetryAt?: string | null; reason?: string }> = [];

      for (const sub of due) {
        // Idempotencia: solo UNA corrida procesa una sub. Si no ganamos el lock,
        // otra ya está en ello → saltar (evita cargos dobles si el job se solapa).
        if (!dryRun) {
          const claimed = await db.claimSubForDunning(sub.id, now);
          if (!claimed) { results.push({ userId: sub.userId, subId: sub.id, ok: false, reason: "locked" }); continue; }
        }
        const anchor = sub.currentPeriodEnd ?? now;       // vencimiento = día 0 del ciclo
        const paymentMethod = sub.sipayProvider ?? "mit";
        const order = `mit-${sub.userId}-${Date.now()}`;
        const chargeStart = Date.now();
        try {
          if (dryRun) {
            // No cobramos: solo mostramos a quién tocaría cobrar ahora.
            results.push({ userId: sub.userId, subId: sub.id, ok: true, action: "dry-run", code: sub.lastDeclineCode ?? undefined });
            continue;
          }
          const result = await createMITRecurring({ amountCents, token: sub.sipayToken!, order, custom_01: String(sub.userId) });
          const data = result.data as any;
          // El código de denegación Redsys llega SIEMPRE en data.payload.code.
          const code: string = String(data?.payload?.code ?? data?.code ?? "");
          const txn: string = data?.payload?.transaction_id ?? "";
          const masked: string = data?.payload?.masked_card ?? sub.sipayMaskedCard ?? "";
          const success = result.ok && code === "0" && !!txn;

          // Traza de intento (original o reintento), pase lo que pase.
          await db.recordPaymentAttempt({ subscriptionId: sub.id, userId: sub.userId, paymentMethod, amountCents, responseCode: success ? "0" : code, success, rawResponse: data ?? result.raw });

          if (success) {
            const newPeriodEnd = new Date(anchor.getTime() + 30 * 24 * 60 * 60 * 1000);
            await db.upsertSubscription({
              userId: sub.userId, plan: "monthly", status: "active",
              currentPeriodStart: anchor, currentPeriodEnd: newPeriodEnd,
              sipayTransactionId: txn, sipayOrder: order, sipayMaskedCard: masked,
              // reset de dunning al cobrar OK
              retryCount: 0, nextRetryAt: null, lastDeclineCode: null, declineCategory: null,
              renewalAttempts: 0, nextRenewalAt: null,
            });
            await db.recordCharge({ userId: sub.userId, provider: "mit", amountCents, sipayTransactionId: txn, sipayOrder: order, sipayMaskedCard: masked, status: "ok" });
            await db.recordWebhookEvent({ provider: "sipay", eventType: "mit_charge_ok", eventId: txn || order, status: "ok", durationMs: Date.now() - chargeStart, payload: data });
            results.push({ userId: sub.userId, subId: sub.id, ok: true, action: "charged", code: "0" });
          } else {
            // Reclasificar el código de ESTA respuesta (un técnico puede volverse
            // 190; un soft puede volverse hard → cancelar aquí mismo).
            const decision = decideNextRetry({ code, retryCount: sub.retryCount ?? 0, anchor, lastAttemptAt: now });
            if (classifyDecline(code).kind === "unmapped") {
              await db.recordWebhookEvent({ provider: "sipay", eventType: "mit_unmapped_code", eventId: order, status: "error", errorMessage: `unmapped_code_${code}`, durationMs: Date.now() - chargeStart, payload: data });
            }
            const detail = data?.payload?.detail ?? data?.detail ?? "unknown";
            await db.recordCharge({ userId: sub.userId, provider: "mit", amountCents, sipayOrder: order, status: "failed", errorDetail: `${code}:${String(detail)}`.slice(0, 500) });
            if (decision.action === "cancel") {
              await db.upsertSubscription({ userId: sub.userId, status: "canceled", lastDeclineCode: code, declineCategory: decision.category, nextRetryAt: null });
              results.push({ userId: sub.userId, subId: sub.id, ok: false, action: "canceled", code, reason: decision.reason });
            } else {
              await db.upsertSubscription({ userId: sub.userId, status: "past_due", retryCount: decision.retryNumber, nextRetryAt: decision.nextRetryAt, lastDeclineCode: code, declineCategory: decision.category });
              results.push({ userId: sub.userId, subId: sub.id, ok: false, action: "retry_scheduled", code, nextRetryAt: decision.nextRetryAt.toISOString() });
            }
            await db.recordWebhookEvent({ provider: "sipay", eventType: "mit_charge_failed", eventId: order, status: "error", errorMessage: `${code}:${String(detail)}`, durationMs: Date.now() - chargeStart, payload: data ?? result.raw });
          }
        } catch (err: any) {
          const msg = err?.message ?? String(err);
          // Excepción / red / timeout → código técnico "TECH": el clasificador
          // programa +24h (NO se reintenta a diario).
          try {
            const decision = decideNextRetry({ code: "TECH", retryCount: sub.retryCount ?? 0, anchor, lastAttemptAt: now });
            await db.recordPaymentAttempt({ subscriptionId: sub.id, userId: sub.userId, paymentMethod, amountCents, responseCode: "TECH", success: false, rawResponse: { error: msg } });
            if (decision.action === "cancel") {
              await db.upsertSubscription({ userId: sub.userId, status: "canceled", lastDeclineCode: "TECH", declineCategory: decision.category, nextRetryAt: null });
            } else {
              await db.upsertSubscription({ userId: sub.userId, status: "past_due", retryCount: decision.retryNumber, nextRetryAt: decision.nextRetryAt, lastDeclineCode: "TECH", declineCategory: decision.category });
            }
          } catch { /* best-effort */ }
          await db.recordWebhookEvent({ provider: "sipay", eventType: "mit_cron_exception", eventId: order, status: "error", errorMessage: msg, durationMs: Date.now() - chargeStart });
          results.push({ userId: sub.userId, subId: sub.id, ok: false, action: "exception", reason: msg });
        } finally {
          if (!dryRun) { try { await db.clearDunningLock(sub.id); } catch { /* best-effort */ } }
        }
      }
      const succeeded = results.filter((r) => r.ok).length;
      const failed = results.length - succeeded;
      console.log(`[dunning cron] processed=${results.length} ok=${succeeded} fail=${failed} duration=${Date.now() - startedAt}ms dryRun=${dryRun}`);
      return res.json({ processed: results.length, succeeded, failed, sweptCanceled: sweptCanceled.length, sweptCanceledIds: sweptCanceled, durationMs: Date.now() - startedAt, dryRun, results });
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

  // Sentry's Express error handler must run AFTER every route has had
  // a chance to register but BEFORE the response is sent, so it can
  // capture errors thrown from any route/middleware above it. The SDK
  // is a no-op when SENTRY_DSN isn't set.
  Sentry.setupExpressErrorHandler(app);

  const PORT = parseInt(process.env.PORT || "8080", 10);
  const port = await findAvailablePort(PORT);

  if (port !== PORT) {
    console.log(`Port ${PORT} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
    // Internal cron scheduler (daily Telegram summary + recovery emails). Only
    // in production so dev doesn't send real emails/notifications. No-ops if
    // CRON_SECRET is unset. Reuses the /api/cron/* endpoints over localhost.
    if (process.env.NODE_ENV === "production") {
      import("./scheduler")
        .then(({ startInternalSchedulers }) => startInternalSchedulers(port))
        .catch((err) => console.error("[scheduler] failed to start:", err));
    }
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
