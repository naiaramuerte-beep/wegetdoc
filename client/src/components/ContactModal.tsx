/* =============================================================
   EditorPDF — Modal de contacto
   Se abre desde el menú de navegación
   ============================================================= */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X, Mail, MessageSquare, Send, Check } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

const REASONS = [
  "Soporte técnico",
  "Facturación",
  "Solicitud de función",
  "Informe de error",
  "Colaboración",
  "Otro",
];

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    reason: "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const sendMutation = trpc.contact.send.useMutation({
    onSuccess: () => {
      setSent(true);
      toast.success("Mensaje enviado correctamente");
    },
    onError: () => toast.error("Error al enviar el mensaje. Inténtalo de nuevo."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error("Por favor, completa todos los campos obligatorios");
      return;
    }
    sendMutation.mutate(form);
  };

  const handleClose = () => {
    setSent(false);
    setForm({ name: user?.name ?? "", email: user?.email ?? "", reason: "", subject: "", message: "" });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <MessageSquare size={20} className="text-blue-700" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Contacto</h2>
              <p className="text-xs text-slate-500">Te respondemos en menos de 24 horas</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {sent ? (
          /* Success state */
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¡Mensaje enviado!</h3>
            <p className="text-slate-500 mb-6">
              Hemos recibido tu mensaje y te responderemos lo antes posible en <strong>{form.email}</strong>.
            </p>
            <Button onClick={handleClose} className="bg-blue-700 hover:bg-blue-800 text-white px-8">
              Cerrar
            </Button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-slate-600 mb-1.5 block">Nombre *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div>
                <Label className="text-sm text-slate-600 mb-1.5 block">Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-slate-600 mb-1.5 block">Motivo</Label>
              <div className="flex flex-wrap gap-2">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, reason: r })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      form.reason === r
                        ? "bg-blue-700 text-white border-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm text-slate-600 mb-1.5 block">Asunto *</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="¿En qué podemos ayudarte?"
                required
              />
            </div>

            <div>
              <Label className="text-sm text-slate-600 mb-1.5 block">Mensaje *</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe tu consulta con el mayor detalle posible..."
                rows={4}
                required
                className="resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={sendMutation.isPending}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white"
              >
                {sendMutation.isPending ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Enviar mensaje
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
