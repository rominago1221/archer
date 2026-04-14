// Freemium gating helper: first document is free, subsequent ones require
// an upgrade. Mirrors the backend check in /documents/upload (plan == 'free'
// AND existing count >= 1).
export function deriveFreemiumExhausted(user, documents = []) {
  if (!user) return false;
  const plan = String(user.plan || 'free').toLowerCase();
  if (plan !== 'free') return false;
  return Array.isArray(documents) && documents.length >= 1;
}

// Returns { emoji, colorBg, colorFg } for the document row icon, based on
// the stored file_type or, failing that, the filename extension.
export function getDocumentIcon(fileType, fileName = '') {
  const ext = String(
    fileType
      || (fileName.includes('.') ? fileName.split('.').pop() : '')
      || ''
  ).toLowerCase();

  if (['pdf'].includes(ext)) return { emoji: '\uD83D\uDCC4', bg: '#fef2f2', fg: '#b91c1c' };
  if (['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(ext)) return { emoji: '\uD83D\uDDBC\uFE0F', bg: '#eff6ff', fg: '#1a56db' };
  if (['doc', 'docx'].includes(ext)) return { emoji: '\uD83D\uDCDD', bg: '#eff6ff', fg: '#1a56db' };
  if (['eml', 'msg'].includes(ext)) return { emoji: '\u2709\uFE0F', bg: '#fef3c7', fg: '#b45309' };
  if (['txt', 'text'].includes(ext)) return { emoji: '\uD83D\uDCDD', bg: '#fafaf8', fg: '#6b7280' };
  return { emoji: '\uD83D\uDCC4', bg: '#eff6ff', fg: '#1a56db' };
}
