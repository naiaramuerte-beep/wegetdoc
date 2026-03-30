import { readFileSync, writeFileSync } from "fs";

const FILE = "client/src/lib/i18n.ts";
let src = readFileSync(FILE, "utf8");

const newKeys = {
  editor_panel_upload_image_hint: {
    es: "Sube una imagen JPG o PNG para insertarla en el PDF:",
    en: "Upload a JPG or PNG image to insert it into the PDF:",
    fr: "Téléchargez une image JPG ou PNG pour l'insérer dans le PDF :",
    de: "Laden Sie ein JPG- oder PNG-Bild hoch, um es in das PDF einzufügen:",
    pt: "Carregue uma imagem JPG ou PNG para inseri-la no PDF:",
    it: "Carica un'immagine JPG o PNG per inserirla nel PDF:",
    nl: "Upload een JPG- of PNG-afbeelding om in de PDF in te voegen:",
    pl: "Prześlij obraz JPG lub PNG, aby wstawić go do PDF:",
    ru: "Загрузите изображение JPG или PNG для вставки в PDF:",
    zh: "上传JPG或PNG图片插入到PDF中：",
  },
  editor_panel_convert_image_to_pdf: {
    es: "Convertir imagen a PDF:",
    en: "Convert image to PDF:",
    fr: "Convertir une image en PDF :",
    de: "Bild in PDF konvertieren:",
    pt: "Converter imagem para PDF:",
    it: "Converti immagine in PDF:",
    nl: "Afbeelding converteren naar PDF:",
    pl: "Konwertuj obraz do PDF:",
    ru: "Конвертировать изображение в PDF:",
    zh: "将图片转换为PDF：",
  },
  editor_panel_exporting: {
    es: "Exportando...",
    en: "Exporting...",
    fr: "Exportation...",
    de: "Exportieren...",
    pt: "Exportando...",
    it: "Esportazione...",
    nl: "Exporteren...",
    pl: "Eksportowanie...",
    ru: "Экспорт...",
    zh: "导出中...",
  },
  editor_panel_convert_to_btn: {
    es: "Convertir a",
    en: "Convert to",
    fr: "Convertir en",
    de: "Konvertieren in",
    pt: "Converter para",
    it: "Converti in",
    nl: "Converteren naar",
    pl: "Konwertuj do",
    ru: "Конвертировать в",
    zh: "转换为",
  },
};

const langOrder = ["es", "en", "fr", "de", "pt", "it", "nl", "pl", "ru", "zh"];

// 1. Add to Translations type - find editor_toast_not_found: string;
const typeMarker = "editor_toast_not_found: string;";
let typeInsert = "";
for (const key of Object.keys(newKeys)) {
  typeInsert += `  ${key}: string;\n`;
}
src = src.replace(typeMarker, typeMarker + "\n" + typeInsert);

// 2. Add to each language block - find editor_toast_not_found: "..." in each block
// We need to find each occurrence and add after it
for (const lang of langOrder) {
  // Build the insert text for this language
  let insert = "";
  for (const [key, translations] of Object.entries(newKeys)) {
    insert += `    ${key}: "${translations[lang]}",\n`;
  }
  
  // Find the editor_toast_not_found line for this language
  // We need to find the Nth occurrence (skip type definition)
  const langIdx = langOrder.indexOf(lang);
  let searchFrom = 0;
  let found = -1;
  
  // Skip the type definition occurrence
  const firstOccurrence = src.indexOf('editor_toast_not_found:', searchFrom);
  searchFrom = src.indexOf('\n', firstOccurrence) + 1;
  
  // Now find the (langIdx+1)th occurrence
  for (let i = 0; i <= langIdx; i++) {
    found = src.indexOf('editor_toast_not_found:', searchFrom);
    if (found === -1) {
      console.error(`Could not find editor_toast_not_found for lang ${lang} (occurrence ${i+1})`);
      break;
    }
    if (i < langIdx) {
      searchFrom = src.indexOf('\n', found) + 1;
    }
  }
  
  if (found !== -1) {
    const lineEnd = src.indexOf('\n', found);
    src = src.slice(0, lineEnd + 1) + insert + src.slice(lineEnd + 1);
  }
}

writeFileSync(FILE, src);
console.log("Done! Added", Object.keys(newKeys).length, "new keys to all", langOrder.length, "languages");
