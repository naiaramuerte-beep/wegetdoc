import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import RichTextEditor from "@/components/RichTextEditor";
import { toast } from "sonner";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
  Globe,
  Clock,
  Tag,
  FileText,
} from "lucide-react";

type BlogPost = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  category: string;
  tags: string | null;
  readTime: number;
  published: boolean;
  publishedAt: Date;
  updatedAt: Date;
};

type EditorMode = "list" | "create" | "edit";

const CATEGORIES = [
  "guides",
  "tutorials",
  "tips",
  "news",
  "comparisons",
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function estimateReadTime(html: string) {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function BlogAdmin() {
  const [mode, setMode] = useState<EditorMode>("list");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    metaTitle: "",
    metaDescription: "",
    category: "guides",
    tags: "",
    readTime: 5,
    published: false,
  });

  const utils = trpc.useUtils();
  const { data: posts = [], isLoading } = trpc.admin.blogPosts.useQuery();

  const createMutation = trpc.admin.createBlogPost.useMutation({
    onSuccess: () => {
      toast.success("Artículo creado correctamente");
      utils.admin.blogPosts.invalidate();
      setMode("list");
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.admin.updateBlogPost.useMutation({
    onSuccess: () => {
      toast.success("Artículo actualizado");
      utils.admin.blogPosts.invalidate();
      setMode("list");
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.admin.deleteBlogPost.useMutation({
    onSuccess: () => {
      toast.success("Artículo eliminado");
      utils.admin.blogPosts.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const togglePublishMutation = trpc.admin.updateBlogPost.useMutation({
    onSuccess: () => utils.admin.blogPosts.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      metaTitle: "",
      metaDescription: "",
      category: "guides",
      tags: "",
      readTime: 5,
      published: false,
    });
    setEditingPost(null);
  }

  function openCreate() {
    resetForm();
    setMode("create");
  }

  function openEdit(post: BlogPost) {
    setEditingPost(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      metaTitle: post.metaTitle ?? "",
      metaDescription: post.metaDescription ?? "",
      category: post.category,
      tags: post.tags ?? "",
      readTime: post.readTime,
      published: post.published,
    });
    setMode("edit");
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: f.slug || slugify(title),
      metaTitle: f.metaTitle || title,
    }));
  }

  function handleContentChange(html: string) {
    setForm((f) => ({
      ...f,
      content: html,
      readTime: estimateReadTime(html),
    }));
  }

  function handleSubmit() {
    if (!form.title || !form.slug || !form.excerpt || !form.content) {
      toast.error("Título, slug, extracto y contenido son obligatorios");
      return;
    }
    if (mode === "edit" && editingPost) {
      updateMutation.mutate({ id: editingPost.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ─── LIST VIEW ────────────────────────────────────────────────
  if (mode === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Blog</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {posts.length} artículo{posts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus size={16} />
            Nuevo artículo
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay artículos todavía</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer artículo para empezar a posicionar en buscadores e IAs.
              </p>
              <Button onClick={openCreate} className="gap-2">
                <Plus size={16} />
                Crear primer artículo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {posts.map((post) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground truncate">{post.title}</span>
                      <Badge variant={post.published ? "default" : "secondary"} className="shrink-0 text-xs">
                        {post.published ? "Publicado" : "Borrador"}
                      </Badge>
                      <Badge variant="outline" className="shrink-0 text-xs capitalize">
                        {post.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe size={11} />
                        /{post.slug}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {post.readTime} min
                      </span>
                      <span>
                        {new Date(post.publishedAt).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        togglePublishMutation.mutate({
                          id: post.id,
                          published: !post.published,
                        })
                      }
                      title={post.published ? "Despublicar" : "Publicar"}
                    >
                      {post.published ? <EyeOff size={15} /> : <Eye size={15} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(post as BlogPost)}
                    >
                      <Edit2 size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(post.id)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete confirmation */}
        <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar artículo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El artículo se eliminará permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ─── CREATE / EDIT VIEW ───────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => { setMode("list"); resetForm(); }} className="gap-2">
          <ArrowLeft size={16} />
          Volver
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">
            {mode === "create" ? "Nuevo artículo" : "Editar artículo"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="published"
              checked={form.published}
              onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
            />
            <Label htmlFor="published" className="text-sm cursor-pointer">
              {form.published ? "Publicado" : "Borrador"}
            </Label>
          </div>
          <Button onClick={handleSubmit} disabled={isSaving} className="gap-2">
            <Save size={16} />
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="title">Título del artículo *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Cómo editar un PDF online gratis en 2025"
                  className="mt-1 text-lg font-semibold"
                />
              </div>
              <div>
                <Label htmlFor="excerpt">Extracto / Descripción corta *</Label>
                <Textarea
                  id="excerpt"
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Resumen de 1-2 frases que aparece en la lista del blog y en redes sociales..."
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contenido</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <RichTextEditor
                content={form.content}
                onChange={handleContentChange}
                placeholder="Escribe el contenido del artículo aquí. Puedes usar headings, listas, imágenes, enlaces..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* URL & Slug */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe size={14} />
                URL del artículo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              <div>
                <Label htmlFor="slug" className="text-xs text-muted-foreground">Slug (URL)</Label>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground shrink-0">/blog/</span>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                    placeholder="como-editar-pdf-online"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={11} />
                <span>{form.readTime} min de lectura (calculado automáticamente)</span>
              </div>
            </CardContent>
          </Card>

          {/* Category & Tags */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Tag size={14} />
                Categoría y etiquetas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div>
                <Label htmlFor="category" className="text-xs text-muted-foreground">Categoría</Label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="tags" className="text-xs text-muted-foreground">
                  Etiquetas (separadas por comas)
                </Label>
                <Input
                  id="tags"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="pdf, editor, online, gratis"
                  className="mt-1 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">SEO / Meta tags</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div>
                <Label htmlFor="metaTitle" className="text-xs text-muted-foreground">
                  Meta título
                  <span className="ml-1 text-muted-foreground/60">({form.metaTitle.length}/60)</span>
                </Label>
                <Input
                  id="metaTitle"
                  value={form.metaTitle}
                  onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))}
                  placeholder="Cómo editar PDF online gratis | editPDF"
                  className="mt-1 text-sm"
                  maxLength={70}
                />
              </div>
              <div>
                <Label htmlFor="metaDescription" className="text-xs text-muted-foreground">
                  Meta descripción
                  <span className="ml-1 text-muted-foreground/60">({form.metaDescription.length}/160)</span>
                </Label>
                <Textarea
                  id="metaDescription"
                  value={form.metaDescription}
                  onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
                  placeholder="Aprende a editar cualquier PDF online sin instalar nada. Guía paso a paso con editPDF.online..."
                  className="mt-1 text-sm resize-none"
                  rows={3}
                  maxLength={170}
                />
              </div>
              {/* Preview */}
              {(form.metaTitle || form.title) && (
                <div className="rounded-md border border-border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Vista previa Google</p>
                  <p className="text-sm font-medium text-blue-600 truncate">
                    {form.metaTitle || form.title}
                  </p>
                  <p className="text-xs text-green-700">editpdf.online/blog/{form.slug || "slug"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {form.metaDescription || form.excerpt || "Sin descripción"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
