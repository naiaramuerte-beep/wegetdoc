// Lightweight, dependency-free language guess for admin contact messages.
// Best-effort: script ranges first (very reliable), then a stopword vote for
// Latin-script languages the product actually serves. Short texts are
// inherently ambiguous, so treat the result as a hint, not ground truth.

export type LangGuess = { name: string; flag: string };

const STOPWORDS: Record<string, { name: string; flag: string; words: string[] }> = {
  es: { name: "Español", flag: "🇪🇸", words: ["que","de","por","para","con","una","pero","está","cómo","gracias","hola","archivo","pago","puedo","no","mi","documento","descargar"] },
  en: { name: "Inglés", flag: "🇬🇧", words: ["the","and","for","with","this","that","cannot","please","hello","file","payment","download","help","my","have","can","not"] },
  fr: { name: "Francés", flag: "🇫🇷", words: ["le","la","les","des","une","pour","avec","bonjour","fichier","paiement","merci","je","pas","mon","est"] },
  de: { name: "Alemán", flag: "🇩🇪", words: ["der","die","das","und","ich","nicht","eine","mit","danke","hallo","datei","zahlung","kann","mein","ist"] },
  pt: { name: "Portugués", flag: "🇵🇹", words: ["não","uma","com","para","obrigado","ficheiro","pagamento","olá","você","está","meu","documento"] },
  it: { name: "Italiano", flag: "🇮🇹", words: ["il","non","con","una","grazie","ciao","file","pagamento","sono","può","mio","documento"] },
  nl: { name: "Neerlandés", flag: "🇳🇱", words: ["het","een","niet","met","ik","hallo","bestand","betaling","kan","dank","mijn","is"] },
  pl: { name: "Polaco", flag: "🇵🇱", words: ["nie","się","jest","dla","dziękuję","plik","płatność","cześć","mogę","moje","proszę"] },
  ro: { name: "Rumano", flag: "🇷🇴", words: ["nu","este","pentru","cu","mulțumesc","fișier","plată","salut","pot","bună","meu"] },
};

export function detectLanguage(text: string | null | undefined): LangGuess | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  const has = (re: RegExp) => re.test(t);

  // Non-Latin scripts — script alone is a strong signal.
  if (has(/[一-鿿]/)) return { name: "Chino", flag: "🇨🇳" };
  if (has(/[぀-ヿ]/)) return { name: "Japonés", flag: "🇯🇵" };
  if (has(/[가-힣]/)) return { name: "Coreano", flag: "🇰🇷" };
  if (has(/[؀-ۿ]/)) return { name: "Árabe", flag: "🇸🇦" };
  if (has(/[֐-׿]/)) return { name: "Hebreo", flag: "🇮🇱" };
  if (has(/[Ͱ-Ͽ]/)) return { name: "Griego", flag: "🇬🇷" };

  // Cyrillic — distinguish Ukrainian / Russian by their unique letters.
  if (has(/[Ѐ-ӿ]/)) {
    if (has(/[іїєґ]/i)) return { name: "Ucraniano", flag: "🇺🇦" };
    if (has(/[ыэъё]/i)) return { name: "Ruso", flag: "🇷🇺" };
    return { name: "Cirílico", flag: "🌐" };
  }

  // Latin script — stopword vote across the languages we serve.
  const words = (" " + t.toLowerCase() + " ").match(/[a-zà-ÿąćęłńóśźżăâîșțğ']+/g) ?? [];
  if (words.length === 0) return null;
  const wordSet = new Set(words);
  let best: { code: string; hits: number } | null = null;
  for (const [code, def] of Object.entries(STOPWORDS)) {
    let hits = 0;
    for (const w of def.words) if (wordSet.has(w)) hits++;
    if (hits > 0 && (!best || hits > best.hits)) best = { code, hits };
  }
  if (best) {
    const d = STOPWORDS[best.code];
    return { name: d.name, flag: d.flag };
  }
  // Latin but no stopword matched — unknown.
  return { name: "Latino", flag: "🌐" };
}
