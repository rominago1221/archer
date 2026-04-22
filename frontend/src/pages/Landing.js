import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHead from '../components/seo/PageHead';
import JsonLd, { ORGANIZATION_SCHEMA, SOFTWARE_APP_SCHEMA } from '../components/seo/JsonLd';
import GoogleAnalytics from '../components/seo/GoogleAnalytics';
import { PAGE_METADATA } from '../lib/seo/metadata';
import PublicHeader from '../components/PublicHeader';
import HomeJourneySection from '../components/Home/HomeJourneySection';
import translations, { getStoredLocale, setStoredLocale, getLocaleFromPrefs } from '../data/landingTranslations';
const F = '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif';

/* ─── BILINGUAL CONTENT ─── */
const C = {
  en: {
    heroBadge: 'The most powerful legal AI in the world',
    heroSub: 'Your law firm, redefined for life.',
    ctaStart: 'Start free', ctaHow: 'See how it works',
    trust: [
      { num: '2.4M', desc: 'case laws', color: '#1a56db', icon: 'book' },
      { num: 'Live', desc: 'case law', color: '#16a34a', icon: 'activity', pulse: true },
      { num: '60 sec', desc: 'analysis', color: '#eab308', icon: 'zap' },
      { num: 'Attorney', desc: 'signed', color: '#7c3aed', icon: 'shieldCheck' },
      { num: '94%', desc: 'accuracy', color: '#15803d', icon: 'badgeCheck' },
    ],
    pillarsSupra: 'THE COMPLETE LAW FIRM',
    pillarsTitle: ['Your entire legal case.', 'Handled from A to Z.'],
    pillarsDesc: 'Three steps. Most cases resolved in under 6 hours.',
    pillars: [
      { num: '01', title: 'You upload', desc: 'Drop any legal document. Archer reads it all.', green: false, output: 'formats' },
      { num: '02', title: 'Archer analyzes', desc: 'Full case analysis in 60 seconds flat.', green: false, output: 'stats' },
      { num: '03', title: 'You choose', desc: 'Send it yourself, or let an attorney sign it.', green: true, output: 'actions' },
    ],
    pillarsFooter: ['Average case: ', 'resolved in 6 hours'],
    intelSupra: 'THE INTELLIGENCE',
    intelTitle: ['The most powerful legal AI', 'ever built for individuals.'],
    intelDesc: 'Trained on 2.4 million case laws. Runs five reasoning passes on every case. Updated with live jurisprudence. No other legal AI comes close.',
    stats: [
      { num: '2.4M', label: 'Case laws analyzed', sub: 'Live, updated daily', bg: '#eff6ff', ic: '#1a56db' },
      { num: '60s', label: 'Full case analysis', sub: 'From upload to result', bg: '#fef3c7', ic: '#eab308' },
      { num: '5', label: 'Reasoning passes', sub: 'Per case analyzed', bg: '#f3e8ff', ic: '#7c3aed' },
      { num: '94%', label: 'Accuracy rate', sub: 'Benchmarked on real cases', bg: '#dcfce7', ic: '#15803d' },
    ],
    caps: [
      { t: 'Legal angle detection', d: 'Identifies every legal argument available in your case, ranked by win probability.' },
      { t: 'Jurisprudence matching', d: 'Cross-references your case against millions of precedents in real time.' },
      { t: 'Win probability scoring', d: 'Calculates your exact chances of winning, based on 2.4M historical outcomes.' },
      { t: 'Multi-jurisdiction', d: 'Trained on both US federal/state law and Belgian civil law. More countries coming.' },
      { t: '5 languages supported', d: 'English, French, Dutch, German, and Spanish. Native-level legal terminology.' },
      { t: 'Available 24/7', d: 'No office hours. Your legal cabinet never sleeps, never takes vacation, never makes you wait.' },
    ],
    handleSupra: 'WHAT WE HANDLE',
    handleTitle: ["Whatever you're dealing with.", "We've seen it before."],
    handleDesc: 'From small daily annoyances to life-changing disputes, Archer handles the legal issues real people actually face.',
    handleCards: [
      { t: 'Speeding tickets', d: 'Contest fines, wrong readings, procedural errors.', bg: '#eff6ff', ic: '#1a56db', icon: 'car' },
      { t: 'Parking fines', d: 'Wrong plate, invalid zone, expired meter disputes.', bg: '#fef3c7', ic: '#b45309', icon: 'parking' },
      { t: 'Consumer disputes', d: 'Defective products, refund refusals, scams.', bg: '#dcfce7', ic: '#15803d', icon: 'bag' },
      { t: 'Contract disputes', d: 'Breach, unclear clauses, cancellations.', bg: '#e0e7ff', ic: '#4338ca', icon: 'file' },
      { t: 'Wrongful eviction', d: 'Illegal notices, procedural violations, tenant rights.', bg: '#fee2e2', ic: '#b91c1c', icon: 'home' },
      { t: 'Wrongful termination', d: 'Unfair firing, missing notice, unpaid wages.', bg: '#f3e8ff', ic: '#7c3aed', icon: 'briefcase' },
      { t: 'Insurance denials', d: 'Bad faith claims, coverage disputes, delays.', bg: '#ffedd5', ic: '#ea580c', icon: 'shield' },
      { t: 'Court summons', d: 'Understand, respond, prepare your defense.', bg: '#f4f4f1', ic: '#555', icon: 'scale' },
    ],
    letterBadge: 'ONE OF FOUR ACTIONS',
    letterTitle: ['A real lawyer.', 'In ', '4 hours.', ' For ', '$49.99.'],
    letterDesc: "For high-stakes cases \u2014 evictions, wrongful termination, insurance denials \u2014 Archer's attorneys step in. A partner attorney reviews, signs, and takes full legal responsibility.",
    letterDisclaimer: "Most Archer cases don't need this. It's there when your case does.",
    letterFeats: [
      { t: 'Legally binding', d: 'Same weight as any traditional attorney letter.' },
      { t: 'Signed by a partner attorney', d: 'Real lawyer, bar-registered, stays on your case.' },
      { t: 'Real-time case tracking', d: 'When the other party replies, Archer re-analyzes automatically.' },
      { t: '$49.99 flat \u00B7 Delivered in 4h', d: 'Traditional firms charge $400\u2013$800. Same output.' },
    ],
    letterCta: 'Request an attorney letter',
    letterTo: 'Mr. Robert Henderson', letterToSub: 'Henderson Property Management, LLC',
    letterRe: 'Notice of Legal Violations \u2014 Eviction Notice #4821',
    letterBody: '\u201CDear Mr. Henderson, We represent Ms. Sarah Mitchell in connection with the eviction notice dated... Our client\u2019s rights have been violated under three specific provisions of New York tenant law...\u201D',
    letterDelivered: 'DELIVERED \u00B7 3h 42min',
    counselBadge: 'OPTIONAL \u00B7 WHENEVER YOU NEED',
    counselTitle: ['Sometimes', 'you just want', 'to ', 'talk to a lawyer.'],
    counselDesc: "Archer handles 92% of cases end-to-end without any human intervention. But when you want a human voice \u2014 for reassurance, complex questions, or a second opinion \u2014 a real partner attorney is one click away.",
    counselFeats: [
      { t: 'Connected in 15 minutes', d: 'No appointments, no scheduling back-and-forth' },
      { t: 'Attorney already briefed', d: 'Your full case analysis is handed over before the call' },
      { t: 'Attorney-client privilege', d: 'End-to-end encrypted. Fully confidential.' },
    ],
    counselPay: 'PAY PER CALL', counselPrice: '$149', counselPer: '/session', counselSub: '30-min session with a partner attorney',
    counselPro: 'WITH PROTECT PRO', counselProPrice: 'First call', counselProFree: 'Included, free', counselProBadge: 'BEST VALUE',
    counselCta: 'See how live counsel works',
    counselMockLabel: 'UPCOMING CALL', counselMockReady: 'READY', counselMockTime: 'Starts in 12:34', counselMockDur: '30-min session',
    counselMockBrief: 'CASE BRIEFED BY ARCHER', counselMockCase: 'Eviction notice', counselMockViol: 'found', counselMockFile: 'Attorney will receive full brief on join', counselMockJoin: 'Join session',
    vsSupra: 'HALF THE PRICE. 100\u00D7 FASTER.',
    vsTitle: ['The old way.', 'vs. The Archer way.'],
    vsDesc: 'Traditional law firms were built for corporations. Archer is built for real people with real problems.',
    vsOld: 'OLD WAY', vsOldLabel: 'Traditional lawyer', vsNew: 'THE ARCHER WAY', vsNewLabel: 'Archer',
    vsRows: [
      { label: 'First consultation', old: '$300\u2013500', nw: 'Free, instant' },
      { label: 'Attorney letter', old: '$400\u2013800, 5\u20137 days', nw: '$49.99, 4 hours' },
      { label: 'Case analysis', old: 'Billable hours', nw: '60 seconds, included' },
      { label: 'DIY letter (send it yourself)', old: 'Not offered', nw: 'Free, unlimited', isNew: true },
      { label: 'Availability', old: 'Business hours', nw: '24/7/365' },
      { label: 'Monthly cost', old: '$200\u2013500/mo (insurance)', nw: '$29.99/mo Protect' },
    ],
    pricingSupra: 'ARCHER PROTECT',
    pricingTitle: ['Protect yourself.', 'For less than one attorney consultation.'],
    pricingDesc: 'Unlimited analyses, unlimited DIY letters, unlimited legal chat. Cancel anytime.',
    plans: [
      { name: 'Protect Solo', tag: 'For individuals', price: '$29.99', period: '/month', yearly: 'Or $299/year \u2014 save $60', feats: [{ t: 'Unlimited document analyses', bold: true }, { t: 'Unlimited DIY letters', bold: true }, { t: 'Unlimited legal chat' }, { t: 'Document Vault + Risk Monitor' }], cta: 'Start Solo', featured: false },
      { name: 'Protect Family', tag: 'Up to 3 family members', price: '$49.99', period: '/month', yearly: 'Or $499/year \u2014 save $100', feats: [{ t: 'Everything in Solo, for 3 people', bold: true }, { t: '1 Live Counsel session/year', bold: true, accent: '#7c3aed', value: '($149 value)' }, { t: 'Shared Document Vault' }, { t: 'Priority support' }], cta: 'Start Family', featured: true, badge: '\u2605 MOST POPULAR' },
      { name: 'Protect Pro', tag: 'For high-stakes cases', price: '$89.99', period: '/month', yearly: 'Or $899/year \u2014 save $180', feats: [{ t: 'Everything in Solo' }, { t: '2 Attorney Letters/year', bold: true, accent: '#1a56db', value: '($100 value)' }, { t: '1 Live Counsel session/year', bold: true, accent: '#7c3aed', value: '($149 value)' }, { t: 'Dedicated attorney follow-up' }], cta: 'Start Pro', featured: false },
    ],
    addons: { label: 'OPTIONAL ADD-ONS \u00B7 AVAILABLE TO ALL PLANS', items: [{ t: 'Certified mail', p: '$14', ic: '#b45309' }, { t: 'Attorney Letter', p: '$49.99', ic: '#1a56db' }, { t: 'Live Counsel', p: '$149', ic: '#7c3aed' }] },
    pricingLink: 'See full pricing details',
    faqSupra: 'COMMON QUESTIONS',
    faqTitle: ['Everything you need', 'to know.'],
    faqDesc: 'The most common questions about Archer, answered honestly and without the legalese.',
    faqs: [
      { q: 'Is this actually legal?', a: "Yes, 100%. Every Attorney Letter is signed by a real lawyer registered with the bar. Archer is not giving legal advice \u2014 it's preparing your case and routing it through real attorneys who take legal responsibility for the output." },
      { q: 'What if Archer gets something wrong?', a: "Every case is reviewed by a partner attorney before anything is sent. If you're not satisfied, we offer a 30-day money-back guarantee. Plus, Archer's 94% accuracy rate is benchmarked against real case outcomes \u2014 not self-reported." },
      { q: 'How is this different from ChatGPT?', a: "ChatGPT gives you general answers. Archer is trained specifically on 2.4M case laws, cross-checks live jurisprudence, runs five reasoning passes per case, and \u2014 critically \u2014 routes everything through real attorneys who validate and sign. ChatGPT can't do that." },
      { q: 'Can I cancel anytime?', a: "Yes. No commitments, no cancellation fees, no paperwork. Cancel from your dashboard in two clicks. You keep access until the end of your billing period, and we refund the unused portion if requested within 30 days." },
      { q: 'Is my data really private?', a: 'Yes. Archer uses bank-grade encryption for all case data. When a partner attorney reviews your case, attorney-client privilege applies \u2014 the same legal protection you\'d get from any law firm. We never sell data, never train on your case, never share with third parties.' },
      { q: 'What types of cases?', a: 'Eviction notices, employment disputes, wrongful termination, insurance denials, debt collection, rent increases, parking fines, medical bills, contract disputes, and more. If your case involves a document and a deadline, Archer can help.' },
      { q: 'Which countries and languages?', a: 'Currently US federal and state law, and Belgian civil law. Available in English, French, Dutch, German, and Spanish. More jurisdictions launching in 2026.' },
      { q: "Do courts accept Archer's Attorney Letters?", a: "Yes. Because every letter is signed by a real bar-registered attorney, it has the same legal weight as any letter from a traditional law firm. Opposing parties, courts, and institutions treat it exactly the same." },
    ],
    ctaBadge: 'YOUR LEGAL POWER STARTS HERE',
    ctaTitle: ['Stop facing it alone.', 'Start fighting back.'],
    ctaDesc: 'Upload your first document. Get a full legal analysis in 60 seconds. First case free. No credit card required.',
    ctaBtn: 'Upload my document',
    ctaSub: 'Free first analysis \u00B7 No credit card \u00B7 Cancel anytime',
  },
  fr: {
    heroBadge: "L'IA juridique la plus puissante au monde",
    heroSub: 'Votre cabinet juridique, r\u00E9invent\u00E9 pour la vie.',
    ctaStart: 'Commencer gratuitement', ctaHow: "Voir comment \u00E7a marche",
    trust: [
      { num: '2.4M', desc: 'jurisprudences', color: '#1a56db', icon: 'book' },
      { num: 'Live', desc: 'jurisprudence', color: '#16a34a', icon: 'activity', pulse: true },
      { num: '60 sec', desc: 'analyse', color: '#eab308', icon: 'zap' },
      { num: 'Avocat', desc: 'signature', color: '#7c3aed', icon: 'shieldCheck' },
      { num: '94%', desc: 'pr\u00E9cision', color: '#15803d', icon: 'badgeCheck' },
    ],
    pillarsSupra: 'LE CABINET JURIDIQUE COMPLET',
    pillarsTitle: ['Votre dossier juridique entier.', 'G\u00E9r\u00E9 de A \u00E0 Z.'],
    pillarsDesc: "Trois \u00E9tapes. La plupart des dossiers r\u00E9solus en moins de 6 heures.",
    pillars: [
      { num: '01', title: 'Vous t\u00E9l\u00E9versez', desc: "D\u00E9posez n'importe quel document juridique. Archer lit tout.", green: false, output: 'formats' },
      { num: '02', title: 'Archer analyse', desc: 'Analyse compl\u00E8te du dossier en 60 secondes.', green: false, output: 'stats' },
      { num: '03', title: 'Vous choisissez', desc: "Envoyez-le vous-m\u00EAme, ou laissez un avocat le signer.", green: true, output: 'actions' },
    ],
    pillarsFooter: ['Dossier moyen : ', 'r\u00E9solu en 6 heures'],
    intelSupra: "L'INTELLIGENCE",
    intelTitle: ["L'IA juridique la plus puissante", 'jamais con\u00E7ue pour les particuliers.'],
    intelDesc: "Entra\u00EEn\u00E9e sur 2,4 millions de jurisprudences. Ex\u00E9cute cinq passes de raisonnement sur chaque dossier. Mise \u00E0 jour avec la jurisprudence en direct. Aucune autre IA juridique ne s'en approche.",
    stats: [
      { num: '2.4M', label: 'Jurisprudences analys\u00E9es', sub: 'En direct, mises \u00E0 jour quotidiennement', bg: '#eff6ff', ic: '#1a56db' },
      { num: '60s', label: 'Analyse compl\u00E8te du dossier', sub: 'Du t\u00E9l\u00E9chargement au r\u00E9sultat', bg: '#fef3c7', ic: '#eab308' },
      { num: '5', label: 'Passes de raisonnement', sub: 'Par dossier analys\u00E9', bg: '#f3e8ff', ic: '#7c3aed' },
      { num: '94%', label: 'Taux de pr\u00E9cision', sub: 'Mesur\u00E9 sur de vrais dossiers', bg: '#dcfce7', ic: '#15803d' },
    ],
    caps: [
      { t: "D\u00E9tection d'angles juridiques", d: 'Identifie tous les arguments juridiques disponibles dans votre dossier, class\u00E9s par probabilit\u00E9 de victoire.' },
      { t: 'Correspondance jurisprudentielle', d: 'Croise votre dossier avec des millions de pr\u00E9c\u00E9dents en temps r\u00E9el.' },
      { t: 'Score de probabilit\u00E9 de victoire', d: 'Calcule vos chances exactes de gagner, bas\u00E9 sur 2,4M de r\u00E9sultats historiques.' },
      { t: 'Multi-juridictions', d: "Entra\u00EEn\u00E9 sur le droit f\u00E9d\u00E9ral/\u00E9tatique am\u00E9ricain et le droit civil belge. Plus de pays \u00E0 venir." },
      { t: '5 langues support\u00E9es', d: 'Anglais, fran\u00E7ais, n\u00E9erlandais, allemand et espagnol. Terminologie juridique natif.' },
      { t: 'Disponible 24/7', d: 'Aucun horaire de bureau. Votre cabinet juridique ne dort jamais, ne prend jamais de vacances, ne vous fait jamais attendre.' },
    ],
    handleSupra: 'CE QUE NOUS G\u00C9RONS',
    handleTitle: ["\u00C0 quoi que vous fassiez face.", "On l'a d\u00E9j\u00E0 vu."],
    handleDesc: "Des petits tracas quotidiens aux litiges qui changent une vie, Archer g\u00E8re les probl\u00E8mes juridiques auxquels les gens font vraiment face.",
    handleCards: [
      { t: 'Exc\u00E8s de vitesse', d: 'Contester des amendes, erreurs de lecture, vices de proc\u00E9dure.', bg: '#eff6ff', ic: '#1a56db', icon: 'car' },
      { t: 'Amendes de stationnement', d: 'Mauvaise plaque, zone invalide, horodateur d\u00E9fectueux.', bg: '#fef3c7', ic: '#b45309', icon: 'parking' },
      { t: 'Litiges consommateur', d: 'Produits d\u00E9fectueux, refus de remboursement, arnaques.', bg: '#dcfce7', ic: '#15803d', icon: 'bag' },
      { t: 'Litiges contractuels', d: 'Rupture, clauses floues, r\u00E9siliations abusives.', bg: '#e0e7ff', ic: '#4338ca', icon: 'file' },
      { t: 'Expulsion abusive', d: 'Avis ill\u00E9gaux, vices de proc\u00E9dure, droits du locataire.', bg: '#fee2e2', ic: '#b91c1c', icon: 'home' },
      { t: 'Licenciement abusif', d: 'Renvoi injuste, pr\u00E9avis manquant, salaires impay\u00E9s.', bg: '#f3e8ff', ic: '#7c3aed', icon: 'briefcase' },
      { t: "Refus d'assurance", d: 'Mauvaise foi, litiges de couverture, d\u00E9lais.', bg: '#ffedd5', ic: '#ea580c', icon: 'shield' },
      { t: 'Citation au tribunal', d: 'Comprendre, r\u00E9pondre, pr\u00E9parer ta d\u00E9fense.', bg: '#f4f4f1', ic: '#555', icon: 'scale' },
    ],
    letterBadge: 'UNE DES QUATRE ACTIONS',
    letterTitle: ['Un vrai avocat.', 'En ', '4 heures.', ' Pour ', '49,99 \u20AC.'],
    letterDesc: "Pour les dossiers \u00E0 enjeux \u2014 expulsions, licenciement abusif, refus d'assurance \u2014 les avocats d'Archer interviennent. Un avocat partenaire r\u00E9vise, signe et prend l'enti\u00E8re responsabilit\u00E9 juridique.",
    letterDisclaimer: "La plupart des dossiers Archer n'en ont pas besoin. C'est l\u00E0 quand votre dossier l'exige.",
    letterFeats: [
      { t: 'Juridiquement contraignante', d: "M\u00EAme poids que n'importe quelle lettre d'avocat traditionnelle." },
      { t: 'Sign\u00E9e par un avocat partenaire', d: 'Vrai avocat, inscrit au barreau, reste sur votre dossier.' },
      { t: 'Suivi en temps r\u00E9el', d: "Quand l'autre partie r\u00E9pond, Archer r\u00E9analyse automatiquement." },
      { t: '49,99 \u20AC forfait \u00B7 Livr\u00E9e en 4h', d: 'Les cabinets traditionnels facturent 400\u2013800 \u20AC. M\u00EAme r\u00E9sultat.' },
    ],
    letterCta: "Demander une lettre d'avocat",
    letterTo: 'Mr. Robert Henderson', letterToSub: 'Henderson Property Management, SPRL',
    letterRe: "Avis de violations l\u00E9gales \u2014 Avis d'expulsion #4821",
    letterBody: '\u00AB Cher M. Henderson, Nous repr\u00E9sentons Mme Sarah Mitchell concernant l\'avis d\'expulsion dat\u00E9 du... Les droits de notre cliente ont \u00E9t\u00E9 viol\u00E9s sous trois dispositions sp\u00E9cifiques du droit des locataires de New York... \u00BB',
    letterDelivered: 'LIVR\u00C9E \u00B7 3h 42min',
    counselBadge: 'OPTIONNEL \u00B7 QUAND VOUS EN AVEZ BESOIN',
    counselTitle: ['Parfois vous voulez', 'simplement', '', 'parler \u00E0 un avocat.'],
    counselDesc: "Archer g\u00E8re 92 % des dossiers de bout en bout sans aucune intervention humaine. Mais quand vous voulez une voix humaine \u2014 pour \u00EAtre rassur\u00E9, pour des questions complexes ou un second avis \u2014 un vrai avocat partenaire est \u00E0 un clic.",
    counselFeats: [
      { t: 'Connect\u00E9 en 15 minutes', d: "Pas de rendez-vous, pas d'aller-retour pour planifier" },
      { t: 'Avocat d\u00E9j\u00E0 brief\u00E9', d: "Votre analyse compl\u00E8te de dossier est transmise avant l'appel" },
      { t: 'Secret professionnel', d: 'Chiffr\u00E9 de bout en bout. Totalement confidentiel.' },
    ],
    counselPay: "\u00C0 L'APPEL", counselPrice: '149 \u20AC', counselPer: '/session', counselSub: "Session de 30 min avec un avocat partenaire",
    counselPro: 'AVEC PROTECT PRO', counselProPrice: 'Premier appel', counselProFree: 'Inclus, gratuit', counselProBadge: 'MEILLEURE OFFRE',
    counselCta: 'Voir comment fonctionne Live Counsel',
    counselMockLabel: 'APPEL \u00C0 VENIR', counselMockReady: 'PR\u00CAT', counselMockTime: 'Commence dans 12:34', counselMockDur: 'Session de 30 min',
    counselMockBrief: 'DOSSIER BRIEF\u00C9 PAR ARCHER', counselMockCase: "Avis d'expulsion", counselMockViol: 'trouv\u00E9es', counselMockFile: "L'avocat recevra le briefing complet au d\u00E9marrage", counselMockJoin: 'Rejoindre la session',
    vsSupra: 'MOITI\u00C9 PRIX. 100\u00D7 PLUS RAPIDE.',
    vsTitle: ["L'ancienne m\u00E9thode.", 'vs. La m\u00E9thode Archer.'],
    vsDesc: 'Les cabinets juridiques traditionnels ont \u00E9t\u00E9 cr\u00E9\u00E9s pour les entreprises. Archer est con\u00E7u pour les vraies personnes avec de vrais probl\u00E8mes.',
    vsOld: 'ANCIENNE M\u00C9THODE', vsOldLabel: 'Avocat traditionnel', vsNew: 'LA M\u00C9THODE ARCHER', vsNewLabel: 'Archer',
    vsRows: [
      { label: 'Premi\u00E8re consultation', old: '300\u2013500 \u20AC', nw: 'Gratuit, instantan\u00E9' },
      { label: "Lettre d'avocat", old: '400\u2013800 \u20AC, 5\u20137 jours', nw: '49,99 \u20AC, 4 heures' },
      { label: 'Analyse de dossier', old: 'Heures facturables', nw: '60 secondes, inclus' },
      { label: 'Lettre DIY (envoyez-la vous-m\u00EAme)', old: 'Non propos\u00E9', nw: 'Gratuit, illimit\u00E9', isNew: true },
      { label: 'Disponibilit\u00E9', old: 'Heures de bureau', nw: '24/7/365' },
      { label: 'Co\u00FBt mensuel', old: '200\u2013500 \u20AC/mois (assurance)', nw: '29,99 \u20AC/mois Protect' },
    ],
    pricingSupra: 'ARCHER PROTECT',
    pricingTitle: ['Prot\u00E9gez-vous.', "Pour moins qu'une consultation d'avocat."],
    pricingDesc: "Analyses illimit\u00E9es, lettres DIY illimit\u00E9es, chat juridique illimit\u00E9. R\u00E9siliation \u00E0 tout moment.",
    plans: [
      { name: 'Protect Solo', tag: 'Pour les particuliers', price: '29,99 \u20AC', period: '/mois', yearly: 'Ou 299 \u20AC/an \u2014 \u00E9conomisez 60 \u20AC', feats: [{ t: 'Analyses de documents illimit\u00E9es', bold: true }, { t: 'Lettres DIY illimit\u00E9es', bold: true }, { t: 'Chat juridique illimit\u00E9' }, { t: 'Coffre-fort + Surveillance des risques' }], cta: 'Commencer Solo', featured: false },
      { name: 'Protect Family', tag: "Jusqu'\u00E0 3 membres", price: '49,99 \u20AC', period: '/mois', yearly: 'Ou 499 \u20AC/an \u2014 \u00E9conomisez 100 \u20AC', feats: [{ t: 'Tout Solo, pour 3 personnes', bold: true }, { t: '1 session Live Counsel/an', bold: true, accent: '#7c3aed', value: '(149 \u20AC de valeur)' }, { t: 'Coffre-fort partag\u00E9' }, { t: 'Support prioritaire' }], cta: 'Commencer Family', featured: true, badge: '\u2605 LE PLUS POPULAIRE' },
      { name: 'Protect Pro', tag: 'Pour les dossiers s\u00E9rieux', price: '89,99 \u20AC', period: '/mois', yearly: 'Ou 899 \u20AC/an \u2014 \u00E9conomisez 180 \u20AC', feats: [{ t: 'Tout Solo inclus' }, { t: "2 lettres d'avocat/an", bold: true, accent: '#1a56db', value: '(100 \u20AC de valeur)' }, { t: '1 session Live Counsel/an', bold: true, accent: '#7c3aed', value: '(149 \u20AC de valeur)' }, { t: "Suivi avocat d\u00E9di\u00E9" }], cta: 'Commencer Pro', featured: false },
    ],
    addons: { label: "ADD-ONS OPTIONNELS \u00B7 DISPONIBLES POUR TOUS LES PLANS", items: [{ t: 'Courrier certifi\u00E9', p: '15 \u20AC', ic: '#b45309' }, { t: "Lettre d'avocat", p: '49,99 \u20AC', ic: '#1a56db' }, { t: 'Live Counsel', p: '149 \u20AC', ic: '#7c3aed' }] },
    pricingLink: 'Voir tous les d\u00E9tails de tarification',
    faqSupra: 'QUESTIONS FR\u00C9QUENTES',
    faqTitle: ['Tout ce que vous devez', 'savoir.'],
    faqDesc: 'Les questions les plus courantes sur Archer, r\u00E9pondues honn\u00EAtement et sans jargon juridique.',
    faqs: [
      { q: 'Est-ce vraiment l\u00E9gal ?', a: "Oui, 100 %. Chaque lettre d'avocat est sign\u00E9e par un vrai avocat inscrit au barreau. Archer ne donne pas de conseil juridique \u2014 il pr\u00E9pare votre dossier et le fait valider par de vrais avocats qui prennent la responsabilit\u00E9 juridique." },
      { q: 'Et si Archer se trompe ?', a: "Chaque dossier est r\u00E9vis\u00E9 par un avocat partenaire avant tout envoi. Si vous n'\u00EAtes pas satisfait, nous offrons une garantie satisfait ou rembours\u00E9 de 30 jours. Le taux de pr\u00E9cision de 94 % est mesur\u00E9 sur de vrais r\u00E9sultats." },
      { q: 'En quoi est-ce diff\u00E9rent de ChatGPT ?', a: "ChatGPT vous donne des r\u00E9ponses g\u00E9n\u00E9rales. Archer est entra\u00EEn\u00E9 sur 2,4M de jurisprudences, croise la jurisprudence en direct, ex\u00E9cute cinq passes de raisonnement par dossier, et fait tout valider et signer par de vrais avocats." },
      { q: 'Puis-je annuler \u00E0 tout moment ?', a: "Oui. Aucun engagement, aucun frais d'annulation. R\u00E9siliez depuis votre tableau de bord en deux clics. Vous conservez l'acc\u00E8s jusqu'\u00E0 la fin de votre p\u00E9riode de facturation." },
      { q: 'Mes donn\u00E9es sont-elles priv\u00E9es ?', a: "Oui. Archer utilise un chiffrement bancaire pour toutes les donn\u00E9es. Quand un avocat r\u00E9vise votre dossier, le secret professionnel s'applique. Nous ne vendons jamais les donn\u00E9es." },
      { q: 'Quels types de dossiers ?', a: "Avis d'expulsions, litiges d'emploi, licenciements abusifs, refus d'assurance, recouvrement de dettes, augmentations de loyer, amendes, factures m\u00E9dicales, litiges contractuels et plus." },
      { q: 'Quels pays et langues ?', a: "Droit f\u00E9d\u00E9ral et \u00E9tatique am\u00E9ricain et droit civil belge. Disponible en anglais, fran\u00E7ais, n\u00E9erlandais, allemand et espagnol. Plus de juridictions en 2026." },
      { q: "Les tribunaux acceptent-ils les lettres d'Archer ?", a: "Oui. Parce que chaque lettre est sign\u00E9e par un vrai avocat inscrit au barreau, elle a le m\u00EAme poids juridique que n'importe quelle lettre d'un cabinet traditionnel." },
    ],
    ctaBadge: 'VOTRE POUVOIR JURIDIQUE COMMENCE ICI',
    ctaTitle: ["Arr\u00EAtez d'y faire face seul.", 'Commencez \u00E0 riposter.'],
    ctaDesc: "T\u00E9l\u00E9versez votre premier document. Obtenez une analyse juridique compl\u00E8te en 60 secondes. Premier dossier gratuit. Aucune carte bancaire requise.",
    ctaBtn: 'T\u00E9l\u00E9verser mon document',
    ctaSub: 'Premi\u00E8re analyse gratuite \u00B7 Sans carte bancaire \u00B7 R\u00E9siliation \u00E0 tout moment',
  },
};

/* ─── SVG ICONS ─── */
const ChkSvg = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const XSvg = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
const ArrowR = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;

/* ─── CSS ─── */
const CSS = `
.ah{font-family:${F};color:#0a0a0f}
.ah .sw{width:100%;padding:100px 40px}
.ah .sw.gray{background:#f4f4f1;border-top:.5px solid #e2e0db}
.ah .sw.white{background:#fff;border-top:.5px solid #e2e0db}
.ah .si{max-width:1200px;margin:0 auto}
.ah .supra{font-size:11px;font-weight:600;letter-spacing:2px;color:#1a56db;text-transform:uppercase;margin-bottom:16px}
.ah .stitle{font-size:56px;font-weight:500;letter-spacing:-2px;line-height:1.05;margin:0 0 16px;color:#0a0a0f}
.ah .stitle .ac{color:#1a56db;font-weight:800}
.ah .sdesc{font-size:19px;color:#555;max-width:680px;margin:0 auto 0;line-height:1.6}
.ah .hero-wrap{background:#fff;padding:110px 40px 90px;text-align:center;position:relative}
.ah .hero-badge{display:inline-flex;align-items:center;gap:10px;background:#eff6ff;border:1px solid rgba(26,86,219,.18);padding:11px 22px;border-radius:40px;margin-bottom:40px;animation:badge-glow 3s ease-in-out infinite}
.ah .hero-title{display:flex;justify-content:center;align-items:baseline;gap:24px;margin-bottom:20px;flex-wrap:wrap}
.ah .hero-title .meet{font-size:128px;font-weight:500;letter-spacing:-6px;line-height:1;color:#0a0a0f}
.ah .hero-title .archer{font-size:128px;font-weight:800;letter-spacing:-4px;line-height:1;color:#1a56db}
.ah .hero-sub{font-size:28px;font-weight:400;font-style:italic;color:#555;margin:0 0 32px}
.ah .hero-ctas{display:flex;justify-content:center;gap:12px;margin-bottom:48px;flex-wrap:wrap}
.ah .btn-p{display:inline-flex;align-items:center;gap:10px;background:#1a56db;color:#fff;padding:17px 34px;border-radius:32px;font-size:15px;font-weight:600;border:none;cursor:pointer;transition:all .2s}
.ah .btn-p:hover{background:#1e40af;transform:scale(1.02)}
.ah .btn-o{display:inline-flex;align-items:center;gap:8px;background:#fff;color:#0a0a0f;padding:17px 34px;border-radius:32px;font-size:15px;font-weight:600;border:.5px solid #e2e0db;cursor:pointer;transition:all .2s}
.ah .btn-o:hover{border-color:#1a56db;color:#1a56db}
.ah .trust-bar{display:inline-flex;align-items:center;gap:20px;background:#f4f4f1;border:.5px solid #e2e0db;border-radius:48px;padding:16px 28px;flex-wrap:wrap;justify-content:center}
.ah .trust-div{width:1px;height:30px;background:#d1d5db}
.ah .trust-item{display:flex;align-items:center;gap:10px}
.ah .trust-num{font-size:14px;font-weight:700;color:#0a0a0f;display:block}
.ah .trust-desc{font-size:10px;color:#9ca3af;display:block}
.ah .pulse-dot{width:6px;height:6px;background:#16a34a;border-radius:50%;animation:pulse-anim 1.8s ease-in-out infinite;display:inline-block;margin-left:4px}
.ah .pillars-grid{display:grid;grid-template-columns:1fr 72px 1fr 72px 1fr;align-items:center;gap:0;max-width:1160px;margin:64px auto 0}
.ah .pillar{background:#fff;border:.5px solid #e2e0db;border-radius:20px;padding:44px 36px;position:relative}
.ah .pillar-num{position:absolute;top:20px;right:24px;font-size:13px;font-weight:700;color:#d1d5db}
.ah .pillar-icon{width:80px;height:80px;border-radius:20px;background:#eff6ff;display:flex;align-items:center;justify-content:center;margin-bottom:24px}
.ah .pillar-icon.green{background:#dcfce7}
.ah .pillar h3{font-size:36px;font-weight:800;letter-spacing:-1.2px;color:#0a0a0f;margin:0 0 12px}
.ah .pillar p{font-size:14px;color:#555;line-height:1.6;margin:0}
.ah .pillar-arrow{display:flex;align-items:center;justify-content:center;padding-top:40px}
.ah .pillars-foot{display:flex;justify-content:center;margin-top:64px}
.ah .pillars-badge{display:inline-flex;align-items:center;gap:10px;background:#fff;border:.5px solid #e2e0db;border-radius:30px;padding:14px 24px}
.ah .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:64px 0 48px}
.ah .stat-card{background:#fff;border:.5px solid #e2e0db;border-radius:16px;padding:32px 24px;text-align:center}
.ah .stat-icon{width:48px;height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px}
.ah .stat-num{font-size:40px;font-weight:800;letter-spacing:-1.5px;color:#0a0a0f;margin-bottom:6px}
.ah .stat-label{font-size:13px;font-weight:600;color:#0a0a0f;margin-bottom:2px}
.ah .stat-sub{font-size:11px;color:#9ca3af}
.ah .caps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.ah .cap{background:#fff;border:.5px solid #e2e0db;border-radius:16px;padding:24px}
.ah .cap-h{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:14px;font-weight:700;color:#0a0a0f}
.ah .cap p{font-size:12px;color:#555;line-height:1.6;margin:0}
.ah .case-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:64px;max-width:1160px;margin-left:auto;margin-right:auto}
.ah .case-card{background:#fff;border:.5px solid #e2e0db;border-radius:14px;padding:24px 22px;transition:transform .2s,border-color .2s}
.ah .case-card:hover{transform:translateY(-2px);border-color:#1a56db}
.ah .case-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.ah .case-card h4{font-size:15px;font-weight:800;color:#0a0a0f;letter-spacing:-.3px;line-height:1.2;margin:0 0 4px}
.ah .case-card .cd{font-size:11px;color:#9ca3af;line-height:1.45;margin:0}
.ah .pillar-out{margin-top:20px;padding-top:16px;border-top:.5px solid #e2e0db}
.ah .fmt-chips{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ah .fmt-chip{background:#eff6ff;color:#1a56db;font-size:10px;font-weight:700;padding:4px 10px;border-radius:6px;letter-spacing:.5px}
.ah .fmt-time{font-size:11px;color:#16a34a;font-weight:700;margin-left:auto}
.ah .pstat-row{display:flex;gap:16px;justify-content:center}
.ah .pstat-num{font-size:18px;font-weight:800;letter-spacing:-.5px;line-height:1}
.ah .pstat-label{font-size:9px;color:#9ca3af;font-weight:600;letter-spacing:.5px;margin-top:2px}
.ah .pact-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.ah .pact-chip{background:#f4f4f1;border-radius:8px;padding:8px 6px;text-align:center}
.ah .pact-chip.blue{background:#eff6ff}.ah .pact-chip.purple{background:#f3e8ff}
.ah .pact-label{font-size:10px;color:#555;margin-bottom:2px}
.ah .pact-price{font-size:12px;font-weight:800;letter-spacing:-.3px}
.ah .addons-strip{background:#fff;border:.5px solid #e2e0db;border-radius:14px;padding:18px 24px;max-width:820px;margin:32px auto 24px;text-align:center}
.ah .addons-label{font-size:10px;color:#9ca3af;font-weight:700;letter-spacing:1px;margin-bottom:10px}
.ah .addons-row{display:flex;justify-content:center;align-items:center;gap:24px;flex-wrap:wrap}
.ah .addons-div{width:1px;height:18px;background:#e2e0db}
.ah .addons-item{display:flex;align-items:center;gap:8px;font-size:12px;color:#555}
.ah .addons-price{font-size:13px;font-weight:800;color:#0a0a0f}
.ah .comp-row.diy{background:linear-gradient(90deg,rgba(220,252,231,.3) 0%,transparent 100%)}
.ah .diy-new{font-size:10px;color:#15803d;font-weight:700;letter-spacing:.3px;margin-top:2px}
.ah .split{display:grid;grid-template-columns:1.05fr 1fr;gap:80px;align-items:center}
.ah .split-title{font-size:62px;font-weight:500;letter-spacing:-2.5px;line-height:1.05;color:#0a0a0f;margin:16px 0 20px}
.ah .split-desc{font-size:19px;color:#555;line-height:1.6;margin-bottom:32px;max-width:520px}
.ah .feat-list{display:flex;flex-direction:column;gap:16px;max-width:520px;margin-bottom:32px}
.ah .feat-item{display:flex;gap:14px;align-items:flex-start}
.ah .feat-icon{width:40px;height:40px;border-radius:10px;background:#eff6ff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ah .feat-t{font-size:14px;font-weight:700;color:#0a0a0f;margin-bottom:2px}
.ah .feat-d{font-size:12px;color:#555;line-height:1.5}
.ah .letter{background:#fff;border:.5px solid #e2e0db;border-radius:16px;padding:40px 36px;position:relative}
.ah .letter-del{position:absolute;top:-14px;right:32px;background:#dcfce7;color:#15803d;padding:6px 14px;border-radius:14px;font-size:10px;font-weight:700;letter-spacing:.4px;display:flex;align-items:center;gap:5px}
.ah .counsel-feat{display:flex;gap:14px;align-items:center;padding:16px 18px;background:#f4f4f1;border-radius:14px}
.ah .counsel-fi{width:38px;height:38px;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ah .pblocks{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:520px;margin:24px 0 32px}
.ah .pblock{background:#f4f4f1;border-radius:14px;padding:18px 20px;position:relative}
.ah .pblock.hl{background:#eff6ff;border:1px solid rgba(26,86,219,.2)}
.ah .pblock-badge{position:absolute;top:-9px;right:14px;background:#1a56db;color:#fff;padding:3px 9px;border-radius:10px;font-size:9px;font-weight:700}
.ah .comp-table{background:#fff;border:.5px solid #e2e0db;border-radius:20px;overflow:hidden;margin-top:64px}
.ah .comp-hdr{display:grid;grid-template-columns:1.2fr 1fr 1fr;background:#fafaf8;padding:24px 32px}
.ah .comp-hdr-archer{background:#eff6ff;margin:-24px -32px -24px 0;padding:24px 32px;border-left:.5px solid #e2e0db}
.ah .comp-row{display:grid;grid-template-columns:1.2fr 1fr 1fr;padding:18px 32px;border-top:.5px solid #e2e0db;align-items:center}
.ah .comp-row .archer-cell{background:#eff6ff;margin:-18px -32px -18px 0;padding:18px 32px;border-left:.5px solid #e2e0db}
.ah .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:64px}
.ah .pcard{background:#fff;border:.5px solid #e2e0db;border-radius:20px;padding:36px 32px;position:relative;transition:transform .2s}
.ah .pcard.feat{border:2px solid #1a56db;transform:scale(1.03)}
.ah .pcard-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#1a56db;color:#fff;padding:5px 14px;border-radius:12px;font-size:10px;font-weight:700;white-space:nowrap}
.ah .pcard h3{font-size:20px;font-weight:700;margin:0 0 4px}
.ah .pcard-tag{font-size:12px;color:#9ca3af;margin-bottom:16px}
.ah .pcard-price{font-size:44px;font-weight:800;letter-spacing:-1.5px;line-height:1;color:#0a0a0f}
.ah .pcard-per{font-size:14px;color:#555;margin-left:4px}
.ah .pcard-yr{font-size:11px;color:#16a34a;font-weight:600;margin:8px 0 20px}
.ah .pcard-feats{list-style:none;padding:20px 0;margin:0;border-top:.5px solid #e2e0db;border-bottom:.5px solid #e2e0db}
.ah .pcard-feats li{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:#0a0a0f;margin-bottom:10px}
.ah .pcard-feats li:last-child{margin-bottom:0}
.ah .pcard-cta{width:100%;padding:14px;border-radius:30px;font-size:14px;font-weight:600;cursor:pointer;margin-top:24px;transition:all .2s;border:.5px solid #e2e0db;background:#fff;color:#0a0a0f}
.ah .pcard-cta:hover{border-color:#1a56db;color:#1a56db;transform:translateY(-1px)}
.ah .pcard-cta.primary{background:#1a56db;color:#fff;border:none}
.ah .pcard-cta.primary:hover{background:#1e40af}
.ah .faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:64px;max-width:1100px;margin-left:auto;margin-right:auto}
.ah .faq-item{background:#fff;border:.5px solid #e2e0db;border-radius:16px;padding:28px}
.ah .faq-item h4{display:flex;align-items:center;gap:12px;font-size:16px;font-weight:700;color:#0a0a0f;margin:0 0 12px}
.ah .faq-q{width:22px;height:22px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#1a56db;flex-shrink:0}
.ah .faq-item p{font-size:14px;color:#555;line-height:1.6;margin:0;padding-left:34px}
.ah .final-cta{background:#1a56db;padding:120px 40px;text-align:center}
.ah .final-cta .badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);padding:10px 20px;border-radius:30px;color:#fff;font-size:12px;font-weight:700;letter-spacing:.5px;margin-bottom:32px}
.ah .final-cta h2{font-size:80px;font-weight:500;letter-spacing:-3px;line-height:.95;color:#fff;margin:0 0 24px}
.ah .final-cta h2 b{font-weight:800}
.ah .final-cta p{font-size:22px;color:rgba(255,255,255,.85);max-width:680px;margin:0 auto 40px;line-height:1.5}
.ah .final-btn{display:inline-flex;align-items:center;gap:10px;background:#fff;color:#1a56db;padding:20px 48px;border-radius:40px;font-size:17px;font-weight:600;border:none;cursor:pointer;transition:transform .2s}
.ah .final-btn:hover{transform:scale(1.03)}
.ah .final-sub{font-size:13px;color:rgba(255,255,255,.7);margin-top:16px}
@keyframes badge-glow{0%,100%{box-shadow:0 0 0 0 rgba(26,86,219,.15)}50%{box-shadow:0 0 0 6px rgba(26,86,219,.08),0 0 24px 4px rgba(26,86,219,.1)}}
@keyframes sparkle-twinkle{0%,100%{transform:scale(1) rotate(0);opacity:1}50%{transform:scale(1.25) rotate(90deg);opacity:.75}}
@keyframes pulse-anim{0%{box-shadow:0 0 0 0 rgba(22,163,74,.7)}70%{box-shadow:0 0 0 10px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}
@keyframes draw-line{to{stroke-dashoffset:0}}
@keyframes fade-in{to{opacity:1}}
.ah .sparkle-l{animation:sparkle-twinkle 2.2s ease-in-out infinite;flex-shrink:0}
.ah .sparkle-r{animation:sparkle-twinkle 2.2s ease-in-out infinite;animation-delay:1.1s;flex-shrink:0}
.ah .flow-l1{stroke-dasharray:60;stroke-dashoffset:60;animation:draw-line 2s ease-out forwards}
.ah .flow-l2{stroke-dasharray:60;stroke-dashoffset:60;animation:draw-line 2s ease-out forwards;animation-delay:.6s}
.ah .flow-a1{opacity:0;animation:fade-in .4s ease-out forwards;animation-delay:1.6s}
.ah .flow-a2{opacity:0;animation:fade-in .4s ease-out forwards;animation-delay:2.2s}
.ah .split-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:30px;font-size:11px;font-weight:600;letter-spacing:1.5px}
.ah .split-badge.amber{background:#fef3c7;color:#b45309}
.ah .split-badge.purple{background:#f3e8ff;color:#7c3aed}
@media(max-width:1100px){
.ah .hero-title .meet,.ah .hero-title .archer{font-size:88px!important;letter-spacing:-4px}
.ah .stitle{font-size:44px}
.ah .split-title{font-size:48px}
.ah .final-cta h2{font-size:56px}
.ah .pillars-grid{grid-template-columns:1fr;gap:20px}
.ah .pillar-arrow{transform:rotate(90deg);padding-top:0}
.ah .stats-grid{grid-template-columns:repeat(2,1fr)}
.ah .caps-grid{grid-template-columns:repeat(2,1fr)}
.ah .case-grid{grid-template-columns:repeat(2,1fr)}
.ah .split{grid-template-columns:1fr;gap:40px}
.ah .pricing-grid{grid-template-columns:1fr}
.ah .pcard.feat{transform:none}
.ah .faq-grid{grid-template-columns:1fr}
.ah .comp-hdr,.ah .comp-row{grid-template-columns:1fr}
.ah .comp-hdr-archer,.ah .comp-row .archer-cell{margin:8px 0 0;border-left:none;border-top:.5px solid #e2e0db}
}
@media(max-width:640px){
.ah .sw{padding:60px 20px}
.ah .hero-wrap{padding:80px 20px 60px}
.ah .hero-title .meet,.ah .hero-title .archer{font-size:56px!important;letter-spacing:-2px}
.ah .hero-sub{font-size:20px}
.ah .stitle{font-size:32px}
.ah .split-title{font-size:36px}
.ah .final-cta h2{font-size:40px}
.ah .trust-bar{gap:14px;padding:14px 18px}
.ah .trust-div{display:none}
.ah .case-grid{grid-template-columns:1fr}
.ah .final-cta{padding:60px 20px}
}
`;

const Landing = () => {
  const navigate = useNavigate();
  const stored = getStoredLocale() || 'be-fr';
  const [locale, setLocale] = useState(stored);
  // FREEZE US — default jurisdiction BE. Legacy us-* locales are respected.
  const [jurisdiction, setJurisdiction] = useState(stored.startsWith('us') ? 'US' : 'BE');
  const [language, setLanguage] = useState(stored.split('-')[1] || stored.split('-')[0] || 'fr');
  const t = translations[locale] || translations['be-fr'] || translations['us-en'];
  const c = language === 'fr' ? C.fr : C.en;

  const handleJurisdictionChange = (j) => { setJurisdiction(j); const nl = getLocaleFromPrefs(j, language); setLocale(nl); setStoredLocale(nl); };
  const handleLanguageChange = (l) => { setLanguage(l); const nl = getLocaleFromPrefs(jurisdiction, l); setLocale(nl); setStoredLocale(nl); };

  return (
    <div className="ah" style={{ minHeight: '100vh' }}>
      <PageHead metadata={PAGE_METADATA.home} />
      <JsonLd data={ORGANIZATION_SCHEMA} />
      <JsonLd data={SOFTWARE_APP_SCHEMA} />
      <GoogleAnalytics />
      <style>{CSS}</style>

      {/* ── NAV (v2 header — was legacy inline nav with JurisdictionPills) ── */}
      <PublicHeader
        onLanguageChange={handleLanguageChange}
        onJurisdictionChange={handleJurisdictionChange}
      />

      {/* ── 1. HERO ── */}
      <div className="hero-wrap" style={{ paddingTop: 170 }}>
        <div className="hero-badge">
          <svg className="sparkle-l" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a56db', letterSpacing: 0.2 }}>{c.heroBadge}</span>
          <svg className="sparkle-r" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
        <div className="hero-title"><span className="meet">Meet</span><span className="archer">Archer</span></div>
        <p className="hero-sub">{c.heroSub}</p>
        <div className="hero-ctas">
          <button className="btn-p" onClick={() => navigate('/signup')} data-testid="hero-start-btn">{c.ctaStart}</button>
          <button className="btn-o" onClick={() => navigate('/how-it-works')}>{c.ctaHow} <ArrowR /></button>
        </div>
        <div className="trust-bar">
          {c.trust.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className="trust-div" />}
              <div className="trust-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon === 'book' && <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>}
                  {item.icon === 'activity' && <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.24 2.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4 12H2"/>}
                  {item.icon === 'zap' && <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>}
                  {item.icon === 'shieldCheck' && <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></>}
                  {item.icon === 'badgeCheck' && <><circle cx="12" cy="12" r="10"/><polyline points="22 4 12 14.01 9 11.01"/></>}
                </svg>
                {item.pulse && <span className="pulse-dot" />}
                <div><span className="trust-num">{item.num}</span><span className="trust-desc">{item.desc}</span></div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── 2. HOME JOURNEY SECTION (V10 glassmorphism) ── */}
      <HomeJourneySection
        language={language}
        country={jurisdiction}
        onStart={() => navigate('/upload')}
        onBookCall={() => navigate('/lawyers/book')}
      />

      {/* ── 3. INTELLIGENCE ── */}
      <div className="sw white">
        <div className="si" style={{ textAlign: 'center' }}>
          <div className="supra">{c.intelSupra}</div>
          <h2 className="stitle">{c.intelTitle[0]}<br /><span className="ac">{c.intelTitle[1]}</span></h2>
          <p className="sdesc">{c.intelDesc}</p>
          <div className="stats-grid">
            {c.stats.map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={s.ic} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {i === 0 && <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>}
                  {i === 1 && <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>}
                  {i === 2 && <><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/></>}
                  {i === 3 && <><circle cx="12" cy="12" r="10"/><polyline points="22 4 12 14.01 9 11.01"/></>}
                </svg></div>
                <div className="stat-num">{s.num}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="caps-grid">
            {c.caps.map((cap, i) => (
              <div key={i} className="cap">
                <div className="cap-h"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg><span>{cap.t}</span></div>
                <p>{cap.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. WHAT WE HANDLE ── */}
      <div className="sw white" data-testid="section-what-we-handle">
        <div className="si" style={{ textAlign: 'center' }}>
          <div className="supra">{c.handleSupra}</div>
          <h2 className="stitle">{c.handleTitle[0]}<br /><span className="ac">{c.handleTitle[1]}</span></h2>
          <p className="sdesc">{c.handleDesc}</p>
          <div className="case-grid">
            {c.handleCards.map((card, i) => {
              const IconEl = () => {
                const s = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: card.ic, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
                if (card.icon === 'car') return <svg {...s}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
                if (card.icon === 'parking') return <svg {...s}><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>;
                if (card.icon === 'bag') return <svg {...s}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
                if (card.icon === 'file') return <svg {...s}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>;
                if (card.icon === 'home') return <svg {...s}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
                if (card.icon === 'briefcase') return <svg {...s}><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
                if (card.icon === 'shield') return <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
                if (card.icon === 'scale') return <svg {...s}><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>;
                return null;
              };
              return (
                <div key={i} className="case-card">
                  <div className="case-icon" style={{ background: card.bg }}><IconEl /></div>
                  <h4>{card.t}</h4>
                  <div className="cd">{card.d}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 5. ATTORNEY LETTER ── */}
      <div className="sw gray">
        <div className="si">
          <div className="split">
            <div>
              <div className="split-badge amber"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>{c.letterBadge}</div>
              <h2 className="split-title">{c.letterTitle[0]}<br />{c.letterTitle[1]}<span className="ac" style={{ fontWeight: 800 }}>{c.letterTitle[2]}</span>{c.letterTitle[3]}<span className="ac" style={{ fontWeight: 800 }}>{c.letterTitle[4]}</span></h2>
              <p className="split-desc">{c.letterDesc}</p>
              {c.letterDisclaimer && <p style={{ fontSize: 13, fontStyle: 'italic', color: '#9ca3af', marginBottom: 24, maxWidth: 520 }}>{c.letterDisclaimer}</p>}
              <div className="feat-list">
                {c.letterFeats.map((f, i) => (
                  <div key={i} className="feat-item">
                    <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                    <div><div className="feat-t">{f.t}</div><div className="feat-d">{f.d}</div></div>
                  </div>
                ))}
              </div>
              <button className="btn-p" onClick={() => navigate('/upload')} data-testid="letter-cta">{c.letterCta} <ArrowR /></button>
            </div>
            <div>
              <div className="letter">
                <div className="letter-del"><ChkSvg /> {c.letterDelivered}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 20, borderBottom: '.5px solid #e2e0db' }}>
                  <div><div style={{ fontSize: 26, fontWeight: 800, color: '#1a56db', letterSpacing: -1, lineHeight: 1 }}>Archer</div><div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>Law firm in your pocket.</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: .5, fontWeight: 600 }}>CASE REF.</div><div style={{ fontSize: 12, fontWeight: 700, color: '#0a0a0f', marginTop: 2 }}>#AR-4821-NY</div></div>
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: .5, fontWeight: 600, marginBottom: 4 }}>TO</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0f', marginBottom: 14 }}>{c.letterTo}<br /><span style={{ fontWeight: 400, color: '#555', fontSize: 12 }}>{c.letterToSub}</span></div>
                <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: .5, fontWeight: 600, marginBottom: 4 }}>RE</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0f', marginBottom: 24 }}>{c.letterRe}</div>
                <div style={{ background: '#fafaf8', borderRadius: 10, padding: 16, marginBottom: 24 }}><div style={{ fontSize: 11, color: '#555', lineHeight: 1.7, fontStyle: 'italic' }}>{c.letterBody}</div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 20, borderTop: '.5px solid #e2e0db' }}>
                  <div style={{ fontFamily: "'Brush Script MT', cursive", fontSize: 28, color: '#1a56db', fontStyle: 'italic' }}>S. Mitchell</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#0a0a0f' }}>Sarah Mitchell, Esq.</div><div style={{ fontSize: 9, color: '#9ca3af' }}>Partner · Bar #A4-12834 NY</div></div>
                  <div style={{ width: 56, height: 56, border: '2px solid #1a56db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: '#eff6ff' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><div style={{ fontSize: 7, color: '#1a56db', fontWeight: 700, marginTop: 1, letterSpacing: .3 }}>VERIFIED</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. LIVE COUNSEL ── */}
      <div className="sw white">
        <div className="si">
          <div className="split">
            <div>
              <div className="split-badge purple"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>{c.counselBadge}</div>
              <h2 className="split-title">{c.counselTitle[0]}<br />{c.counselTitle[1]}<br />{c.counselTitle[2]}<span className="ac" style={{ fontWeight: 800 }}>{c.counselTitle[3]}</span></h2>
              <p className="split-desc">{c.counselDesc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520, marginBottom: 24 }}>
                {c.counselFeats.map((f, i) => (
                  <div key={i} className="counsel-feat">
                    <div className="counsel-fi"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0f', marginBottom: 2 }}>{f.t}</div><div style={{ fontSize: 12, color: '#555' }}>{f.d}</div></div>
                  </div>
                ))}
              </div>
              <div className="pblocks">
                <div className="pblock">
                  <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: 1.2, fontWeight: 600, marginBottom: 6 }}>{c.counselPay}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}><span style={{ fontSize: 32, fontWeight: 800, color: '#0a0a0f', letterSpacing: -1, lineHeight: 1 }}>{c.counselPrice}</span><span style={{ fontSize: 12, color: '#555' }}>{c.counselPer}</span></div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.counselSub}</div>
                </div>
                <div className="pblock hl">
                  <div className="pblock-badge">{c.counselProBadge}</div>
                  <div style={{ fontSize: 10, color: '#1a56db', letterSpacing: 1.2, fontWeight: 700, marginBottom: 6 }}>{c.counselPro}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#1a56db', letterSpacing: -.8, lineHeight: 1, marginBottom: 4 }}>{c.counselProPrice}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ChkSvg /><span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{c.counselProFree}</span></div>
                </div>
              </div>
              <button className="btn-o">{c.counselCta}</button>
            </div>
            <div style={{ background: '#f4f4f1', borderRadius: 20, padding: 24 }}>
              <div style={{ background: '#fff', border: '.5px solid #e2e0db', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ background: '#0a0a0f', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ display: 'flex', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} /></div><span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>archer.app/counsel</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(22,163,74,.15)', padding: '3px 8px', borderRadius: 10 }}><span className="pulse-dot" style={{ position: 'relative', width: 5, height: 5 }} /><span style={{ fontSize: 9, color: '#16a34a', fontWeight: 600, letterSpacing: .3 }}>LIVE</span></div>
                </div>
                <div style={{ padding: 24, background: '#fafaf8' }}>
                  <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: 1, marginBottom: 12 }}>{c.counselMockLabel}</div>
                  <div style={{ background: '#fff', border: '.5px solid #e2e0db', borderRadius: 12, padding: 18, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                        <svg width="52" height="52" viewBox="0 0 80 80"><rect width="80" height="80" fill="#fde4cf"/><path d="M4 80L4 70C4 60 14 54 24 53L56 53C66 54 76 60 76 70L76 80Z" fill="#1e3a5f"/><path d="M32 53L40 71L48 53Z" fill="#fff"/><rect x="36" y="43" width="8" height="11" fill="#e8b897"/><circle cx="40" cy="30" r="15" fill="#e8b897"/><circle cx="35" cy="30" r="1.3" fill="#2c1810"/><circle cx="45" cy="30" r="1.3" fill="#2c1810"/><path d="M36 36Q40 38 44 36" stroke="#8b5a3c" strokeWidth="1.3" fill="none" strokeLinecap="round"/><path d="M22 28C22 14 28 8 40 8C52 8 58 14 58 28L58 34C56 29 52 26 48 26L32 26C28 26 24 29 22 34Z" fill="#3d2817"/></svg>
                      </div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: '#0a0a0f', marginBottom: 3 }}>Sarah Mitchell, Esq.</div><div style={{ fontSize: 11, color: '#9ca3af' }}>Partner · Bar #A4-12834 NY · 14 yrs exp.</div></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#dcfce7', padding: '4px 10px', borderRadius: 8 }}><ChkSvg /><span style={{ fontSize: 9, fontWeight: 700, color: '#15803d', letterSpacing: .3 }}>{c.counselMockReady}</span></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 14, borderTop: '.5px solid #e2e0db' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0f' }}>{c.counselMockTime}</span><div style={{ width: 1, height: 12, background: '#e2e0db', margin: '0 6px' }} /><span style={{ fontSize: 11, color: '#555' }}>{c.counselMockDur}</span></div>
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: 1, marginBottom: 12 }}>{c.counselMockBrief}</div>
                  <div style={{ background: '#eff6ff', border: '.5px solid rgba(26,86,219,.15)', borderRadius: 12, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontSize: 11, color: '#9ca3af', letterSpacing: .3, fontWeight: 600 }}>CASE #4821</span><span style={{ fontSize: 11, fontWeight: 700, color: '#1a56db' }}>{c.counselMockCase}</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px' }}><div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: .3, marginBottom: 3 }}>VIOLATIONS</div><div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0f' }}>3</span><span style={{ fontSize: 10, color: '#555' }}>{c.counselMockViol}</span></div></div>
                      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px' }}><div style={{ fontSize: 9, color: '#9ca3af', letterSpacing: .3, marginBottom: 3 }}>WIN PROB.</div><div style={{ fontSize: 18, fontWeight: 700, color: '#15803d' }}>94%</div></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>{c.counselMockFile}</div>
                  </div>
                  <button style={{ width: '100%', marginTop: 16, padding: 14, fontSize: 13, fontWeight: 700, borderRadius: 12, background: '#1a56db', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>{c.counselMockJoin}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. VS OLD WORLD ── */}
      <div className="sw gray">
        <div className="si" style={{ textAlign: 'center' }}>
          <div className="supra" style={{ color: '#b91c1c' }}>{c.vsSupra}</div>
          <h2 className="stitle">{c.vsTitle[0]}<br /><span className="ac">{c.vsTitle[1]}</span></h2>
          <p className="sdesc">{c.vsDesc}</p>
          <div className="comp-table">
            <div className="comp-hdr">
              <div />
              <div><div style={{ fontSize: 11, color: '#9ca3af', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>{c.vsOld}</div><div style={{ fontSize: 18, fontWeight: 700, color: '#555' }}>{c.vsOldLabel}</div></div>
              <div className="comp-hdr-archer"><div style={{ fontSize: 11, color: '#1a56db', letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>{c.vsNew}</div><div style={{ fontSize: 18, fontWeight: 800, color: '#1a56db', letterSpacing: -.3 }}>{c.vsNewLabel}</div></div>
            </div>
            {c.vsRows.map((r, i) => (
              <div key={i} className={`comp-row${r.isNew ? ' diy' : ''}`}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0a0a0f' }}>{r.label}{r.isNew && <div className="diy-new">{'\u2605'} NEW {'\u00B7'} ARCHER EXCLUSIVE</div>}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}><XSvg />{r.old}</div>
                <div className="archer-cell" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#15803d' }}><ChkSvg />{r.nw}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 7. PRICING TEASER ── */}
      <div className="sw white">
        <div className="si" style={{ textAlign: 'center' }}>
          <div className="supra">{c.pricingSupra}</div>
          <h2 className="stitle">{c.pricingTitle[0]}<br /><span className="ac">{c.pricingTitle[1]}</span></h2>
          <p className="sdesc">{c.pricingDesc}</p>
          <div className="pricing-grid">
            {c.plans.map((p, i) => (
              <div key={i} className={`pcard${p.featured ? ' feat' : ''}`}>
                {p.badge && <div className="pcard-badge">{p.badge}</div>}
                <h3>{p.name}</h3>
                <div className="pcard-tag">{p.tag}</div>
                <div><span className="pcard-price">{p.price}</span><span className="pcard-per">{p.period}</span></div>
                <div className="pcard-yr">{p.yearly}</div>
                <ul className="pcard-feats">{p.feats.map((f, fi) => {
                  const feat = typeof f === 'string' ? { t: f } : f;
                  return <li key={fi}><ChkSvg /><span style={{ fontWeight: feat.bold ? 700 : 400, color: feat.accent || '#0a0a0f' }}>{feat.t}{feat.value && <span style={{ fontSize: 11, color: feat.accent || '#555', marginLeft: 4 }}>{feat.value}</span>}</span></li>;
                })}</ul>
                <button className={`pcard-cta${p.featured ? ' primary' : ''}`} onClick={() => navigate('/signup')}>{p.cta}</button>
              </div>
            ))}
          </div>
          {c.addons && (
            <div className="addons-strip">
              <div className="addons-label">{c.addons.label}</div>
              <div className="addons-row">
                {c.addons.items.map((a, ai) => (
                  <React.Fragment key={ai}>
                    {ai > 0 && <div className="addons-div" />}
                    <div className="addons-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={a.ic} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
                      <span>{a.t}</span>
                      <span className="addons-price">{a.p}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <span onClick={() => navigate('/pricing')} style={{ fontSize: 14, color: '#1a56db', fontWeight: 600, cursor: 'pointer' }}>{c.pricingLink} <ArrowR /></span>
          </div>
        </div>
      </div>

      {/* ── 8. FAQ ── */}
      <div className="sw gray" id="faq">
        <div className="si" style={{ textAlign: 'center' }}>
          <div className="supra">{c.faqSupra}</div>
          <h2 className="stitle">{c.faqTitle[0]}<br /><span className="ac">{c.faqTitle[1]}</span></h2>
          <p className="sdesc">{c.faqDesc}</p>
          <div className="faq-grid">
            {c.faqs.map((f, i) => (
              <div key={i} className="faq-item">
                <h4><span className="faq-q">?</span>{f.q}</h4>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 9. FINAL CTA ── */}
      <div className="final-cta">
        <div className="badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>{c.ctaBadge}</div>
        <h2>{c.ctaTitle[0]}<br /><b>{c.ctaTitle[1]}</b></h2>
        <p>{c.ctaDesc}</p>
        <button className="final-btn" onClick={() => navigate('/upload')} data-testid="final-cta-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>{c.ctaBtn}</button>
        <div className="final-sub">{c.ctaSub}</div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 bg-[#111] text-center">
        <div style={{ marginBottom: 16 }}><img src="/logos/archer-logo-mono-white.svg" alt="Archer" style={{ height: 36 }} /></div>
        <p className="text-xs text-[#666] max-w-2xl mx-auto">{t.footer} &middot; &copy; 2026 Archer Inc.</p>
      </footer>
    </div>
  );
};

export default Landing;
