import { readFileSync, writeFileSync } from "fs";

const file = "client/src/lib/i18n.ts";
let content = readFileSync(file, "utf-8");

// New keys to add after editor_panel_compress_btn
const translations = {
  type: {
    editor_compress_result_title: "string",
    editor_compress_result_desc: "string",
    editor_compress_original: "string",
    editor_compress_compressed: "string",
    editor_compress_saved: "string",
    editor_compress_return: "string",
    editor_compress_download: "string",
    editor_compress_btn_only: "string",
    editor_protect_result_title: "string",
    editor_protect_result_desc: "string",
    editor_protect_download: "string",
    editor_protect_return: "string",
  },
  es: {
    editor_compress_result_title: "PDF comprimido",
    editor_compress_result_desc: "El PDF se ha comprimido correctamente",
    editor_compress_original: "Original",
    editor_compress_compressed: "Comprimido",
    editor_compress_saved: "Ahorro",
    editor_compress_return: "Volver",
    editor_compress_download: "Descargar",
    editor_compress_btn_only: "Comprimir",
    editor_protect_result_title: "PDF protegido",
    editor_protect_result_desc: "Tu archivo original no se ha modificado. Puedes volver y cambiar la contraseña.",
    editor_protect_download: "Descargar PDF protegido",
    editor_protect_return: "Volver",
  },
  en: {
    editor_compress_result_title: "PDF compressed",
    editor_compress_result_desc: "The PDF has been compressed successfully",
    editor_compress_original: "Original",
    editor_compress_compressed: "Compressed",
    editor_compress_saved: "Saved",
    editor_compress_return: "Return",
    editor_compress_download: "Download",
    editor_compress_btn_only: "Compress",
    editor_protect_result_title: "PDF protected",
    editor_protect_result_desc: "Your original file has not been modified. You can go back and change the password.",
    editor_protect_download: "Download protected PDF",
    editor_protect_return: "Return",
  },
  fr: {
    editor_compress_result_title: "PDF compressé",
    editor_compress_result_desc: "Le PDF a été compressé avec succès",
    editor_compress_original: "Original",
    editor_compress_compressed: "Compressé",
    editor_compress_saved: "Économie",
    editor_compress_return: "Retour",
    editor_compress_download: "Télécharger",
    editor_compress_btn_only: "Compresser",
    editor_protect_result_title: "PDF protégé",
    editor_protect_result_desc: "Votre fichier original n'a pas été modifié. Vous pouvez revenir et changer le mot de passe.",
    editor_protect_download: "Télécharger le PDF protégé",
    editor_protect_return: "Retour",
  },
  de: {
    editor_compress_result_title: "PDF komprimiert",
    editor_compress_result_desc: "Die PDF wurde erfolgreich komprimiert",
    editor_compress_original: "Original",
    editor_compress_compressed: "Komprimiert",
    editor_compress_saved: "Ersparnis",
    editor_compress_return: "Zurück",
    editor_compress_download: "Herunterladen",
    editor_compress_btn_only: "Komprimieren",
    editor_protect_result_title: "PDF geschützt",
    editor_protect_result_desc: "Ihre Originaldatei wurde nicht verändert. Sie können zurückgehen und das Passwort ändern.",
    editor_protect_download: "Geschütztes PDF herunterladen",
    editor_protect_return: "Zurück",
  },
  pt: {
    editor_compress_result_title: "PDF comprimido",
    editor_compress_result_desc: "O PDF foi comprimido com sucesso",
    editor_compress_original: "Original",
    editor_compress_compressed: "Comprimido",
    editor_compress_saved: "Economia",
    editor_compress_return: "Voltar",
    editor_compress_download: "Baixar",
    editor_compress_btn_only: "Comprimir",
    editor_protect_result_title: "PDF protegido",
    editor_protect_result_desc: "Seu arquivo original não foi modificado. Você pode voltar e alterar a senha.",
    editor_protect_download: "Baixar PDF protegido",
    editor_protect_return: "Voltar",
  },
  it: {
    editor_compress_result_title: "PDF compresso",
    editor_compress_result_desc: "Il PDF è stato compresso con successo",
    editor_compress_original: "Originale",
    editor_compress_compressed: "Compresso",
    editor_compress_saved: "Risparmio",
    editor_compress_return: "Indietro",
    editor_compress_download: "Scarica",
    editor_compress_btn_only: "Comprimi",
    editor_protect_result_title: "PDF protetto",
    editor_protect_result_desc: "Il file originale non è stato modificato. Puoi tornare indietro e cambiare la password.",
    editor_protect_download: "Scarica PDF protetto",
    editor_protect_return: "Indietro",
  },
  nl: {
    editor_compress_result_title: "PDF gecomprimeerd",
    editor_compress_result_desc: "De PDF is succesvol gecomprimeerd",
    editor_compress_original: "Origineel",
    editor_compress_compressed: "Gecomprimeerd",
    editor_compress_saved: "Besparing",
    editor_compress_return: "Terug",
    editor_compress_download: "Downloaden",
    editor_compress_btn_only: "Comprimeren",
    editor_protect_result_title: "PDF beveiligd",
    editor_protect_result_desc: "Uw originele bestand is niet gewijzigd. U kunt teruggaan en het wachtwoord wijzigen.",
    editor_protect_download: "Beveiligde PDF downloaden",
    editor_protect_return: "Terug",
  },
  pl: {
    editor_compress_result_title: "PDF skompresowany",
    editor_compress_result_desc: "PDF został pomyślnie skompresowany",
    editor_compress_original: "Oryginał",
    editor_compress_compressed: "Skompresowany",
    editor_compress_saved: "Oszczędność",
    editor_compress_return: "Wróć",
    editor_compress_download: "Pobierz",
    editor_compress_btn_only: "Kompresuj",
    editor_protect_result_title: "PDF zabezpieczony",
    editor_protect_result_desc: "Twój oryginalny plik nie został zmodyfikowany. Możesz wrócić i zmienić hasło.",
    editor_protect_download: "Pobierz zabezpieczony PDF",
    editor_protect_return: "Wróć",
  },
  ru: {
    editor_compress_result_title: "PDF сжат",
    editor_compress_result_desc: "PDF успешно сжат",
    editor_compress_original: "Оригинал",
    editor_compress_compressed: "Сжатый",
    editor_compress_saved: "Экономия",
    editor_compress_return: "Назад",
    editor_compress_download: "Скачать",
    editor_compress_btn_only: "Сжать",
    editor_protect_result_title: "PDF защищён",
    editor_protect_result_desc: "Ваш оригинальный файл не был изменён. Вы можете вернуться и изменить пароль.",
    editor_protect_download: "Скачать защищённый PDF",
    editor_protect_return: "Назад",
  },
  zh: {
    editor_compress_result_title: "PDF已压缩",
    editor_compress_result_desc: "PDF已成功压缩",
    editor_compress_original: "原始",
    editor_compress_compressed: "压缩后",
    editor_compress_saved: "节省",
    editor_compress_return: "返回",
    editor_compress_download: "下载",
    editor_compress_btn_only: "压缩",
    editor_protect_result_title: "PDF已保护",
    editor_protect_result_desc: "您的原始文件未被修改。您可以返回并更改密码。",
    editor_protect_download: "下载受保护的PDF",
    editor_protect_return: "返回",
  },
};

// 1. Add to type definition
const typeKeys = Object.entries(translations.type).map(([k, v]) => `  ${k}: ${v};`).join("\n");
content = content.replace(
  "  editor_panel_compress_btn: string;",
  `  editor_panel_compress_btn: string;\n${typeKeys}`
);

// 2. Add to each language block - find editor_panel_compress_btn in each lang and add after it
const langs = ["es", "en", "fr", "de", "pt", "it", "nl", "pl", "ru", "zh"];
for (const lang of langs) {
  const langKeys = Object.entries(translations[lang]).map(([k, v]) => `    ${k}: "${v.replace(/"/g, '\\"')}",`).join("\n");
  // Find the line with editor_panel_compress_btn for this language
  const lines = content.split("\n");
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`editor_panel_compress_btn:`) && lines[i].includes('"') && !lines[i].includes("string")) {
      if (!found) {
        // Check if this is the right language block by looking backwards for the lang key
        let langCheck = "";
        for (let j = i; j >= Math.max(0, i - 500); j--) {
          const m = lines[j].match(/^\s+(\w+):\s*\{/);
          if (m) { langCheck = m[1]; break; }
        }
        if (langCheck === lang) {
          lines.splice(i + 1, 0, langKeys);
          found = true;
        }
      }
    }
  }
  if (!found) {
    console.error(`Could not find editor_panel_compress_btn for lang: ${lang}`);
  }
  content = lines.join("\n");
}

writeFileSync(file, content);
console.log("Done! Added compress/protect result translations.");
