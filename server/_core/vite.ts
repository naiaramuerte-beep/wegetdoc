import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { brandName, brandDomain } from "../brand";

const FAVICON_CLOUDPDF = `<link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />
    <link rel="icon" type="image/png" sizes="256x256" href="/favicon-256.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />`;

const FAVICON_FASTDOC = `<link rel="icon" type="image/svg+xml" href="/favicon-fastdoc.svg" />`;

const faviconLinks = brandName === "FastDoc" ? FAVICON_FASTDOC : FAVICON_CLOUDPDF;

const TRACKING_CLOUDPDF = `<!-- Google Consent Mode v2 — MUST run before gtag config -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('consent', 'default', {
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'analytics_storage': 'denied'
      });
      gtag('set', 'url_passthrough', true);
      (function() {
        try {
          var consent = localStorage.getItem('cloudpdf_cookie_consent');
          if (consent === 'all') {
            gtag('consent', 'update', {
              'ad_storage': 'granted',
              'ad_user_data': 'granted',
              'ad_personalization': 'granted',
              'analytics_storage': 'granted'
            });
          }
        } catch(e) {}
      })();
    </script>
    <!-- Google tag (gtag.js) — Analytics G-XBHZ3TMG7K + Ads AW-18038662610 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18038662610"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'AW-18038662610');
      gtag('config', 'G-XBHZ3TMG7K');
    </script>`;

const trackingScripts = brandName === "FastDoc" ? "" : TRACKING_CLOUDPDF;

const isFastDoc = brandName === "FastDoc";
const pageTitle = isFastDoc
  ? `Online PDF Editor – Edit, Sign & Convert PDF | ${brandName}`
  : `Free Online PDF Editor – Edit, Sign & Convert PDF | ${brandName}`;
const pageDescription = isFastDoc
  ? "Edit PDF files online. Add text, signatures, images and annotations. Convert PDF to Word, JPG, Excel. Works on any device."
  : "Edit PDF files online for free. Add text, signatures, images and annotations. Convert PDF to Word, JPG, Excel. No installation needed. Works on any device.";
const pageKeywords = isFastDoc
  ? "edit PDF online, PDF editor, PDF to Word, sign PDF online, convert PDF, merge PDF, compress PDF"
  : "edit PDF online, free PDF editor, PDF to Word, sign PDF online, convert PDF, merge PDF, compress PDF";

function replaceBrandPlaceholders(html: string): string {
  return html
    .replaceAll("%%BRAND_NAME%%", brandName)
    .replaceAll("%%BRAND_DOMAIN%%", brandDomain)
    .replaceAll("%%FAVICON_LINKS%%", faviconLinks)
    .replaceAll("%%TRACKING_SCRIPTS%%", trackingScripts)
    .replaceAll("%%PAGE_TITLE%%", pageTitle)
    .replaceAll("%%PAGE_DESCRIPTION%%", pageDescription)
    .replaceAll("%%PAGE_KEYWORDS%%", pageKeywords);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(replaceBrandPlaceholders(page));
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  const indexPath = path.resolve(distPath, "index.html");
  app.use("*", (_req, res) => {
    const html = fs.readFileSync(indexPath, "utf-8");
    res.status(200).set({ "Content-Type": "text/html" }).end(replaceBrandPlaceholders(html));
  });
}
