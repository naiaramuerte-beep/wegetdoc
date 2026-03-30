import { readFileSync, writeFileSync } from "fs";

const FILE = "client/src/lib/i18n.ts";
let src = readFileSync(FILE, "utf8");

// New keys to add
const newKeys = {
  editor_panel_select_image_label: {
    es: "Seleccionar imagen",
    en: "Select image",
    fr: "Sélectionner une image",
    de: "Bild auswählen",
    pt: "Selecionar imagem",
    it: "Seleziona immagine",
    nl: "Afbeelding selecteren",
    pl: "Wybierz obraz",
    ru: "Выбрать изображение",
    zh: "选择图片",
  },
  editor_panel_split_at_page: {
    es: "Dividir PDF en página:",
    en: "Split PDF at page:",
    fr: "Diviser le PDF à la page :",
    de: "PDF an Seite teilen:",
    pt: "Dividir PDF na página:",
    it: "Dividi PDF alla pagina:",
    nl: "PDF splitsen op pagina:",
    pl: "Podziel PDF na stronie:",
    ru: "Разделить PDF на странице:",
    zh: "在页面拆分PDF：",
  },
  editor_panel_split_btn: {
    es: "Dividir",
    en: "Split",
    fr: "Diviser",
    de: "Teilen",
    pt: "Dividir",
    it: "Dividi",
    nl: "Splitsen",
    pl: "Podziel",
    ru: "Разделить",
    zh: "拆分",
  },
  editor_panel_page_short: {
    es: "Pág.",
    en: "Page",
    fr: "Page",
    de: "Seite",
    pt: "Pág.",
    it: "Pag.",
    nl: "Pag.",
    pl: "Str.",
    ru: "Стр.",
    zh: "页",
  },
  editor_panel_coming_soon: {
    es: "Próximamente",
    en: "Coming soon",
    fr: "Bientôt disponible",
    de: "Demnächst verfügbar",
    pt: "Em breve",
    it: "Prossimamente",
    nl: "Binnenkort beschikbaar",
    pl: "Wkrótce",
    ru: "Скоро",
    zh: "即将推出",
  },
  editor_panel_conversion_coming: {
    es: "La conversión estará disponible en breve.",
    en: "Conversion will be available soon.",
    fr: "La conversion sera bientôt disponible.",
    de: "Die Konvertierung wird bald verfügbar sein.",
    pt: "A conversão estará disponível em breve.",
    it: "La conversione sarà disponibile a breve.",
    nl: "De conversie is binnenkort beschikbaar.",
    pl: "Konwersja będzie wkrótce dostępna.",
    ru: "Конвертация скоро будет доступна.",
    zh: "转换功能即将推出。",
  },
  editor_panel_convert_files_to_pdf: {
    es: "Convierte archivos a PDF:",
    en: "Convert files to PDF:",
    fr: "Convertir des fichiers en PDF :",
    de: "Dateien in PDF konvertieren:",
    pt: "Converter arquivos para PDF:",
    it: "Converti file in PDF:",
    nl: "Bestanden converteren naar PDF:",
    pl: "Konwertuj pliki do PDF:",
    ru: "Конвертировать файлы в PDF:",
    zh: "将文件转换为PDF：",
  },
  editor_panel_conversion_wait: {
    es: "La conversión puede tardar unos segundos dependiendo del tamaño del PDF.",
    en: "Conversion may take a few seconds depending on the PDF size.",
    fr: "La conversion peut prendre quelques secondes selon la taille du PDF.",
    de: "Die Konvertierung kann je nach PDF-Größe einige Sekunden dauern.",
    pt: "A conversão pode levar alguns segundos dependendo do tamanho do PDF.",
    it: "La conversione potrebbe richiedere alcuni secondi a seconda delle dimensioni del PDF.",
    nl: "De conversie kan enkele seconden duren afhankelijk van de PDF-grootte.",
    pl: "Konwersja może potrwać kilka sekund w zależności od rozmiaru PDF.",
    ru: "Конвертация может занять несколько секунд в зависимости от размера PDF.",
    zh: "转换可能需要几秒钟，具体取决于PDF大小。",
  },
  editor_toast_not_found: {
    es: "no encontrado en el documento",
    en: "not found in the document",
    fr: "non trouvé dans le document",
    de: "nicht im Dokument gefunden",
    pt: "não encontrado no documento",
    it: "non trovato nel documento",
    nl: "niet gevonden in het document",
    pl: "nie znaleziono w dokumencie",
    ru: "не найдено в документе",
    zh: "在文档中未找到",
  },
};

const langOrder = ["es", "en", "fr", "de", "pt", "it", "nl", "pl", "ru", "zh"];

// 1. Add to Translations type
const typeMarker = "editor_panel_type_here: string;";
let typeInsert = "";
for (const key of Object.keys(newKeys)) {
  typeInsert += `  ${key}: string;\n`;
}
src = src.replace(typeMarker, typeMarker + "\n" + typeInsert);

// 2. Add to each language block - find the last editor_panel_type_here in each lang block
// We'll find all occurrences of editor_panel_type_here: " and insert after each one
const langBlocks = [];
let searchFrom = 0;
for (const lang of langOrder) {
  const idx = src.indexOf('editor_panel_type_here:', searchFrom);
  if (idx === -1) {
    console.error(`Could not find editor_panel_type_here for lang ${lang}`);
    continue;
  }
  // Find end of this line
  const lineEnd = src.indexOf('\n', idx);
  langBlocks.push({ lang, lineEnd });
  searchFrom = lineEnd + 1;
}

// Insert in reverse order so indices don't shift
for (let i = langBlocks.length - 1; i >= 0; i--) {
  const { lang, lineEnd } = langBlocks[i];
  let insert = "\n";
  for (const [key, translations] of Object.entries(newKeys)) {
    insert += `    ${key}: "${translations[lang]}",\n`;
  }
  src = src.slice(0, lineEnd) + insert + src.slice(lineEnd);
}

writeFileSync(FILE, src);
console.log("Done! Added", Object.keys(newKeys).length, "new keys to all", langOrder.length, "languages");
