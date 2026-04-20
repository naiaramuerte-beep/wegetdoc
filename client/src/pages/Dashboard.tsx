/* =============================================================
   EditorPDF — Dashboard de usuario
   Pestañas: Mi Cuenta | Mis Documentos | Equipo | Facturación
   ============================================================= */
import { useState, useEffect, useCallback } from "react";
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
  Shield, Globe, Clock, Edit3, Loader2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PaywallModal from "@/components/PaywallModal";
import { useLocation } from "wouter";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { brandName } from "@/lib/brand";
import { useLanguage } from "@/contexts/LanguageContext";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Tab = "account" | "documents" | "team" | "billing";

export default function Dashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();
  // Read tab from URL query param (e.g. ?tab=documents after payment)
  const getInitialTab = (): Tab => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "documents" || tab === "team" || tab === "billing" || tab === "account") return tab;
    return "account";
  };
   const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);
  const utils = trpc.useUtils();

  // Show success toast if redirected after payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      utils.subscription.status.invalidate();
      toast.success(t.dash_payment_success);


      // Clean URL without reload
      const cleanUrl = window.location.pathname + "?tab=documents";
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#E63946] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // DEV-ONLY localhost bypass: lets us iterate on the dashboard UI without registering.
  // Reverts to the normal auth redirect on any non-localhost host — safe for production.
  // TODO: remove this block once the dashboard is stable.
  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  if (!isAuthenticated && !isLocalhost) {
    const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    const currentLang = langMatch ? langMatch[1] : "es";
    window.location.href = `/${currentLang}?login=true`;
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
                <div className="w-12 h-12 rounded-full bg-[#0A0A0B] flex items-center justify-center text-white font-bold text-lg mb-3">
                  {user?.name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <p className="font-semibold text-slate-800 truncate">{user?.name ?? t.dash_user}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              {/* Nav */}
              <nav className="p-2">
                {([
                  { id: "account", label: t.dash_account, icon: User },
                  { id: "documents", label: t.dash_documents, icon: FileText },
                  { id: "team", label: t.dash_team, icon: Users },
                  { id: "billing", label: t.dash_billing, icon: CreditCard },
                ] as const).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? "bg-[#FDECEE] text-[#E63946]"
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
                  {t.dash_logout}
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
  const { t } = useLanguage();
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
      toast.success(t.dash_profile_updated);
      utils.auth.me.invalidate();
    },
    onError: () => toast.error(t.dash_profile_error),
  });

  const deleteMutation = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success(t.dash_account_deleted);
      window.location.href = "/";
    },
    onError: () => toast.error(t.dash_account_delete_error),
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-5">{t.dash_personal_info}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">{t.dash_full_name}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t.dash_your_name}
            />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">{t.dash_email}</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="tu@email.com"
              type="email"
            />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">{t.dash_phone}</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+34 600 000 000"
            />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">{t.dash_country}</Label>
            <Input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="España"
            />
          </div>
          <div>
            <Label className="text-sm text-slate-600 mb-1.5 block">{t.dash_language}</Label>
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
            <Label className="text-sm text-slate-600 mb-1.5 block">{t.dash_timezone}</Label>
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
            className="bg-[#E63946] hover:bg-[#C72738] text-white px-6"
          >
            {updateMutation.isPending ? t.dash_saving : t.dash_save_changes}
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-2">{t.dash_danger_zone}</h2>
        <p className="text-sm text-slate-500 mb-4">
          {t.dash_danger_warning}
        </p>
        {!showDeleteConfirm ? (
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <Trash2 size={16} className="mr-2" />
            {t.dash_delete_account}
          </Button>
        ) : (
          <div className="flex gap-3 items-center">
            <p className="text-sm text-red-600 font-medium">{t.dash_delete_confirm}</p>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              size="sm"
            >
              {t.dash_delete_yes}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              {t.dash_cancel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────
function DocumentsTab() {
  const { t, lang } = useLanguage();
  const { data: docs, isLoading } = trpc.documents.list.useQuery();
  const { data: folders } = trpc.folders.list.useQuery();
  const { data: subData } = trpc.subscription.status.useQuery();
  const isPremium = subData?.isPremium ?? false;
  const utils = trpc.useUtils();
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [, navigate] = useLocation();
  const { setPendingFile, setPendingTool } = usePdfFile();

  // ── Download document by ID (server fetches from R2 directly) ──
  const handleDownloadDocument = async (doc: any) => {
    if (!doc.id) { toast.error(t.dash_cannot_download); return; }
    try {
      toast.loading(t.dash_preparing_download, { id: "download-doc" });
      const response = await fetch(`/api/documents/download/${doc.id}`, { credentials: "include" });
      if (!response.ok) throw new Error(t.dash_download_error);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name || "document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t.dash_doc_downloaded, { id: "download-doc" });
    } catch (err) {
      toast.error(t.dash_download_error, { id: "download-doc" });
    }
  };

  const handleEditDocument = async (doc: any) => {
    if (!doc.id) { toast.error(t.dash_cannot_open); return; }
    try {
      toast.loading(t.dash_loading_doc, { id: "load-doc" });
      const response = await fetch(`/api/documents/download/${doc.id}`, { credentials: "include" });
      if (!response.ok) throw new Error(t.dash_download_error);
      const blob = await response.blob();
      const file = new File([blob], doc.name, { type: "application/pdf" });
      setPendingFile(file);
      setPendingTool(null);
      toast.dismiss("load-doc");
      const langMatch = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
      const lang = langMatch ? langMatch[1] : "es";
      navigate(`/${lang}/editor`);
    } catch (err) {
      toast.dismiss("load-doc");
      toast.error(t.dash_load_error);
    }
  };

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success(t.dash_doc_deleted); },
  });

  const createFolderMutation = trpc.folders.create.useMutation({
    onSuccess: () => { utils.folders.list.invalidate(); setNewFolderName(""); setShowNewFolder(false); toast.success(t.dash_folder_created); },
  });

  const deleteFolderMutation = trpc.folders.delete.useMutation({
    onSuccess: () => { utils.folders.list.invalidate(); toast.success(t.dash_folder_deleted); },
  });

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
      {/* Folders */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">{t.dash_folders}</h2>
          <Button size="sm" variant="outline" onClick={() => setShowNewFolder(true)}>
            <Plus size={14} className="mr-1.5" />{t.dash_new_folder}
          </Button>
        </div>
        {showNewFolder && (
          <div className="flex gap-2 mb-3">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t.dash_folder_name}
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
          <p className="text-sm text-slate-400 text-center py-3">{t.dash_no_folders}</p>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">{t.dash_my_documents}</h2>
          {isPremium ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <Crown size={12} className="text-emerald-600" />
              {t.dash_download_active}
            </span>
          ) : (
            <button
              onClick={() => setShowPaywall(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors"
            >
              <Crown size={12} className="text-amber-600" />
              {t.dash_subscribe_download}
            </button>
          )}
        </div>
        {docs && docs.length > 0 ? (
          <div className="space-y-2">
            {docs.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-slate-400">
                        {doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB · ` : ""}
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                      {!isPremium && doc.paymentStatus === "pending" && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">{t.dash_payment_pending}</span>
                      )}
                      {doc.paymentStatus === "paid" && (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{t.dash_paid}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Edit button — always visible for all users */}
                  {doc.fileUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 gap-1 text-[#E63946] hover:text-[#C72738] hover:bg-[#FDECEE]"
                      title={t.dash_edit_in_editor}
                      onClick={() => handleEditDocument(doc)}
                    >
                      <Edit3 size={13} />
                      <span className="text-xs">{t.dash_edit}</span>
                    </Button>
                  )}
                  {doc.fileUrl && (
                    isPremium ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title={t.dash_download}
                        onClick={() => handleDownloadDocument(doc)}
                      >
                        <Download size={14} />
                      </Button>
                    ) : doc.paymentStatus === "pending" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        title={t.dash_pay_to_download}
                        onClick={() => setShowPaywall(true)}
                      >
                        <CreditCard size={13} />
                        <span className="text-xs font-medium">{t.dash_pay}</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-amber-500"
                        title={t.dash_requires_subscription}
                        onClick={() => setShowPaywall(true)}
                      >
                        <Crown size={14} />
                      </Button>
                    )
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:text-red-500"
                    onClick={() => deleteMutation.mutate({ id: doc.id })}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <FileText size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{t.dash_no_documents}</p>
            <p className="text-sm text-slate-400 mt-1">{t.dash_no_documents_desc}</p>
          </div>
        )}
      </div>

      {/* Paywall: shown when user tries to download without subscription */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} action={t.dash_download} />
    </div>
  );
}

// ─── Team Tab ────────────────────────────────────────────────────────
function TeamTab() {
  const { t } = useLanguage();
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
      toast.success(t.dash_invite_sent);
    },
    onError: () => toast.error(t.dash_invite_error),
  });

  const removeMutation = trpc.team.remove.useMutation({
    onSuccess: () => { utils.team.list.invalidate(); toast.success(t.dash_member_removed); },
  });

  const roleColors: Record<string, string> = {
    editor: "bg-[#FDECEE] text-[#E63946]",
    viewer: "bg-slate-100 text-slate-600",
    admin: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{t.dash_team_title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{t.dash_team_desc}</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="bg-[#E63946] hover:bg-[#C72738] text-white"
        >
          <Plus size={14} className="mr-1.5" />
          {t.dash_invite}
        </Button>
      </div>

      {showForm && (
        <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label className="text-xs text-slate-500 mb-1 block">{t.dash_email}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colaborador@empresa.com"
                onKeyDown={(e) => e.key === "Enter" && inviteMutation.mutate({ email, role })}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">{t.dash_role}</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="viewer">{t.dash_viewer}</option>
                <option value="editor">{t.dash_editor}</option>
                <option value="admin">{t.dash_admin}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => inviteMutation.mutate({ email, role })}
              disabled={!email.trim() || inviteMutation.isPending}
              className="bg-[#E63946] hover:bg-[#C72738] text-white"
            >
              <Mail size={14} className="mr-1.5" />
              {t.dash_send_invite}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              {t.dash_cancel}
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
                    {t.dash_invited_on} {new Date(member.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[member.role] ?? "bg-slate-100 text-slate-600"}`}>
                  {member.role === "editor" ? t.dash_editor : member.role === "viewer" ? t.dash_viewer : t.dash_admin}
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
          <p className="text-slate-500 font-medium">{t.dash_no_team}</p>
          <p className="text-sm text-slate-400 mt-1">{t.dash_no_team_desc}</p>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Payment Form (inside Elements) ──────────────────
function DashboardPaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error } = await stripe.confirmSetup({ elements, redirect: "if_required" });
      if (error) {
        toast.error(error.message ?? "Payment failed");
      } else {
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: "tabs", wallets: { applePay: "auto", googlePay: "auto" } }} />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full mt-4 py-3 rounded-xl bg-[#E63946] text-white font-semibold text-sm hover:bg-[#C72738] transition-colors disabled:opacity-50"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> ...</span>
        ) : (
          t.dash_subscribe
        )}
      </button>
    </form>
  );
}

// ─── Stripe Inline Checkout (Dashboard) ──────────────────────
function DashboardStripeInline({ onComplete }: { onComplete: () => void }) {
  const { t } = useLanguage();
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const stripeConfigQ = trpc.subscription.stripeConfig.useQuery();
  const createCheckoutSession = trpc.subscription.createCheckoutSession.useMutation();

  useEffect(() => {
    if (stripeConfigQ.data?.publishableKey) {
      setStripePromise(loadStripe(stripeConfigQ.data.publishableKey));
    }
  }, [stripeConfigQ.data?.publishableKey]);

  useEffect(() => {
    if (!stripeConfigQ.data?.publishableKey || clientSecret) return;
    createCheckoutSession.mutateAsync().then((res) => {
      if (res.clientSecret) setClientSecret(res.clientSecret);
    }).catch((err) => {
      console.error("[Stripe] Failed to create checkout session:", err);
      toast.error("Error loading payment form.");
    });
  }, [stripeConfigQ.data?.publishableKey]);

  if (!stripePromise || !clientSecret) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-[#E63946]" />
        <span className="ml-2 text-sm text-slate-500">{t.dash_loading_payment}</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
        <DashboardPaymentForm onSuccess={onComplete} />
      </Elements>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────
function BillingTab() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { data: subData, isLoading } = trpc.subscription.status.useQuery();
  const utils = trpc.useUtils();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInlineCheckout, setShowInlineCheckout] = useState(false);

  const handleStripeComplete = useCallback(async () => {
    await utils.subscription.status.invalidate();
    setShowInlineCheckout(false);
    toast.success(t.dash_subscription_activated);
  }, [utils]);

  const openInlineCheckout = () => {
    setShowInlineCheckout(true);
    setTimeout(() => {
      document.getElementById("billing-checkout-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const cancelMutation = trpc.subscription.cancel.useMutation({
    onSuccess: () => {
      utils.subscription.status.invalidate();
      setShowCancelModal(false);
      toast.success(t.dash_subscription_cancelled);
    },
    onError: () => {
      toast.error(t.dash_cancel_error);
    },
  });

  const isPremium = subData?.isPremium ?? false;
  const sub = subData?.subscription;

  const expiryDateStr = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

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
      {/* Current plan card */}
      <div className={`rounded-2xl shadow-sm border p-6 ${
        isPremium
          ? sub?.cancelAtPeriodEnd
            ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-400"
            : "bg-[#0A0A0B] text-white border-[#1A1A1C]"
          : "bg-white border-slate-100"
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isPremium && <Crown size={18} className="text-yellow-300 flex-shrink-0" />}
              <h2 className={`text-lg font-bold truncate ${isPremium ? "text-white" : "text-slate-800"}`}>
                {isPremium
                  ? sub?.cancelAtPeriodEnd
                    ? t.dash_cancelled_plan
                    : sub?.plan === "trial" ? t.dash_trial_plan : t.dash_premium_plan
                  : t.dash_basic_plan}
              </h2>
            </div>

            {/* Status description */}
            {isPremium && sub?.cancelAtPeriodEnd ? (
              <div className="mt-1 space-y-1">
                <p className="text-amber-100 text-sm flex items-center gap-1.5">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {t.dash_access_expires}{" "}
                  <strong className="text-white">{expiryDateStr ?? t.dash_end_of_period}</strong>
                </p>
                <p className="text-amber-200 text-xs">
                  {t.dash_keep_using}
                </p>
              </div>
            ) : isPremium ? (
              <p className="text-white/80 text-sm">
                {expiryDateStr
                  ? `${t.dash_next_renewal} ${expiryDateStr}`
                  : t.dash_active_access}
              </p>
            ) : (
              <p className="text-slate-500 text-sm">{t.dash_basic_features}</p>
            )}
          </div>

          {/* Price badge */}
          <div className="text-right flex-shrink-0">
            {isPremium && sub?.plan !== "trial" ? (
              <div>
                <p className="text-3xl font-bold text-white">19,99€</p>
                <p className={`text-xs ${sub?.cancelAtPeriodEnd ? "text-amber-200" : "text-white/60"}`}>{t.dash_per_month}</p>
              </div>
            ) : !isPremium ? (
              <p className="text-3xl font-bold text-slate-800">{t.dash_basic}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Manage subscription — cancel button (only if active and NOT already canceling) */}
      {isPremium && !sub?.cancelAtPeriodEnd && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-800 mb-1">{t.dash_manage_subscription}</h3>
          <p className="text-sm text-slate-500 mb-4">
            {t.dash_cancel_keep_access}{" "}
            <strong>{expiryDateStr ?? t.dash_end_of_period}</strong>.
            {" "}{t.dash_no_more_charges}
          </p>
          <Button
            variant="outline"
            onClick={() => setShowCancelModal(true)}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors"
          >
            {t.dash_cancel_subscription}
          </Button>
        </div>
      )}

      {/* Already canceled — info banner */}
      {isPremium && sub?.cancelAtPeriodEnd && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {t.dash_scheduled_cancel}
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              {t.dash_active_until}{" "}
              <strong>{expiryDateStr ?? t.dash_end_of_period}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Features comparison (only for basic users) */}
      {!isPremium && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">{t.dash_premium_features}</h3>
          <div className="space-y-2.5">
            {[
              t.dash_feature_unlimited,
              t.dash_feature_signature,
              t.dash_feature_password,
              t.dash_feature_compress,
              t.dash_feature_convert,
              t.dash_feature_cloud,
              t.dash_feature_support,
              t.dash_feature_watermark,
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#FDECEE] flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-[#E63946]" />
                </div>
                <span className="text-sm text-slate-700">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Button
              className="w-full bg-[#E63946] hover:bg-[#C72738] text-white"
              onClick={openInlineCheckout}
              disabled={showInlineCheckout}
            >
              <CreditCard size={16} className="mr-2" />
              {showInlineCheckout ? t.dash_payment_form_open : t.dash_subscribe_now}
            </Button>
          </div>
        </div>
      )}

      {/* Inline Stripe Checkout */}
      {showInlineCheckout && !isPremium && (
        <div id="billing-checkout-section" className="bg-white rounded-2xl shadow-sm border border-[#E8E8EC] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between" style={{ backgroundColor: "#f8fafc" }}>
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-[#E63946]" />
              <h3 className="font-bold text-slate-800">{t.dash_complete_subscription}</h3>
            </div>
            <button onClick={() => setShowInlineCheckout(false)} className="text-sm text-slate-500 hover:text-slate-700 hover:underline">{t.dash_cancel}</button>
          </div>
          <DashboardStripeInline onComplete={handleStripeComplete} />
        </div>
      )}

      {/* ── Cancel Confirmation Modal ── */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowCancelModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t.dash_cancel_subscription_q}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{t.dash_cannot_undo}</p>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors flex-shrink-0"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* Info box */}
            <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex items-center gap-2">
                <Check size={15} className="text-[#1E9E63] flex-shrink-0" />
                <p className="text-sm text-slate-700">
                  {t.dash_keep_access_until}{" "}
                  <strong>{expiryDateStr ?? t.dash_end_of_period}</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Check size={15} className="text-[#1E9E63] flex-shrink-0" />
                <p className="text-sm text-slate-700">{t.dash_no_auto_charges}</p>
              </div>
              <div className="flex items-center gap-2">
                <Check size={15} className="text-[#1E9E63] flex-shrink-0" />
                <p className="text-sm text-slate-700">{t.dash_docs_accessible}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelMutation.isPending}
              >
                {t.dash_keep_subscription}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {t.dash_cancelling}
                  </span>
                ) : (
                  t.dash_yes_cancel
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
