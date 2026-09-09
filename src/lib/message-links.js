const MD_LINK_RE = /\[([^\]]*)\]\(\s*(https?:\/\/[^)]+?)\s*\)/gi;
const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;
const URL_TRAILING_PUNCT_RE = /[.,;:!?)\]}>]+$/;

export function stripMarkdownMarks(text) {
  return String(text || '').replace(/\*\*/g, '').trim();
}

/**
 * Repara enlaces markdown partidos por salto de línea
 * (típico: "[texto](https" + "\\n" + "//host/ruta)").
 */
export function normalizeMessageLinks(text) {
  if (!text) return '';
  let out = String(text)
    .replace(/https:\s*[\r\n]+\s*\/\//gi, 'https://')
    .replace(/https\s*[\r\n]+\s*\/\//gi, 'https://');

  out = out.replace(MD_LINK_RE, (_, label, url) => {
    const cleanUrl = String(url).replace(/\s+/g, '');
    const cleanLabel = stripMarkdownMarks(label) || 'Ver reporte';
    return `[${cleanLabel}](${cleanUrl})`;
  });

  return out;
}

export function extractFirstUrl(text) {
  if (!text) return null;

  const normalized = normalizeMessageLinks(text);
  const md = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/i.exec(normalized);
  if (md?.[2]) {
    return {
      url: md[2],
      label: stripMarkdownMarks(md[1]) || 'Reporte',
    };
  }

  const bare = normalized.match(URL_RE);
  if (!bare?.[0]) return null;

  let url = bare[0].replace(URL_TRAILING_PUNCT_RE, '');
  return url ? { url, label: null } : null;
}
