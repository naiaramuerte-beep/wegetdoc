/* =============================================================
   PDFPro — Dashboard de usuario
   Pestañas: Mi Cuenta | Mis Documentos | Equipo | Facturación
   ============================================================= */
import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User, FileText, Users, CreditCard, Settings,
  LogOut, Trash2, Plus, X, Download, FolderOpen,
  Crown, Check, AlertCircle, ChevronRight, Mail,
  Shield, Globe, Clock, Search,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaywallModal from "@/components/PaywallModal";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

type Tab = "account" | "documents" | "team" | "billing";

export default function Dashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("account");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex-1 container max-w-6xl py-10">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full md:w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* User info */}
              <div className="p-5 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg mb-3">
                  {user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <p className="font-semibold text-slate-800 truncate">{user?.name ?? "Usuario"}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              {/* Nav */}
              <nav className="p-2">
                {([
                  { id: "account", label: "Mi Cuenta", icon: User },
                  { id: "documents", label: "Documentos", icon: FileText },
                  { id: "team", label: "Equipo", icon: Users },
                  { id: "billing", label: "Facturación", icon: CreditCard },
                ] as const).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => item.id === "billing" ? navigate("/billing") : setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </button>
                ))}
                <Separator className="my-2" />
                <button
                  onClick={() => { logout(); navigate("/"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {activeTab === "account" && <AccountTab user={user} />}
            {activeTab === "documents" && <DocumentsTab />}
            {activeTab === "team" && <TeamTab />}
            {activeTab === "billing" && <BillingTab />}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ─── Account Tab ──────────────────────────────────────────────
function AccountTab({ user }: { user: any }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    language: user?.language ?? "es",
    timezone: user?.timezone ?? "Europe/Madrid",
    country: user?.country ?? "",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil actualizado correctamente");
      utils.auth.me.invalidate();
    },
    onError: () => toast.error("Error al actualizar el perfil"),
  });

  const deleteMutation = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Cuenta eliminada");
      window.location.href = "/";
    },
    onError: () => toast.error("Error al eliminar la cuenta"),
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">Información personal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">Nombre completo</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">Correo electrónico</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="tu@email.com"
              type="email"
            />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">Teléfono</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+34 600 000 000"
            />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">País</Label>
            <Input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="España"
            />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">Idioma</Label>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="pt">Português</option>
            </select>
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">Zona horaria</Label>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="Europe/Madrid">Europa/Madrid (UTC+1)</option>
              <option value="Europe/London">Europa/Londres (UTC+0)</option>
              <option value="America/New_York">América/Nueva York (UTC-5)</option>
              <option value="America/Los_Angeles">América/Los Ángeles (UTC-8)</option>
              <option value="Asia/Tokyo">Asia/Tokio (UTC+9)</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-2">Zona de peligro</h2>
        <p className="text-sm text-slate-500 mb-4">
          Una vez elimines tu cuenta, no hay vuelta atrás. Por favor, asegúrate antes de continuar.
        </p>
        {!showDeleteConfirm ? (
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <Trash2 size={16} className="mr-2" />
            Eliminar cuenta
          </Button>
        ) : (
          <div className="flex gap-3 items-center">
            <p className="text-sm text-red-600 font-medium">¿Estás seguro? Esta acción es irreversible.</p>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              size="sm"
            >
              Sí, eliminar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Timer component: counts down 24h from createdAt ──────────────────────────
function DocTimer({ createdAt }: { createdAt: string | Date }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const calc = () => {
      const created = new Date(createdAt).getTime();
      const expiry = created + 24 * 60 * 60 * 1000;
      const diff = expiry - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  const isExpired = remaining === "Expired";
  return (
    <span className={`flex items-center gap-1 text-xs font-mono font-medium ${
      isExpired ? "text-red-500" : "text-orange-500"
    }`}>
      <Clock size={11} />{remaining}
    </span>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────
function DocumentsTab() {
  const { data: docs, isLoading } = trpc.documents.list.useQuery();
  const { data: folders } = trpc.folders.list.useQuery();
  const { data: subData } = trpc.subscription.status.useQuery();
  const isPremium = subData?.isPremium ?? false;
  const utils = trpc.useUtils();
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("Document deleted"); },
  });

  const createFolderMutation = trpc.folders.create.useMutation({
    onSuccess: () => { utils.folders.list.invalidate(); setNewFolderName(""); setShowNewFolder(false); toast.success("Folder created"); },
  });

  const deleteFolderMutation = trpc.folders.delete.useMutation({
    onSuccess: () => { utils.folders.list.invalidate(); toast.success("Folder deleted"); },
  });

  const filteredDocs = docs?.filter((d: any) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upgrade banner for non-premium users */}
      {!isPremium && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Crown size={18} className="text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Make the most of your account</p>
              <p className="text-sm text-slate-500">Subscribe to edit, save and download your PDFs without restrictions.</p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/billing")}
            className="bg-slate-900 hover:bg-slate-800 text-white shrink-0 ml-4"
            size="sm"
          >
            Upgrade now
          </Button>
        </div>
      )}

      {/* Folders */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Folders</h2>
          <Button size="sm" variant="outline" onClick={() => setShowNewFolder(true)}>
            <Plus size={14} className="mr-1.5" />Create Folder
          </Button>
        </div>
        {showNewFolder && (
          <div className="flex gap-2 mb-3">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              onKeyDown={(e) => e.key === "Enter" && createFolderMutation.mutate({ name: newFolderName })}
              autoFocus
            />
            <Button size="sm" onClick={() => createFolderMutation.mutate({ name: newFolderName })} disabled={!newFolderName.trim()}>
              <Check size={14} />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowNewFolder(false)}>
              <X size={14} />
            </Button>
          </div>
        )}
        {folders && folders.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {folders.map((folder: any) => (
              <div key={folder.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 group">
                <div className="flex items-center gap-2">
                  <FolderOpen size={16} className="text-amber-500" />
                  <span className="text-sm text-slate-700 truncate">{folder.name}</span>
                </div>
                <button
                  onClick={() => deleteFolderMutation.mutate({ id: folder.id })}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-3">Here you can manage your folders</p>
        )}
      </div>

      {/* Documents table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Documents</h2>
        </div>
        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-8 text-sm"
          />
        </div>
        {filteredDocs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 w-8">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">Name</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 hidden md:table-cell">Updated Date</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 hidden md:table-cell">Size</th>
                  {!isPremium && <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">Timer</th>}
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc: any) => (
                  <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50 group">
                    <td className="py-3 px-2">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600">PDF</span>
                        <span className="font-medium text-slate-800 truncate max-w-[160px]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-500 hidden md:table-cell">
                      {new Date(doc.updatedAt ?? doc.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="py-3 px-2 text-slate-500 hidden md:table-cell">
                      {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : "-"}
                    </td>
                    {!isPremium && (
                      <td className="py-3 px-2">
                        <DocTimer createdAt={doc.createdAt} />
                      </td>
                    )}
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1 justify-end">
                        {/* Edit button */}
                        <a href={`/editor?docId=${doc.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1 text-slate-600 hover:text-slate-900">
                            <FileText size={12} />Edit
                          </Button>
                        </a>
                        {/* Download button */}
                        {isPremium ? (
                          <a href={doc.fileUrl} download={doc.name} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1 text-slate-600 hover:text-slate-900">
                              <Download size={12} />Download
                            </Button>
                          </a>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs gap-1 text-slate-600 hover:text-slate-900"
                            onClick={() => setShowDownloadPopup(true)}
                          >
                            <Download size={12} />Download
                          </Button>
                        )}
                        {/* Delete */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:text-red-500 opacity-0 group-hover:opacity-100"
                          onClick={() => deleteMutation.mutate({ id: doc.id })}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <FileText size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No documents yet</p>
            <p className="text-sm text-slate-400 mt-1">PDFs you save from the editor will appear here</p>
          </div>
        )}
      </div>

      {/* Download not available popup */}
      {showDownloadPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 relative">
            <button
              onClick={() => setShowDownloadPopup(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
            <h3 className="font-bold text-slate-900 text-lg mb-4">Download not available</h3>
            <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <Download size={14} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Take your document with you</p>
                <p className="text-xs text-slate-500 mt-1">Subscribe to save it with the changes applied and keep it handy anytime.</p>
              </div>
            </div>
            <Button
              onClick={() => { setShowDownloadPopup(false); navigate("/billing"); }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold h-11 mb-2"
            >
              Subscribe
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDownloadPopup(false)}
              className="w-full h-10"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team Tab ────────────────────────────────────────────────────────
function TeamTab() {
  const { data: team, isLoading } = trpc.team.list.useQuery();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer" | "admin">("editor");
  const [showForm, setShowForm] = useState(false);

  const inviteMutation = trpc.team.invite.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setEmail("");
      setShowForm(false);
      toast.success("Invitación enviada correctamente");
    },
    onError: () => toast.error("Error al enviar la invitación"),
  });

  const removeMutation = trpc.team.remove.useMutation({
    onSuccess: () => { utils.team.list.invalidate(); toast.success("Miembro eliminado"); },
  });

  const roleColors: Record<string, string> = {
    editor: "bg-blue-50 text-blue-700",
    viewer: "bg-slate-100 text-slate-600",
    admin: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Equipo</h2>
          <p className="text-sm text-slate-500 mt-0.5">Invita a colaboradores para trabajar juntos en tus documentos</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={14} className="mr-1.5" />
          Invitar
        </Button>
      </div>

      {showForm && (
        <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs text-slate-500 mb-1 block">Correo electrónico</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colaborador@empresa.com"
                onKeyDown={(e) => e.key === "Enter" && inviteMutation.mutate({ email, role })}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Rol</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="viewer">Visor</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => inviteMutation.mutate({ email, role })}
              disabled={!email.trim() || inviteMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mail size={14} className="mr-1.5" />
              Enviar invitación
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : team && team.length > 0 ? (
        <div className="space-y-2">
          {team.map((member: any) => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-sm font-medium">
                  {member.inviteeEmail.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{member.inviteeEmail}</p>
                  <p className="text-xs text-slate-400">
                    Invitado el {new Date(member.createdAt).toLocaleDateString("es-ES")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[member.role] ?? "bg-slate-100 text-slate-600"}`}>
                  {member.role === "editor" ? "Editor" : member.role === "viewer" ? "Visor" : "Admin"}
                </span>
                <button
                  onClick={() => removeMutation.mutate({ id: member.id })}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Users size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Sin miembros en el equipo</p>
          <p className="text-sm text-slate-400 mt-1">Invita a colaboradores para trabajar juntos</p>
        </div>
      )}
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────
function BillingTab() {
  const { data: subData, isLoading } = trpc.subscription.status.useQuery();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const checkoutMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
    },
    onError: () => toast.error("Error al crear el pago"),
  });

  const cancelMutation = trpc.subscription.cancel.useMutation({
    onSuccess: () => {
      utils.subscription.status.invalidate();
      toast.success("Suscripción cancelada. Seguirás teniendo acceso hasta el final del período.");
    },
    onError: () => toast.error("Error al cancelar la suscripción"),
  });

  const isPremium = subData?.isPremium ?? false;
  const sub = subData?.subscription;

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="space-y-4">
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current plan */}
      <div className={`rounded-2xl shadow-sm border p-6 ${isPremium ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-500" : "bg-white border-slate-100"}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isPremium && <Crown size={18} className="text-yellow-300" />}
              <h2 className={`text-lg font-bold ${isPremium ? "text-white" : "text-slate-800"}`}>
                {isPremium ? `Plan ${sub?.plan === "trial" ? "Prueba" : "Premium"}` : "Plan Gratuito"}
              </h2>
            </div>
            <p className={`text-sm ${isPremium ? "text-blue-100" : "text-slate-500"}`}>
              {isPremium
                ? sub?.currentPeriodEnd
                  ? `Válido hasta ${new Date(sub.currentPeriodEnd).toLocaleDateString("es-ES")}`
                  : "Acceso activo"
                : "Funciones básicas de edición PDF"}
            </p>
            {isPremium && sub?.cancelAtPeriodEnd && (
              <p className="text-yellow-200 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                Se cancelará al final del período
              </p>
            )}
          </div>
          <div className={`text-right`}>
            {isPremium ? (
              <div>
                <p className="text-3xl font-bold text-white">
                  {sub?.plan === "trial" ? "0,99€" : "9,99€"}
                </p>
                <p className="text-blue-200 text-xs">
                  {sub?.plan === "trial" ? "prueba 7 días" : "/ mes"}
                </p>
              </div>
            ) : (
              <p className="text-3xl font-bold text-slate-800">Gratis</p>
            )}
          </div>
        </div>
      </div>

      {/* Features comparison */}
      {!isPremium && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Funciones disponibles con Premium</h3>
          <div className="space-y-2.5">
            {[
              "Descarga ilimitada de PDFs editados",
              "Firma digital avanzada",
              "Protección con contraseña",
              "Compresión de PDFs",
              "Conversión PDF a Word, Excel, JPG",
              "Almacenamiento de documentos en la nube",
              "Soporte prioritario",
              "Sin marca de agua",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-blue-600" />
                </div>
                <span className="text-sm text-slate-700">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border-2 border-blue-200 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => checkoutMutation.mutate({ plan: "trial", origin: window.location.origin })}>
              <p className="font-bold text-slate-800 text-lg">0,99€</p>
              <p className="text-blue-600 font-medium text-sm">Prueba 7 días</p>
              <p className="text-xs text-slate-500 mt-1">Acceso completo durante 7 días</p>
              <Button size="sm" className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white" disabled={checkoutMutation.isPending}>
                Empezar prueba
              </Button>
            </div>
            <div className="border-2 border-indigo-200 rounded-xl p-4 hover:border-indigo-400 transition-colors cursor-pointer bg-indigo-50"
              onClick={() => checkoutMutation.mutate({ plan: "monthly", origin: window.location.origin })}>
              <p className="font-bold text-slate-800 text-lg">9,99€<span className="text-sm font-normal text-slate-500">/mes</span></p>
              <p className="text-indigo-600 font-medium text-sm">Plan Mensual</p>
              <p className="text-xs text-slate-500 mt-1">Acceso ilimitado, cancela cuando quieras</p>
              <Button size="sm" className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={checkoutMutation.isPending}>
                Suscribirse
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel subscription */}
      {isPremium && !sub?.cancelAtPeriodEnd && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-800 mb-2">Gestionar suscripción</h3>
          <p className="text-sm text-slate-500 mb-4">
            Si cancelas, seguirás teniendo acceso hasta el {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString("es-ES") : "final del período"}.
          </p>
          <Button
            variant="outline"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            {cancelMutation.isPending ? "Cancelando..." : "Cancelar suscripción"}
          </Button>
        </div>
      )}
    </div>
  );
}
