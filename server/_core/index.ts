import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import Stripe from "stripe";
import multer from "multer";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerGoogleOAuthRoutes } from "./googleOauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getUserById, upsertSubscription, getBlogPosts, createDocument } from "../db";
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

async function findAvailablePort(startPort: number = 3000): Promise<number> {
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

  // ── Stripe Webhook (MUST be before express.json) ───────────────────────────────────────────
  // Prefer STRIPE_LIVE_SECRET_KEY (user-provided) over system default
  const stripe = new Stripe(
    process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "",
    { apiVersion: "2026-02-25.clover" }
  );

  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err) {
      console.error("[Webhook] Signature verification failed:", err);
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      return;
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      res.json({ verified: true });
      return;
    }

    console.log(`[Webhook] Event: ${event.type} | ID: ${event.id}`);

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.user_id || "0");
        const plan = (session.metadata?.plan || "trial") as "trial" | "monthly";

        if (userId) {
          const user = await getUserById(userId);
          if (user) {
            const now = new Date();
            const periodEnd =
              plan === "trial"
                ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            await upsertSubscription({
              userId,
              stripeCustomerId: (session.customer as string) || undefined,
              stripeSubscriptionId: (session.subscription as string) || undefined,
              stripePriceId: undefined,
              stripeSessionId: session.id,
              plan,
              status: "active",
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
            });
            console.log(`[Webhook] Subscription activated for user ${userId}, plan: ${plan}`);
          }
        }
      } else if (event.type === "customer.subscription.updated") {
        const sub = event.data.object as Stripe.Subscription;
        const userId = parseInt(sub.metadata?.user_id || "0");
        if (userId) {
          await upsertSubscription({
            userId,
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            stripePriceId: sub.items.data[0]?.price?.id || undefined,
            stripeSessionId: undefined,
            plan: "monthly",
            status: sub.status as "active" | "canceled" | "past_due" | "trialing" | "incomplete",
            currentPeriodStart: new Date((sub as any).current_period_start * 1000),
            currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          });
        }
      } else if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as Stripe.Subscription;
        const userId = parseInt(sub.metadata?.user_id || "0");
        if (userId) {
          await upsertSubscription({
            userId,
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            stripePriceId: undefined,
            stripeSessionId: undefined,
            plan: "monthly",
            status: "canceled",
            currentPeriodStart: undefined,
            currentPeriodEnd: undefined,
            cancelAtPeriodEnd: false,
          });
        }
      }
    } catch (err) {
      console.error("[Webhook] Error processing event:", err);
    }

    res.json({ received: true });
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback (Manus)
  registerOAuthRoutes(app);
  // Google OAuth direct routes: /api/auth/google and /api/auth/google/callback
  registerGoogleOAuthRoutes(app);

  // Sitemap.xml — dynamic, includes blog posts
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const posts = await getBlogPosts(true);
      const base = "https://editpdf.online";
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
      const doc = await createDocument({
        userId,
        name,
        fileKey: permanentKey,
        fileUrl: permanentUrl,
        fileSize: buffer.length,
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
      const doc = await createDocument({
        userId,
        name,
        fileKey: key,
        fileUrl: url,
        fileSize: file.size,
        folderId,
      });
      res.json({ success: true, doc });
    } catch (err) {
      console.error("[Upload] Error:", err);
      res.status(500).json({ error: "Upload failed" });
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
      // where pikepdf is installed (not the Manus agent's Python 3.13 venv).
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
      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const { tmpdir } = await import("os");
      const { join } = await import("path");
      const { writeFile, readFile, unlink } = await import("fs/promises");
      const execFileAsync = promisify(execFile);
      const ts = Date.now();
      const tmpIn = join(tmpdir(), `export_in_${ts}.pdf`);
      const tmpOut = join(tmpdir(), `export_out_${ts}.${format}`);
      const tmpPy = join(tmpdir(), `export_${ts}.py`);
      await writeFile(tmpIn, file.buffer);
      let pyLines: string[];
      if (format === "docx") {
        pyLines = [
          "from pdf2docx import Converter",
          "import sys",
          "cv = Converter(sys.argv[1])",
          "cv.convert(sys.argv[2], start=0, end=None)",
          "cv.close()",
        ];
      } else if (format === "xlsx") {
        pyLines = [
          "import fitz, openpyxl, sys",
          "doc = fitz.open(sys.argv[1])",
          "wb = openpyxl.Workbook()",
          "ws = wb.active",
          "for page_num in range(len(doc)):",
          "    page = doc[page_num]",
          "    tabs = page.find_tables()",
          "    found = False",
          "    for tab in tabs:",
          "        found = True",
          "        for row in tab.extract():",
          "            ws.append([cell if cell else '' for cell in row])",
          "    if not found:",
          "        text = page.get_text()",
          "        for line in text.split('\\n'):",
          "            if line.strip():",
          "                ws.append([line.strip()])",
          "wb.save(sys.argv[2])",
        ];
      } else {
        // pptx via LibreOffice impress_pdf_import
        pyLines = [
          "import subprocess, sys, os, shutil, tempfile, glob",
          "tmpdir = tempfile.mkdtemp()",
          "subprocess.run(['libreoffice', '--headless', '--norestore', '--nologo',",
          "    '--infilter=impress_pdf_import', '--convert-to', 'pptx',",
          "    '--outdir', tmpdir, sys.argv[1]], check=True)",
          "files = glob.glob(os.path.join(tmpdir, '*.pptx'))",
          "if files: shutil.copy(files[0], sys.argv[2])",
          "shutil.rmtree(tmpdir, ignore_errors=True)",
        ];
      }
      await writeFile(tmpPy, pyLines.join("\n"));
      const cleanEnv = { ...process.env };
      delete cleanEnv.PYTHONHOME;
      delete cleanEnv.PYTHONPATH;
      delete cleanEnv.NUITKA_PYTHONPATH;
      try {
        await execFileAsync("python3", [tmpPy, tmpIn, tmpOut], { timeout: 120000, env: cleanEnv });
        const outputBytes = await readFile(tmpOut);
        const originalName = (req.body.filename as string) || file.originalname || "document.pdf";
        const baseName = originalName.replace(/\.pdf$/i, "");
        const mimeTypes: Record<string, string> = {
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        };
        res.setHeader("Content-Type", mimeTypes[format]);
        res.setHeader("Content-Disposition", `attachment; filename="${baseName}.${format}"`);
        res.send(outputBytes);
      } finally {
        unlink(tmpIn).catch(() => {});
        unlink(tmpOut).catch(() => {});
        unlink(tmpPy).catch(() => {});
      }
    } catch (err) {
      console.error("[Export] Error:", err);
      res.status(500).json({ error: "Failed to export PDF" });
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

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
