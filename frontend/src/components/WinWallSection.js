import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Shield, Check, Upload } from 'lucide-react';

/* ─── CATEGORY COLORS ─── */
const CAT = {
  red: { bg: '#fee2e2', color: '#b91c1c' },
  amber: { bg: '#fef3c7', color: '#b45309' },
  teal: { bg: '#ccfbf1', color: '#0f766e' },
  purple: { bg: '#f3e8ff', color: '#7c3aed' },
  pink: { bg: '#fce7f3', color: '#be185d' },
  indigo: { bg: '#e0e7ff', color: '#4338ca' },
  cyan: { bg: '#cffafe', color: '#0e7490' },
};

/* ─── CONTENT ─── */
const D = {
  us: {
    badge: 'THE WIN WALL',
    h1: ['Real wins.', 'Real money saved.'],
    desc: 'Every time someone fights back with Archer and wins, we celebrate it here. Real users. Real cases. Real money recovered.',
    featured: 'FEATURED WIN', saved: 'SAVED', won: 'WON',
    carousel: [
      { initials: 'MR', name: 'Mike R.', meta: 'Austin, TX \u00B7 Insurance denial', amount: '$14,500', title: ['Insurance refused to pay $14,500. ', 'They paid it in full.'], desc: "James cross-checked Mike\u2019s water damage policy and found the exclusion clause they cited didn\u2019t apply to his contract. The insurer reversed the denial within 6 days." },
      { initials: 'TJ', name: 'Tyler J.', meta: 'Phoenix, AZ \u00B7 Speeding ticket', amount: '$1,200', title: ['Caught at 92 mph. ', 'License saved. Ticket dismissed.'], desc: 'Tyler was facing a reckless driving charge and a $1,200 fine. James spotted a calibration discrepancy in the radar certification log. The judge dismissed the case at first hearing.' },
      { initials: 'JM', name: 'Jessica M.', meta: 'Houston, TX \u00B7 Eviction notice', amount: '$3,800', title: ['They wanted me out in 30 days. Archer gave me ', '90 more days at home.'], desc: "Jessica\u2019s landlord sent a 30-day notice with three procedural violations under Texas tenant law. James spotted them in 47 seconds. The Attorney Letter went out before lunch." },
      { initials: 'AT', name: 'Ashley T.', meta: 'Los Angeles, CA \u00B7 Wrongful termination', amount: '$22,000', title: ['Fired without notice. James got me ', '$22,000 in severance.'], desc: 'Ashley was terminated after 6 years with no warning. James found a wrongful termination angle under California labor law. HR settled within 10 days of receiving the Attorney Letter.' },
      { initials: 'DK', name: 'David K.', meta: 'Chicago, IL \u00B7 Debt collection', amount: '$8,000', title: ['Debt collector for $8,000. ', 'Time-barred. Case closed.'], desc: 'David was being chased for a credit card debt from 2017. James proved it was beyond the statute of limitations under FDCPA. The collector dropped the claim immediately.' },
    ],
    stats: { total: 5840000, totalLabel: 'Total saved', cases: 14892, casesLabel: 'Cases won', rate: '91%', rateLabel: 'Success rate', avg: '$392', avgLabel: 'Avg saved', currency: '$', live: 'Live' },
    filters: ['All wins', 'Speeding ticket', 'Eviction', 'Employment', 'Insurance', 'Debt', 'Rent'],
    wins: [
      { initials: 'RT', name: 'Rachel T.', meta: 'San Diego, CA \u00B7 1 week ago', cat: 'red', catLabel: 'MEDICAL BILL', quote: '\u201CHospital sent me a $9,400 surprise bill. James found violations of the No Surprises Act. Bill voided.\u201D', amount: '$9,400' },
      { initials: 'MS', name: 'Marcus S.', meta: 'Dallas, TX \u00B7 1 week ago', cat: 'amber', catLabel: 'SECURITY DEPOSIT', quote: '\u201CLandlord kept my $2,800 deposit for fake damages. James drafted the demand letter. Full refund in 5 days.\u201D', amount: '$2,800' },
      { initials: 'JL', name: 'Jennifer L.', meta: 'New York, NY \u00B7 2 weeks ago', cat: 'teal', catLabel: 'PARKING FINES', quote: "\u201C4 parking tickets in an unmarked zone. James proved the signage didn\u2019t comply with NYC code. All dismissed.\u201D", amount: '$520' },
      { initials: 'CH', name: 'Carlos H.', meta: 'Miami, FL \u00B7 2 weeks ago', cat: 'purple', catLabel: 'EMPLOYMENT', quote: '\u201CEmployer tried to enforce a 5-year non-compete. James proved it was unenforceable. Now I work where I want.\u201D', amount: '$18,000' },
      { initials: 'SP', name: 'Sarah P.', meta: 'Seattle, WA \u00B7 3 weeks ago', cat: 'pink', catLabel: 'RENT INCREASE', quote: '\u201CLandlord wanted +24% rent increase. James proved it violated the rent stabilization ordinance. Capped at 6%.\u201D', amount: '$5,400' },
      { initials: 'BW', name: 'Brandon W.', meta: 'Atlanta, GA \u00B7 3 weeks ago', cat: 'indigo', catLabel: 'CAR INSURANCE', quote: '\u201CInsurance lowered my accident claim by 50%. James found 3 violations of the unfair claims practice act. Full payout.\u201D', amount: '$7,200' },
    ],
    loadMore: 'Load more wins', savedLabel: 'Saved',
    citiesBadge: 'WINS BY CITY', citiesH2: 'Across all 50 states.', winsUnit: 'wins',
    cities: [
      { name: 'Los Angeles', amount: 1280000, wins: 3247 },
      { name: 'Houston', amount: 948000, wins: 2418 },
      { name: 'Phoenix', amount: 812000, wins: 2089 },
      { name: 'Chicago', amount: 721000, wins: 1847 },
      { name: 'Miami', amount: 592000, wins: 1524 },
      { name: 'Atlanta', amount: 508000, wins: 1312 },
      { name: 'Denver', amount: 462000, wins: 1198 },
      { name: 'Seattle', amount: 497000, wins: 1257 },
    ],
    ctaBadge: 'YOUR WIN COULD BE NEXT',
    ctaH2: ['Stop facing it alone.', 'Start fighting back.'],
    ctaDesc: 'James reads your document, cross-checks 2.4 million case laws, runs five reasoning passes, and finds the legal angles that win. Then a real partner attorney signs the letter that makes them stop.',
    ctaBtn: 'Upload my document', ctaSub: 'Free first analysis \u00B7 No credit card',
    uploadLink: '/upload',
    incRange: [50, 300], cityIncRange: [30, 150],
  },
  'en-be': {
    badge: 'THE WIN WALL',
    h1: ['Real wins.', 'Real money saved.'],
    desc: 'Every time someone fights back with Archer and wins, we celebrate it here. Real users. Real cases. Real money recovered.',
    featured: 'FEATURED WIN', saved: 'SAVED', won: 'WON',
    carousel: [
      { initials: 'SM', name: 'Sarah M.', meta: 'Brussels \u00B7 Eviction notice', amount: '\u20AC1,151', title: ['They wanted me out in 30 days. Archer gave me ', '90 more days at home.'], desc: "Sarah\u2019s landlord sent an eviction notice with three procedural violations under Belgian tenant law. James spotted them in 47 seconds. The Attorney Letter went out before lunch." },
      { initials: 'EL', name: 'Emma L.', meta: 'Antwerp \u00B7 Wrongful termination', amount: '\u20AC18,400', title: ['Fired after 8 years. James got me ', '\u20AC18,400 in severance.'], desc: "Emma was terminated without proper notice. James calculated her full severance under the Claeys formula and CCT 109. The HR department didn\u2019t even argue when the Attorney Letter arrived." },
      { initials: 'JR', name: 'Julien R.', meta: 'Charleroi \u00B7 Insurance denial', amount: '\u20AC12,000', title: ['Insurance refused \u20AC12,000 in damages. ', 'They paid in full.'], desc: "Julien\u2019s water damage claim was denied citing an exclusion clause. James cross-checked the policy and found the exclusion didn\u2019t apply to his contract version. The insurer reversed the decision within a week." },
      { initials: 'TD', name: 'Thomas D.', meta: 'Li\u00E8ge \u00B7 Speeding ticket', amount: '\u20AC890', title: ['Caught at 142 km/h. ', 'License saved. Fine cancelled.'], desc: 'Thomas was facing license suspension and a \u20AC890 fine. James spotted a calibration anomaly in the radar certificate that no one had noticed. The case was dismissed at the first hearing.' },
      { initials: 'AB', name: 'Antoine B.', meta: 'Mons \u00B7 Rent increase', amount: '\u20AC1,872', title: ['My landlord wanted +18% rent. ', 'Got it down to 2.4%.'], desc: 'Antoine received a rent increase notice that exceeded the legal indexation. James calculated the maximum allowed under Belgian law and drafted a formal contestation. The landlord conceded immediately.' },
    ],
    stats: { total: 1240000, totalLabel: 'Total saved', cases: 3247, casesLabel: 'Cases won', rate: '89%', rateLabel: 'Success rate', avg: '\u20AC384', avgLabel: 'Avg saved', currency: '\u20AC', live: 'Live' },
    filters: ['All wins', 'Speeding ticket', 'Eviction', 'Employment', 'Insurance', 'Debt', 'Rent'],
    wins: [
      { initials: 'CV', name: 'Camille V.', meta: 'Ghent \u00B7 1 week ago', cat: 'cyan', catLabel: 'DEBT COLLECTION', quote: '\u201CCollector chasing me for an old debt. James proved it was time-barred. They dropped it instantly.\u201D', amount: '\u20AC2,150' },
      { initials: 'MK', name: 'Marc K.', meta: 'Namur \u00B7 1 week ago', cat: 'teal', catLabel: 'SPEEDING TICKET', quote: "\u201CGot flashed at 56 in a 50 zone. James found the speed sign was hidden by a tree. Charge dismissed.\u201D", amount: '\u20AC165' },
      { initials: 'NF', name: 'Nadia F.', meta: 'Brussels \u00B7 2 weeks ago', cat: 'amber', catLabel: 'UNFAIR DEPOSIT', quote: '\u201CLandlord kept my \u20AC1,800 deposit for fake damages. James drafted the contestation. Got it all back.\u201D', amount: '\u20AC1,800' },
      { initials: 'PD', name: 'Pierre D.', meta: 'Li\u00E8ge \u00B7 2 weeks ago', cat: 'purple', catLabel: 'EMPLOYMENT', quote: '\u201CEmployer tried to enforce a non-compete. James proved it was overly broad and unenforceable in Belgium.\u201D', amount: '\u20AC5,400' },
      { initials: 'LK', name: 'Laura K.', meta: 'Antwerp \u00B7 3 weeks ago', cat: 'indigo', catLabel: 'INSURANCE', quote: '\u201CCar insurance lowered my claim by 40%. James found 2 violations of consumer protection law. Full payout.\u201D', amount: '\u20AC3,650' },
      { initials: 'SB', name: 'Sophie B.', meta: 'Charleroi \u00B7 3 weeks ago', cat: 'pink', catLabel: 'PARKING FINE', quote: "\u201C3 parking fines in a no-sign zone. James found the signage was non-compliant. All cancelled.\u201D", amount: '\u20AC345' },
    ],
    loadMore: 'Load more wins', savedLabel: 'Saved',
    citiesBadge: 'WINS BY CITY', citiesH2: 'Across all of Belgium.', winsUnit: 'wins',
    cities: [
      { name: 'Brussels', amount: 384000, wins: 982 },
      { name: 'Antwerp', amount: 268000, wins: 712 },
      { name: 'Li\u00E8ge', amount: 198000, wins: 524 },
      { name: 'Ghent', amount: 152000, wins: 418 },
      { name: 'Charleroi', amount: 104000, wins: 287 },
      { name: 'Namur', amount: 67000, wins: 184 },
      { name: 'Mons', amount: 38000, wins: 98 },
      { name: 'Bruges', amount: 29000, wins: 42 },
    ],
    ctaBadge: 'YOUR WIN COULD BE NEXT',
    ctaH2: ['Stop facing it alone.', 'Start fighting back.'],
    ctaDesc: 'James reads your document, cross-checks 2.4 million case laws, runs five reasoning passes, and finds the legal angles that win. Then a real partner attorney signs the letter that makes them stop.',
    ctaBtn: 'Upload my document', ctaSub: 'Free first analysis \u00B7 No credit card',
    uploadLink: '/upload',
    incRange: [40, 240], cityIncRange: [20, 100],
  },
  'fr-be': {
    badge: 'LE MUR DES VICTOIRES',
    h1: ['Des vraies victoires.', 'Du vrai argent r\u00E9cup\u00E9r\u00E9.'],
    desc: 'Chaque fois que quelqu\u2019un se bat avec Archer et gagne, on le c\u00E9l\u00E8bre ici. De vrais utilisateurs. De vrais dossiers. Du vrai argent r\u00E9cup\u00E9r\u00E9.',
    featured: 'VICTOIRE DU JOUR', saved: '\u00C9CONOMIS\u00C9', won: 'GAGN\u00C9',
    carousel: [
      { initials: 'SM', name: 'Sarah M.', meta: 'Bruxelles \u00B7 Expulsion', amount: '1 151 \u20AC', title: ['Ils voulaient me mettre dehors en 30 jours. Archer m\u2019a donn\u00E9 ', '90 jours de plus chez moi.'], desc: "Le propri\u00E9taire de Sarah a envoy\u00E9 un avis d\u2019expulsion avec trois vices de proc\u00E9dure en droit locatif belge. James les a rep\u00E9r\u00E9s en 47 secondes. L\u2019Attorney Letter est partie avant midi." },
      { initials: 'EL', name: 'Emma L.', meta: 'Anvers \u00B7 Licenciement abusif', amount: '18 400 \u20AC', title: ['Licenci\u00E9e apr\u00E8s 8 ans. James m\u2019a obtenu ', '18 400 \u20AC d\u2019indemnit\u00E9s.'], desc: "Emma a \u00E9t\u00E9 licenci\u00E9e sans pr\u00E9avis correct. James a calcul\u00E9 ses indemnit\u00E9s compl\u00E8tes selon la formule Claeys et la CCT 109. Le service RH n\u2019a m\u00EAme pas contest\u00E9 \u00E0 la r\u00E9ception de l\u2019Attorney Letter." },
      { initials: 'JR', name: 'Julien R.', meta: 'Charleroi \u00B7 Refus d\u2019assurance', amount: '12 000 \u20AC', title: ['L\u2019assurance a refus\u00E9 12 000 \u20AC de dommages. ', 'Ils ont tout pay\u00E9.'], desc: "La demande de d\u00E9g\u00E2ts des eaux de Julien a \u00E9t\u00E9 refus\u00E9e en invoquant une clause d\u2019exclusion. James a v\u00E9rifi\u00E9 la police et trouv\u00E9 que l\u2019exclusion ne s\u2019appliquait pas \u00E0 sa version du contrat. L\u2019assureur a revers\u00E9 sa d\u00E9cision en une semaine." },
      { initials: 'TD', name: 'Thomas D.', meta: 'Li\u00E8ge \u00B7 Exc\u00E8s de vitesse', amount: '890 \u20AC', title: ['Flash\u00E9 \u00E0 142 km/h. ', 'Permis sauv\u00E9. Amende annul\u00E9e.'], desc: "Thomas risquait un retrait de permis et une amende de 890 \u20AC. James a rep\u00E9r\u00E9 une anomalie de calibrage dans le certificat radar que personne n\u2019avait remarqu\u00E9e. L\u2019affaire a \u00E9t\u00E9 class\u00E9e d\u00E8s la premi\u00E8re audience." },
      { initials: 'AB', name: 'Antoine B.', meta: 'Mons \u00B7 Augmentation de loyer', amount: '1 872 \u20AC', title: ['Mon propri\u00E9taire voulait +18% de loyer. ', 'R\u00E9duit \u00E0 2,4%.'], desc: "Antoine a re\u00E7u un avis d\u2019augmentation de loyer d\u00E9passant l\u2019indexation l\u00E9gale. James a calcul\u00E9 le maximum autoris\u00E9 par la loi belge et r\u00E9dig\u00E9 une contestation formelle. Le propri\u00E9taire a c\u00E9d\u00E9 imm\u00E9diatement." },
    ],
    stats: { total: 1240000, totalLabel: 'Total \u00E9conomis\u00E9', cases: 3247, casesLabel: 'Affaires gagn\u00E9es', rate: '89%', rateLabel: 'Taux de succ\u00E8s', avg: '384 \u20AC', avgLabel: 'Moyenne \u00E9conomis\u00E9e', currency: '\u20AC', live: 'En direct' },
    filters: ['Toutes les victoires', 'Exc\u00E8s de vitesse', 'Expulsion', 'Emploi', 'Assurance', 'Dette', 'Loyer'],
    wins: [
      { initials: 'CV', name: 'Camille V.', meta: 'Gand \u00B7 1 semaine', cat: 'cyan', catLabel: 'RECOUVREMENT DE DETTE', quote: '\u201CUn recouvreur me poursuivait pour une vieille dette. James a prouv\u00E9 qu\u2019elle \u00E9tait prescrite. Ils ont abandonn\u00E9 imm\u00E9diatement.\u201D', amount: '2 150 \u20AC' },
      { initials: 'MK', name: 'Marc K.', meta: 'Namur \u00B7 1 semaine', cat: 'teal', catLabel: 'EXC\u00C8S DE VITESSE', quote: '\u201CFlash\u00E9 \u00E0 56 dans une zone 50. James a trouv\u00E9 que le panneau \u00E9tait cach\u00E9 par un arbre. Amende annul\u00E9e.\u201D', amount: '165 \u20AC' },
      { initials: 'NF', name: 'Nadia F.', meta: 'Bruxelles \u00B7 2 semaines', cat: 'amber', catLabel: 'CAUTION INJUSTIFI\u00C9E', quote: '\u201CMon propri\u00E9taire a gard\u00E9 mes 1 800 \u20AC de caution pour de faux d\u00E9g\u00E2ts. James a r\u00E9dig\u00E9 la contestation. Tout r\u00E9cup\u00E9r\u00E9.\u201D', amount: '1 800 \u20AC' },
      { initials: 'PD', name: 'Pierre D.', meta: 'Li\u00E8ge \u00B7 2 semaines', cat: 'purple', catLabel: 'EMPLOI', quote: '\u201CMon employeur a voulu imposer une clause de non-concurrence. James a prouv\u00E9 qu\u2019elle \u00E9tait trop large et inapplicable en Belgique.\u201D', amount: '5 400 \u20AC' },
      { initials: 'LK', name: 'Laura K.', meta: 'Anvers \u00B7 3 semaines', cat: 'indigo', catLabel: 'ASSURANCE', quote: '\u201CMon assurance auto a r\u00E9duit mon indemnisation de 40%. James a trouv\u00E9 2 violations du droit de la consommation. Indemnisation compl\u00E8te.\u201D', amount: '3 650 \u20AC' },
      { initials: 'SB', name: 'Sophie B.', meta: 'Charleroi \u00B7 3 semaines', cat: 'pink', catLabel: 'AMENDE DE STATIONNEMENT', quote: '\u201C3 amendes de stationnement dans une zone sans panneau. James a prouv\u00E9 que la signalisation n\u2019\u00E9tait pas conforme. Tout annul\u00E9.\u201D', amount: '345 \u20AC' },
    ],
    loadMore: 'Voir plus de victoires', savedLabel: '\u00C9conomis\u00E9',
    citiesBadge: 'VICTOIRES PAR VILLE', citiesH2: 'Dans toute la Belgique.', winsUnit: 'victoires',
    cities: [
      { name: 'Bruxelles', amount: 384000, wins: 982 },
      { name: 'Anvers', amount: 268000, wins: 712 },
      { name: 'Li\u00E8ge', amount: 198000, wins: 524 },
      { name: 'Gand', amount: 152000, wins: 418 },
      { name: 'Charleroi', amount: 104000, wins: 287 },
      { name: 'Namur', amount: 67000, wins: 184 },
      { name: 'Mons', amount: 38000, wins: 98 },
      { name: 'Bruges', amount: 29000, wins: 42 },
    ],
    ctaBadge: 'VOTRE VICTOIRE EST LA PROCHAINE',
    ctaH2: ["Arr\u00EAtez d\u2019y faire face seul.", 'Commencez \u00E0 riposter.'],
    ctaDesc: "James lit votre document, croise 2,4 millions de jurisprudences, ex\u00E9cute cinq passes de raisonnement, et trouve les angles juridiques qui gagnent. Ensuite un vrai avocat partenaire signe la lettre qui les fait s\u2019arr\u00EAter.",
    ctaBtn: 'T\u00E9l\u00E9verser mon document', ctaSub: 'Premi\u00E8re analyse gratuite \u00B7 Sans carte bancaire',
    uploadLink: '/upload',
    incRange: [40, 240], cityIncRange: [20, 100],
  },
};

/* ─── FORMAT HELPERS ─── */
const fmtAmount = (v, cur) => {
  if (cur === '$') {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
    if (v >= 1000) return `$${Math.round(v / 1000)}K`;
    return `$${v.toLocaleString('en-US')}`;
  }
  if (v >= 1000000) return `\u20AC${(v / 1000000).toFixed(2).replace('.', ',')}M`;
  if (v >= 1000) return `\u20AC${Math.round(v / 1000)}K`;
  return `\u20AC${v.toLocaleString('de-DE')}`;
};
const fmtCases = (v, isFr) => isFr ? v.toLocaleString('fr-FR') : v.toLocaleString('en-US');
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/* ─── CSS ─── */
const CSS = `
.ww .section-wrap{width:100%;padding:64px 24px}
.ww .section-wrap.gray{background:#f4f4f1}
.ww .section-wrap.white{background:#fff;border-top:0.5px solid #e2e0db;border-bottom:0.5px solid #e2e0db}
.ww .section-wrap.blue{background:#eff6ff;border-top:0.5px solid #e2e0db}
.ww .section-inner{max-width:1280px;margin:0 auto}
.ww .carousel-slide{opacity:0;position:absolute;top:0;left:0;width:100%;transition:opacity .5s}
.ww .carousel-slide.active{opacity:1;position:relative}
.ww .wins-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.ww .cities-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.ww .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@keyframes ww-pulse{0%{box-shadow:0 0 0 0 rgba(22,163,74,.7)}70%{box-shadow:0 0 0 8px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}
.ww .pulse-dot{width:6px;height:6px;background:#16a34a;border-radius:50%;animation:ww-pulse 2s ease-in-out infinite}
.ww .flash{color:#16a34a !important;transition:color .4s}
.ww .win-card:hover{transform:translateY(-2px);border-color:#1a56db !important}
.ww .city-card:hover{transform:translateY(-1px)}
@media(max-width:768px){
.ww .wins-grid{grid-template-columns:1fr}
.ww .stats-grid{grid-template-columns:repeat(2,1fr)}
.ww .cities-grid{grid-template-columns:repeat(2,1fr)}
.ww .hero-h1{font-size:38px !important}
}
`;

/* ─── COMPONENT ─── */
const WinWallSection = ({ jurisdiction = 'US', language = 'en' }) => {
  const version = jurisdiction === 'US' ? 'us' : language === 'fr' ? 'fr-be' : 'en-be';
  const t = D[version];
  const isFr = version === 'fr-be';
  const navigate = useNavigate();

  const [current, setCurrent] = useState(0);
  const [totalSaved, setTotalSaved] = useState(t.stats.total);
  const [casesWon, setCasesWon] = useState(t.stats.cases);
  const [cityData, setCityData] = useState(t.cities.map(c => ({ ...c })));
  const [flashTotal, setFlashTotal] = useState(false);
  const [flashCases, setFlashCases] = useState(false);
  const [flashCity, setFlashCity] = useState(-1);
  const timerRef = useRef(null);

  const resetCarousel = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % 5), 4500);
  }, []);

  useEffect(() => {
    resetCarousel();
    const totalTimer = setInterval(() => {
      setTotalSaved(p => p + rand(t.incRange[0], t.incRange[1]));
      setFlashTotal(true);
      setTimeout(() => setFlashTotal(false), 600);
    }, 3500);
    const casesTimer = setInterval(() => {
      if (Math.random() < 0.6) {
        setCasesWon(p => p + 1);
        setFlashCases(true);
        setTimeout(() => setFlashCases(false), 600);
      }
    }, 5000);
    const cityTimer = setInterval(() => {
      const idx = rand(0, 7);
      setCityData(prev => {
        const next = [...prev];
        const inc = rand(t.cityIncRange[0], t.cityIncRange[1]);
        next[idx] = { ...next[idx], amount: next[idx].amount + inc, wins: Math.random() < 0.45 ? next[idx].wins + 1 : next[idx].wins };
        return next;
      });
      setFlashCity(idx);
      setTimeout(() => setFlashCity(-1), 600);
    }, version === 'us' ? 2500 : 2800);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(totalTimer);
      clearInterval(casesTimer);
      clearInterval(cityTimer);
    };
  }, [resetCarousel, t.incRange, t.cityIncRange, version]);

  const goSlide = (i) => { setCurrent(i); resetCarousel(); };

  const s = {
    badge: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#1a56db', fontSize: 10, fontWeight: 600, letterSpacing: 1, padding: '5px 14px', borderRadius: 20 },
    h1: { fontSize: 52, fontWeight: 600, letterSpacing: -2, lineHeight: 1.05, color: '#0a0a0f', margin: '18px 0 14px' },
    accent: { color: '#1a56db' },
    desc: { fontSize: 15, color: '#555', lineHeight: 1.6, maxWidth: 560, margin: '0 auto' },
    iconCircle: { width: 56, height: 56, borderRadius: '50%', background: '#fef9ec', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    slide: { background: '#fff', borderRadius: 16, padding: '32px 28px', border: '0.5px solid #e2e0db', maxWidth: 760, margin: '0 auto' },
    slideBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, background: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 600, letterSpacing: 0.8, padding: '4px 12px', borderRadius: 12, marginBottom: 14 },
    slideH3: { fontSize: 22, fontWeight: 500, color: '#0a0a0f', lineHeight: 1.35, margin: '0 0 12px', letterSpacing: -0.3 },
    slideP: { fontSize: 14, color: '#555', lineHeight: 1.6, margin: '0 0 20px' },
    slideFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    avatar: (bg, color) => ({ width: 36, height: 36, borderRadius: '50%', background: bg || '#eff6ff', color: color || '#1a56db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }),
    dot: (active) => ({ width: 8, height: 8, borderRadius: '50%', background: active ? '#1a56db' : '#d1d5db', border: 'none', cursor: 'pointer', padding: 0, transition: 'background .2s' }),
    statCard: { background: '#f4f4f1', borderRadius: 14, padding: '22px 18px', textAlign: 'center' },
    statNum: { fontSize: 28, fontWeight: 600, color: '#0a0a0f', lineHeight: 1, marginBottom: 4, transition: 'color .4s' },
    statLabel: { fontSize: 12, color: '#555' },
    liveDot: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#16a34a', marginTop: 6 },
    filterWrap: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
    filter: (active) => ({ padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: active ? '1px solid #1a56db' : '0.5px solid #e2e0db', background: active ? '#eff6ff' : '#fff', color: active ? '#1a56db' : '#555' }),
    winCard: { background: '#fff', borderRadius: 14, padding: '18px 16px', border: '0.5px solid #e2e0db', transition: 'transform .2s, border-color .2s' },
    wonBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 10, letterSpacing: 0.3 },
    catPill: (cat) => ({ display: 'inline-block', fontSize: 10, fontWeight: 500, padding: '4px 10px', borderRadius: 6, letterSpacing: 0.4, background: CAT[cat]?.bg || '#f4f4f1', color: CAT[cat]?.color || '#555', marginBottom: 10 }),
    winQuote: { fontSize: 13, color: '#555', lineHeight: 1.55, margin: '0 0 14px', fontStyle: 'italic' },
    winSaved: { fontSize: 20, fontWeight: 500, color: '#15803d' },
    cityCard: { background: '#f4f4f1', borderRadius: 12, padding: '18px 14px', textAlign: 'center', transition: 'transform .2s' },
    cityAmount: { fontSize: 22, fontWeight: 600, color: '#0a0a0f', lineHeight: 1, marginBottom: 4, transition: 'color .4s' },
    cityName: { fontSize: 13, fontWeight: 500, color: '#0a0a0f', marginBottom: 2 },
    cityWins: { fontSize: 11, color: '#9ca3af', transition: 'color .4s' },
    ctaWrap: { textAlign: 'center', maxWidth: 640, margin: '0 auto' },
    ctaBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1a56db', fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 14 },
    ctaH2: { fontSize: 36, fontWeight: 600, letterSpacing: -1.5, lineHeight: 1.1, color: '#0a0a0f', margin: '0 0 14px' },
    ctaP: { fontSize: 14, color: '#555', lineHeight: 1.6, margin: '0 0 24px' },
    ctaBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 30, background: '#1a56db', color: '#fff', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' },
    ctaSub: { fontSize: 12, color: '#9ca3af', marginTop: 10 },
    loadBtn: { display: 'block', margin: '20px auto 0', padding: '10px 28px', borderRadius: 24, border: '0.5px solid #e2e0db', background: '#fff', fontSize: 13, fontWeight: 500, color: '#555', cursor: 'pointer' },
    liveBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, background: '#ecfdf5', color: '#16a34a', padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 500, letterSpacing: 0.8 },
  };

  return (
    <div className="ww" data-testid="win-wall-section">
      <style>{CSS}</style>

      {/* 1. HERO (white) */}
      <div className="section-wrap white">
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <div style={s.iconCircle}><Trophy size={28} color="#d4a017" /></div>
          <div style={{ marginBottom: 16 }}><div style={s.badge}>{t.badge}</div></div>
          <h2 className="hero-h1" style={s.h1}>{t.h1[0]}<br /><span style={s.accent}>{t.h1[1]}</span></h2>
          <p style={s.desc}>{t.desc}</p>
        </div>
      </div>

      {/* 2. CAROUSEL (gray) */}
      <div className="section-wrap gray">
        <div className="section-inner">
          <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', minHeight: 280 }}>
            {t.carousel.map((sl, i) => (
              <div key={i} className={`carousel-slide ${i === current ? 'active' : ''}`} style={s.slide}>
                <div style={s.slideBadge}><Check size={9} /> {t.featured}</div>
                <h3 style={s.slideH3}>&ldquo;{sl.title[0]}<span style={s.accent}>{sl.title[1]}</span>&rdquo;</h3>
                <p style={s.slideP}>{sl.desc}</p>
                <div style={s.slideFooter}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={s.avatar('#eff6ff', '#1a56db')}>{sl.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0f' }}>{sl.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{sl.meta}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: 0.5, marginBottom: 2 }}>{t.saved}</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#15803d' }}>{sl.amount}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <button key={i} data-testid={`carousel-dot-${i}`} style={s.dot(i === current)} onClick={() => goSlide(i)} />
            ))}
          </div>
        </div>
      </div>

      {/* 3. STATS (white) */}
      <div className="section-wrap white">
        <div className="section-inner">
          <div className="stats-grid">
            <div style={s.statCard}>
              <div data-testid="stat-total" style={{ ...s.statNum, ...(flashTotal ? { color: '#16a34a' } : {}) }}>{fmtAmount(totalSaved, t.stats.currency)}</div>
              <div style={s.statLabel}>{t.stats.totalLabel}</div>
              <div style={s.liveDot}><span className="pulse-dot" /> {t.stats.live}</div>
            </div>
            <div style={s.statCard}>
              <div data-testid="stat-cases" style={{ ...s.statNum, ...(flashCases ? { color: '#16a34a' } : {}) }}>{fmtCases(casesWon, isFr)}</div>
              <div style={s.statLabel}>{t.stats.casesLabel}</div>
              <div style={s.liveDot}><span className="pulse-dot" /> {t.stats.live}</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>{t.stats.rate}</div>
              <div style={s.statLabel}>{t.stats.rateLabel}</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>{t.stats.avg}</div>
              <div style={s.statLabel}>{t.stats.avgLabel}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. WINS GRID (gray) */}
      <div className="section-wrap gray">
        <div className="section-inner">
          <div style={s.filterWrap}>
            {t.filters.map((f, i) => (
              <div key={i} style={s.filter(i === 0)}>{f}</div>
            ))}
          </div>
          <div className="wins-grid">
            {t.wins.map((w, i) => (
              <div key={i} className="win-card" style={s.winCard} data-testid={`win-card-${i}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={s.avatar(CAT[w.cat]?.bg, CAT[w.cat]?.color)}>{w.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0f' }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{w.meta}</div>
                    </div>
                  </div>
                  <div style={s.wonBadge}><Check size={9} /> {t.won}</div>
                </div>
                <div style={s.catPill(w.cat)}>{w.catLabel}</div>
                <p style={s.winQuote}>{w.quote}</p>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{t.savedLabel}</div>
                  <div style={s.winSaved}>{w.amount}</div>
                </div>
              </div>
            ))}
          </div>
          <button style={s.loadBtn}>{t.loadMore}</button>
        </div>
      </div>

      {/* 5. CITIES (white) */}
      <div className="section-wrap white">
        <div className="section-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={s.badge}>{t.citiesBadge}</div>
            <div style={s.liveBadge}><span className="pulse-dot" /> {t.stats.live}</div>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -1, color: '#0a0a0f', margin: '0 0 20px' }}>{t.citiesH2}</h2>
          <div className="cities-grid">
            {cityData.map((c, i) => (
              <div key={i} className="city-card" style={s.cityCard}>
                <div style={{ ...s.cityAmount, ...(flashCity === i ? { color: '#16a34a' } : {}) }}>{fmtAmount(c.amount, t.stats.currency)}</div>
                <div style={s.cityName}>{c.name}</div>
                <div style={{ ...s.cityWins, ...(flashCity === i ? { color: '#16a34a' } : {}) }}>{fmtCases(c.wins, isFr)} {t.winsUnit}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. FINAL CTA (blue) */}
      <div className="section-wrap blue">
        <div className="section-inner">
          <div style={s.ctaWrap}>
            <div style={s.ctaBadge}><Shield size={13} /> {t.ctaBadge}</div>
            <h2 style={s.ctaH2}>{t.ctaH2[0]}<br />{t.ctaH2[1]}</h2>
            <p style={s.ctaP}>{t.ctaDesc}</p>
            <button style={s.ctaBtn} onClick={() => navigate(t.uploadLink)} data-testid="winwall-cta">
              <Upload size={16} /> {t.ctaBtn}
            </button>
            <div style={s.ctaSub}>{t.ctaSub}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WinWallSection;
