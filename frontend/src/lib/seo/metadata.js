/**
 * Centralized SEO metadata system for Archer.
 * Used with react-helmet-async to set per-page meta tags.
 */

const SITE_URL = 'https://archer.law';
const SITE_NAME = 'Archer';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og/default.png`;

/**
 * Generate metadata object for a page.
 * @param {Object} data
 * @param {string} data.title - 50-60 chars max
 * @param {string} data.description - 140-155 chars max
 * @param {string} [data.canonical]
 * @param {string} [data.ogImage]
 * @param {'website'|'article'} [data.ogType]
 * @param {'en_US'|'fr_BE'} [data.locale]
 * @param {boolean} [data.noindex]
 * @param {Object} [data.article] - For blog articles
 */
export function generateMetadata(data) {
  const title = `${data.title} | ${SITE_NAME}`;
  const canonical = data.canonical || SITE_URL;
  const ogImage = data.ogImage || DEFAULT_OG_IMAGE;
  const locale = data.locale || 'en_US';

  return {
    title,
    description: data.description,
    canonical,
    ogImage,
    locale,
    noindex: data.noindex || false,
    ogType: data.ogType || 'website',
    article: data.article || null,
  };
}

/**
 * Pre-defined metadata for known pages.
 */
export const PAGE_METADATA = {
  home: generateMetadata({
    title: 'AI Legal Assistant: Solve Legal Issues in Minutes',
    description: 'Archer is the AI legal assistant that analyzes your case, drafts attorney-signed letters, and helps you win — for $49 instead of $5,000.',
    canonical: SITE_URL,
  }),
  pricing: generateMetadata({
    title: 'Pricing: Legal Protection from $24.99/mo',
    description: 'Archer Protect: unlimited AI legal analyses, attorney letters, and video consultations. From $24.99/month. Cancel anytime.',
    canonical: `${SITE_URL}/pricing`,
  }),
  howItWorks: generateMetadata({
    title: 'How It Works: AI Case Analysis in 60 Seconds',
    description: 'Upload any legal document. Archer analyzes it in 60 seconds, identifies violations, and drafts an attorney-signed response letter.',
    canonical: `${SITE_URL}/how-it-works`,
  }),
  blog: generateMetadata({
    title: 'Legal Guides: Clear, Practical Advice',
    description: 'Expert legal guides written in plain English. Eviction help, employment rights, severance negotiation, and more.',
    canonical: `${SITE_URL}/blog`,
  }),
  evictionHelp: generateMetadata({
    title: "Facing Eviction? Here's How to Fight Back (2026 Guide)",
    description: 'Complete guide to eviction rights, legal defenses, and what to do in the next 72 hours. Expert-reviewed, state-by-state.',
    canonical: `${SITE_URL}/eviction-help`,
  }),
  wrongfulTermination: generateMetadata({
    title: 'Wrongful Termination: Know Your Rights & Fight Back',
    description: 'Were you fired illegally? Learn your rights, document your case, and take action. State-by-state guide with expert analysis.',
    canonical: `${SITE_URL}/wrongful-termination`,
  }),
  severanceNegotiation: generateMetadata({
    title: 'Severance Negotiation: Get What You Deserve',
    description: 'Most severance offers are negotiable. Learn how to evaluate, negotiate, and maximize your severance package.',
    canonical: `${SITE_URL}/severance-negotiation`,
  }),
  aiLegalAssistant: generateMetadata({
    title: 'AI Legal Assistant: The Future of Affordable Legal Help',
    description: 'How AI is making legal help accessible to everyone. Archer analyzes cases, drafts letters, and connects you with attorneys.',
    canonical: `${SITE_URL}/ai-legal-assistant`,
  }),
};

export { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE };
