import Home, { type HomeOverrides } from "./Home";
import { useLanguage } from "@/contexts/LanguageContext";

type LangCode = "es" | "en" | "fr" | "de" | "pt" | "it" | "nl" | "pl" | "ru" | "zh";

interface AdPageDef {
  slug: string;
  title: Record<LangCode, string>;
  highlight: Record<LangCode, string>;
  subtitle: Record<LangCode, string>;
  metaTitle: Record<LangCode, string>;
  metaDesc: Record<LangCode, string>;
  editorTool?: string;
}

export const AD_PAGES: AdPageDef[] = [
  {
    slug: "edit-pdf-online",
    title:     { es: "Edita", en: "Edit", fr: "Modifier", de: "Bearbeiten", pt: "Editar", it: "Modifica", nl: "Bewerk", pl: "Edytuj", ru: "Редактировать", zh: "编辑" },
    highlight: { es: "PDF Online", en: "PDF Online", fr: "PDF en ligne", de: "PDF Online", pt: "PDF Online", it: "PDF Online", nl: "PDF Online", pl: "PDF Online", ru: "PDF онлайн", zh: "PDF 在线" },
    subtitle:  { es: "Modifica texto, imágenes y páginas de cualquier PDF directamente en tu navegador", en: "Modify text, images, and pages of any PDF directly in your browser", fr: "Modifiez texte, images et pages de tout PDF directement dans votre navigateur", de: "Bearbeiten Sie Text, Bilder und Seiten jeder PDF direkt im Browser", pt: "Modifique texto, imagens e páginas de qualquer PDF diretamente no navegador", it: "Modifica testo, immagini e pagine di qualsiasi PDF direttamente nel browser", nl: "Bewerk tekst, afbeeldingen en pagina's van elke PDF rechtstreeks in uw browser", pl: "Modyfikuj tekst, obrazy i strony dowolnego PDF bezpośrednio w przeglądarce", ru: "Редактируйте текст, изображения и страницы любого PDF прямо в браузере", zh: "直接在浏览器中修改任何PDF的文本、图片和页面" },
    metaTitle: { es: "Editar PDF Online - EditorPDF", en: "Edit PDF Online - EditorPDF", fr: "Modifier PDF en ligne - EditorPDF", de: "PDF online bearbeiten - EditorPDF", pt: "Editar PDF Online - EditorPDF", it: "Modifica PDF Online - EditorPDF", nl: "PDF online bewerken - EditorPDF", pl: "Edytuj PDF online - EditorPDF", ru: "Редактировать PDF онлайн - EditorPDF", zh: "在线编辑PDF - EditorPDF" },
    metaDesc:  { es: "Edita cualquier PDF online: modifica texto, añade imágenes, reorganiza páginas. Seguro y rápido.", en: "Edit any PDF online: modify text, add images, reorganize pages. Secure and fast.", fr: "Éditez tout PDF en ligne : modifiez le texte, ajoutez des images, réorganisez les pages.", de: "Bearbeiten Sie jede PDF online: Text ändern, Bilder hinzufügen, Seiten neu ordnen.", pt: "Edite qualquer PDF online: modifique texto, adicione imagens, reorganize páginas.", it: "Modifica qualsiasi PDF online: cambia testo, aggiungi immagini, riorganizza pagine.", nl: "Bewerk elke PDF online: wijzig tekst, voeg afbeeldingen toe, herorden pagina's.", pl: "Edytuj dowolny PDF online: modyfikuj tekst, dodawaj obrazy, reorganizuj strony.", ru: "Редактируйте любой PDF онлайн: меняйте текст, добавляйте изображения.", zh: "在线编辑任何PDF：修改文本、添加图片、重新排列页面。" },
  },
  {
    slug: "sign-pdf-online",
    editorTool: "sign",
    title:     { es: "Firma", en: "Sign", fr: "Signer", de: "Unterschreiben", pt: "Assinar", it: "Firma", nl: "Onderteken", pl: "Podpisz", ru: "Подписать", zh: "签署" },
    highlight: { es: "PDF Online", en: "PDF Online", fr: "PDF en ligne", de: "PDF Online", pt: "PDF Online", it: "PDF Online", nl: "PDF Online", pl: "PDF Online", ru: "PDF онлайн", zh: "PDF 在线" },
    subtitle:  { es: "Añade tu firma digital a cualquier documento PDF en segundos — sin imprimir", en: "Add your digital signature to any PDF document in seconds — no printing needed", fr: "Ajoutez votre signature numérique à tout document PDF en quelques secondes", de: "Fügen Sie Ihre digitale Unterschrift in Sekunden zu jedem PDF hinzu", pt: "Adicione sua assinatura digital a qualquer PDF em segundos — sem imprimir", it: "Aggiungi la tua firma digitale a qualsiasi PDF in pochi secondi", nl: "Voeg uw digitale handtekening toe aan elk PDF-document in seconden", pl: "Dodaj swój podpis cyfrowy do dowolnego PDF w kilka sekund", ru: "Добавьте цифровую подпись к любому PDF за считанные секунды", zh: "几秒钟内为任何PDF文档添加数字签名" },
    metaTitle: { es: "Firmar PDF Online - EditorPDF", en: "Sign PDF Online - EditorPDF", fr: "Signer PDF en ligne - EditorPDF", de: "PDF online unterschreiben - EditorPDF", pt: "Assinar PDF Online - EditorPDF", it: "Firma PDF Online - EditorPDF", nl: "PDF online ondertekenen - EditorPDF", pl: "Podpisz PDF online - EditorPDF", ru: "Подписать PDF онлайн - EditorPDF", zh: "在线签署PDF - EditorPDF" },
    metaDesc:  { es: "Firma cualquier PDF online con tu firma digital. Sin imprimir, sin escáner.", en: "Sign any PDF online with your digital signature. No printing, no scanner needed.", fr: "Signez tout PDF en ligne avec votre signature numérique. Rapide et sécurisé.", de: "Unterschreiben Sie jede PDF online mit Ihrer digitalen Unterschrift.", pt: "Assine qualquer PDF online com sua assinatura digital. Rápido e seguro.", it: "Firma qualsiasi PDF online con la tua firma digitale. Veloce e sicuro.", nl: "Onderteken elke PDF online met uw digitale handtekening.", pl: "Podpisz dowolny PDF online swoim podpisem cyfrowym.", ru: "Подпишите любой PDF онлайн цифровой подписью.", zh: "使用数字签名在线签署任何PDF。" },
  },
  {
    slug: "word-to-pdf",
    title:     { es: "Convertir Word a", en: "Word to", fr: "Convertir Word en", de: "Word in", pt: "Converter Word para", it: "Convertire Word in", nl: "Word naar", pl: "Konwertuj Word do", ru: "Конвертировать Word в", zh: "Word 转" },
    highlight: { es: "PDF", en: "PDF", fr: "PDF", de: "PDF", pt: "PDF", it: "PDF", nl: "PDF", pl: "PDF", ru: "PDF", zh: "PDF" },
    subtitle:  { es: "Convierte documentos Word (.doc, .docx) a PDF con formato perfecto en un clic", en: "Convert Word documents (.doc, .docx) to PDF with perfect formatting in one click", fr: "Convertissez vos documents Word en PDF avec une mise en page parfaite", de: "Konvertieren Sie Word-Dokumente in PDF mit perfekter Formatierung", pt: "Converta documentos Word para PDF com formatação perfeita", it: "Converti documenti Word in PDF con formattazione perfetta", nl: "Converteer Word-documenten naar PDF met perfecte opmaak", pl: "Konwertuj dokumenty Word do PDF z idealnym formatowaniem", ru: "Конвертируйте документы Word в PDF с идеальным форматированием", zh: "一键将Word文档转换为格式完美的PDF" },
    metaTitle: { es: "Convertir Word a PDF Online - EditorPDF", en: "Word to PDF Converter Online - EditorPDF", fr: "Convertir Word en PDF en ligne - EditorPDF", de: "Word in PDF umwandeln - EditorPDF", pt: "Converter Word para PDF - EditorPDF", it: "Convertire Word in PDF - EditorPDF", nl: "Word naar PDF converteren - EditorPDF", pl: "Konwertuj Word do PDF - EditorPDF", ru: "Конвертировать Word в PDF - EditorPDF", zh: "Word转PDF在线转换器 - EditorPDF" },
    metaDesc:  { es: "Convierte Word a PDF online. Mantiene el formato original. Rápido y seguro.", en: "Convert Word to PDF online. Keeps original formatting. Fast and secure.", fr: "Convertissez Word en PDF en ligne. Conserve le format original.", de: "Word in PDF online konvertieren. Behält Originalformatierung.", pt: "Converta Word para PDF online. Mantém formatação original.", it: "Converti Word in PDF online. Mantiene formattazione originale.", nl: "Converteer Word naar PDF online. Behoudt originele opmaak.", pl: "Konwertuj Word do PDF online. Zachowuje oryginalny format.", ru: "Конвертируйте Word в PDF онлайн. Сохраняет форматирование.", zh: "在线将Word转换为PDF。保持原始格式。" },
  },
  {
    slug: "jpg-to-pdf",
    title:     { es: "Convertir JPG a", en: "JPG to", fr: "Convertir JPG en", de: "JPG in", pt: "Converter JPG para", it: "Convertire JPG in", nl: "JPG naar", pl: "Konwertuj JPG do", ru: "Конвертировать JPG в", zh: "JPG 转" },
    highlight: { es: "PDF", en: "PDF", fr: "PDF", de: "PDF", pt: "PDF", it: "PDF", nl: "PDF", pl: "PDF", ru: "PDF", zh: "PDF" },
    subtitle:  { es: "Convierte imágenes JPG, PNG o WEBP a un documento PDF de alta calidad", en: "Convert JPG, PNG, or WEBP images to a high-quality PDF document", fr: "Convertissez vos images JPG, PNG ou WEBP en un document PDF de haute qualité", de: "Konvertieren Sie JPG-, PNG- oder WEBP-Bilder in ein hochwertiges PDF", pt: "Converta imagens JPG, PNG ou WEBP para um PDF de alta qualidade", it: "Converti immagini JPG, PNG o WEBP in un PDF di alta qualità", nl: "Converteer JPG-, PNG- of WEBP-afbeeldingen naar een PDF", pl: "Konwertuj obrazy JPG, PNG lub WEBP do PDF wysokiej jakości", ru: "Конвертируйте изображения JPG, PNG или WEBP в качественный PDF", zh: "将JPG、PNG或WEBP图片转换为高质量PDF文档" },
    metaTitle: { es: "Convertir JPG a PDF Online - EditorPDF", en: "JPG to PDF Converter Online - EditorPDF", fr: "Convertir JPG en PDF en ligne - EditorPDF", de: "JPG in PDF umwandeln - EditorPDF", pt: "Converter JPG para PDF - EditorPDF", it: "Convertire JPG in PDF - EditorPDF", nl: "JPG naar PDF converteren - EditorPDF", pl: "Konwertuj JPG do PDF - EditorPDF", ru: "Конвертировать JPG в PDF - EditorPDF", zh: "JPG转PDF在线转换器 - EditorPDF" },
    metaDesc:  { es: "Convierte JPG a PDF online. Alta calidad, rápido y seguro.", en: "Convert JPG to PDF online. High quality, fast and secure.", fr: "Convertissez JPG en PDF en ligne. Haute qualité, rapide.", de: "JPG in PDF online konvertieren. Hohe Qualität, schnell.", pt: "Converta JPG para PDF online. Alta qualidade, rápido.", it: "Converti JPG in PDF online. Alta qualità, veloce.", nl: "Converteer JPG naar PDF online. Hoge kwaliteit, snel.", pl: "Konwertuj JPG do PDF online. Wysoka jakość, szybko.", ru: "Конвертируйте JPG в PDF онлайн. Высокое качество.", zh: "在线将JPG转换为PDF。高质量、快速。" },
  },
  {
    slug: "compress-pdf-online",
    title:     { es: "Comprimir", en: "Compress", fr: "Compresser", de: "Komprimieren", pt: "Comprimir", it: "Comprimi", nl: "Comprimeer", pl: "Kompresuj", ru: "Сжать", zh: "压缩" },
    highlight: { es: "PDF Online", en: "PDF Online", fr: "PDF en ligne", de: "PDF Online", pt: "PDF Online", it: "PDF Online", nl: "PDF Online", pl: "PDF Online", ru: "PDF онлайн", zh: "PDF 在线" },
    subtitle:  { es: "Reduce el tamaño de tus PDFs hasta un 70% sin perder calidad — ideal para email", en: "Reduce your PDF file size by up to 70% without losing quality — perfect for email", fr: "Réduisez la taille de vos PDF jusqu'à 70% sans perte de qualité", de: "Reduzieren Sie die PDF-Dateigröße um bis zu 70% ohne Qualitätsverlust", pt: "Reduza o tamanho dos seus PDFs em até 70% sem perder qualidade", it: "Riduci le dimensioni dei tuoi PDF fino al 70% senza perdere qualità", nl: "Verklein uw PDF-bestand tot 70% zonder kwaliteitsverlies", pl: "Zmniejsz rozmiar PDF nawet o 70% bez utraty jakości", ru: "Уменьшите размер PDF до 70% без потери качества", zh: "将PDF文件大小缩小高达70%，不损失质量" },
    metaTitle: { es: "Comprimir PDF Online - EditorPDF", en: "Compress PDF Online - EditorPDF", fr: "Compresser PDF en ligne - EditorPDF", de: "PDF online komprimieren - EditorPDF", pt: "Comprimir PDF Online - EditorPDF", it: "Comprimi PDF Online - EditorPDF", nl: "PDF online comprimeren - EditorPDF", pl: "Kompresuj PDF online - EditorPDF", ru: "Сжать PDF онлайн - EditorPDF", zh: "在线压缩PDF - EditorPDF" },
    metaDesc:  { es: "Comprime PDF online: reduce el tamaño hasta un 70%. Rápido y seguro.", en: "Compress PDF online: reduce file size by up to 70%. Fast and secure.", fr: "Compressez PDF en ligne : réduisez la taille jusqu'à 70%.", de: "PDF online komprimieren: Dateigröße um bis zu 70% reduzieren.", pt: "Comprima PDF online: reduza o tamanho em até 70%.", it: "Comprimi PDF online: riduci le dimensioni fino al 70%.", nl: "Comprimeer PDF online: verklein bestandsgrootte tot 70%.", pl: "Kompresuj PDF online: zmniejsz rozmiar do 70%.", ru: "Сжатие PDF онлайн: уменьшите размер до 70%.", zh: "在线压缩PDF：文件大小最多缩小70%。" },
  },
  {
    slug: "convert-pdf-online",
    title:     { es: "Convertir", en: "Convert", fr: "Convertir", de: "Konvertieren", pt: "Converter", it: "Converti", nl: "Converteer", pl: "Konwertuj", ru: "Конвертировать", zh: "转换" },
    highlight: { es: "PDF Online", en: "PDF Online", fr: "PDF en ligne", de: "PDF Online", pt: "PDF Online", it: "PDF Online", nl: "PDF Online", pl: "PDF Online", ru: "PDF онлайн", zh: "PDF 在线" },
    subtitle:  { es: "Convierte PDF a Word, Excel, JPG, PNG y más — o al revés, todo desde el navegador", en: "Convert PDF to Word, Excel, JPG, PNG and more — or the other way around, all in your browser", fr: "Convertissez PDF en Word, Excel, JPG, PNG et plus — tout dans votre navigateur", de: "Konvertieren Sie PDF in Word, Excel, JPG, PNG und mehr — direkt im Browser", pt: "Converta PDF para Word, Excel, JPG, PNG e mais — tudo no navegador", it: "Converti PDF in Word, Excel, JPG, PNG e altro — tutto nel browser", nl: "Converteer PDF naar Word, Excel, JPG, PNG en meer — alles in uw browser", pl: "Konwertuj PDF do Word, Excel, JPG, PNG i więcej — wszystko w przeglądarce", ru: "Конвертируйте PDF в Word, Excel, JPG, PNG и другие форматы", zh: "将PDF转换为Word、Excel、JPG、PNG等格式" },
    metaTitle: { es: "Convertir PDF Online - EditorPDF", en: "Convert PDF Online - EditorPDF", fr: "Convertir PDF en ligne - EditorPDF", de: "PDF online konvertieren - EditorPDF", pt: "Converter PDF Online - EditorPDF", it: "Converti PDF Online - EditorPDF", nl: "PDF online converteren - EditorPDF", pl: "Konwertuj PDF online - EditorPDF", ru: "Конвертировать PDF онлайн - EditorPDF", zh: "在线转换PDF - EditorPDF" },
    metaDesc:  { es: "Convierte PDF a Word, Excel, JPG y más formatos online. Rápido y seguro.", en: "Convert PDF to Word, Excel, JPG and more formats online. Fast and secure.", fr: "Convertissez PDF en Word, Excel, JPG et plus en ligne.", de: "PDF in Word, Excel, JPG und mehr online konvertieren.", pt: "Converta PDF para Word, Excel, JPG e mais online.", it: "Converti PDF in Word, Excel, JPG e altri formati online.", nl: "Converteer PDF naar Word, Excel, JPG en meer online.", pl: "Konwertuj PDF do Word, Excel, JPG i innych online.", ru: "Конвертируйте PDF в Word, Excel, JPG и другие форматы онлайн.", zh: "在线将PDF转换为Word、Excel、JPG等格式。" },
  },
];

export default function AdLanding({ page }: { page: AdPageDef }) {
  const { lang } = useLanguage();
  const l = (lang as LangCode) || "en";

  const overrides: HomeOverrides = {
    heroTitle: page.title[l] || page.title.en,
    heroHighlight: page.highlight[l] || page.highlight.en,
    heroSubtitle: page.subtitle[l] || page.subtitle.en,
    metaTitle: page.metaTitle[l] || page.metaTitle.en,
    metaDesc: page.metaDesc[l] || page.metaDesc.en,
    editorTool: page.editorTool,
  };

  return <Home overrides={overrides} />;
}
