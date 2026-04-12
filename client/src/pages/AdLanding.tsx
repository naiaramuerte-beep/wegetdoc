import { useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Shield, Zap, Lock, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePdfFile } from "@/contexts/PdfFileContext";
import { colors, brandName } from "@/lib/brand";

// ── SVG Icons (inline, no external deps) ──────────────────────

function EditPdfIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect x="16" y="8" width="40" height="52" rx="4" fill="#e8f5e9" stroke="#1B5E20" strokeWidth="2.5" />
      <line x1="24" y1="22" x2="48" y2="22" stroke="#1B5E20" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="30" x2="44" y2="30" stroke="#1B5E20" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="38" x2="40" y2="38" stroke="#1B5E20" strokeWidth="2" strokeLinecap="round" />
      <path d="M50 40 L66 24 L72 30 L56 46 L48 48 Z" fill="#1B5E20" opacity="0.9" />
      <path d="M66 24 L72 30" stroke="#14532d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SignPdfIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect x="16" y="8" width="40" height="52" rx="4" fill="#e8f5e9" stroke="#1B5E20" strokeWidth="2.5" />
      <line x1="24" y1="22" x2="48" y2="22" stroke="#1B5E20" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="30" x2="44" y2="30" stroke="#1B5E20" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 46 C32 38, 38 50, 44 42 S52 48, 56 44" stroke="#1B5E20" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <line x1="26" y1="50" x2="50" y2="50" stroke="#1B5E20" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M58 16 L64 10 L70 16 L64 62 L58 56 Z" fill="#1B5E20" opacity="0.15" />
      <path d="M62 12 L62 58" stroke="#1B5E20" strokeWidth="2" strokeLinecap="round" />
      <circle cx="62" cy="8" r="2" fill="#1B5E20" />
    </svg>
  );
}

function WordToPdfIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect x="4" y="14" width="30" height="40" rx="3" fill="#d1e7ff" stroke="#2563eb" strokeWidth="2" />
      <text x="19" y="39" textAnchor="middle" fill="#2563eb" fontSize="11" fontWeight="bold" fontFamily="system-ui">W</text>
      <path d="M40 34 L50 34" stroke="#1B5E20" strokeWidth="2.5" strokeLinecap="round" markerEnd="url(#arrow)" />
      <polygon points="52,30 58,34 52,38" fill="#1B5E20" />
      <rect x="62" y="14" width="30" height="40" rx="3" fill="#e8f5e9" stroke="#1B5E20" strokeWidth="2" />
      <text x="77" y="33" textAnchor="middle" fill="#1B5E20" fontSize="8" fontWeight="bold" fontFamily="system-ui">PDF</text>
      <line x1="69" y1="42" x2="85" y2="42" stroke="#1B5E20" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function JpgToPdfIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect x="4" y="14" width="30" height="40" rx="3" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
      <circle cx="14" cy="28" r="4" fill="#d97706" opacity="0.4" />
      <path d="M8 44 L14 36 L20 40 L26 32 L30 44" fill="#d97706" opacity="0.3" />
      <text x="19" y="52" textAnchor="middle" fill="#d97706" fontSize="7" fontWeight="bold" fontFamily="system-ui">JPG</text>
      <path d="M40 34 L50 34" stroke="#1B5E20" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="52,30 58,34 52,38" fill="#1B5E20" />
      <rect x="62" y="14" width="30" height="40" rx="3" fill="#e8f5e9" stroke="#1B5E20" strokeWidth="2" />
      <text x="77" y="33" textAnchor="middle" fill="#1B5E20" fontSize="8" fontWeight="bold" fontFamily="system-ui">PDF</text>
      <line x1="69" y1="42" x2="85" y2="42" stroke="#1B5E20" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CompressPdfIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect x="10" y="8" width="36" height="48" rx="4" fill="#e8f5e9" stroke="#1B5E20" strokeWidth="2.5" opacity="0.4" />
      <rect x="18" y="16" width="28" height="40" rx="4" fill="#e8f5e9" stroke="#1B5E20" strokeWidth="2.5" />
      <text x="32" y="40" textAnchor="middle" fill="#1B5E20" fontSize="8" fontWeight="bold" fontFamily="system-ui">PDF</text>
      <path d="M52 26 L52 42" stroke="#1B5E20" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M46 32 L52 26 L58 32" stroke="#1B5E20" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M46 36 L52 42 L58 36" stroke="#1B5E20" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <text x="52" y="56" textAnchor="middle" fill="#1B5E20" fontSize="7" fontWeight="600" fontFamily="system-ui">-70%</text>
    </svg>
  );
}

function ConvertPdfIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect x="8" y="20" width="26" height="36" rx="3" fill="#e8f5e9" stroke="#1B5E20" strokeWidth="2" />
      <text x="21" y="42" textAnchor="middle" fill="#1B5E20" fontSize="8" fontWeight="bold" fontFamily="system-ui">PDF</text>
      <path d="M40 30 C50 30, 50 30, 50 20" stroke="#1B5E20" strokeWidth="2" fill="none" strokeLinecap="round" />
      <polygon points="48,16 54,20 48,24" fill="#1B5E20" />
      <path d="M40 46 C50 46, 50 46, 50 56" stroke="#1B5E20" strokeWidth="2" fill="none" strokeLinecap="round" />
      <polygon points="48,52 54,56 48,60" fill="#1B5E20" />
      <rect x="56" y="8" width="20" height="20" rx="3" fill="#d1e7ff" stroke="#2563eb" strokeWidth="1.5" />
      <text x="66" y="21" textAnchor="middle" fill="#2563eb" fontSize="6" fontWeight="bold" fontFamily="system-ui">DOC</text>
      <rect x="56" y="48" width="20" height="20" rx="3" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
      <text x="66" y="61" textAnchor="middle" fill="#d97706" fontSize="6" fontWeight="bold" fontFamily="system-ui">IMG</text>
    </svg>
  );
}

// ── Translations per page ─────────────────────────────────────

type LangCode = "es" | "en" | "fr" | "de" | "pt" | "it" | "nl" | "pl" | "ru" | "zh";

interface PageContent {
  title: Record<LangCode, string>;
  subtitle: Record<LangCode, string>;
  metaTitle: Record<LangCode, string>;
  metaDesc: Record<LangCode, string>;
  cta: Record<LangCode, string>;
  badge1: Record<LangCode, string>;
  badge2: Record<LangCode, string>;
  badge3: Record<LangCode, string>;
}

const SHARED_CTA: Record<LangCode, string> = {
  es: "Empezar por 0,50\u00A0€",
  en: "Start for €0.50",
  fr: "Commencer pour 0,50\u00A0€",
  de: "Starten für 0,50\u00A0€",
  pt: "Começar por 0,50\u00A0€",
  it: "Inizia per 0,50\u00A0€",
  nl: "Start voor €\u00A00,50",
  pl: "Zacznij za 0,50\u00A0€",
  ru: "Начать за 0,50\u00A0€",
  zh: "仅需 €0.50 开始",
};

const SHARED_BADGES: { b1: Record<LangCode, string>; b2: Record<LangCode, string>; b3: Record<LangCode, string> } = {
  b1: { es: "Seguro y privado", en: "Secure & Private", fr: "Sécurisé et privé", de: "Sicher & privat", pt: "Seguro e privado", it: "Sicuro e privato", nl: "Veilig & privé", pl: "Bezpieczne i prywatne", ru: "Безопасно и конфиденциально", zh: "安全且私密" },
  b2: { es: "Sin instalación", en: "No installation", fr: "Sans installation", de: "Ohne Installation", pt: "Sem instalação", it: "Nessuna installazione", nl: "Geen installatie", pl: "Bez instalacji", ru: "Без установки", zh: "无需安装" },
  b3: { es: "Resultado al instante", en: "Instant results", fr: "Résultats instantanés", de: "Sofortige Ergebnisse", pt: "Resultados instantâneos", it: "Risultati immediati", nl: "Direct resultaat", pl: "Natychmiastowe wyniki", ru: "Мгновенный результат", zh: "即时结果" },
};

export interface AdPage {
  slug: string;
  editorTool?: string;
  icon: React.FC<{ size?: number }>;
  content: PageContent;
  acceptExtra?: string;
}

export const AD_PAGES: AdPage[] = [
  {
    slug: "edit-pdf-online",
    editorTool: "text",
    icon: EditPdfIcon,
    content: {
      title:    { es: "Edita PDF Online", en: "Edit PDF Online", fr: "Modifier PDF en ligne", de: "PDF online bearbeiten", pt: "Editar PDF Online", it: "Modifica PDF Online", nl: "PDF online bewerken", pl: "Edytuj PDF online", ru: "Редактировать PDF онлайн", zh: "在线编辑PDF" },
      subtitle: { es: "Modifica texto, imágenes y páginas de cualquier PDF directamente en tu navegador", en: "Modify text, images, and pages of any PDF directly in your browser", fr: "Modifiez texte, images et pages de tout PDF directement dans votre navigateur", de: "Bearbeiten Sie Text, Bilder und Seiten jeder PDF direkt im Browser", pt: "Modifique texto, imagens e páginas de qualquer PDF diretamente no navegador", it: "Modifica testo, immagini e pagine di qualsiasi PDF direttamente nel browser", nl: "Bewerk tekst, afbeeldingen en pagina's van elke PDF rechtstreeks in uw browser", pl: "Modyfikuj tekst, obrazy i strony dowolnego PDF bezpośrednio w przeglądarce", ru: "Редактируйте текст, изображения и страницы любого PDF прямо в браузере", zh: "直接在浏览器中修改任何PDF的文本、图片和页面" },
      metaTitle:{ es: "Editar PDF Online - EditorPDF", en: "Edit PDF Online - EditorPDF", fr: "Modifier PDF en ligne - EditorPDF", de: "PDF online bearbeiten - EditorPDF", pt: "Editar PDF Online - EditorPDF", it: "Modifica PDF Online - EditorPDF", nl: "PDF online bewerken - EditorPDF", pl: "Edytuj PDF online - EditorPDF", ru: "Редактировать PDF онлайн - EditorPDF", zh: "在线编辑PDF - EditorPDF" },
      metaDesc: { es: "Edita cualquier PDF online: modifica texto, añade imágenes, reorganiza páginas. Seguro y rápido.", en: "Edit any PDF online: modify text, add images, reorganize pages. Secure and fast.", fr: "Éditez tout PDF en ligne : modifiez le texte, ajoutez des images, réorganisez les pages.", de: "Bearbeiten Sie jede PDF online: Text ändern, Bilder hinzufügen, Seiten neu ordnen.", pt: "Edite qualquer PDF online: modifique texto, adicione imagens, reorganize páginas.", it: "Modifica qualsiasi PDF online: cambia testo, aggiungi immagini, riorganizza pagine.", nl: "Bewerk elke PDF online: wijzig tekst, voeg afbeeldingen toe, herorden pagina's.", pl: "Edytuj dowolny PDF online: modyfikuj tekst, dodawaj obrazy, reorganizuj strony.", ru: "Редактируйте любой PDF онлайн: меняйте текст, добавляйте изображения, переупорядочивайте страницы.", zh: "在线编辑任何PDF：修改文本、添加图片、重新排列页面。" },
      cta: SHARED_CTA, badge1: SHARED_BADGES.b1, badge2: SHARED_BADGES.b2, badge3: SHARED_BADGES.b3,
    },
  },
  {
    slug: "sign-pdf-online",
    editorTool: "sign",
    icon: SignPdfIcon,
    content: {
      title:    { es: "Firma PDF Online", en: "Sign PDF Online", fr: "Signer PDF en ligne", de: "PDF online unterschreiben", pt: "Assinar PDF Online", it: "Firma PDF Online", nl: "PDF online ondertekenen", pl: "Podpisz PDF online", ru: "Подписать PDF онлайн", zh: "在线签署PDF" },
      subtitle: { es: "Añade tu firma digital a cualquier documento PDF en segundos — sin imprimir", en: "Add your digital signature to any PDF document in seconds — no printing needed", fr: "Ajoutez votre signature numérique à tout document PDF en quelques secondes", de: "Fügen Sie Ihre digitale Unterschrift in Sekunden zu jedem PDF hinzu", pt: "Adicione sua assinatura digital a qualquer PDF em segundos — sem imprimir", it: "Aggiungi la tua firma digitale a qualsiasi PDF in pochi secondi", nl: "Voeg uw digitale handtekening toe aan elk PDF-document in seconden", pl: "Dodaj swój podpis cyfrowy do dowolnego PDF w kilka sekund", ru: "Добавьте цифровую подпись к любому PDF за считанные секунды", zh: "几秒钟内为任何PDF文档添加数字签名" },
      metaTitle:{ es: "Firmar PDF Online - EditorPDF", en: "Sign PDF Online - EditorPDF", fr: "Signer PDF en ligne - EditorPDF", de: "PDF online unterschreiben - EditorPDF", pt: "Assinar PDF Online - EditorPDF", it: "Firma PDF Online - EditorPDF", nl: "PDF online ondertekenen - EditorPDF", pl: "Podpisz PDF online - EditorPDF", ru: "Подписать PDF онлайн - EditorPDF", zh: "在线签署PDF - EditorPDF" },
      metaDesc: { es: "Firma cualquier PDF online con tu firma digital. Sin imprimir, sin escáner. Rápido y seguro.", en: "Sign any PDF online with your digital signature. No printing, no scanner needed. Fast and secure.", fr: "Signez tout PDF en ligne avec votre signature numérique. Rapide et sécurisé.", de: "Unterschreiben Sie jede PDF online mit Ihrer digitalen Unterschrift. Schnell und sicher.", pt: "Assine qualquer PDF online com sua assinatura digital. Rápido e seguro.", it: "Firma qualsiasi PDF online con la tua firma digitale. Veloce e sicuro.", nl: "Onderteken elke PDF online met uw digitale handtekening. Snel en veilig.", pl: "Podpisz dowolny PDF online swoim podpisem cyfrowym. Szybko i bezpiecznie.", ru: "Подпишите любой PDF онлайн цифровой подписью. Быстро и безопасно.", zh: "使用数字签名在线签署任何PDF。快速安全。" },
      cta: SHARED_CTA, badge1: SHARED_BADGES.b1, badge2: SHARED_BADGES.b2, badge3: SHARED_BADGES.b3,
    },
  },
  {
    slug: "word-to-pdf",
    editorTool: "word-to-pdf",
    icon: WordToPdfIcon,
    acceptExtra: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    content: {
      title:    { es: "Convertir Word a PDF", en: "Word to PDF Converter", fr: "Convertir Word en PDF", de: "Word in PDF umwandeln", pt: "Converter Word para PDF", it: "Convertire Word in PDF", nl: "Word naar PDF converteren", pl: "Konwertuj Word do PDF", ru: "Конвертировать Word в PDF", zh: "Word转PDF转换器" },
      subtitle: { es: "Convierte documentos Word (.doc, .docx) a PDF con formato perfecto en un clic", en: "Convert Word documents (.doc, .docx) to PDF with perfect formatting in one click", fr: "Convertissez vos documents Word (.doc, .docx) en PDF avec une mise en page parfaite", de: "Konvertieren Sie Word-Dokumente (.doc, .docx) in PDF mit perfekter Formatierung", pt: "Converta documentos Word (.doc, .docx) para PDF com formatação perfeita", it: "Converti documenti Word (.doc, .docx) in PDF con formattazione perfetta", nl: "Converteer Word-documenten (.doc, .docx) naar PDF met perfecte opmaak", pl: "Konwertuj dokumenty Word (.doc, .docx) do PDF z idealnym formatowaniem", ru: "Конвертируйте документы Word (.doc, .docx) в PDF с идеальным форматированием", zh: "一键将Word文档（.doc、.docx）转换为格式完美的PDF" },
      metaTitle:{ es: "Convertir Word a PDF Online - EditorPDF", en: "Word to PDF Converter Online - EditorPDF", fr: "Convertir Word en PDF en ligne - EditorPDF", de: "Word in PDF umwandeln online - EditorPDF", pt: "Converter Word para PDF Online - EditorPDF", it: "Convertire Word in PDF Online - EditorPDF", nl: "Word naar PDF converteren online - EditorPDF", pl: "Konwertuj Word do PDF online - EditorPDF", ru: "Конвертировать Word в PDF онлайн - EditorPDF", zh: "在线Word转PDF转换器 - EditorPDF" },
      metaDesc: { es: "Convierte Word a PDF online gratis. Mantiene el formato original. Rápido, seguro y sin instalar nada.", en: "Convert Word to PDF online. Keeps original formatting. Fast, secure, no installation needed.", fr: "Convertissez Word en PDF en ligne. Conserve le format original. Rapide et sécurisé.", de: "Konvertieren Sie Word in PDF online. Behält die Originalformatierung. Schnell und sicher.", pt: "Converta Word para PDF online. Mantém a formatação original. Rápido e seguro.", it: "Converti Word in PDF online. Mantiene la formattazione originale. Veloce e sicuro.", nl: "Converteer Word naar PDF online. Behoudt originele opmaak. Snel en veilig.", pl: "Konwertuj Word do PDF online. Zachowuje oryginalny format. Szybko i bezpiecznie.", ru: "Конвертируйте Word в PDF онлайн. Сохраняет оригинальное форматирование. Быстро и безопасно.", zh: "在线将Word转换为PDF。保持原始格式。快速、安全、无需安装。" },
      cta: SHARED_CTA, badge1: SHARED_BADGES.b1, badge2: SHARED_BADGES.b2, badge3: SHARED_BADGES.b3,
    },
  },
  {
    slug: "jpg-to-pdf",
    editorTool: "jpg-to-pdf",
    icon: JpgToPdfIcon,
    acceptExtra: "image/jpeg,image/png,image/webp",
    content: {
      title:    { es: "Convertir JPG a PDF", en: "JPG to PDF Converter", fr: "Convertir JPG en PDF", de: "JPG in PDF umwandeln", pt: "Converter JPG para PDF", it: "Convertire JPG in PDF", nl: "JPG naar PDF converteren", pl: "Konwertuj JPG do PDF", ru: "Конвертировать JPG в PDF", zh: "JPG转PDF转换器" },
      subtitle: { es: "Convierte imágenes JPG, PNG o WEBP a un documento PDF de alta calidad", en: "Convert JPG, PNG, or WEBP images to a high-quality PDF document", fr: "Convertissez vos images JPG, PNG ou WEBP en un document PDF de haute qualité", de: "Konvertieren Sie JPG-, PNG- oder WEBP-Bilder in ein hochwertiges PDF", pt: "Converta imagens JPG, PNG ou WEBP para um documento PDF de alta qualidade", it: "Converti immagini JPG, PNG o WEBP in un documento PDF di alta qualità", nl: "Converteer JPG-, PNG- of WEBP-afbeeldingen naar een PDF van hoge kwaliteit", pl: "Konwertuj obrazy JPG, PNG lub WEBP do dokumentu PDF wysokiej jakości", ru: "Конвертируйте изображения JPG, PNG или WEBP в качественный PDF-документ", zh: "将JPG、PNG或WEBP图片转换为高质量PDF文档" },
      metaTitle:{ es: "Convertir JPG a PDF Online - EditorPDF", en: "JPG to PDF Converter Online - EditorPDF", fr: "Convertir JPG en PDF en ligne - EditorPDF", de: "JPG in PDF umwandeln online - EditorPDF", pt: "Converter JPG para PDF Online - EditorPDF", it: "Convertire JPG in PDF Online - EditorPDF", nl: "JPG naar PDF converteren online - EditorPDF", pl: "Konwertuj JPG do PDF online - EditorPDF", ru: "Конвертировать JPG в PDF онлайн - EditorPDF", zh: "在线JPG转PDF转换器 - EditorPDF" },
      metaDesc: { es: "Convierte JPG a PDF online. Alta calidad, rápido y seguro. Sin instalar nada.", en: "Convert JPG to PDF online. High quality, fast and secure. No installation needed.", fr: "Convertissez JPG en PDF en ligne. Haute qualité, rapide et sécurisé.", de: "Konvertieren Sie JPG in PDF online. Hohe Qualität, schnell und sicher.", pt: "Converta JPG para PDF online. Alta qualidade, rápido e seguro.", it: "Converti JPG in PDF online. Alta qualità, veloce e sicuro.", nl: "Converteer JPG naar PDF online. Hoge kwaliteit, snel en veilig.", pl: "Konwertuj JPG do PDF online. Wysoka jakość, szybko i bezpiecznie.", ru: "Конвертируйте JPG в PDF онлайн. Высокое качество, быстро и безопасно.", zh: "在线将JPG转换为PDF。高质量、快速、安全。" },
      cta: SHARED_CTA, badge1: SHARED_BADGES.b1, badge2: SHARED_BADGES.b2, badge3: SHARED_BADGES.b3,
    },
  },
  {
    slug: "compress-pdf-online",
    editorTool: "compress",
    icon: CompressPdfIcon,
    content: {
      title:    { es: "Comprimir PDF Online", en: "Compress PDF Online", fr: "Compresser PDF en ligne", de: "PDF online komprimieren", pt: "Comprimir PDF Online", it: "Comprimi PDF Online", nl: "PDF online comprimeren", pl: "Kompresuj PDF online", ru: "Сжать PDF онлайн", zh: "在线压缩PDF" },
      subtitle: { es: "Reduce el tamaño de tus PDFs hasta un 70% sin perder calidad — ideal para email", en: "Reduce your PDF file size by up to 70% without losing quality — perfect for email", fr: "Réduisez la taille de vos PDF jusqu'à 70% sans perte de qualité — idéal pour l'email", de: "Reduzieren Sie die PDF-Dateigröße um bis zu 70% ohne Qualitätsverlust", pt: "Reduza o tamanho dos seus PDFs em até 70% sem perder qualidade", it: "Riduci le dimensioni dei tuoi PDF fino al 70% senza perdere qualità", nl: "Verklein uw PDF-bestand tot 70% zonder kwaliteitsverlies", pl: "Zmniejsz rozmiar PDF nawet o 70% bez utraty jakości", ru: "Уменьшите размер PDF до 70% без потери качества", zh: "将PDF文件大小缩小高达70%，不损失质量" },
      metaTitle:{ es: "Comprimir PDF Online - EditorPDF", en: "Compress PDF Online - EditorPDF", fr: "Compresser PDF en ligne - EditorPDF", de: "PDF online komprimieren - EditorPDF", pt: "Comprimir PDF Online - EditorPDF", it: "Comprimi PDF Online - EditorPDF", nl: "PDF online comprimeren - EditorPDF", pl: "Kompresuj PDF online - EditorPDF", ru: "Сжать PDF онлайн - EditorPDF", zh: "在线压缩PDF - EditorPDF" },
      metaDesc: { es: "Comprime PDF online: reduce el tamaño hasta un 70%. Rápido, seguro y sin instalar nada.", en: "Compress PDF online: reduce file size by up to 70%. Fast, secure, no installation needed.", fr: "Compressez PDF en ligne : réduisez la taille jusqu'à 70%. Rapide et sécurisé.", de: "PDF online komprimieren: Dateigröße um bis zu 70% reduzieren. Schnell und sicher.", pt: "Comprima PDF online: reduza o tamanho em até 70%. Rápido e seguro.", it: "Comprimi PDF online: riduci le dimensioni fino al 70%. Veloce e sicuro.", nl: "Comprimeer PDF online: verklein bestandsgrootte tot 70%. Snel en veilig.", pl: "Kompresuj PDF online: zmniejsz rozmiar do 70%. Szybko i bezpiecznie.", ru: "Сжатие PDF онлайн: уменьшите размер до 70%. Быстро и безопасно.", zh: "在线压缩PDF：文件大小最多缩小70%。快速、安全。" },
      cta: SHARED_CTA, badge1: SHARED_BADGES.b1, badge2: SHARED_BADGES.b2, badge3: SHARED_BADGES.b3,
    },
  },
  {
    slug: "convert-pdf-online",
    editorTool: "convert-word",
    icon: ConvertPdfIcon,
    content: {
      title:    { es: "Convertir PDF Online", en: "Convert PDF Online", fr: "Convertir PDF en ligne", de: "PDF online konvertieren", pt: "Converter PDF Online", it: "Converti PDF Online", nl: "PDF online converteren", pl: "Konwertuj PDF online", ru: "Конвертировать PDF онлайн", zh: "在线转换PDF" },
      subtitle: { es: "Convierte PDF a Word, Excel, JPG, PNG y más — o al revés, todo desde el navegador", en: "Convert PDF to Word, Excel, JPG, PNG and more — or the other way around, all in your browser", fr: "Convertissez PDF en Word, Excel, JPG, PNG et plus — ou l'inverse, tout dans votre navigateur", de: "Konvertieren Sie PDF in Word, Excel, JPG, PNG und mehr — oder umgekehrt", pt: "Converta PDF para Word, Excel, JPG, PNG e mais — ou o contrário, tudo no navegador", it: "Converti PDF in Word, Excel, JPG, PNG e altro — o viceversa, tutto nel browser", nl: "Converteer PDF naar Word, Excel, JPG, PNG en meer — of andersom, alles in uw browser", pl: "Konwertuj PDF do Word, Excel, JPG, PNG i więcej — lub odwrotnie, wszystko w przeglądarce", ru: "Конвертируйте PDF в Word, Excel, JPG, PNG и другие форматы — или наоборот", zh: "将PDF转换为Word、Excel、JPG、PNG等格式——或反向转换" },
      metaTitle:{ es: "Convertir PDF Online - EditorPDF", en: "Convert PDF Online - EditorPDF", fr: "Convertir PDF en ligne - EditorPDF", de: "PDF online konvertieren - EditorPDF", pt: "Converter PDF Online - EditorPDF", it: "Converti PDF Online - EditorPDF", nl: "PDF online converteren - EditorPDF", pl: "Konwertuj PDF online - EditorPDF", ru: "Конвертировать PDF онлайн - EditorPDF", zh: "在线转换PDF - EditorPDF" },
      metaDesc: { es: "Convierte PDF a Word, Excel, JPG y más formatos online. Rápido, seguro y sin instalar nada.", en: "Convert PDF to Word, Excel, JPG and more formats online. Fast, secure, no installation needed.", fr: "Convertissez PDF en Word, Excel, JPG et plus de formats en ligne. Rapide et sécurisé.", de: "Konvertieren Sie PDF in Word, Excel, JPG und mehr Formate online. Schnell und sicher.", pt: "Converta PDF para Word, Excel, JPG e mais formatos online. Rápido e seguro.", it: "Converti PDF in Word, Excel, JPG e altri formati online. Veloce e sicuro.", nl: "Converteer PDF naar Word, Excel, JPG en meer formaten online. Snel en veilig.", pl: "Konwertuj PDF do Word, Excel, JPG i innych formatów online. Szybko i bezpiecznie.", ru: "Конвертируйте PDF в Word, Excel, JPG и другие форматы онлайн. Быстро и безопасно.", zh: "在线将PDF转换为Word、Excel、JPG等格式。快速、安全。" },
      cta: SHARED_CTA, badge1: SHARED_BADGES.b1, badge2: SHARED_BADGES.b2, badge3: SHARED_BADGES.b3,
    },
  },
];

// ── Component ─────────────────────────────────────────────────

export default function AdLanding({ page }: { page: AdPage }) {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const { setPendingFile, setPendingTool } = usePdfFile();
  const fileRef = useRef<HTMLInputElement>(null);
  const l = (lang as LangCode) || "en";

  const c = page.content;
  const Icon = page.icon;

  useEffect(() => {
    document.title = c.metaTitle[l] || c.metaTitle.en;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", c.metaDesc[l] || c.metaDesc.en);
    window.scrollTo(0, 0);
  }, [l, page]);

  const handleCta = () => {
    if (page.editorTool) setPendingTool(page.editorTool);
    fileRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    navigate(`/${l}/editor`);
  };

  const accept = page.acceptExtra
    ? `application/pdf,.pdf,${page.acceptExtra}`
    : "application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
      />

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-16 md:py-24">
        <div className="max-w-xl w-full text-center flex flex-col items-center">
          {/* Icon */}
          <div
            className="w-28 h-28 md:w-32 md:h-32 rounded-3xl flex items-center justify-center mb-8"
            style={{ backgroundColor: "rgba(27, 94, 32, 0.07)" }}
          >
            <Icon size={72} />
          </div>

          {/* Title */}
          <h1
            className="text-3xl md:text-5xl font-extrabold leading-tight mb-4 tracking-tight"
            style={{ color: "#0f172a" }}
          >
            {c.title[l] || c.title.en}
          </h1>

          {/* Subtitle */}
          <p
            className="text-base md:text-lg leading-relaxed mb-8 max-w-md mx-auto"
            style={{ color: "#64748b" }}
          >
            {c.subtitle[l] || c.subtitle.en}
          </p>

          {/* CTA Button */}
          <button
            onClick={handleCta}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-white text-base md:text-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 mb-8"
            style={{
              backgroundColor: colors.primary,
              boxShadow: "0 8px 24px rgba(27, 94, 32, 0.3)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v10M6 9l4 4 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 15v2h14v-2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {c.cta[l] || c.cta.en}
          </button>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm" style={{ color: "#64748b" }}>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" style={{ color: colors.primary }} />
              {c.badge1[l] || c.badge1.en}
            </span>
            <span className="w-px h-4 rounded-full" style={{ backgroundColor: "#e2e8f0" }} />
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4" style={{ color: colors.primary }} />
              {c.badge2[l] || c.badge2.en}
            </span>
            <span className="w-px h-4 rounded-full" style={{ backgroundColor: "#e2e8f0" }} />
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4" style={{ color: colors.primary }} />
              {c.badge3[l] || c.badge3.en}
            </span>
          </div>

          {/* Brand trust line */}
          <p className="mt-6 text-xs" style={{ color: "#94a3b8" }}>
            {brandName} — editorpdf.net
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
