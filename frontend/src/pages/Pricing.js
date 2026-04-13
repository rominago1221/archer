import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Clock, DollarSign, Award, Lock, Sparkles, CheckCircle, Layers } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

/* ─── CONTENT OBJECT ─── */
const content = {
  en: {
    hero: { title: 'Be protected.', subtitle: 'Whatever life throws at you.' },
    toggle: { monthly: 'Monthly', yearly: 'Yearly', save: 'Save 17%' },
    plans: [
      {
        id: 'free', name: 'Free', desc: 'Try Archer',
        monthly: { price: '$0', period: 'forever' },
        yearly: { price: '$0', period: 'forever' },
        cta: 'Start free', ctaStyle: 'default', link: '/en/signup?plan=free',
        features: [
          { ok: true, text: '1 analysis' },
          { ok: true, text: 'Basic Risk Score' },
          { ok: false, text: 'No Attorney Letter' },
        ],
      },
      {
        id: 'paypercase', name: 'Pay-per-case', desc: 'One-shot need',
        monthly: { price: '$39', period: 'per case' },
        yearly: { price: '$39', period: 'per case' },
        cta: 'Analyze now', ctaStyle: 'secondary', link: '/en/upload',
        features: [
          { ok: true, text: 'Full analysis' },
          { ok: true, text: 'Battle Preview' },
          { ok: true, text: 'Outcome Predictor' },
          { ok: true, text: '1 letter included' },
        ],
      },
      {
        id: 'solo', name: 'Protect Solo', desc: 'Personal cabinet', featured: true,
        badge: 'MOST POPULAR',
        monthly: { price: '$29.99', period: '/month' },
        yearly: { price: '$299', period: '/year', save: 'Save $60/year' },
        cta: 'Start 14-day trial', ctaStyle: 'primary', subCta: 'No credit card required',
        link: '/en/signup?plan=solo&cycle=monthly',
        features: [
          { ok: true, text: '2 analyses/month' },
          { ok: true, text: '1 Attorney Letter/year' },
          { ok: true, text: 'Risk Monitor' },
          { ok: true, text: 'James unlimited' },
          { ok: true, text: 'Document Vault' },
          { ok: true, text: 'Cancel anytime' },
        ],
      },
      {
        id: 'family', name: 'Protect Family', desc: '5 people',
        monthly: { price: '$49.99', period: '/month' },
        yearly: { price: '$499', period: '/year', save: 'Save $100/year' },
        cta: 'Protect family', ctaStyle: 'default', link: '/en/signup?plan=family',
        features: [
          { ok: true, text: 'Everything in Solo' },
          { ok: true, text: '5 users' },
          { ok: true, text: '5 analyses/month' },
          { ok: true, text: '2 Attorney Letters/year' },
          { ok: true, text: '24/7 hotline' },
        ],
      },
      {
        id: 'pro', name: 'Protect Pro', desc: 'Freelancers & landlords',
        monthly: { price: '$89.99', period: '/month' },
        yearly: { price: '$899', period: '/year', save: 'Save $180/year' },
        cta: 'Choose Pro', ctaStyle: 'default', link: '/en/signup?plan=pro',
        features: [
          { ok: true, text: 'Everything in Family' },
          { ok: true, text: 'Unlimited analyses' },
          { ok: true, text: '4 Attorney Letters/year' },
          { ok: true, text: 'Quarterly video call' },
          { ok: true, text: 'Priority support 24/7' },
        ],
      },
    ],
    attorney: {
      badge: 'THE ATTORNEY LETTER',
      h2pre: 'A real lawyer letter.',
      h2accent1: '4 hours.',
      h2mid: ' For ',
      h2accent2: '$49.',
      desc: 'An official letter drafted by James and personally signed by a licensed partner attorney. Bar number, official letterhead, full legal authority \u2014 sent on your behalf in less than 4 hours.',
      pillars: [
        { title: '4 hours', sub: 'Delivered fast', icon: 'clock' },
        { title: '10\u00D7 cheaper', sub: 'vs. lawyer', icon: 'dollar' },
        { title: 'Bar certified', sub: 'Real attorney', icon: 'award' },
        { title: 'Or refunded', sub: 'No result, no pay', icon: 'shield' },
      ],
    },
    intelligence: {
      badge: 'THE INTELLIGENCE',
      h2: 'The most powerful legal AI',
      h2br: 'ever built for individuals.',
      desc: 'James reads your document, cross-checks live jurisprudence across millions of cases, and finds the legal angle that wins. In 60 seconds.',
      stats1: [
        { num: '2.4M', label: 'Case laws indexed' },
        { num: '60s', label: 'Full analysis' },
        { num: '5', label: 'Reasoning passes' },
        { num: '94%', label: 'Accuracy rate' },
      ],
      stats2: [
        { num: '2', label: 'Jurisdictions' },
        { num: '5', label: 'Languages' },
        { num: '158', label: 'Document types' },
        { num: '24/7', label: 'Always on' },
      ],
      capabilities: [
        { icon: 'clock', title: 'Live jurisprudence', sub: 'Updated daily' },
        { icon: 'layers', title: '5-pass reasoning', sub: 'Deep analysis' },
        { icon: 'check', title: 'Outcome predictor', sub: 'Win probability' },
        { icon: 'shield', title: 'Battle Preview', sub: 'See your odds' },
        { icon: 'lock', title: 'AES-256 encryption', sub: 'GDPR compliant' },
        { icon: 'sparkles', title: 'Trained on Claude 4.6', sub: "Anthropic's most advanced" },
      ],
    },
    oldWorld: {
      badge: 'VS THE OLD WORLD',
      h2pre: 'Half the price.',
      h2accent: '100\u00D7 faster.',
      left: {
        label: 'TRADITIONAL INSURANCE', title: 'LegalShield, ARAG, DAS',
        items: ['$40\u2013115/month', '2\u20134 weeks delay', '$150\u2013300 deductible', '3-month waiting period', 'Annual cap', 'No AI'],
      },
      right: {
        label: 'ARCHER PROTECT', title: 'Solo plan',
        items: ['$29.99/month', '60 seconds', 'Zero deductible', 'Instant coverage', 'No cap', 'Powered by AI'],
      },
    },
    guarantee: { badge: '30-DAY GUARANTEE', text: 'Try Archer Protect risk-free.' },
  },
  fr: {
    hero: { title: 'Soyez prot\u00E9g\u00E9.', subtitle: 'Quoi que la vie vous r\u00E9serve.' },
    toggle: { monthly: 'Mensuel', yearly: 'Annuel', save: '\u00C9conomisez 17%' },
    plans: [
      {
        id: 'free', name: 'Free', desc: 'D\u00E9couvrir Archer',
        monthly: { price: '0 \u20AC', period: '\u00E0 vie' },
        yearly: { price: '0 \u20AC', period: '\u00E0 vie' },
        cta: 'Commencer gratuitement', ctaStyle: 'default', link: '/fr/signup?plan=free',
        features: [
          { ok: true, text: '1 analyse' },
          { ok: true, text: 'Risk Score basique' },
          { ok: false, text: "Pas d'Attorney Letter" },
        ],
      },
      {
        id: 'paypercase', name: '\u00C0 la demande', desc: 'Pour un cas ponctuel',
        monthly: { price: '29 \u20AC', period: 'par dossier' },
        yearly: { price: '29 \u20AC', period: 'par dossier' },
        cta: 'Analyser un document', ctaStyle: 'secondary', link: '/fr/upload',
        features: [
          { ok: true, text: 'Analyse compl\u00E8te' },
          { ok: true, text: 'Battle Preview' },
          { ok: true, text: 'Outcome Predictor' },
          { ok: true, text: '1 lettre incluse' },
        ],
      },
      {
        id: 'solo', name: 'Protect Solo', desc: 'Cabinet personnel', featured: true,
        badge: 'LE PLUS POPULAIRE',
        monthly: { price: '19,99 \u20AC', period: '/mois' },
        yearly: { price: '199 \u20AC', period: '/an', save: '\u00C9conomisez 40 \u20AC/an' },
        cta: 'Essai gratuit 14 jours', ctaStyle: 'primary', subCta: 'Sans carte bancaire',
        link: '/fr/signup?plan=solo&cycle=monthly',
        features: [
          { ok: true, text: '2 analyses/mois' },
          { ok: true, text: '1 Attorney Letter/an' },
          { ok: true, text: 'Risk Monitor' },
          { ok: true, text: 'James illimit\u00E9' },
          { ok: true, text: 'Document Vault' },
          { ok: true, text: 'Annulation \u00E0 tout moment' },
        ],
      },
      {
        id: 'family', name: 'Protect Family', desc: '5 personnes',
        monthly: { price: '34,99 \u20AC', period: '/mois' },
        yearly: { price: '349 \u20AC', period: '/an', save: '\u00C9conomisez 70 \u20AC/an' },
        cta: 'Prot\u00E9ger ma famille', ctaStyle: 'default', link: '/fr/signup?plan=family',
        features: [
          { ok: true, text: 'Tout Solo inclus' },
          { ok: true, text: '5 utilisateurs' },
          { ok: true, text: '5 analyses/mois' },
          { ok: true, text: '2 Attorney Letters/an' },
          { ok: true, text: 'Hotline 24/7 prioritaire' },
        ],
      },
      {
        id: 'pro', name: 'Protect Pro', desc: 'Ind\u00E9pendants & bailleurs',
        monthly: { price: '59,99 \u20AC', period: '/mois' },
        yearly: { price: '599 \u20AC', period: '/an', save: '\u00C9conomisez 120 \u20AC/an' },
        cta: 'Choisir Pro', ctaStyle: 'default', link: '/fr/signup?plan=pro',
        features: [
          { ok: true, text: 'Tout Family inclus' },
          { ok: true, text: 'Analyses illimit\u00E9es' },
          { ok: true, text: '4 Attorney Letters/an' },
          { ok: true, text: 'Consultation vid\u00E9o trimestrielle' },
          { ok: true, text: 'Support prioritaire 24/7' },
        ],
      },
    ],
    attorney: {
      badge: "L'ATTORNEY LETTER",
      h2pre: "Une vraie lettre d'avocat.",
      h2accent1: '4 heures.',
      h2mid: ' Pour ',
      h2accent2: '39 \u20AC.',
      desc: "Une lettre officielle r\u00E9dig\u00E9e par James et personnellement sign\u00E9e par un avocat partenaire inscrit au barreau. Num\u00E9ro de barreau, papier \u00E0 en-t\u00EAte officiel, pleine autorit\u00E9 juridique \u2014 envoy\u00E9e en votre nom en moins de 4 heures.",
      pillars: [
        { title: '4 heures', sub: 'Livraison rapide', icon: 'clock' },
        { title: '10\u00D7 moins cher', sub: 'vs. avocat', icon: 'dollar' },
        { title: 'Avocat certifi\u00E9', sub: 'Inscrit au barreau', icon: 'award' },
        { title: 'Ou rembours\u00E9', sub: 'Sans r\u00E9sultat, pas de paiement', icon: 'shield' },
      ],
    },
    intelligence: {
      badge: "L'INTELLIGENCE",
      h2: "L'IA juridique la plus puissante",
      h2br: 'jamais con\u00E7ue pour les particuliers.',
      desc: 'James lit votre document, croise la jurisprudence en direct sur des millions de cas, et trouve l\u2019angle juridique qui gagne. En 60 secondes.',
      stats1: [
        { num: '2,4M', label: 'Jurisprudences index\u00E9es' },
        { num: '60s', label: 'Analyse compl\u00E8te' },
        { num: '5', label: 'Passes de raisonnement' },
        { num: '94%', label: 'Taux de pr\u00E9cision' },
      ],
      stats2: [
        { num: '2', label: 'Juridictions' },
        { num: '5', label: 'Langues' },
        { num: '158', label: 'Types de documents' },
        { num: '24/7', label: 'Toujours actif' },
      ],
      capabilities: [
        { icon: 'clock', title: 'Jurisprudence en direct', sub: 'Mise \u00E0 jour quotidienne' },
        { icon: 'layers', title: 'Raisonnement 5 passes', sub: 'Analyse profonde' },
        { icon: 'check', title: 'Outcome Predictor', sub: 'Probabilit\u00E9 de victoire' },
        { icon: 'shield', title: 'Battle Preview', sub: 'Vos chances de gagner' },
        { icon: 'lock', title: 'Chiffrement AES-256', sub: 'Conforme RGPD' },
        { icon: 'sparkles', title: 'Propuls\u00E9 par Claude 4.6', sub: "Le mod\u00E8le le plus avanc\u00E9 d'Anthropic" },
      ],
    },
    oldWorld: {
      badge: "VS L'ANCIEN MONDE",
      h2pre: 'Moiti\u00E9 prix.',
      h2accent: '100\u00D7 plus rapide.',
      left: {
        label: 'ASSURANCE TRADITIONNELLE', title: 'DAS, ARAG, Euromex',
        items: ['30\u2013115 \u20AC/mois', 'D\u00E9lai de 2\u20134 semaines', 'Franchise 150\u2013300 \u20AC', 'D\u00E9lai de carence 3 mois', 'Plafond annuel', 'Sans IA'],
      },
      right: {
        label: 'ARCHER PROTECT', title: 'Formule Solo',
        items: ['19,99 \u20AC/mois', '60 secondes', 'Sans franchise', 'Couverture imm\u00E9diate', 'Sans plafond', "Propuls\u00E9 par l'IA"],
      },
    },
    guarantee: { badge: 'GARANTIE 30 JOURS', text: 'Essayez Archer Protect sans risque.' },
  },
};

/* ─── ICON MAP ─── */
const iconMap = {
  clock: Clock,
  dollar: DollarSign,
  award: Award,
  shield: Shield,
  lock: Lock,
  sparkles: Sparkles,
  check: CheckCircle,
  layers: Layers,
};

const Icon = ({ name, size = 18, ...props }) => {
  const Comp = iconMap[name];
  return Comp ? <Comp size={size} {...props} /> : null;
};

/* ─── STYLES ─── */
const s = {
  page: { minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif', color: '#0a0a0f' },
  hero: { textAlign: 'center', padding: '80px 20px 40px' },
  shieldIcon: { width: 80, height: 80, borderRadius: '50%', background: '#eff6ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  h1: { fontSize: 64, fontWeight: 600, letterSpacing: -2.5, lineHeight: 1, margin: '0 0 18px', color: '#0a0a0f' },
  tagline: { fontSize: 28, color: '#1a56db', fontStyle: 'italic', margin: 0, fontWeight: 400, letterSpacing: -0.5 },
  toggleWrap: { display: 'flex', justifyContent: 'center', margin: '24px 0' },
  toggle: { display: 'inline-flex', background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 30, padding: 4, gap: 0 },
  toggleOpt: (active) => ({ padding: '8px 18px', borderRadius: 24, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: active ? '#0a0a0f' : 'transparent', color: active ? '#fff' : '#555', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', border: 'none', outline: 'none', userSelect: 'none' }),
  savePill: { background: '#ecfdf5', color: '#16a34a', fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, maxWidth: 1100, margin: '0 auto', padding: '0 20px' },
  card: (featured) => ({ background: '#fff', border: featured ? '2px solid #1a56db' : '0.5px solid #e2e0db', borderRadius: 16, padding: '24px 18px', position: 'relative', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, border-color 0.2s' }),
  badgePop: { position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#1a56db', color: '#fff', fontSize: 10, fontWeight: 600, letterSpacing: 1, padding: '4px 14px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' },
  planName: (featured) => ({ fontSize: 14, fontWeight: 500, color: featured ? '#1a56db' : '#0a0a0f', marginBottom: 2 }),
  planDesc: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  price: { fontSize: 32, fontWeight: 500, lineHeight: 1, color: '#0a0a0f', marginBottom: 2 },
  period: { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
  yearlySave: { fontSize: 11, color: '#16a34a', fontWeight: 500, marginBottom: 4, minHeight: 16 },
  ctaBase: { width: '100%', padding: '10px 0', borderRadius: 28, fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'center', marginTop: 8, marginBottom: 4, transition: 'transform 0.15s, background 0.2s', border: 'none', outline: 'none', display: 'block', textDecoration: 'none' },
  ctaDefault: { background: '#fff', color: '#0a0a0f', border: '0.5px solid #e2e0db' },
  ctaSecondary: { background: '#fff', color: '#1a56db', border: '1px solid #1a56db' },
  ctaPrimary: { background: '#1a56db', color: '#fff', border: 'none' },
  noCC: { fontSize: 10, color: '#9ca3af', textAlign: 'center', marginBottom: 8 },
  featureRow: (ok) => ({ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: ok ? '#0a0a0f' : '#9ca3af', marginBottom: 6 }),
  checkMark: { color: '#16a34a', fontSize: 13, fontWeight: 700, width: 16, flexShrink: 0 },
  xMark: { color: '#9ca3af', fontSize: 13, fontWeight: 400, width: 16, flexShrink: 0 },
  section: { background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 16, padding: '40px 32px', maxWidth: 1060, margin: '0 auto', textAlign: 'center' },
  sectionBadge: (green) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, background: green ? '#ecfdf5' : '#eff6ff', color: green ? '#16a34a' : '#1a56db', fontSize: 10, fontWeight: 600, letterSpacing: 1, padding: '5px 14px', borderRadius: 20, marginBottom: 18 }),
  h2: { fontSize: 32, fontWeight: 500, letterSpacing: -1, lineHeight: 1.1, color: '#0a0a0f', margin: '0 0 14px' },
  accent: { color: '#1a56db' },
  desc: { fontSize: 14, color: '#555', lineHeight: 1.6, maxWidth: 540, margin: '0 auto 28px' },
  pillars: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 700, margin: '0 auto' },
  pillarIcon: { width: 40, height: 40, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: '#1a56db' },
  pillarTitle: { fontSize: 14, fontWeight: 500, color: '#0a0a0f', marginBottom: 2 },
  pillarSub: { fontSize: 11, color: '#9ca3af' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 820, margin: '0 auto 12px' },
  stat: { background: '#fff', borderRadius: 12, padding: '20px 14px', textAlign: 'center' },
  statNum: { fontSize: 28, fontWeight: 500, color: '#1a56db', lineHeight: 1, marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#555' },
  capGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 820, margin: '12px auto 0' },
  capCard: { background: '#fff', borderRadius: 12, padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' },
  capIcon: { width: 32, height: 32, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#1a56db' },
  capTitle: { fontSize: 13, fontWeight: 500, color: '#0a0a0f' },
  capSub: { fontSize: 11, color: '#9ca3af' },
  compare: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 720, margin: '0 auto' },
  compareCol: (highlight) => ({ background: highlight ? '#eff6ff' : '#f4f4f1', border: highlight ? '2px solid #1a56db' : '0.5px solid #e2e0db', borderRadius: 16, padding: '24px 20px' }),
  compareLabel: (blue) => ({ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: blue ? '#1a56db' : '#9ca3af', marginBottom: 6, textTransform: 'uppercase' }),
  compareTitle: (blue) => ({ fontSize: 18, fontWeight: 500, color: blue ? '#1a56db' : '#0a0a0f', marginBottom: 16 }),
  compareItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 8 },
  finalCta: { textAlign: 'center' },
  finalBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1a56db', fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 8 },
  finalText: { fontSize: 18, fontWeight: 500, color: '#1a56db', margin: 0 },
};

/* ─── RESPONSIVE CSS ─── */
const responsiveCSS = `
.pricing-page .pricing-grid-wrap {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
}
.pricing-page .pricing-card:hover {
  transform: translateY(-2px);
  border-color: #1a56db !important;
}
.pricing-page .pricing-cta:hover {
  transform: scale(1.02);
}
@keyframes shield-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes shield-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(26,86,219,0.15); }
  50% { box-shadow: 0 0 24px 8px rgba(26,86,219,0.12); }
}
.pricing-page .shield-anim {
  animation: shield-float 3s ease-in-out infinite, shield-glow 3s ease-in-out infinite;
}
@keyframes subtle-pulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.04); }
}
.pricing-page .badge-popular-anim {
  animation: subtle-pulse 4s ease-in-out infinite;
}
@media (max-width: 1200px) {
  .pricing-page .pricing-grid-wrap {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 768px) {
  .pricing-page .pricing-grid-wrap {
    grid-template-columns: 1fr;
    max-width: 400px;
  }
  .pricing-page .pillars-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .pricing-page .stats-grid-wrap {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .pricing-page .cap-grid-wrap {
    grid-template-columns: 1fr !important;
  }
  .pricing-page .compare-grid {
    grid-template-columns: 1fr !important;
  }
  .pricing-page .section-wrap {
    padding: 28px 18px !important;
  }
  .pricing-page .hero-h1 {
    font-size: 42px !important;
  }
  .pricing-page .hero-tagline {
    font-size: 18px !important;
  }
  .pricing-page .section-h2 {
    font-size: 24px !important;
  }
}
`;

/* ─── COMPONENT ─── */
export default function Pricing() {
  const { lang: urlLang } = useParams();
  const language = urlLang === 'fr' ? 'fr' : 'en';
  const t = content[language];
  const [billing, setBilling] = useState('monthly');
  const navigate = useNavigate();

  return (
    <div className="pricing-page" style={{ minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif', color: '#0a0a0f' }}>
      <PublicNavbar />
      <style>{responsiveCSS}</style>

      {/* ── BAND 1: HERO + TOGGLE — white ── */}
      <div style={{ background: '#fff', paddingTop: 72 }}>
      {/* ── SECTION 1: HERO ── */}
      <div style={s.hero}>
        <div className="shield-anim" style={s.shieldIcon}><Shield size={38} color="#16a34a" /></div>
        <h1 className="hero-h1" style={s.h1}>{t.hero.title}</h1>
        <p className="hero-tagline" style={s.tagline}>{t.hero.subtitle}</p>
      </div>

      {/* ── SECTION 2: TOGGLE ── */}
      <div style={{ ...s.toggleWrap, paddingBottom: 48 }}>
        <div style={s.toggle}>
          <div
            data-testid="toggle-monthly"
            style={s.toggleOpt(billing === 'monthly')}
            onClick={() => setBilling('monthly')}
          >
            {t.toggle.monthly}
          </div>
          <div
            data-testid="toggle-yearly"
            style={s.toggleOpt(billing === 'yearly')}
            onClick={() => setBilling('yearly')}
          >
            {t.toggle.yearly}
            <span style={s.savePill}>{t.toggle.save}</span>
          </div>
        </div>
      </div>
      </div>{/* close white band */}

      {/* ── BAND 2: CARDS — gray ── */}
      <div style={{ background: '#f4f4f1', borderTop: '1px solid #ebebeb', padding: '48px 0' }}>
      <div className="pricing-grid-wrap">
        {t.plans.map((plan) => {
          const p = billing === 'yearly' ? plan.yearly : plan.monthly;
          const ctaStyleObj = plan.ctaStyle === 'primary' ? s.ctaPrimary : plan.ctaStyle === 'secondary' ? s.ctaSecondary : s.ctaDefault;
          return (
            <div
              key={plan.id}
              className="pricing-card"
              data-testid={`pricing-card-${plan.id}`}
              style={s.card(plan.featured)}
            >
              {plan.badge && (
                <div className="badge-popular-anim" style={s.badgePop}>
                  <Shield size={11} /> {plan.badge}
                </div>
              )}
              <div style={s.planName(plan.featured)}>{plan.name}</div>
              <div style={s.planDesc}>{plan.desc}</div>
              <div style={s.price}>{p.price}</div>
              <div style={s.period}>{p.period}</div>
              <div style={s.yearlySave}>{billing === 'yearly' && p.save ? p.save : '\u00A0'}</div>
              <button
                className="pricing-cta"
                data-testid={`cta-${plan.id}`}
                style={{ ...s.ctaBase, ...ctaStyleObj }}
                onClick={() => navigate(plan.link)}
              >
                {plan.cta}
              </button>
              {plan.subCta && <div style={s.noCC}>{plan.subCta}</div>}
              <div style={{ marginTop: 12, flex: 1 }}>
                {plan.features.map((f, fi) => (
                  <div key={fi} style={s.featureRow(f.ok)}>
                    <span style={f.ok ? s.checkMark : s.xMark}>{f.ok ? '\u2713' : '\u00D7'}</span>
                    {f.text}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>{/* close gray cards band */}

      {/* ── BAND 3: ATTORNEY LETTER — white ── */}
      <div style={{ background: '#fff', borderTop: '1px solid #ebebeb', padding: '48px 20px' }}>
      {/* ── SECTION 4: ATTORNEY LETTER ── */}
      <div className="section-wrap" style={{ ...s.section, border: 'none', background: 'transparent' }} data-testid="section-attorney-letter">
        <div style={s.sectionBadge(false)}>
          <Shield size={11} /> {t.attorney.badge}
        </div>
        <h2 className="section-h2" style={s.h2}>
          {t.attorney.h2pre}<br />
          {language === 'en' ? 'In ' : 'En '}<span style={s.accent}>{t.attorney.h2accent1}</span>
          {t.attorney.h2mid}<span style={s.accent}>{t.attorney.h2accent2}</span>
        </h2>
        <p style={s.desc}>{t.attorney.desc}</p>
        <div className="pillars-grid" style={s.pillars}>
          {t.attorney.pillars.map((p, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={s.pillarIcon}><Icon name={p.icon} size={22} /></div>
              <div style={s.pillarTitle}>{p.title}</div>
              <div style={s.pillarSub}>{p.sub}</div>
            </div>
          ))}
        </div>
      </div>
      </div>{/* close attorney band */}

      {/* ── BAND 4: INTELLIGENCE — gray ── */}
      <div style={{ background: '#f4f4f1', borderTop: '1px solid #ebebeb', padding: '48px 20px' }}>
      {/* ── SECTION 5: THE INTELLIGENCE ── */}
      <div className="section-wrap" style={{ ...s.section, textAlign: 'center', border: 'none', background: 'transparent' }} data-testid="section-intelligence">
        <div style={s.sectionBadge(false)}>{t.intelligence.badge}</div>
        <h2 className="section-h2" style={s.h2}>
          {t.intelligence.h2}<br />{t.intelligence.h2br}
        </h2>
        <p style={s.desc}>{t.intelligence.desc}</p>
        <div className="stats-grid-wrap" style={s.statsGrid}>
          {t.intelligence.stats1.map((st, i) => (
            <div key={i} style={s.stat}>
              <div style={s.statNum}>{st.num}</div>
              <div style={s.statLabel}>{st.label}</div>
            </div>
          ))}
        </div>
        <div className="stats-grid-wrap" style={s.statsGrid}>
          {t.intelligence.stats2.map((st, i) => (
            <div key={i} style={s.stat}>
              <div style={s.statNum}>{st.num}</div>
              <div style={s.statLabel}>{st.label}</div>
            </div>
          ))}
        </div>
        <div className="cap-grid-wrap" style={s.capGrid}>
          {t.intelligence.capabilities.map((c, i) => (
            <div key={i} style={s.capCard}>
              <div style={s.capIcon}><Icon name={c.icon} size={18} /></div>
              <div>
                <div style={s.capTitle}>{c.title}</div>
                <div style={s.capSub}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>{/* close intelligence band */}

      {/* ── BAND 5: VS OLD WORLD — white ── */}
      <div style={{ background: '#fff', borderTop: '1px solid #ebebeb', padding: '48px 20px' }}>
      {/* ── SECTION 6: VS THE OLD WORLD ── */}
      <div className="section-wrap" style={{ ...s.section, border: 'none', background: 'transparent' }} data-testid="section-old-world">
        <div style={{ marginBottom: 32 }}>
          <div style={s.sectionBadge(true)}>{t.oldWorld.badge}</div>
          <h2 className="section-h2" style={s.h2}>
            {t.oldWorld.h2pre}<br /><span style={s.accent}>{t.oldWorld.h2accent}</span>
          </h2>
        </div>
        <div className="compare-grid" style={s.compare}>
          <div style={s.compareCol(false)}>
            <div style={s.compareLabel(false)}>{t.oldWorld.left.label}</div>
            <div style={s.compareTitle(false)}>{t.oldWorld.left.title}</div>
            {t.oldWorld.left.items.map((item, i) => (
              <div key={i} style={s.compareItem}>
                <span style={s.xMark}>{'\u00D7'}</span> {item}
              </div>
            ))}
          </div>
          <div style={s.compareCol(true)}>
            <div style={s.compareLabel(true)}>{t.oldWorld.right.label}</div>
            <div style={s.compareTitle(true)}>{t.oldWorld.right.title}</div>
            {t.oldWorld.right.items.map((item, i) => (
              <div key={i} style={s.compareItem}>
                <span style={s.checkMark}>{'\u2713'}</span> {item}
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>{/* close old world band */}

      {/* ── BAND 6: GUARANTEE — blue full width ── */}
      <div style={{ background: '#eff6ff', borderTop: '1px solid #d6e4f0', padding: '48px 20px' }}>
      {/* ── SECTION 7: 30-DAY GUARANTEE ── */}
      <div style={s.finalCta} data-testid="section-guarantee">
        <div style={s.finalBadge}><Shield size={13} /> {t.guarantee.badge}</div>
        <p style={s.finalText}>{t.guarantee.text}</p>
      </div>
      </div>
    </div>
  );
}
