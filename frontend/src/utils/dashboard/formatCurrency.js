// Formats a numeric amount according to country + language conventions.
// Examples:
//   formatCurrency(1200, 'BE', 'fr')  → "1 200€"
//   formatCurrency(49.99, 'BE', 'fr') → "49,99€"
//   formatCurrency(-520, 'BE', 'fr')  → "−520€"   (U+2212 minus sign)
//   formatCurrency(1200, 'US', 'en')  → "$1,200"
//   formatCurrency(49.99, 'US', 'en') → "$49.99"
//   formatCurrency(-520, 'US', 'en')  → "−$520"
export function formatCurrency(amount, country = 'BE', language = 'fr') {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '';
  const num = Number(amount);
  const abs = Math.abs(num);
  const hasDecimals = abs % 1 !== 0;
  const isNegative = num < 0;

  const locale = language === 'fr' ? 'fr-FR' : language === 'nl' ? 'nl-BE' : language === 'es' ? 'es-ES' : 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(abs);

  const MINUS = '\u2212'; // U+2212, typographic minus
  const sign = isNegative ? MINUS : '';

  if (country === 'US') {
    return `${sign}$${formatted}`;
  }
  // BE and any other → euro suffix, space before symbol is NOT standard in FR (49,99€ not 49,99 €)
  return `${sign}${formatted}€`;
}
