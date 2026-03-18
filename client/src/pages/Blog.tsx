import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Clock, ArrowRight, Rss } from "lucide-react";

export default function Blog() {
  const [, navigate] = useLocation();
  const { data: posts = [], isLoading } = trpc.blog.list.useQuery();

  // SEO meta tags
  useEffect(() => {
    document.title = "Blog — editPDF | Guías, tutoriales y consejos sobre PDF";
    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("description", "Aprende a editar, convertir, firmar y proteger PDFs con nuestras guías paso a paso. Tutoriales gratuitos para sacar el máximo partido a editPDF.online.");
    setMeta("og:title", "Blog — editPDF | Guías y tutoriales sobre PDF", true);
    setMeta("og:description", "Guías, tutoriales y consejos sobre cómo trabajar con PDFs online. Todo lo que necesitas saber sobre edición, conversión y firma de documentos.", true);
    setMeta("og:type", "website", true);
    setMeta("og:url", "https://editpdf.online/blog", true);
    return () => {
      document.title = "editPDF — Free Online PDF Editor";
    };
  }, []);

  const categoryColors: Record<string, string> = {
    guides: "bg-blue-100 text-blue-700",
    tutorials: "bg-green-100 text-green-700",
    tips: "bg-amber-100 text-amber-700",
    news: "bg-purple-100 text-purple-700",
    comparisons: "bg-rose-100 text-rose-700",
  };

  const categoryLabels: Record<string, string> = {
    guides: "Guía",
    tutorials: "Tutorial",
    tips: "Consejos",
    news: "Noticias",
    comparisons: "Comparativas",
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-20 text-center" style={{ background: "linear-gradient(135deg, oklch(0.18 0.04 250) 0%, oklch(0.22 0.06 260) 100%)" }}>
          <div className="container max-w-3xl">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Rss size={20} className="text-blue-400" />
              <span className="text-blue-400 text-sm font-medium uppercase tracking-wider">Blog</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
              Guías y tutoriales sobre PDF
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Todo lo que necesitas saber para editar, convertir, firmar y proteger tus documentos PDF online, sin instalar nada.
            </p>
          </div>
        </section>

        {/* Articles grid */}
        <section className="py-12 md:py-16">
          <div className="container max-w-6xl">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-card h-64 animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <Rss size={48} className="text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Próximamente</h2>
                <p className="text-muted-foreground">Estamos preparando contenido de calidad. ¡Vuelve pronto!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    className="group rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex flex-col overflow-hidden"
                    onClick={() => navigate(`/blog/${post.slug}`)}
                  >
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[post.category] ?? "bg-muted text-muted-foreground"}`}>
                          {categoryLabels[post.category] ?? post.category}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock size={11} />
                          {post.readTime} min
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      <p className="text-sm text-muted-foreground flex-1 line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <time className="text-xs text-muted-foreground">
                          {new Date(post.publishedAt).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </time>
                        <span className="flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">
                          Leer más <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        {posts.length > 0 && (
          <section className="py-12 border-t border-border">
            <div className="container max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-foreground mb-3">¿Listo para editar tu PDF?</h2>
              <p className="text-muted-foreground mb-6">
                Prueba editPDF gratis — sin registro, sin instalación, directamente en tu navegador.
              </p>
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "oklch(0.55 0.22 260)" }}
              >
                Empezar gratis <ArrowRight size={16} />
              </button>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
