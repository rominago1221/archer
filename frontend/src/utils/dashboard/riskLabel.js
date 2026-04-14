// Derives the risk level and display color from the numeric score (0-100).
// Returns an object { level, color, barColor, tintBg } suitable for the hero UI.
// Bands: 0-30 low (green), 30-60 moderate (amber), 60-80 high (orange), 80+ critical (red)
export function getRiskBand(score) {
  const s = Number(score) || 0;
  if (s >= 80) return { level: 'critical', color: '#b91c1c', pillBg: '#b91c1c', scoreColor: '#ef4444', barColor: '#ef4444' };
  if (s >= 60) return { level: 'high', color: '#b45309', pillBg: '#f59e0b', scoreColor: '#f59e0b', barColor: '#f59e0b' };
  if (s >= 30) return { level: 'moderate', color: '#b45309', pillBg: '#f59e0b', scoreColor: '#f59e0b', barColor: '#f59e0b' };
  return { level: 'low', color: '#15803d', pillBg: '#16a34a', scoreColor: '#16a34a', barColor: '#16a34a' };
}

// Maps a sub-score value (0-100) to the bar color used in the 2x2 subscore grid.
// Mirrors the V7 mockup semantic (red when urgent/dangerous, amber middle, green safe).
export function getSubScoreColor(value) {
  const v = Number(value) || 0;
  if (v >= 70) return { text: '#ef4444', bar: '#ef4444' };
  if (v >= 50) return { text: '#f59e0b', bar: '#f59e0b' };
  return { text: '#16a34a', bar: '#16a34a' };
}

// Maps (level, language) → localized risk label key. Keep i18n lookup in the caller.
export function getRiskLabelKey(level) {
  const validLevels = ['low', 'moderate', 'high', 'critical'];
  return validLevels.includes(level) ? level : 'moderate';
}
