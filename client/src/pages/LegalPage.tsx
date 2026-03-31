/* =============================================================
   CloudPDF — Página legal dinámica
   Renderiza contenido Markdown desde la base de datos
   ============================================================= */
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileText } from "lucide-react";

interface LegalPageProps {
  slug: string;
}

export default function LegalPage({ slug }: LegalPageProps) {
  const { data: page, isLoading } = trpc.legal.get.useQuery({ slug });

  const defaultTitles: Record<string, string> = {
    privacy: "Política de Privacidad",
    terms: "Términos de Uso y Contrato",
    cookies: "Política de Cookies",
    legal: "Aviso Legal",
  };

  const title = page?.title ?? defaultTitles[slug] ?? "Página legal";

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
                Última actualización: {new Date(page.updatedAt).toLocaleDateString("es-ES")}
              </p>
            )}
            <div
              className="prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-blue-600"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(page.content ?? "") }}
            />
          </article>
        ) : (
          <div className="text-center py-20">
            <FileText size={48} className="text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-600 mb-2">{title}</h2>
            <p className="text-slate-400">Esta página aún no tiene contenido.</p>
            <p className="text-slate-400 text-sm mt-1">
              El administrador puede añadir contenido desde el panel de administración.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

// Simple Markdown to HTML converter (basic)
function markdownToHtml(md: string): string {
  return md
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
