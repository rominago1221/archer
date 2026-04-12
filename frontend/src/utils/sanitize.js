import DOMPurify from 'dompurify';

/**
 * Sanitize HTML to prevent XSS attacks.
 * Only allows safe tags and attributes.
 */
export const sanitizeHtml = (dirty) => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'br', 'span', 'p', 'div', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['style', 'href', 'target', 'rel', 'class'],
  });
};

/**
 * Format markdown-style bold (**text**) to HTML and sanitize.
 */
export const formatBoldText = (text) => {
  if (!text) return '';
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<b style="color:#1a1a2e;font-weight:600">$1</b>')
    .replace(/\n/g, '<br/>');
  return sanitizeHtml(html);
};

/**
 * Safe print content — uses Blob URL instead of document.write
 */
export const safePrintContent = (content, title = 'Document') => {
  if (!content) return;
  const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<!DOCTYPE html><html><head><title>${DOMPurify.sanitize(title)}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8}pre{white-space:pre-wrap}</style></head><body><pre>${escaped}</pre></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) {
    w.onload = () => { URL.revokeObjectURL(url); w.print(); };
  }
};
