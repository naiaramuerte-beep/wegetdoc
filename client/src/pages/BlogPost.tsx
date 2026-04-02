import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import DOMPurify from "dompurify";
import { trpc } from "@/lib/trpc";
import { brandName } from "@/lib/brand";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Clock, ArrowLeft, ArrowRight, Calendar, Tag } from "lucide-react";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();

  const { data: post, isLoading, error } = trpc.blog.post.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const { data: allPosts = [] } = trpc.blog.list.useQuery();
  const relatedPosts = allPosts.filter((p) => p.slug !== slug).slice(0, 3);

  // Dynamic SEO meta tags + JSON-LD
  useEffect(() => {
    if (!post) return;

    const title = post.metaTitle || post.title;
    const description = post.metaDescription || post.excerpt;
    const url = `https://cloud-pdf.net/blog/${post.slug}`;

    document.title = `${title} | ${brandName} Blog`;

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

    setMeta("description", description);
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:type", "article", true);
    setMeta("og:url", url, true);
    setMeta("og:site_name", brandName, true);
    setMeta("article:published_time", new Date(post.publishedAt).toISOString(), true);
    setMeta("article:modified_time", new Date(post.updatedAt).toISOString(), true);
    if (post.tags) setMeta("article:tag", post.tags, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);

    // JSON-LD Article schema (GEO/SEO)
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": post.title,
      "description": description,
      "url": url,
      "datePublished": new Date(post.publishedAt).toISOString(),
      "dateModified": new Date(post.updatedAt).toISOString(),
      "author": {
        "@type": "Organization",
        "name": brandName,
        "url": "https://cloud-pdf.net"
      },
      "publisher": {
        "@type": "Organization",
        "name": brandName,
        "url": "https://cloud-pdf.net",
        "logo": {
          "@type": "ImageObject",
          "url": "https://cloud-pdf.net/favicon.ico"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": url
      },
      "keywords": post.tags ?? "",
      "articleSection": post.category,
      "inLanguage": "es",
      "timeRequired": `PT${post.readTime}M`,
    };

    let scriptEl = document.querySelector('script[data-blog-jsonld]') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.setAttribute("type", "application/ld+json");
      scriptEl.setAttribute("data-blog-jsonld", "true");
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = `${brandName} — Online PDF Editor`;
      scriptEl?.remove();
    };
  }, [post]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Artículo no encontrado</h1>
          <p className="text-muted-foreground mb-6">El artículo que buscas no existe o ha sido eliminado.</p>
          <button
            onClick={() => navigate("/blog")}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft size={16} /> Volver al blog
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const tags = post.tags ? post.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Article header */}
        <header className="py-12 md:py-16 border-b border-border" style={{ background: "linear-gradient(135deg, oklch(0.18 0.04 250) 0%, oklch(0.22 0.06 260) 100%)" }}>
          <div className="container max-w-3xl">
            <button
              onClick={() => navigate("/blog")}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6"
            >
              <ArrowLeft size={14} /> Volver al blog
            </button>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 capitalize">
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock size={12} /> {post.readTime} min de lectura
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar size={12} />
                {new Date(post.publishedAt).toLocaleDateString("es-ES", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
              {post.title}
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">{post.excerpt}</p>
          </div>
        </header>

        {/* Article body */}
        <div className="py-10 md:py-14">
          <div className="container max-w-3xl">
            <div
              className="prose prose-slate max-w-none text-foreground
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-foreground
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-foreground [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-foreground
                [&_p]:mb-4 [&_p]:leading-relaxed [&_p]:text-foreground/90
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul>li]:mb-1
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol>li]:mb-1
                [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-6
                [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4
                [&_img]:rounded-xl [&_img]:max-w-full [&_img]:my-6 [&_img]:shadow-md
                [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:opacity-80
                [&_strong]:font-semibold [&_strong]:text-foreground
                [&_hr]:border-border [&_hr]:my-8
                [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-muted [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:p-2"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
            />

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mt-10 pt-6 border-t border-border">
                <Tag size={14} className="text-muted-foreground" />
                {tags.map((tag) => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* CTA */}
            <div
              className="mt-10 rounded-2xl p-6 md:p-8 text-center"
              style={{ background: "linear-gradient(135deg, oklch(0.18 0.04 250) 0%, oklch(0.22 0.06 260) 100%)" }}
            >
              <h3 className="text-xl font-bold text-white mb-2">¿Listo para editar tu PDF?</h3>
              <p className="text-slate-300 mb-5 text-sm">
                Prueba {brandName} — sin registro, sin instalación, directamente en tu navegador.
              </p>
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                style={{ background: "oklch(0.55 0.22 260)" }}
              >
                Editar PDF ahora <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Related posts */}
        {relatedPosts.length > 0 && (
          <section className="py-10 border-t border-border">
            <div className="container max-w-6xl">
              <h2 className="text-xl font-bold text-foreground mb-6">Artículos relacionados</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {relatedPosts.map((p) => (
                  <article
                    key={p.id}
                    className="group rounded-xl border border-border bg-card hover:shadow-md transition-all cursor-pointer p-5"
                    onClick={() => navigate(`/blog/${p.slug}`)}
                  >
                    <span className="text-xs text-muted-foreground capitalize">{p.category}</span>
                    <h3 className="font-semibold text-foreground mt-1 mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {p.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
                    <span className="flex items-center gap-1 text-xs text-primary mt-3 group-hover:gap-2 transition-all">
                      Leer <ArrowRight size={12} />
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

// Sanitize blog HTML with DOMPurify (OWASP-compliant)
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
      "ul", "ol", "li", "a", "strong", "em", "b", "i", "u", "s",
      "blockquote", "pre", "code", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span", "sub", "sup", "mark",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "title", "width", "height",
      "class", "id", "colspan", "rowspan", "loading",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
