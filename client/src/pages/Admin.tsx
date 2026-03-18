/* =============================================================
   PDFPro — Panel de Administración
   Pestañas: Estadísticas | Usuarios | Mensajes | Páginas legales | Ajustes
   ============================================================= */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BarChart3, Users, MessageSquare, FileText, Settings,
  Trash2, UserX, Search, Crown, Mail, Check, X,
  TrendingUp, CreditCard, Globe, Shield,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";

type AdminTab = "stats" | "users" | "messages" | "legal" | "settings";

export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<AdminTab>("stats");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    navigate("/");
    return null;
  }

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: "stats", label: "Estadísticas", icon: BarChart3 },
    { id: "users", label: "Usuarios", icon: Users },
    { id: "messages", label: "Mensajes", icon: MessageSquare },
    { id: "legal", label: "Páginas legales", icon: FileText },
    { id: "settings", label: "Ajustes", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1 container max-w-7xl py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona usuarios, contenido y configuración de PDFPro</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-100 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "stats" && <StatsTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "messages" && <MessagesTab />}
        {activeTab === "legal" && <LegalTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
      <Footer />
    </div>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────
function StatsTab() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-slate-100" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Total usuarios", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Suscriptores activos", value: stats?.activeSubscriptions ?? 0, icon: Crown, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Documentos subidos", value: stats?.totalDocuments ?? 0, icon: FileText, color: "text-green-600", bg: "bg-green-50" },
    { label: "Mensajes sin leer", value: stats?.unreadMessages ?? 0, icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
              <card.icon size={18} className={card.color} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{card.value.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Subscribed users */}
      <SubscribedUsersPanel />
    </div>
  );
}

function SubscribedUsersPanel() {
  const { data: subs, isLoading } = trpc.admin.subscribedUsers.useQuery();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Crown size={16} className="text-yellow-500" />
        Usuarios con suscripción activa
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : subs && subs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Usuario</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Plan</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Estado</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Vence</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((sub: any) => (
                <tr key={sub.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-slate-800">{sub.name ?? "—"}</p>
                    <p className="text-xs text-slate-400">{sub.email}</p>
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="outline" className="text-xs capitalize">{sub.plan}</Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      sub.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">
                    {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("es-ES") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-400 text-sm text-center py-4">Sin suscriptores activos</p>
      )}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────
function UsersTab() {
  const [search, setSearch] = useState("");
  const { data: users, isLoading, refetch } = trpc.admin.users.useQuery({ search: search || undefined });
  const deactivateMutation = trpc.admin.deactivateUser.useMutation({
    onSuccess: () => { refetch(); toast.success("Usuario desactivado"); },
  });
  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { refetch(); toast.success("Usuario eliminado"); },
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Todos los usuarios</h3>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email..."
            className="pl-8 w-56"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : users && users.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Usuario</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Rol</th>
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Registro</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 group">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(u.name ?? u.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{u.name ?? "—"}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString("es-ES")}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs hover:text-orange-600"
                        onClick={() => deactivateMutation.mutate({ userId: u.id })}
                        title="Desactivar"
                      >
                        <UserX size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs hover:text-red-600"
                        onClick={() => {
                          if (confirm(`¿Eliminar usuario ${u.email}?`)) {
                            deleteMutation.mutate({ userId: u.id });
                          }
                        }}
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-400 text-sm text-center py-8">No se encontraron usuarios</p>
      )}
    </div>
  );
}

// ─── Messages Tab ─────────────────────────────────────────────
function MessagesTab() {
  const { data: messages, isLoading, refetch } = trpc.admin.contactMessages.useQuery();
  const [selected, setSelected] = useState<any | null>(null);
  const markReadMutation = trpc.admin.markMessageRead.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Mensajes de contacto</h3>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {messages.map((msg: any) => (
              <div
                key={msg.id}
                onClick={() => { setSelected(msg); if (!msg.isRead) markReadMutation.mutate({ id: msg.id }); }}
                className={`p-3 rounded-xl cursor-pointer border transition-colors ${
                  selected?.id === msg.id
                    ? "border-blue-300 bg-blue-50"
                    : msg.isRead
                    ? "border-slate-100 hover:bg-slate-50"
                    : "border-blue-100 bg-blue-50/50 hover:bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm truncate ${msg.isRead ? "text-slate-700" : "font-semibold text-slate-800"}`}>
                      {msg.subject}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{msg.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!msg.isRead && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    <span className="text-xs text-slate-400">
                      {new Date(msg.createdAt).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-8">Sin mensajes</p>
        )}
      </div>

      {/* Detail */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        {selected ? (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">{selected.subject}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  De: <strong>{selected.name}</strong> &lt;{selected.email}&gt;
                </p>
                {selected.reason && (
                  <Badge variant="outline" className="text-xs mt-1">{selected.reason}</Badge>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap">
              {selected.message}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Recibido: {new Date(selected.createdAt).toLocaleString("es-ES")}
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => window.open(`mailto:${selected.email}?subject=Re: ${selected.subject}`)}
            >
              <Mail size={13} className="mr-1.5" />
              Responder por email
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[200px] text-slate-400 text-sm">
            Selecciona un mensaje para verlo
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Legal Tab ────────────────────────────────────────────────
function LegalTab() {
  const { data: pages, isLoading, refetch } = trpc.admin.legalPages.useQuery();
  const [editing, setEditing] = useState<{ slug: string; title: string; content: string } | null>(null);

  const saveMutation = trpc.admin.saveLegalPage.useMutation({
    onSuccess: () => {
      refetch();
      setEditing(null);
      toast.success("Página legal guardada");
    },
    onError: () => toast.error("Error al guardar"),
  });

  const legalSlugs = [
    { slug: "privacy", title: "Política de Privacidad" },
    { slug: "terms", title: "Términos y Condiciones" },
    { slug: "cookies", title: "Política de Cookies" },
    { slug: "legal", title: "Aviso Legal" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Páginas legales</h3>
        <div className="space-y-1.5">
          {legalSlugs.map((page) => {
            const existing = pages?.find((p: any) => p.slug === page.slug);
            return (
              <button
                key={page.slug}
                onClick={() => setEditing({
                  slug: page.slug,
                  title: existing?.title ?? page.title,
                  content: existing?.content ?? "",
                })}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                  editing?.slug === page.slug
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{page.title}</p>
                  <p className="text-xs text-slate-400">/{page.slug}</p>
                </div>
                {existing ? (
                  <Check size={14} className="text-green-500 flex-shrink-0" />
                ) : (
                  <span className="text-xs text-slate-400">Sin contenido</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        {editing ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-slate-600 mb-1.5 block">Título</Label>
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm text-slate-600 mb-1.5 block">Contenido (Markdown soportado)</Label>
              <Textarea
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                rows={16}
                className="font-mono text-sm resize-none"
                placeholder="# Título&#10;&#10;Contenido de la página..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => saveMutation.mutate(editing)}
                disabled={saveMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saveMutation.isPending ? "Guardando..." : "Guardar página"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[300px] text-slate-400 text-sm">
            Selecciona una página para editarla
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────
function SettingsTab() {
  const { data: settings, isLoading, refetch } = trpc.admin.settings.useQuery();
  const [form, setForm] = useState<Record<string, string>>({});

  const saveMutation = trpc.admin.saveSetting.useMutation({
    onSuccess: () => { refetch(); toast.success("Ajuste guardado"); },
  });

  const settingDefs = [
    { key: "site_name", label: "Nombre del sitio", placeholder: "PDFPro" },
    { key: "site_tagline", label: "Eslogan", placeholder: "Editor PDF Online Gratuito" },
    { key: "support_email", label: "Email de soporte", placeholder: "soporte@pdfpro.com" },
    { key: "max_file_size_mb", label: "Tamaño máximo de archivo (MB)", placeholder: "100" },
    { key: "maintenance_mode", label: "Modo mantenimiento (true/false)", placeholder: "false" },
  ];

  const getValue = (key: string) => {
    if (form[key] !== undefined) return form[key];
    return settings?.find((s: any) => s.key === key)?.value ?? "";
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h3 className="font-semibold text-slate-800 mb-5">Configuración del sitio</h3>
      <div className="space-y-4 max-w-lg">
        {settingDefs.map((def) => (
          <div key={def.key}>
            <Label className="text-sm text-slate-600 mb-1.5 block">{def.label}</Label>
            <div className="flex gap-2">
              <Input
                value={getValue(def.key)}
                onChange={(e) => setForm({ ...form, [def.key]: e.target.value })}
                placeholder={def.placeholder}
              />
              <Button
                size="sm"
                onClick={() => saveMutation.mutate({ key: def.key, value: getValue(def.key) })}
                disabled={saveMutation.isPending}
                className="flex-shrink-0"
              >
                <Check size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
