export function spreadsheetText(value: unknown): string {
  const text = String(value ?? '').replace(/\p{Cc}/gu, ' ');
  return /^\s*[=+\-@|%]/.test(text) ? `'${text}` : text;
}

/** Escape everything, then restore only exact emphasis tags without attributes. */
export function safeTemplateHtml(value: unknown): string {
  // Preserve existing emphasis templates, dropping every attribute before escaping.
  const normalized = String(value ?? '').replace(/<(\/?)(strong|em|b|i|span|br)(?=[\s/>])[^>]*>/gi, '<$1$2>');
  return normalized.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    .replace(/&lt;(\/?)(strong|em|b|i|span|br)\s*\/?&gt;/gi, '<$1$2>');
}
