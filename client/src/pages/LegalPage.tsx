/* =============================================================
   EditorPDF — Dynamic legal page with i18n support
   Fetches slug-{lang} first, falls back to slug (Spanish default)
   ============================================================= */
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface LegalPageProps {
  slug: string;
}

export default function LegalPage({ slug }: LegalPageProps) {
  const { lang } = useLanguage();
  // Try language-specific slug first (e.g. "terms-en"), fall back to base slug ("terms" = Spanish)
  const localizedSlug = lang === "es" ? slug : `${slug}-${lang}`;
  const { data: localizedPage, isLoading: loadingLocalized } = trpc.legal.get.useQuery({ slug: localizedSlug }, { enabled: lang !== "es" });
  const { data: fallbackPage, isLoading: loadingFallback } = trpc.legal.get.useQuery({ slug });

  const page = (lang !== "es" && localizedPage) ? localizedPage : fallbackPage;
  const isLoading = lang !== "es" ? (loadingLocalized || (!localizedPage && loadingFallback)) : loadingFallback;

  const defaultTitles: Record<string, Record<string, string>> = {
    es: { privacy: "Política de Privacidad", terms: "Términos de Servicio", cookies: "Política de Cookies", legal: "Aviso Legal", gdpr: "RGPD", refund: "Política de Reembolso" },
    en: { privacy: "Privacy Policy", terms: "Terms of Service", cookies: "Cookie Policy", legal: "Legal Notice", gdpr: "GDPR Compliance", refund: "Refund Policy" },
  };

  const titles = defaultTitles[lang] ?? defaultTitles.en ?? {};
  const title = page?.title ?? titles[slug] ?? "Legal";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-3xl py-12">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-slate-100 rounded-xl w-1/2" />
            <div className="h-4 bg-slate-100 rounded-xl w-full" />
            <div className="h-4 bg-slate-100 rounded-xl w-5/6" />
            <div className="h-4 bg-slate-100 rounded-xl w-4/5" />
          </div>
        ) : page ? (
          <article>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">{title}</h1>
            {page.updatedAt && (
              <p className="text-sm text-slate-400 mb-8">
                {lang === "es" ? "Última actualización" : "Last updated"}: {new Date(page.updatedAt).toLocaleDateString()}
              </p>
            )}
            <div
              className="prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-green-700"
              dangerouslySetInnerHTML={{ __html: contentToHtml(page.content ?? "") }}
            />
          </article>
        ) : (
          <div className="text-center py-20">
            <FileText size={48} className="text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-600 mb-2">{title}</h2>
            <p className="text-slate-400">
              {lang === "es" ? "Esta página aún no tiene contenido." : "This page has no content yet."}
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

/** If content already contains HTML tags, return as-is; otherwise run simple Markdown conversion */
function contentToHtml(content: string): string {
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }
  return content
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*<\/li>)/, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[h|u|l|p])(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}
