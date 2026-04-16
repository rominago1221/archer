import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PageHead from '../components/seo/PageHead';
import JsonLd, { LEGAL_SERVICE_SCHEMA } from '../components/seo/JsonLd';
import { PAGE_METADATA } from '../lib/seo/metadata';

const Chk = ({c='#16a34a'}) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

const D = {
  en: {
    heroBadge: 'ARCHER PROTECT \u00B7 PRICING',
    heroTitle: ['Pricing built', 'for ', 'real life.'],
    heroTag: 'Start with a free analysis. Subscribe when you need more.\nZero hourly billing. Zero surprises. Cancel anytime.',
    freeLabel: 'FREE FIRST ANALYSIS',
    freeTitle: 'Create a free account. Get one analysis free.',
    freeDesc: 'Full legal analysis on one document. Upgrade to Protect when you need more \u2014 attorney letters, live counsel, and unlimited cases.',
    freeCta: 'Create free account',
    subSupra: 'ARCHER PROTECT PLANS',
    subTitle: ['Pick your plan.', 'Unlock everything.'],
    subSub: 'All Protect plans include unlimited document analyses, unlimited DIY letters, unlimited legal chat, and access to Attorney Letters on demand. Monthly or yearly. Cancel anytime.',
    monthly: 'Monthly', yearly: 'Yearly', save17: 'SAVE 17%',
    plans: [
      { name: 'Protect Solo', tag: 'For individuals', price: ['$29.99','$24.92'], per: '/mo', period: ['Or $299/year','Or $299/year'], yrSave: ['Save $60 yearly','Save $60 yearly'], cta: 'Start Solo', feats: [
        { t: 'Unlimited document analyses', bold: true },
        { t: 'Unlimited DIY letters', bold: true },
        { t: 'Unlimited legal chat' },
        { t: 'Document Vault' },
        { t: 'Risk Monitor for emails' },
      ]},
      { name: 'Protect Family', tag: 'Up to 3 family members', badge: '\u2605 MOST POPULAR', featured: true, price: ['$49.99','$41.58'], per: '/mo', period: ['Or $499/year','Or $499/year'], yrSave: ['Save $100 yearly','Save $100 yearly'], cta: 'Start Family', feats: [
        { t: 'Everything in Solo, for 3 people', bold: true },
        { t: '1 Live Counsel session/year', bold: true, c: '#7c3aed', sub: '$149 value included' },
        { t: 'Shared Document Vault' },
        { t: 'Priority support' },
      ]},
      { name: 'Protect Pro', tag: 'For high-stakes cases', price: ['$89.99','$74.92'], per: '/mo', period: ['Or $899/year','Or $899/year'], yrSave: ['Save $180 yearly','Save $180 yearly'], cta: 'Start Pro', feats: [
        { t: 'Everything in Solo' },
        { t: '2 Attorney Letters/year', bold: true, c: '#1a56db', sub: '$100 value included' },
        { t: '1 Live Counsel/year', bold: true, c: '#7c3aed', sub: '$149 value included' },
        { t: 'Dedicated attorney follow-up' },
      ]},
    ],
    compSupra: 'FEATURE BY FEATURE', compTitle: ['Compare all ', 'plans.'],
    compCols: ['Free','Solo','Family','Pro'],
    compPrices: ['$0','$29.99/mo','$49.99/mo','$89.99/mo'],
    compRows: [
      ['Document analyses','1 lifetime','Unlimited','Unlimited','Unlimited'],
      ['DIY letters (download & send)','1 per analysis','Unlimited','Unlimited','Unlimited'],
      ['Unlimited legal chat','\u2715','\u2713','\u2713','\u2713'],
      ['Number of users','1','1','Up to 3','1'],
      ['Document Vault','\u2715','\u2713','\u2713 Shared','\u2713'],
      ['Risk Monitor (email scanning)','\u2715','\u2713','\u2713','\u2713'],
      ['Attorney Letter access','\u2715','$49.99 each','$49.99 each','2 included'],
      ['Live Counsel access','\u2715','$149 each','1 included/year','1 included/year'],
      ['Dedicated attorney follow-up','\u2715','With Letter','With Letter','\u2713 Always'],
      ['Real-time case tracking','\u2715','With Letter','With Letter','\u2713 Always'],
      ['Certified mail add-on','\u2715','$14 each','$14 each','$14 each'],
      ['Priority support','\u2715','\u2715','\u2713','\u2713'],
    ],
    compFoot: 'All plans: 30-day money-back guarantee \u00B7 Cancel anytime \u00B7 No hidden fees',
    alBadge: 'THE ATTORNEY LETTER',
    alTitle: ['A signed lawyer letter.', 'In ', '4 hours.', ' For ', '$49.99.'],
    alDesc: "An official letter drafted by Archer and personally signed by a licensed partner attorney. Bar number, official letterhead, full legal responsibility. Includes dedicated follow-up and real-time case tracking \u2014 when the other party responds, Archer re-analyzes automatically.",
    alSub: 'Available to Protect subscribers only \u00B7 Included free in Pro (2/year)',
    alPillars: [
      { t: '4 hours', s: 'Not 4 weeks' },
      { t: '10\u00D7 cheaper', s: 'vs. $400-800 average' },
      { t: 'Bar certified', s: 'Real signing attorney' },
      { t: 'Real-time tracking', s: 'Attorney stays on your case' },
    ],
    vsSupra: 'VS THE OLD WORLD', vsTitle: ['Why pay more', 'for less?'],
    vsSub: "Here's the honest comparison between getting a lawyer the traditional way, paying for legal insurance, and using Archer Protect.",
    vsCols: [
      { label: 'TRADITIONAL LAWYER', title: 'Local attorney', price: '$300\u2013500', priceSub: 'Per consultation', items: ['$300-500 first consultation','$400-800 per letter','2-3 week wait for appointment','Billable hours, not flat fees','Business hours only'], x: true },
      { label: 'LEGAL INSURANCE', title: 'LegalShield, ARAG, DAS', price: '$40\u2013115', priceSub: 'Per month', items: ['$40-115/month premium','3-month waiting period','$150-300 deductible per case','Annual cap on cases','No AI, still slow lawyers'], x: true },
      { label: 'ARCHER PROTECT', title: 'Solo plan', price: '$29.99', priceSub: 'Per month', items: ['First analysis free, no signup','$49.99 flat attorney letters','60-second analysis, instant','Flat prices, no surprises','Available 24/7/365'], x: false, hl: true },
    ],
    faqSupra: 'PRICING QUESTIONS', faqTitle: ['Common ', 'questions.'],
    faqs: [
      { q: 'What do I get with the free plan?', a: "A free Archer account gets you one full document analysis with win probability, legal angles, and a downloadable DIY letter. It's the perfect way to try Archer with your real case. To do more \u2014 unlimited analyses, legal chat, document vault, and especially Attorney Letters \u2014 you need a Protect plan starting at $29.99/month." },
      { q: "Why can't I buy an Attorney Letter without a subscription?", a: "Archer isn't a one-off service. Our attorneys work with people they're actually helping across time \u2014 reviewing cases, tracking replies, following up. That relationship only makes sense for subscribers. Protect Solo starts at $29.99/mo and includes everything you need to handle most cases yourself, plus access to Attorney Letters on demand." },
      { q: "What's included in the $49.99 Attorney Letter?", a: "A partner attorney reviews your case, edits Archer's draft if needed, signs the letter with their bar number, and stays assigned to your case. You get real-time tracking \u2014 when the other party responds, your attorney uploads their reply and Archer re-analyzes automatically." },
      { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your dashboard in one click, no phone calls, no retention specialists. You keep access until the end of your current billing period, and you can reactivate anytime. All plans include a 30-day money-back guarantee.' },
      { q: 'Is Protect Family really for 3 people?', a: "Yes. Up to 3 family members share one plan \u2014 each person gets their own account, their own cases, and shared access to the Document Vault. Ideal for couples with a kid, or an adult with elderly parents needing legal help." },
      { q: 'Is there a yearly discount?', a: "Yes. Paying yearly saves you 17% \u2014 that's $60 off Solo, $100 off Family, $180 off Pro. Same features, same flexibility, just cheaper if you commit to a year." },
    ],
    ctaBadge: '30-DAY MONEY-BACK GUARANTEE',
    ctaTitle: ['Start free.', 'Upgrade when you need more.'],
    ctaDesc: "Create a free Archer account and analyze one real document. When you're ready for unlimited cases, attorney letters, and real legal protection \u2014 pick a Protect plan. Cancel anytime.",
    ctaBtn: 'Create my free account',
    ctaSub: 'No credit card required \u00B7 30-day money-back on all plans',
  },
  fr: {
    heroBadge: 'ARCHER PROTECT \u00B7 TARIFS',
    heroTitle: ['Des tarifs', 'pour la ', 'vraie vie.'],
    heroTag: "Commence avec une analyse gratuite. Abonne-toi quand tu as besoin de plus.\nZ\u00E9ro facturation horaire. Z\u00E9ro surprise. Annulation \u00E0 tout moment.",
    freeLabel: 'PREMI\u00C8RE ANALYSE GRATUITE',
    freeTitle: 'Cr\u00E9e un compte gratuit. Une analyse offerte.',
    freeDesc: "Analyse juridique compl\u00E8te sur un document. Passe sur Protect quand tu en as besoin de plus \u2014 lettres d'avocat, consultations live, et dossiers illimit\u00E9s.",
    freeCta: 'Cr\u00E9er un compte gratuit',
    subSupra: 'LES PLANS ARCHER PROTECT',
    subTitle: ['Choisis ton plan.', 'D\u00E9bloque tout.'],
    subSub: "Tous les plans Protect incluent des analyses illimit\u00E9es, des lettres DIY illimit\u00E9es, un chat juridique illimit\u00E9, et l'acc\u00E8s aux Lettres d'Avocat \u00E0 la demande. Mensuel ou annuel. Annulation \u00E0 tout moment.",
    monthly: 'Mensuel', yearly: 'Annuel', save17: '-17%',
    plans: [
      { name: 'Protect Solo', tag: 'Pour les particuliers', price: ['29,99 \u20AC','24,92 \u20AC'], per: '/mois', period: ['Ou 299 \u20AC/an','Ou 299 \u20AC/an'], yrSave: ['\u00C9conomise 60 \u20AC par an','\u00C9conomise 60 \u20AC par an'], cta: 'D\u00E9marrer Solo', feats: [
        { t: 'Analyses de documents illimit\u00E9es', bold: true },
        { t: 'Lettres DIY illimit\u00E9es', bold: true },
        { t: 'Chat juridique illimit\u00E9' },
        { t: 'Coffre-fort documents' },
        { t: 'Surveillance des risques emails' },
      ]},
      { name: 'Protect Family', tag: "Jusqu'\u00E0 3 membres de la famille", badge: '\u2605 LE PLUS POPULAIRE', featured: true, price: ['49,99 \u20AC','41,58 \u20AC'], per: '/mois', period: ['Ou 499 \u20AC/an','Ou 499 \u20AC/an'], yrSave: ['\u00C9conomise 100 \u20AC par an','\u00C9conomise 100 \u20AC par an'], cta: 'D\u00E9marrer Family', feats: [
        { t: 'Tout Solo, pour 3 personnes', bold: true },
        { t: '1 session Live Counsel/an', bold: true, c: '#7c3aed', sub: '149 \u20AC de valeur inclus' },
        { t: 'Coffre-fort documents partag\u00E9' },
        { t: 'Support prioritaire' },
      ]},
      { name: 'Protect Pro', tag: 'Pour les cas \u00E0 fort enjeu', price: ['89,99 \u20AC','74,92 \u20AC'], per: '/mois', period: ['Ou 899 \u20AC/an','Ou 899 \u20AC/an'], yrSave: ['\u00C9conomise 180 \u20AC par an','\u00C9conomise 180 \u20AC par an'], cta: 'D\u00E9marrer Pro', feats: [
        { t: 'Tout ce qui est dans Solo' },
        { t: "2 Lettres d'Avocat/an", bold: true, c: '#1a56db', sub: '100 \u20AC de valeur inclus' },
        { t: '1 Live Counsel/an', bold: true, c: '#7c3aed', sub: '149 \u20AC de valeur inclus' },
        { t: 'Suivi par avocat d\u00E9di\u00E9' },
      ]},
    ],
    compSupra: 'FONCTIONNALIT\u00C9 PAR FONCTIONNALIT\u00C9', compTitle: ['Compare tous les ', 'plans.'],
    compCols: ['Gratuit','Solo','Family','Pro'],
    compPrices: ['0 \u20AC','29,99 \u20AC/mois','49,99 \u20AC/mois','89,99 \u20AC/mois'],
    compRows: [
      ['Analyses de documents','1 \u00E0 vie','Illimit\u00E9es','Illimit\u00E9es','Illimit\u00E9es'],
      ['Lettres DIY (t\u00E9l\u00E9chargement & envoi)','1 par analyse','Illimit\u00E9es','Illimit\u00E9es','Illimit\u00E9es'],
      ['Chat juridique illimit\u00E9','\u2715','\u2713','\u2713','\u2713'],
      ["Nombre d'utilisateurs",'1','1',"Jusqu'\u00E0 3",'1'],
      ['Coffre-fort documents','\u2715','\u2713','\u2713 Partag\u00E9','\u2713'],
      ['Surveillance des risques emails','\u2715','\u2713','\u2713','\u2713'],
      ["Acc\u00E8s Lettres d'Avocat",'\u2715','49,99 \u20AC chacune','49,99 \u20AC chacune','2 incluses'],
      ['Acc\u00E8s Live Counsel','\u2715','149 \u20AC chacune','1 incluse/an','1 incluse/an'],
      ['Suivi par avocat d\u00E9di\u00E9','\u2715','Avec la Lettre','Avec la Lettre','\u2713 Toujours'],
      ['Suivi de dossier en temps r\u00E9el','\u2715','Avec la Lettre','Avec la Lettre','\u2713 Toujours'],
      ['Option recommand\u00E9 postal','\u2715','15 \u20AC chacun','15 \u20AC chacun','15 \u20AC chacun'],
      ['Support prioritaire','\u2715','\u2715','\u2713','\u2713'],
    ],
    compFoot: 'Tous les plans : garantie satisfait-rembours\u00E9 30 jours \u00B7 Annulation \u00E0 tout moment \u00B7 Pas de frais cach\u00E9s',
    alBadge: "LA LETTRE D'AVOCAT",
    alTitle: ["Une vraie lettre d'avocat sign\u00E9e.", 'En ', '4 heures.', ' Pour ', '49,99 \u20AC.'],
    alDesc: "Une lettre officielle r\u00E9dig\u00E9e par Archer et sign\u00E9e personnellement par un avocat partenaire inscrit au barreau. Num\u00E9ro de barreau, en-t\u00EAte officielle, responsabilit\u00E9 l\u00E9gale compl\u00E8te. Inclut un suivi d\u00E9di\u00E9 et un tracking en temps r\u00E9el \u2014 quand l'autre partie r\u00E9pond, Archer r\u00E9-analyse automatiquement.",
    alSub: 'R\u00E9serv\u00E9 aux abonn\u00E9s Protect \u00B7 Inclus gratuitement dans Pro (2/an)',
    alPillars: [
      { t: '4 heures', s: 'Pas 4 semaines' },
      { t: '10\u00D7 moins cher', s: 'vs. 400-800 \u20AC en moyenne' },
      { t: 'Certifi\u00E9 barreau', s: 'Vrai avocat signataire' },
      { t: 'Suivi temps r\u00E9el', s: "L'avocat reste sur ton dossier" },
    ],
    vsSupra: "VS L'ANCIEN MONDE", vsTitle: ['Pourquoi payer plus', 'pour moins ?'],
    vsSub: "Voici la comparaison honn\u00EAte entre aller chez un avocat \u00E0 l'ancienne, payer une assurance juridique, et utiliser Archer Protect.",
    vsCols: [
      { label: 'AVOCAT TRADITIONNEL', title: 'Avocat local', price: '300\u2013500 \u20AC', priceSub: 'Par consultation', items: ['300-500 \u20AC premi\u00E8re consultation','400-800 \u20AC par lettre',"2-3 semaines d'attente","Heures factur\u00E9es, pas de prix fixe",'Heures de bureau uniquement'], x: true },
      { label: 'ASSURANCE JURIDIQUE', title: 'LegalShield, ARAG, DAS', price: '40\u2013115 \u20AC', priceSub: 'Par mois', items: ['40-115 \u20AC/mois de prime',"3 mois d'attente avant couverture",'150-300 \u20AC de franchise par cas','Plafond annuel sur les cas','Pas d\'IA, toujours des avocats lents'], x: true },
      { label: 'ARCHER PROTECT', title: 'Plan Solo', price: '29,99 \u20AC', priceSub: 'Par mois', items: ["Premi\u00E8re analyse gratuite, sans inscription","49,99 \u20AC fixe pour lettres d'avocat",'Analyse 60 secondes, instantan\u00E9e','Prix fixes, pas de surprises','Disponible 24h/24, 7j/7'], x: false, hl: true },
    ],
    faqSupra: 'QUESTIONS SUR LES TARIFS', faqTitle: ['Questions ', 'fr\u00E9quentes.'],
    faqs: [
      { q: "Qu'est-ce que j'obtiens avec le plan gratuit ?", a: "Un compte Archer gratuit te donne une analyse compl\u00E8te de document avec probabilit\u00E9 de victoire, angles juridiques, et une lettre DIY t\u00E9l\u00E9chargeable. C'est parfait pour tester Archer avec ton vrai cas. Pour aller plus loin \u2014 analyses illimit\u00E9es, chat juridique, coffre-fort, et surtout les Lettres d'Avocat \u2014 il te faut un plan Protect \u00E0 partir de 29,99 \u20AC/mois." },
      { q: "Pourquoi je ne peux pas acheter une Lettre d'Avocat sans abonnement ?", a: "Archer n'est pas un service one-shot. Nos avocats travaillent avec des gens qu'ils accompagnent dans la dur\u00E9e \u2014 r\u00E9vision de dossiers, suivi des r\u00E9ponses, relances. Cette relation n'a de sens que pour les abonn\u00E9s. Protect Solo commence \u00E0 29,99 \u20AC/mois et inclut tout ce qu'il faut pour g\u00E9rer la plupart des cas toi-m\u00EAme, plus l'acc\u00E8s aux Lettres d'Avocat \u00E0 la demande." },
      { q: "Qu'est-ce qui est inclus dans la Lettre d'Avocat \u00E0 49,99 \u20AC ?", a: "Un avocat partenaire r\u00E9vise ton dossier, \u00E9dite le brouillon d'Archer si n\u00E9cessaire, signe la lettre avec son num\u00E9ro de barreau, et reste assign\u00E9 \u00E0 ton dossier. Tu b\u00E9n\u00E9ficies d'un suivi en temps r\u00E9el \u2014 quand l'autre partie r\u00E9pond, ton avocat uploade sa r\u00E9ponse et Archer r\u00E9-analyse automatiquement." },
      { q: 'Puis-je annuler \u00E0 tout moment ?', a: "Oui. Annule depuis ton dashboard en un clic, pas d'appels t\u00E9l\u00E9phoniques, pas de service de r\u00E9tention. Tu gardes l'acc\u00E8s jusqu'\u00E0 la fin de ta p\u00E9riode de facturation actuelle, et tu peux r\u00E9activer \u00E0 tout moment. Tous les plans incluent une garantie satisfait-rembours\u00E9 de 30 jours." },
      { q: 'Protect Family c\'est vraiment pour 3 personnes ?', a: "Oui. Jusqu'\u00E0 3 membres de la famille partagent un plan \u2014 chaque personne a son propre compte, ses propres dossiers, et un acc\u00E8s partag\u00E9 au Coffre-fort documents. Id\u00E9al pour un couple avec un enfant, ou un adulte avec des parents \u00E2g\u00E9s ayant besoin d'aide juridique." },
      { q: 'Y a-t-il une r\u00E9duction annuelle ?', a: "Oui. Payer \u00E0 l'ann\u00E9e fait \u00E9conomiser 17 % \u2014 soit 60 \u20AC sur Solo, 100 \u20AC sur Family, 180 \u20AC sur Pro. M\u00EAmes fonctionnalit\u00E9s, m\u00EAme flexibilit\u00E9, juste moins cher si tu t'engages sur un an." },
    ],
    ctaBadge: 'GARANTIE SATISFAIT-REMBOURS\u00C9 30 JOURS',
    ctaTitle: ['Commence gratuitement.', 'Passe Protect quand tu veux plus.'],
    ctaDesc: "Cr\u00E9e un compte Archer gratuit et analyse un vrai document. Quand tu es pr\u00EAt pour des dossiers illimit\u00E9s, des lettres d'avocat et une vraie protection juridique \u2014 choisis un plan Protect. Annulation \u00E0 tout moment.",
    ctaBtn: 'Cr\u00E9er mon compte gratuit',
    ctaSub: 'Pas de carte bancaire requise \u00B7 Garantie 30 jours sur tous les plans',
  },
};

const CSS = `
.pp{font-family:-apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif;color:#0a0a0f;background:#f4f4f1;min-height:100vh;padding-top:72px}
.pp .si{max-width:1280px;margin:0 auto;padding:0 24px}
.pp .hero{text-align:center;padding:60px 24px 40px}
.pp .hero-badge{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#eff6ff;border-radius:30px;font-size:11px;font-weight:700;color:#1a56db;letter-spacing:1px;margin-bottom:20px}
.pp .hero h1{font-size:64px;font-weight:500;letter-spacing:-2.5px;line-height:1;margin:0 0 16px}.pp .hero .ac{color:#1a56db;font-weight:800}
.pp .hero .tag{font-size:17px;color:#555;white-space:pre-line;line-height:1.6}
.pp .fb{display:flex;align-items:center;justify-content:space-between;gap:32px;background:#fff;border:.5px solid #e2e0db;border-radius:16px;padding:32px 36px;margin:0 auto 48px;max-width:1280px}
.pp .fb-label{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#16a34a;letter-spacing:1px;margin-bottom:8px}
.pp .fb-title{font-size:20px;font-weight:800;margin-bottom:6px;letter-spacing:-.5px}
.pp .fb-desc{font-size:13px;color:#555;line-height:1.5;max-width:520px}
.pp .fb-cta{padding:14px 28px;border-radius:30px;background:#0a0a0f;color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:8px;transition:all .2s}
.pp .fb-cta:hover{background:#1a56db}
.pp .sh{text-align:center;margin-bottom:32px}
.pp .supra{font-size:11px;font-weight:600;letter-spacing:2px;color:#1a56db;margin-bottom:12px}
.pp .stitle{font-size:42px;font-weight:500;letter-spacing:-1.5px;line-height:1.05;margin:0 0 12px}.pp .stitle .ac{color:#1a56db;font-weight:800}
.pp .ssub{font-size:15px;color:#555;max-width:680px;margin:0 auto;line-height:1.6}
.pp .tog-w{display:flex;justify-content:center;margin-bottom:32px}
.pp .tog{display:inline-flex;background:#fff;border:.5px solid #e2e0db;border-radius:30px;padding:4px;gap:0}
.pp .tog-o{padding:9px 20px;border-radius:24px;font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:#555;border:none;display:flex;align-items:center;gap:6px;transition:all .2s}
.pp .tog-o.on{background:#0a0a0f;color:#fff}
.pp .sav{background:#ecfdf5;color:#16a34a;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px}
.pp .sg{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1080px;margin:0 auto 64px}
.pp .sc{background:#fff;border:.5px solid #e2e0db;border-radius:20px;padding:32px 28px;position:relative;display:flex;flex-direction:column}
.pp .sc.ft{border:2px solid #1a56db;box-shadow:0 8px 32px rgba(26,86,219,.1)}
.pp .sc-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#1a56db;color:#fff;padding:5px 14px;border-radius:12px;font-size:10px;font-weight:800;white-space:nowrap}
.pp .sc-name{font-size:14px;font-weight:700;color:#1a56db;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px}
.pp .sc-tag{font-size:12px;color:#9ca3af;margin-bottom:14px}
.pp .sc-price{font-size:48px;font-weight:800;letter-spacing:-2px;line-height:1;margin-bottom:4px}
.pp .sc-per{font-size:16px;color:#9ca3af;font-weight:500}
.pp .sc-period{font-size:12px;color:#9ca3af;margin-top:4px}
.pp .sc-yr{font-size:11px;color:#16a34a;font-weight:600;margin-bottom:16px;min-height:16px}
.pp .sc-cta{width:100%;padding:14px;border-radius:30px;font-size:14px;font-weight:700;cursor:pointer;border:.5px solid #e2e0db;background:#fff;color:#0a0a0f;margin-bottom:20px;transition:all .2s}
.pp .sc-cta:hover{border-color:#1a56db;color:#1a56db}
.pp .sc-cta.pr{background:#1a56db;color:#fff;border:none}.pp .sc-cta.pr:hover{background:#1e40af}
.pp .sf{border-top:.5px solid #e2e0db;padding-top:16px;display:flex;flex-direction:column;gap:10px;flex:1}
.pp .sf-i{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:#0a0a0f}
.pp .sf-i.bd{font-weight:700}
.pp .sf-sub{display:block;font-size:10px;font-weight:700;color:#9ca3af;margin-top:1px;letter-spacing:.2px}
.pp .sw{background:#fff;border:.5px solid #e2e0db;border-radius:20px;padding:48px;margin-bottom:48px;max-width:1280px;margin-left:auto;margin-right:auto}
.pp table{width:100%;border-collapse:collapse;margin-top:24px}
.pp th,.pp td{padding:14px 12px;text-align:center;font-size:13px;border-bottom:.5px solid #e2e0db}
.pp th{font-weight:400;color:#9ca3af;font-size:12px}
.pp th.ft{background:#eff6ff;border-top:2px solid #1a56db;border-left:1px solid rgba(26,86,219,.2);border-right:1px solid rgba(26,86,219,.2)}
.pp td.ft{background:#eff6ff;border-left:1px solid rgba(26,86,219,.15);border-right:1px solid rgba(26,86,219,.15)}
.pp td.fl{text-align:left;font-weight:600;color:#0a0a0f}
.pp .cg{color:#15803d;font-weight:700}
.pp .cx{color:#d1d5db}
.pp .ca{color:#b45309;font-weight:600;font-size:12px}
.pp .al-badge{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#eff6ff;border-radius:30px;font-size:11px;font-weight:700;color:#1a56db;letter-spacing:1px;margin-bottom:20px}
.pp .al-title{font-size:42px;font-weight:500;letter-spacing:-1.5px;line-height:1.05;margin:0 0 18px}.pp .al-title .ac{color:#1a56db;font-weight:800}
.pp .al-desc{font-size:15px;color:#555;max-width:720px;margin:0 auto 16px;line-height:1.6}
.pp .al-pillars{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;max-width:780px;margin:32px auto 0}
.pp .al-p{text-align:center}
.pp .al-pi{width:52px;height:52px;border-radius:50%;background:#eff6ff;display:inline-flex;align-items:center;justify-content:center;color:#1a56db;margin-bottom:10px}
.pp .al-pt{font-size:14px;font-weight:800;margin-bottom:2px}
.pp .al-ps{font-size:11px;color:#9ca3af}
.pp .vs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:48px}
.pp .vs-col{background:#f4f4f1;border:.5px solid #e2e0db;border-radius:16px;padding:28px 22px;text-align:left}
.pp .vs-col.hl{background:#eff6ff;border:2px solid #1a56db}
.pp .vs-label{font-size:10px;font-weight:700;letter-spacing:1px;color:#9ca3af;margin-bottom:6px}
.pp .vs-col.hl .vs-label{color:#1a56db}
.pp .vs-ct{font-size:16px;font-weight:800;margin-bottom:4px}
.pp .vs-cp{font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:2px}
.pp .vs-cs{font-size:11px;color:#9ca3af;margin-bottom:16px}
.pp .vs-li{display:flex;align-items:flex-start;gap:8px;font-size:13px;margin-bottom:8px}
.pp .vs-x{color:#b91c1c;font-weight:800;flex-shrink:0}
.pp .vs-c{color:#15803d;font-weight:800;flex-shrink:0}
.pp .faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:32px}
.pp .faq-i{background:#fff;border:.5px solid #e2e0db;border-radius:16px;padding:24px}
.pp .faq-q{display:flex;align-items:flex-start;gap:10px;font-size:15px;font-weight:800;margin-bottom:10px}
.pp .faq-qm{width:22px;height:22px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#1a56db;flex-shrink:0}
.pp .faq-a{font-size:13px;color:#555;line-height:1.6;padding-left:32px}
.pp .final{background:#1a56db;border-radius:20px;padding:64px 40px;text-align:center;max-width:1280px;margin:0 auto 40px}
.pp .final .badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);padding:9px 18px;border-radius:30px;color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:24px}
.pp .final h2{font-size:48px;font-weight:500;letter-spacing:-2px;line-height:1;color:#fff;margin:0 0 16px}.pp .final h2 .ac{font-weight:800;color:#fff}
.pp .final p{font-size:17px;color:rgba(255,255,255,.85);max-width:600px;margin:0 auto 32px;line-height:1.5}
.pp .final-btn{display:inline-flex;align-items:center;gap:10px;padding:18px 40px;border-radius:40px;background:#fff;color:#1a56db;font-size:16px;font-weight:700;border:none;cursor:pointer;transition:transform .2s}
.pp .final-btn:hover{transform:scale(1.03)}
.pp .final .fp{font-size:12px;color:rgba(255,255,255,.65);margin-top:14px}
@media(max-width:1100px){.pp .sg{grid-template-columns:1fr}.pp .vs-grid{grid-template-columns:1fr}.pp .al-pillars{grid-template-columns:repeat(2,1fr)}.pp .faq-grid{grid-template-columns:1fr}.pp .fb{flex-direction:column;text-align:center;gap:20px}}
@media(max-width:640px){.pp .hero h1{font-size:40px}.pp .stitle,.pp .al-title{font-size:30px}.pp .final h2{font-size:36px}.pp .sw{padding:28px 18px}.pp .fb{padding:24px 20px}}
.pp footer{padding:32px 24px;background:#111;text-align:center}
`;

export default function Pricing() {
  const { lang } = useParams();
  const isFr = lang === 'fr';
  const t = isFr ? D.fr : D.en;
  const navigate = useNavigate();
  const [billing, setBilling] = useState(0);

  const cellClass = (val) => {
    if (val === '\u2715') return 'cx';
    if (val.startsWith('\u2713') || val === 'Unlimited' || val === 'Illimit\u00E9es' || val.includes('included') || val.includes('inclus') || val.includes('Always') || val.includes('Toujours')) return 'cg';
    if (val.includes('$') || val.includes('\u20AC')) return 'ca';
    return '';
  };

  return (
    <div className="pp">
      <PageHead metadata={PAGE_METADATA.pricing} />
      <JsonLd data={LEGAL_SERVICE_SCHEMA} />
      <style>{CSS}</style>
      <PublicNavbar />

      {/* HERO */}
      <div className="hero"><div className="hero-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>{t.heroBadge}</span></div><h1>{t.heroTitle[0]}<br />{t.heroTitle[1]}<span className="ac">{t.heroTitle[2]}</span></h1><p className="tag">{t.heroTag}</p></div>

      {/* FREE BANNER */}
      <div className="si"><div className="fb"><div className="fb-text"><div className="fb-label"><Chk />{t.freeLabel}</div><div className="fb-title">{t.freeTitle}</div><div className="fb-desc">{t.freeDesc}</div></div><button className="fb-cta" onClick={() => navigate('/signup')}>{t.freeCta}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></button></div></div>

      {/* SUBSCRIBE */}
      <div className="si">
        <div className="sh"><div className="supra">{t.subSupra}</div><h2 className="stitle">{t.subTitle[0]}<br /><span className="ac">{t.subTitle[1]}</span></h2><p className="ssub">{t.subSub}</p></div>
        <div className="tog-w"><div className="tog"><button className={`tog-o${billing===0?' on':''}`} onClick={()=>setBilling(0)}>{t.monthly}</button><button className={`tog-o${billing===1?' on':''}`} onClick={()=>setBilling(1)}>{t.yearly} <span className="sav">{t.save17}</span></button></div></div>
        <div className="sg">
          {t.plans.map((p,i) => <div key={i} className={`sc${p.featured?' ft':''}`}>{p.badge&&<div className="sc-badge">{p.badge}</div>}<div className="sc-name">{p.name}</div><div className="sc-tag">{p.tag}</div><div className="sc-price">{p.price[billing]}<span className="sc-per">{p.per}</span></div><div className="sc-period">{p.period[billing]}</div><div className="sc-yr">{p.yrSave[billing]}</div><button className={`sc-cta${p.featured?' pr':''}`} onClick={()=>navigate('/signup')}>{p.cta}</button><div className="sf">{p.feats.map((f,fi) => <div key={fi} className={`sf-i${f.bold?' bd':''}`}><Chk c={f.c||'#16a34a'}/><span>{f.t}{f.sub&&<span className="sf-sub">{f.sub}</span>}</span></div>)}</div></div>)}
        </div>
      </div>

      {/* COMPARE TABLE */}
      <div className="si"><div className="sw"><div className="sh" style={{marginBottom:8}}><div className="supra">{t.compSupra}</div><h2 className="stitle">{t.compTitle[0]}<span className="ac">{t.compTitle[1]}</span></h2></div>
        <table><thead><tr><th style={{width:'35%',textAlign:'left'}}> </th>{t.compCols.map((c,i)=><th key={i} className={i===2?'ft':''}>{c}<br /><span style={{fontSize:11,color:i===2?'#1a56db':'#9ca3af',fontWeight:700}}>{t.compPrices[i]}</span></th>)}</tr></thead><tbody>{t.compRows.map((r,ri)=><tr key={ri}><td className="fl">{r[0]}</td>{[1,2,3,4].map(ci=><td key={ci} className={`${ci===3?'ft':''} ${cellClass(r[ci])}`}>{r[ci].includes('included')||r[ci].includes('inclus')?<strong>{r[ci]}</strong>:r[ci]}</td>)}</tr>)}</tbody></table>
        <div style={{textAlign:'center',fontSize:12,color:'#9ca3af',marginTop:24,paddingTop:24,borderTop:'.5px solid #e2e0db'}}>{t.compFoot}</div>
      </div></div>

      {/* ATTORNEY LETTER */}
      <div className="si"><div className="sw" style={{textAlign:'center'}}><div className="al-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>{t.alBadge}</div><h2 className="al-title">{t.alTitle[0]}<br />{t.alTitle[1]}<span className="ac">{t.alTitle[2]}</span>{t.alTitle[3]}<span className="ac">{t.alTitle[4]}</span></h2><p className="al-desc">{t.alDesc}</p><div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 18px',background:'#eff6ff',borderRadius:30,marginTop:20}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span style={{fontSize:12,fontWeight:700,color:'#1a56db'}}>{t.alSub}</span></div>
        <div className="al-pillars">{t.alPillars.map((p,i)=><div key={i} className="al-p"><div className="al-pi"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div className="al-pt">{p.t}</div><div className="al-ps">{p.s}</div></div>)}</div>
      </div></div>

      {/* VS OLD WORLD */}
      <div className="si"><div className="sw"><div className="sh"><div className="supra" style={{color:'#16a34a'}}>{t.vsSupra}</div><h2 className="stitle">{t.vsTitle[0]}<br /><span className="ac">{t.vsTitle[1]}</span></h2><p className="ssub">{t.vsSub}</p></div>
        <div className="vs-grid">{t.vsCols.map((col,i)=><div key={i} className={`vs-col${col.hl?' hl':''}`}><div className="vs-label">{col.label}</div><div className="vs-ct">{col.title}</div><div className="vs-cp">{col.price}</div><div className="vs-cs">{col.priceSub}</div>{col.items.map((item,ii)=><div key={ii} className="vs-li">{col.x?<span className="vs-x">{'\u2715'}</span>:<span className="vs-c">{'\u2713'}</span>}{item}</div>)}</div>)}</div>
      </div></div>

      {/* FAQ */}
      <div className="si"><div className="sw"><div className="sh"><div className="supra">{t.faqSupra}</div><h2 className="stitle">{t.faqTitle[0]}<span className="ac">{t.faqTitle[1]}</span></h2></div>
        <div className="faq-grid">{t.faqs.map((f,i)=><div key={i} className="faq-i"><div className="faq-q"><span className="faq-qm">?</span>{f.q}</div><div className="faq-a">{f.a}</div></div>)}</div>
      </div></div>

      {/* FINAL CTA */}
      <div className="final"><div className="badge"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>{t.ctaBadge}</div><h2>{t.ctaTitle[0]}<br /><span className="ac">{t.ctaTitle[1]}</span></h2><p>{t.ctaDesc}</p><button className="final-btn" onClick={()=>navigate('/signup')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>{t.ctaBtn}</button><div className="fp">{t.ctaSub}</div></div>

      <footer><div style={{marginBottom:16}}><img src="/logos/archer-logo-mono-white.svg" alt="Archer" style={{height:36}}/></div><p style={{fontSize:11,color:'#666'}}>&copy; 2026 Archer Inc.</p></footer>
    </div>
  );
}
