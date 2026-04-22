import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PageHead from '../components/seo/PageHead';
import { PAGE_METADATA } from '../lib/seo/metadata';

const F = "'SF Mono', Monaco, monospace";
const ChkSvg = ({s=14,c='#15803d'}) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

const T = {
  en: {
    heroBadge: 'TECHNICAL DEEP DIVE \u00B7 NOTHING HIDDEN',
    heroTitle: ['Look under', 'the hood.'],
    heroSub: 'The full architecture of Archer, from the AI pipeline to the human attorneys. Every step documented, every metric measured, every safeguard explained.',
    heroStats: [{n:'8',l:'PIPELINE STAGES'},{n:'47s',l:'AVG LATENCY'},{n:'0.8%',l:'HALLUCINATION'},{n:'94%',l:'ACCURACY'},{n:'27',l:'PARTNER ATTORNEYS'}],
    demoSupra: 'LIVE DEMO \u00B7 NO SIGNUP',
    demoTitle: ['Watch Archer work.', 'In real time.'],
    demoDesc: "This is exactly what happens when you upload a document to Archer. Every step, every number, every check \u2014 live and unedited.",
    demoSidebar: ['Dashboard','My cases','Documents','Attorneys','Vault'],
    demoBread: 'CASE #4821 \u00B7 NEW YORK \u00B7 TENANT LAW',
    demoH1: 'Eviction Notice Analysis',
    demoComplete: 'ANALYSIS COMPLETE \u00B7 Now it\'s your call',
    demoWin: 'WIN PROBABILITY', demoStrong: 'STRONG',
    demoMetrics: [{l:'VIOLATIONS',v:'3'},{l:'LEGAL ANGLES',v:'7'},{l:'CITATIONS',v:'47'},{l:'DEADLINE',v:'14 days',amber:true}],
    demoRecTitle: 'Archer recommends for this case',
    demoRecDesc: 'High-stakes eviction. Attorney Letter strongly recommended \u2014 the legal weight significantly changes the landlord\'s response rate.',
    demoChoose: 'CHOOSE YOUR NEXT ACTION',
    demoActions: [
      {t:'Download & send it yourself',d:'Get the letter as PDF. Copy-paste into email, print, or mail yourself.',badge:'INCLUDED',bc:'#dcfce7',btc:'#15803d',btn:'Download',ic:'#555'},
      {t:'Certified mail by Archer',d:'We print, mail, and track. Delivery receipt in your dashboard.',badge:'$14',bc:'#fef3c7',btc:'#b45309',btn:'Send $14',ic:'#555'},
      {t:'Get it signed by an attorney',d:'Partner attorney reviews, signs, and assigns themselves to your case. Real-time tracking.',badge:'$49.99 \u00B7 4h',bc:'#dbeafe',btc:'#1a56db',btn:'Request',ic:'#1a56db',rec:true},
      {t:'Talk to an attorney live',d:'30-min video call with a briefed partner attorney. Available in 15 min.',badge:'$149 \u00B7 30 min',bc:'#f3e8ff',btc:'#7c3aed',btn:'Book',ic:'#7c3aed'},
    ],
    demoDisclaimer: "Not sure? Start with the free download. If it doesn't work, upgrade later. You're never locked in.",
    demoFooter: ['This entire flow runs in under ', '60 seconds', ' on real documents'],
    archSupra: 'UNDER THE HOOD \u00B7 TECHNICAL DEEP DIVE',
    archTitle: ['This is not a', 'GPT wrapper.'],
    archDesc: "Archer runs a custom 8-stage pipeline: document parsing, retrieval, 5 reasoning passes, live citation verification, and attorney validation. Trained on 847K legal documents, grounded in 2.4M case laws, benchmarked by 12 bar-registered attorneys.",
    archSteps: [
      {n:'01',t:'Document parser (OCR + layout analysis)',d:'input: PDF/DOCX/IMG \u2192 output: structured text + entities',r:'PROPRIETARY OCR',m:'~0.3s \u00B7 99.4% acc'},
      {n:'02',t:'Legal entity recognition (NER)',d:'parties \u00B7 dates \u00B7 statutes \u00B7 monetary values \u00B7 jurisdictions',r:'ARCHER-NER v2',m:'~0.9s \u00B7 F1: 0.94'},
      {n:'03',t:'Jurisdiction detection',d:'US federal + 50 states \u00B7 Belgium civil law \u00B7 multi-lang routing',r:'RULE-BASED + ML',m:'~0.1s \u00B7 99.8% acc'},
      {n:'04',t:'RAG retrieval against 2.4M case laws',d:'1536-dim embeddings \u00B7 top-50 semantic + BM25 hybrid search',r:'ARCHER VECTOR DB',m:'~8.7s \u00B7 recall@50: 0.97',blue:true},
      {n:'05',t:'5-pass reasoning engine',d:null,r:'ARCHER REASONING CORE',m:'~34.2s \u00B7 CoT verified',core:true},
      {n:'06',t:'Live citation verification',d:'every citation checked against live legal databases \u00B7 zero hallucinations',r:'LEGAL DB INTEGRATION',m:'~2.8s \u00B7 0.8% halluc'},
      {n:'07',t:'Output synthesis & format rendering',d:'structured JSON \u2192 dashboard UI \u00B7 letter template \u00B7 risk report',r:'CUSTOM RENDERER',m:'~0.2s'},
      {n:'08',t:'Attorney validation layer',d:'only for Attorney Letters \u00B7 partner attorney reviews, edits, signs',r:'27 PARTNER ATTORNEYS',m:'~12 min avg',human:true},
    ],
    archCards: [
      {t:'The reasoning engine',d1:'Archer runs on the <b>Archer Reasoning Engine</b>, a custom legal-AI stack built in-house. Unlike generic LLMs, it\'s designed from the ground up for legal work.',d2:'Trained on <b>847,000 legal documents</b> across US federal/state law and Belgian civil law.',specs:['stack: ','archer reasoning engine v3.2','training corpus: ','847K legal docs','context window: ','200K tokens']},
      {t:'The knowledge base',d1:'Archer queries <b>2.4 million case laws in real time</b>. Every citation is verified against the live source before you see it.',d2:'The database is <b>refreshed daily</b>. New court decisions are indexed within 24 hours of publication.',specs:['vectors: ','2,412,847 cases \u00B7 1536-dim','index: ','hybrid (semantic + BM25)','refresh: ','daily \u00B7 03:00 UTC']},
    ],
    humanSupra: 'THE HUMAN LAYER',
    humanTitle: ['Real attorneys.', 'Only when you need them.'],
    humanDesc: "Archer is AI-first. Most cases are resolved entirely with AI analysis and letters you send yourself. Partner attorneys are called in only when you explicitly request an Attorney Letter or a Live Counsel call.",
    humanClar: 'IMPORTANT CLARIFICATION',
    humanClarH: ["Attorneys don't touch every case.", 'They come in when it matters.'],
    humanClarP: 'A common misconception: <b>"If Archer has real attorneys, every output must be reviewed by one."</b> That\'s not how it works. You control when humans get involved, and you only pay when you need them.',
    humanSplit: [
      {pct:'80% OF CASES',t:'No attorney needed',d:"Parking tickets, small consumer disputes, rent increases, minor employment issues. Archer's analysis + a DIY letter is enough.",bg:'#ecfdf5',bc:'#15803d'},
      {pct:'20% OF CASES',t:'Attorney recommended',d:'Evictions, wrongful termination, insurance bad faith, serious contract disputes. Legal weight of a signed letter changes the game.',bg:'#eff6ff',bc:'#1a56db'},
    ],
    humanTeamSupra: 'MEET THE TEAM',
    humanTeamH: 'The attorneys who sign your documents.',
    humanMore: '+23 more partner attorneys across NY, CA, TX, FL, IL + Brussels, Antwerp, Li\u00E8ge',
    tlSupra: 'MINUTE BY MINUTE',
    tlTitle: ['From upload to resolution.', 'Two possible paths.'],
    tlDesc: 'The timeline of a case depends on your choice. Most cases finish on Path A (you send it yourself). High-stakes cases continue on Path B (attorney involvement).',
    tlSteps: [
      {time:'00:00',t:'You upload the document',d:'Drag & drop. Any legal doc works.'},
      {time:'00:47',t:'Full analysis + DIY letter ready',d:'Risk score, legal angles, draft letter, timelines. Everything in your dashboard.'},
      {time:'01:00',t:'You review and decide your next step',d:'Archer gives its recommendation. From here, the timeline splits into two paths.',black:true,label:'YOUR CALL'},
    ],
    pathA: {badge:'PATH A \u00B7 80% OF CASES',t:'You send it yourself',d:'For most cases, the DIY letter is enough. Short journey, no attorney needed.',steps:[
      {time:'01:01',t:'Download PDF or send via certified mail',d:'Free DIY or $14/14\u20AC for certified postal'},
      {time:'~2 days',t:'Letter delivered to the other party',d:'Delivery receipt uploaded to your dashboard'},
    ],result:'Case resolved in 5-14 days average',resultSub:'Total cost: $0 to $14 \u00B7 No attorney involved'},
    pathB: {badge:'PATH B \u00B7 20% OF CASES',t:'Attorney Letter requested',d:'For high-stakes cases. A partner attorney is assigned, signs, and tracks the case.',steps:[
      {time:'01:05',t:'Partner attorney assigned',d:'Specialized in your legal area + jurisdiction'},
      {time:'01:17',t:'Attorney reviews, edits, signs',d:'12 min average \u00B7 full legal responsibility'},
      {time:'03:42',t:'Letter sent from law firm',d:'Certified mail, firm letterhead, tracking'},
    ],tracking:{t:'Real-time case tracking begins',d:'When the other party responds, your attorney uploads their reply. Archer re-analyzes.'},result:'Case resolved in 8-30 days average',resultSub:'Total cost: $49.99 \u00B7 Dedicated attorney follow-up'},
    sgSupra: 'SAFEGUARDS \u00B7 SECURITY \u00B7 PRIVACY',
    sgTitle: ['What could go wrong?', 'We already thought about it.'],
    sgDesc: "The real questions you're asking yourself, answered without marketing fluff. These are the safeguards built into Archer at every layer.",
    sgCards: [
      {q:'"What if the AI hallucinates a fake case citation?"',a:"Every single citation is verified live against the legal database before it reaches your dashboard. If a citation can't be verified, it's flagged and removed automatically.",stat:'Measured hallucination rate: 0.8% \u2014 vs industry ~15%'},
      {q:'"What if the attorney disagrees with the AI\'s analysis?"',a:"The attorney has full authority to edit, rewrite, or reject any part of Archer's output before signing. The final letter you receive is always the attorney's approved version.",stat:'Attorney override rate: 14% of drafts get edited before signature'},
      {q:'"Are my documents really private?"',a:'Every document you upload is encrypted at rest (AES-256) and in transit (TLS 1.3). When a partner attorney reviews your case, attorney-client privilege applies. We never sell data, never train on your cases.',stat:'SOC 2 Type II \u00B7 GDPR compliant \u00B7 HIPAA-ready'},
      {q:'"Can I delete my case data completely?"',a:'Yes. One click from your dashboard triggers a full hard-delete within 30 days (GDPR compliant). Your data is removed from all systems, backups, and vector databases.',stat:'Hard delete in 30 days \u00B7 GDPR Article 17 compliant'},
      {q:'"Who exactly can see my case data?"',a:'Only you and your assigned partner attorney. No Archer employee has access to your case content without a signed request and your explicit consent.',stat:'Zero-access policy \u00B7 access logs auditable on request'},
      {q:'"What if something goes wrong with the letter?"',a:'The signing partner attorney carries professional liability insurance. Archer itself carries a separate $2M cyber & professional liability policy. You\'re covered on both sides.',stat:'$2M liability coverage \u00B7 30-day money-back guarantee'},
    ],
    sgTrust: [{t:'SOC 2 TYPE II',s:'Audited annually'},{t:'GDPR COMPLIANT',s:'EU data protection'},{t:'99.98% UPTIME',s:'24/7 monitoring'},{t:'$2M LIABILITY',s:'Cyber + professional'}],
    rcSupra: 'REAL CASES \u00B7 REAL OUTCOMES',
    rcTitle: ['Three cases.', 'Three different paths.'],
    rcDesc: 'Names and details changed for privacy, but these are actual cases resolved through Archer. Notice how each path fits a different type of case.',
    rcCases: [
      {badge:'DIY LETTER \u00B7 PATH A',bc:'#dcfce7',btc:'#15803d',h:'Contested a \u20AC280 parking fine and won \u2014 without a lawyer',who:'Thomas L. \u00B7 Antwerp \u00B7 Traffic law',p:'Received a parking fine with the wrong license plate. Archer identified the procedural error and generated a contestation letter in 52 seconds. Thomas copy-pasted it into an email to the city.',stats:[['Path taken','Copy & email'],['Archer time','52 seconds'],['Resolution','11 days',true],['Attorney involved','None'],['Total cost','\u20AC0',true]],outcome:'Fine cancelled \u00B7 Full refund of \u20AC280'},
      {badge:'CERTIFIED MAIL \u00B7 PATH A+',bc:'#fef3c7',btc:'#b45309',h:'Recovered \u20AC15,000 severance without going to court',who:'Marc D. \u00B7 Bruxelles \u00B7 Employment law',p:'Fired with 24 hours notice after 7 years. Archer identified 4 legal angles including breach of notice period under Belgian labor law. Marc chose the certified mail option to have proof of receipt.',stats:[['Path taken','Certified mail'],['Legal angles','4 identified'],['Resolution','21 days',true],['Attorney involved','None'],['Total cost','\u20AC15',true]],outcome:'\u20AC15,000 severance paid \u00B7 No lawsuit'},
      {badge:'ATTORNEY LETTER \u00B7 PATH B',bc:'#dbeafe',btc:'#1a56db',h:'Stopped a wrongful eviction in 8 days',who:'Sarah M. \u00B7 Brooklyn, NY \u00B7 Tenant law',p:'Served with a 14-day eviction notice while 6 months pregnant. Archer recommended the Attorney Letter because the landlord was a large property management company that ignores DIY letters.',stats:[['Path taken','Attorney Letter'],['Violations found','3 procedural'],['Resolution','8 days',true],['Assigned attorney','S. Mitchell, Esq.'],['Total cost','$49.99',true]],outcome:'Eviction rescinded \u00B7 Kept her apartment',featured:true},
    ],
    rcFoot1: 'Three cases, three paths, three prices. All resolved with Archer.',
    rcFoot2: "The right path depends on the case. Archer tells you which one fits yours \u2014 you're always in control of the choice.",
    ctaBadge: 'NOW YOU KNOW HOW IT WORKS',
    ctaTitle: ["You've seen the engine.", 'Try it on your document.'],
    ctaDesc: 'No signup required for the first analysis. See the full dashboard, the legal angles, and the win probability \u2014 then decide your next action. Zero risk.',
    ctaBtn: 'Upload my document',
    ctaSub: 'Free first analysis \u00B7 No credit card \u00B7 No account required \u00B7 Results in 60 seconds',
    ctaStats: [{n:'60s',l:'Analysis'},{n:'4h',l:'Attorney letter'},{n:'$49.99',l:'Flat rate'}],
  },
  fr: {
    heroBadge: 'PLONG\u00C9E TECHNIQUE \u00B7 RIEN DE CACH\u00C9',
    heroTitle: ['Regarde sous', 'le capot.'],
    heroSub: "L'architecture compl\u00E8te d'Archer, du pipeline IA aux avocats humains. Chaque \u00E9tape document\u00E9e, chaque m\u00E9trique mesur\u00E9e, chaque garde-fou expliqu\u00E9.",
    heroStats: [{n:'8',l:'\u00C9TAPES PIPELINE'},{n:'47s',l:'LATENCE MOY.'},{n:'0.8%',l:'HALLUCINATION'},{n:'94%',l:'PR\u00C9CISION'},{n:'27',l:'AVOCATS PARTENAIRES'}],
    demoSupra: 'D\u00C9MO LIVE \u00B7 SANS COMPTE',
    demoTitle: ['Regarde Archer travailler.', 'En temps r\u00E9el.'],
    demoDesc: "Voici exactement ce qui se passe quand tu uploades un document dans Archer. Chaque \u00E9tape, chaque chiffre, chaque v\u00E9rification \u2014 en direct et non \u00E9dit\u00E9.",
    demoSidebar: ['Tableau de bord','Mes dossiers','Documents','Avocats','Coffre-fort'],
    demoBread: 'DOSSIER #4821 \u00B7 NEW YORK \u00B7 DROIT LOCATIF',
    demoH1: "Analyse d'avis d'expulsion",
    demoComplete: "ANALYSE TERMIN\u00C9E \u00B7 \u00C0 toi de jouer",
    demoWin: 'PROBABILIT\u00C9 DE VICTOIRE', demoStrong: 'FORT',
    demoMetrics: [{l:'VIOLATIONS',v:'3'},{l:'ANGLES L\u00C9GAUX',v:'7'},{l:'CITATIONS',v:'47'},{l:'D\u00C9LAI',v:'14 jours',amber:true}],
    demoRecTitle: 'Archer recommande pour ce cas',
    demoRecDesc: "Expulsion \u00E0 fort enjeu. Lettre d'avocat fortement recommand\u00E9e \u2014 le poids l\u00E9gal change significativement le taux de r\u00E9ponse du propri\u00E9taire.",
    demoChoose: 'CHOISIS TA PROCHAINE ACTION',
    demoActions: [
      {t:'T\u00E9l\u00E9charger & envoyer toi-m\u00EAme',d:'R\u00E9cup\u00E8re la lettre en PDF. Copie-colle dans ton email, imprime, ou envoie toi-m\u00EAme.',badge:'INCLUS',bc:'#dcfce7',btc:'#15803d',btn:'T\u00E9l\u00E9charger',ic:'#555'},
      {t:'Courrier recommand\u00E9 par Archer',d:'On imprime, on envoie, on suit. Accus\u00E9 de r\u00E9ception dans ton dashboard.',badge:'14\u20AC',bc:'#fef3c7',btc:'#b45309',btn:'Envoyer 14\u20AC',ic:'#555'},
      {t:'Faire signer par un avocat',d:"Un avocat partenaire r\u00E9vise, signe, et s'assigne \u00E0 ton dossier. Suivi en temps r\u00E9el.",badge:'49,99\u20AC \u00B7 4h',bc:'#dbeafe',btc:'#1a56db',btn:'Demander',ic:'#1a56db',rec:true},
      {t:'Parler \u00E0 un avocat en direct',d:"Appel vid\u00E9o de 30 min avec un avocat partenaire d\u00E9j\u00E0 brief\u00E9. Disponible en 15 min.",badge:'149\u20AC \u00B7 30 min',bc:'#f3e8ff',btc:'#7c3aed',btn:'R\u00E9server',ic:'#7c3aed'},
    ],
    demoDisclaimer: "Pas s\u00FBr ? Commence par le t\u00E9l\u00E9chargement gratuit. Si \u00E7a marche pas, upgrade plus tard. Tu n'es jamais bloqu\u00E9.",
    demoFooter: ['Tout ce flux tourne en moins de ', '60 secondes', ' sur de vrais documents'],
    archSupra: 'SOUS LE CAPOT \u00B7 PLONG\u00C9E TECHNIQUE',
    archTitle: ["Ce n'est pas un", 'wrapper GPT.'],
    archDesc: "Archer fait tourner un pipeline custom \u00E0 8 \u00E9tapes : parsing de document, retrieval, 5 passes de raisonnement, v\u00E9rification de citations en temps r\u00E9el, et validation avocat. Entra\u00EEn\u00E9 sur 847K documents juridiques, ancr\u00E9 dans 2,4M jurisprudences, benchmark\u00E9 par 12 avocats inscrits au barreau.",
    archSteps: [
      {n:'01',t:'Document parser (OCR + layout analysis)',d:'input: PDF/DOCX/IMG \u2192 output: structured text + entities',r:'PROPRIETARY OCR',m:'~0.3s \u00B7 99.4% acc'},
      {n:'02',t:'Legal entity recognition (NER)',d:'parties \u00B7 dates \u00B7 statutes \u00B7 monetary values \u00B7 jurisdictions',r:'ARCHER-NER v2',m:'~0.9s \u00B7 F1: 0.94'},
      {n:'03',t:'Jurisdiction detection',d:'US federal + 50 states \u00B7 Belgium civil law \u00B7 multi-lang routing',r:'RULE-BASED + ML',m:'~0.1s \u00B7 99.8% acc'},
      {n:'04',t:'RAG retrieval against 2.4M case laws',d:'1536-dim embeddings \u00B7 top-50 semantic + BM25 hybrid search',r:'ARCHER VECTOR DB',m:'~8.7s \u00B7 recall@50: 0.97',blue:true},
      {n:'05',t:'5-pass reasoning engine',d:null,r:'ARCHER REASONING CORE',m:'~34.2s \u00B7 CoT verified',core:true},
      {n:'06',t:'Live citation verification',d:'every citation checked against live legal databases \u00B7 zero hallucinations',r:'LEGAL DB INTEGRATION',m:'~2.8s \u00B7 0.8% halluc'},
      {n:'07',t:'Output synthesis & format rendering',d:'structured JSON \u2192 dashboard UI \u00B7 letter template \u00B7 risk report',r:'CUSTOM RENDERER',m:'~0.2s'},
      {n:'08',t:'Attorney validation layer',d:"uniquement pour les Lettres d'Avocat \u00B7 l'avocat partenaire r\u00E9vise, \u00E9dite, signe",r:'27 AVOCATS PARTENAIRES',m:'~12 min avg',human:true},
    ],
    archCards: [
      {t:'Le moteur de raisonnement',d1:"Archer tourne sur <b>Archer Reasoning Engine</b>, une stack IA juridique custom d\u00E9velopp\u00E9e en interne. Con\u00E7ue pour le travail juridique.",d2:'Entra\u00EEn\u00E9 sur <b>847 000 documents juridiques</b> couvrant le droit US et le droit civil belge.',specs:['stack: ','archer reasoning engine v3.2','training corpus: ','847K legal docs','context window: ','200K tokens']},
      {t:'La base de connaissance',d1:"Archer interroge <b>2,4 millions de jurisprudences en temps r\u00E9el</b>. Chaque citation est v\u00E9rifi\u00E9e contre la source live.",d2:'La base est <b>actualis\u00E9e quotidiennement</b>. Nouvelles d\u00E9cisions index\u00E9es sous 24h.',specs:['vectors: ','2,412,847 cases \u00B7 1536-dim','index: ','hybrid (semantic + BM25)','refresh: ','daily \u00B7 03:00 UTC']},
    ],
    humanSupra: 'LA COUCHE HUMAINE',
    humanTitle: ['De vrais avocats.', 'Seulement quand tu en as besoin.'],
    humanDesc: "Archer est AI-first. La plupart des cas sont r\u00E9solus enti\u00E8rement avec l'analyse IA et des lettres que tu envoies toi-m\u00EAme. Les avocats partenaires n'interviennent que quand tu demandes explicitement une Lettre d'Avocat ou un Appel Live.",
    humanClar: 'CLARIFICATION IMPORTANTE',
    humanClarH: ["Les avocats n'interviennent pas sur chaque cas.", 'Ils viennent quand \u00E7a compte vraiment.'],
    humanClarP: 'Id\u00E9e re\u00E7ue courante : <b>"Si Archer a de vrais avocats, chaque output doit \u00EAtre r\u00E9vis\u00E9 par l\'un d\'eux."</b> Ce n\'est pas comme \u00E7a que \u00E7a marche.',
    humanSplit: [
      {pct:'80% DES CAS',t:'Aucun avocat n\u00E9cessaire',d:"Contraventions, petits litiges conso, augmentations de loyer. L'analyse d'Archer + une lettre DIY suffit.",bg:'#ecfdf5',bc:'#15803d'},
      {pct:'20% DES CAS',t:'Avocat recommand\u00E9',d:"Expulsions, licenciements abusifs, refus d'assurance, litiges contractuels s\u00E9rieux.",bg:'#eff6ff',bc:'#1a56db'},
    ],
    humanTeamSupra: "L'\u00C9QUIPE",
    humanTeamH: 'Les avocats qui signent tes documents.',
    humanMore: '+23 autres avocats partenaires dans NY, CA, TX, FL, IL + Bruxelles, Anvers, Li\u00E8ge',
    tlSupra: 'MINUTE PAR MINUTE',
    tlTitle: ["De l'upload \u00E0 la r\u00E9solution.", 'Deux parcours possibles.'],
    tlDesc: "La timeline d\u00E9pend de ton choix. La plupart des cas finissent en Parcours A (tu envoies toi-m\u00EAme). Les cas \u00E0 fort enjeu continuent en Parcours B (intervention avocat).",
    tlSteps: [
      {time:'00:00',t:'Tu uploades le document',d:'Glisser-d\u00E9poser. Tout document juridique fonctionne.'},
      {time:'00:47',t:'Analyse compl\u00E8te + lettre DIY pr\u00EAte',d:'Score de risque, angles juridiques, brouillon de lettre, d\u00E9lais. Tout dans ton dashboard.'},
      {time:'01:00',t:'Tu r\u00E9vises et tu d\u00E9cides la suite',d:"Archer donne sa recommandation. D'ici, la timeline se divise en deux parcours.",black:true,label:'\u00C0 TOI'},
    ],
    pathA: {badge:'PARCOURS A \u00B7 80% DES CAS',t:'Tu envoies toi-m\u00EAme',d:'Pour la plupart des cas, la lettre DIY suffit. Parcours court, pas d\'avocat n\u00E9cessaire.',steps:[
      {time:'01:01',t:'T\u00E9l\u00E9charge le PDF ou envoie en recommand\u00E9',d:'Gratuit DIY ou 14\u20AC pour recommand\u00E9'},
      {time:'~2 days',t:"Lettre livr\u00E9e \u00E0 l'autre partie",d:'Accus\u00E9 de r\u00E9ception upload\u00E9 dans ton dashboard'},
    ],result:'Dossier r\u00E9solu en 5-14 jours en moyenne',resultSub:'Co\u00FBt total : 0\u20AC \u00E0 14\u20AC \u00B7 Aucun avocat impliqu\u00E9'},
    pathB: {badge:'PARCOURS B \u00B7 20% DES CAS',t:"Lettre d'Avocat demand\u00E9e",d:"Pour les cas \u00E0 fort enjeu. Un avocat partenaire est assign\u00E9, signe, et suit le dossier.",steps:[
      {time:'01:05',t:'Avocat partenaire assign\u00E9',d:'Sp\u00E9cialis\u00E9 dans ton domaine + juridiction'},
      {time:'01:17',t:"L'avocat r\u00E9vise, \u00E9dite, signe",d:'12 min en moyenne \u00B7 responsabilit\u00E9 l\u00E9gale compl\u00E8te'},
      {time:'03:42',t:'Lettre envoy\u00E9e depuis le cabinet',d:'Recommand\u00E9, en-t\u00EAte du cabinet, tracking'},
    ],tracking:{t:'Le suivi en temps r\u00E9el commence',d:"Quand l'autre partie r\u00E9pond, ton avocat uploade sa r\u00E9ponse. Archer r\u00E9-analyse."},result:'Dossier r\u00E9solu en 8-30 jours en moyenne',resultSub:'Co\u00FBt total : 49,99\u20AC \u00B7 Suivi avocat d\u00E9di\u00E9'},
    sgSupra: 'GARDE-FOUS \u00B7 S\u00C9CURIT\u00C9 \u00B7 CONFIDENTIALIT\u00C9',
    sgTitle: ['Qu\'est-ce qui pourrait mal tourner ?', 'On y a d\u00E9j\u00E0 pens\u00E9.'],
    sgDesc: "Les vraies questions que tu te poses, avec des r\u00E9ponses sans blabla marketing.",
    sgCards: [
      {q:'"Et si l\'IA hallucine une fausse citation ?"',a:"Chaque citation est v\u00E9rifi\u00E9e en live contre la base juridique avant d'arriver dans ton dashboard.",stat:'Taux d\'hallucination mesur\u00E9 : 0,8% \u2014 vs industrie ~15%'},
      {q:'"Et si l\'avocat n\'est pas d\'accord avec l\'analyse IA ?"',a:"L'avocat a pleine autorit\u00E9 pour \u00E9diter, r\u00E9\u00E9crire, ou rejeter n'importe quelle partie de l'output d'Archer avant signature.",stat:"Taux d'override avocat : 14% des brouillons sont \u00E9dit\u00E9s avant signature"},
      {q:'"Mes documents sont-ils vraiment priv\u00E9s ?"',a:"Chaque document upload\u00E9 est chiffr\u00E9 au repos (AES-256) et en transit (TLS 1.3). Le secret professionnel s'applique.",stat:'SOC 2 Type II \u00B7 Conforme RGPD \u00B7 HIPAA-ready'},
      {q:'"Puis-je supprimer mes donn\u00E9es compl\u00E8tement ?"',a:'Oui. Un clic depuis ton dashboard d\u00E9clenche une suppression compl\u00E8te sous 30 jours (conforme RGPD).',stat:'Suppression compl\u00E8te en 30 jours \u00B7 Conforme RGPD Article 17'},
      {q:'"Qui peut voir mes donn\u00E9es exactement ?"',a:"Seulement toi et ton avocat partenaire assign\u00E9. Aucun employ\u00E9 d'Archer n'a acc\u00E8s sans ton consentement.",stat:'Politique z\u00E9ro acc\u00E8s \u00B7 logs auditables sur demande'},
      {q:'"Et si quelque chose tourne mal avec la lettre ?"',a:"L'avocat signataire est couvert par son assurance responsabilit\u00E9 professionnelle. Archer porte une police s\u00E9par\u00E9e de 2M\u20AC.",stat:'Couverture 2M\u20AC \u00B7 Garantie satisfait-rembours\u00E9 30 jours'},
    ],
    sgTrust: [{t:'SOC 2 TYPE II',s:'Audit\u00E9 annuellement'},{t:'CONFORME RGPD',s:'Protection donn\u00E9es UE'},{t:'99,98% UPTIME',s:'Monitoring 24/7'},{t:'2M\u20AC RESPONSABILIT\u00C9',s:'Cyber + professionnelle'}],
    rcSupra: 'CAS R\u00C9ELS \u00B7 R\u00C9SULTATS R\u00C9ELS',
    rcTitle: ['Trois dossiers.', 'Trois parcours diff\u00E9rents.'],
    rcDesc: "Noms et d\u00E9tails modifi\u00E9s pour la confidentialit\u00E9, mais ce sont de vrais dossiers r\u00E9solus avec Archer.",
    rcCases: [
      {badge:'LETTRE DIY \u00B7 PARCOURS A',bc:'#dcfce7',btc:'#15803d',h:"Contest\u00E9 une amende de 280\u20AC et gagn\u00E9 \u2014 sans avocat",who:'Thomas L. \u00B7 Anvers \u00B7 Droit routier',p:"A re\u00E7u une amende avec la mauvaise plaque. Archer a identifi\u00E9 l'erreur et g\u00E9n\u00E9r\u00E9 une lettre en 52 secondes.",stats:[['Parcours suivi','Copie & email'],['Temps Archer','52 secondes'],['R\u00E9solution','11 jours',true],['Avocat impliqu\u00E9','Aucun'],['Co\u00FBt total','0\u20AC',true]],outcome:'Amende annul\u00E9e \u00B7 Remboursement int\u00E9gral de 280\u20AC'},
      {badge:'RECOMMAND\u00C9 \u00B7 PARCOURS A+',bc:'#fef3c7',btc:'#b45309',h:"R\u00E9cup\u00E9r\u00E9 15 000\u20AC de pr\u00E9avis sans tribunal",who:'Marc D. \u00B7 Bruxelles \u00B7 Droit du travail',p:"Licenci\u00E9 avec 24h de pr\u00E9avis apr\u00E8s 7 ans. Archer a identifi\u00E9 4 angles juridiques.",stats:[['Parcours suivi','Recommand\u00E9'],['Angles juridiques','4 identifi\u00E9s'],['R\u00E9solution','21 jours',true],['Avocat impliqu\u00E9','Aucun'],['Co\u00FBt total','15\u20AC',true]],outcome:'15 000\u20AC de pr\u00E9avis pay\u00E9 \u00B7 Aucun proc\u00E8s'},
      {badge:"LETTRE D'AVOCAT \u00B7 PARCOURS B",bc:'#dbeafe',btc:'#1a56db',h:'Stopp\u00E9 une expulsion abusive en 8 jours',who:'Sarah M. \u00B7 Brooklyn, NY \u00B7 Droit locatif',p:"Re\u00E7u un avis d'expulsion de 14 jours enceinte de 6 mois. Archer a recommand\u00E9 la Lettre d'Avocat.",stats:[['Parcours suivi',"Lettre d'Avocat"],['Violations trouv\u00E9es','3 proc\u00E9durales'],['R\u00E9solution','8 jours',true],['Avocat assign\u00E9','S. Mitchell, Esq.'],['Co\u00FBt total','49,99\u20AC',true]],outcome:'Expulsion annul\u00E9e \u00B7 A gard\u00E9 son appartement',featured:true},
    ],
    rcFoot1: 'Trois dossiers, trois parcours, trois prix. Tous r\u00E9solus avec Archer.',
    rcFoot2: "Le bon parcours d\u00E9pend du cas. Archer te dit lequel correspond au tien \u2014 tu contr\u00F4les toujours le choix.",
    ctaBadge: 'MAINTENANT TU SAIS COMMENT \u00C7A MARCHE',
    ctaTitle: ['Tu as vu le moteur.', 'Essaie-le sur ton document.'],
    ctaDesc: "Aucune inscription pour la premi\u00E8re analyse. Vois le dashboard complet, les angles juridiques, la probabilit\u00E9 de victoire \u2014 puis d\u00E9cide la suite. Z\u00E9ro risque.",
    ctaBtn: 'Uploader mon document',
    ctaSub: 'Premi\u00E8re analyse gratuite \u00B7 Sans carte bancaire \u00B7 Sans compte \u00B7 R\u00E9sultats en 60 secondes',
    ctaStats: [{n:'60s',l:'Analyse'},{n:'4h',l:"Lettre d'avocat"},{n:'49,99\u20AC',l:'Prix fixe'}],
  },
};

const attorneys = [
  {name:'Sarah Mitchell, Esq.',bar:'Bar #A4-12834 NY',spec:'Tenant law \u00B7 Housing disputes',specFr:'Droit locatif \u00B7 Litiges logement',yrs:'14',cases:'2,847',bg:'#fde4cf'},
  {name:'David Chen, Esq.',bar:'Bar #C8-47291 CA',spec:'Employment law \u00B7 Wrongful termination',specFr:'Droit du travail \u00B7 Licenciements abusifs',yrs:'17',cases:'3,412',bg:'#e0e7ff'},
  {name:'Marie Dubois, Esq.',bar:'Barreau Bruxelles #B-8429',spec:'Droit civil \u00B7 Litiges conso \u00B7 Assurances',specFr:'Droit civil \u00B7 Litiges conso \u00B7 Assurances',yrs:'11',cases:'1,823',bg:'#f3e8ff'},
  {name:'Archer Rodriguez, Esq.',bar:'Bar #T3-28491 TX',spec:'Insurance law \u00B7 Bad faith claims',specFr:'Droit assurance \u00B7 Mauvaise foi',yrs:'19',cases:'4,156',bg:'#fef3c7'},
];

const CSS = `
.hiw{font-family:-apple-system,BlinkMacSystemFont,"Inter",system-ui,sans-serif;color:#0a0a0f}
.hiw .sw{width:100%;padding:100px 40px}.hiw .sw.gray{background:#f4f4f1;border-top:.5px solid #e2e0db}.hiw .sw.white{background:#fff;border-top:.5px solid #e2e0db}.hiw .sw.blue{background:#1a56db;padding:120px 40px}
.hiw .si{max-width:1200px;margin:0 auto}
.hiw .supra{font-size:11px;font-weight:600;letter-spacing:2px;color:#1a56db;text-transform:uppercase;margin-bottom:16px}
.hiw .stitle{font-size:56px;font-weight:500;letter-spacing:-2px;line-height:1.05;color:#0a0a0f;margin:0 0 16px}.hiw .stitle .ac{color:#1a56db;font-weight:800}
.hiw .sdesc{font-size:19px;color:#555;max-width:720px;margin:0 auto;line-height:1.6}
.hiw .hero-w{background:#fff;padding:120px 40px 90px;text-align:center;padding-top:170px}
.hiw .hero-badge{display:inline-flex;align-items:center;gap:10px;background:#0a0a0f;padding:10px 20px;border-radius:30px;margin-bottom:32px}
.hiw .hero-badge span{font-size:11px;color:#16a34a;font-weight:700;letter-spacing:1.5px;font-family:${F}}
.hiw .pulse-d{width:6px;height:6px;border-radius:50%;background:#16a34a;animation:pl 1.8s ease-in-out infinite;flex-shrink:0}
@keyframes pl{0%{box-shadow:0 0 0 0 rgba(22,163,74,.7)}70%{box-shadow:0 0 0 8px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}
.hiw .hero-t{font-size:96px;font-weight:500;letter-spacing:-4px;line-height:.95;margin:0 0 20px}.hiw .hero-t .ac{color:#1a56db;font-weight:800}
.hiw .hero-sub{font-size:22px;color:#555;max-width:720px;margin:0 auto 40px;line-height:1.5}
.hiw .hero-stats{display:inline-flex;align-items:center;gap:20px;background:#f4f4f1;border:.5px solid #e2e0db;border-radius:40px;padding:14px 28px;flex-wrap:wrap;justify-content:center}
.hiw .hs-d{width:1px;height:28px;background:#d1d5db}
.hiw .hs-n{font-size:20px;font-weight:800;color:#0a0a0f}.hiw .hs-l{font-size:10px;color:#9ca3af;letter-spacing:.3px}
.hiw .demo-frame{background:#fff;border:.5px solid #e2e0db;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(10,10,15,.08);margin-top:48px}
.hiw .demo-hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#fff;border-bottom:.5px solid #e2e0db}
.hiw .demo-body{display:grid;grid-template-columns:220px 1fr;min-height:600px}
.hiw .demo-sb{padding:18px 12px;background:#fafaf8;border-right:.5px solid #e2e0db}
.hiw .demo-main{padding:24px;background:#fafaf8}
.hiw .arch-d{background:#0a0a0f;border-radius:20px;padding:32px;margin-top:48px;position:relative;overflow:hidden}
.hiw .arch-step{display:grid;grid-template-columns:56px 1fr 180px;gap:16px;align-items:center;background:#111118;border:.5px solid #222228;border-radius:10px;padding:12px 18px;margin-bottom:2px}
.hiw .arch-step.core{background:#0f1530;border:1px solid #1a56db;align-items:flex-start}
.hiw .arch-step.human{background:#0d2318;border:1px solid #16a34a}
.hiw .arch-step-n{font-size:18px;font-weight:800;color:#333;font-family:${F}}
.hiw .sg-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin:64px 0 48px}
.hiw .sg-card{background:#fff;border:.5px solid #e2e0db;border-radius:16px;padding:28px;border-left:4px solid #b91c1c}
.hiw .sg-q{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
.hiw .sg-qi{width:28px;height:28px;border-radius:50%;background:#fee2e2;color:#b91c1c;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0}
.hiw .rc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:64px}
.hiw .rc-card{background:#fff;border:.5px solid #e2e0db;border-radius:20px;padding:28px;display:flex;flex-direction:column}
.hiw .rc-card.feat{border:2px solid #1a56db}
@media(max-width:1100px){.hiw .hero-t{font-size:64px;letter-spacing:-2px}.hiw .stitle{font-size:44px}.hiw .demo-body{grid-template-columns:1fr}.hiw .demo-sb{display:none}.hiw .arch-step{grid-template-columns:40px 1fr}.hiw .sg-grid,.hiw .rc-grid{grid-template-columns:1fr}}
@media(max-width:640px){.hiw .sw{padding:60px 20px}.hiw .hero-w{padding:80px 20px 60px}.hiw .hero-t{font-size:40px}.hiw .stitle{font-size:32px}.hiw .hero-stats{gap:14px;padding:14px 18px}.hiw .hs-d{display:none}.hiw .sw.blue{padding:60px 20px}}
`;

export default function HowItWorks() {
  const { lang } = useParams();
  const isFr = lang === 'fr';
  const t = isFr ? T.fr : T.en;
  const navigate = useNavigate();

  return (
    <div className="hiw">
      <PageHead metadata={PAGE_METADATA.howItWorks} />
      <style>{CSS}</style>
      <PublicHeader />

      {/* 1. HERO */}
      <div className="hero-w">
        <div className="hero-badge"><span className="pulse-d" /><span>{t.heroBadge}</span></div>
        <h1 className="hero-t">{t.heroTitle[0]}<br /><span className="ac">{t.heroTitle[1]}</span></h1>
        <p className="hero-sub">{t.heroSub}</p>
        <div className="hero-stats">
          {t.heroStats.map((s,i) => <React.Fragment key={i}>{i>0&&<div className="hs-d"/>}<div><div className="hs-n">{s.n}</div><div className="hs-l">{s.l}</div></div></React.Fragment>)}
        </div>
      </div>

      {/* 2. LIVE DEMO DASHBOARD */}
      <div className="sw gray">
        <div className="si" style={{textAlign:'center'}}>
          <div className="supra">{t.demoSupra}</div>
          <h2 className="stitle">{t.demoTitle[0]}<br /><span className="ac">{t.demoTitle[1]}</span></h2>
          <p className="sdesc">{t.demoDesc}</p>
          <div className="demo-frame">
            <div className="demo-hdr">
              <div style={{display:'flex',alignItems:'center',gap:14}}><span style={{fontSize:20,fontWeight:800,color:'#1a56db',letterSpacing:-.8}}>Archer</span><div style={{width:1,height:18,background:'#e2e0db'}}/><span style={{fontSize:12,color:'#9ca3af'}}>Cases</span><span style={{fontSize:12,fontWeight:600,color:'#0a0a0f',marginLeft:4}}> Case #4821</span></div>
              <div style={{display:'flex',alignItems:'center',gap:12}}><div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:'#ecfdf5',borderRadius:20}}><span className="pulse-d"/><span style={{fontSize:10,fontWeight:700,color:'#16a34a',letterSpacing:.3}}>CONNECTED</span></div><div style={{width:30,height:30,borderRadius:'50%',background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#1a56db'}}>JD</div></div>
            </div>
            <div className="demo-body">
              <div className="demo-sb">
                <div style={{fontSize:9,color:'#9ca3af',letterSpacing:1.5,fontWeight:600,padding:'0 12px',marginBottom:8}}>MAIN</div>
                {t.demoSidebar.map((item,i) => <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,fontSize:13,color:i===1?'#1a56db':'#555',background:i===1?'#eff6ff':'transparent',fontWeight:i===1?700:400,marginBottom:2}}>{item}{i===1&&<span style={{marginLeft:'auto',background:'#1a56db',color:'#fff',padding:'1px 7px',borderRadius:10,fontSize:9,fontWeight:700}}>1</span>}</div>)}
              </div>
              <div className="demo-main" style={{textAlign:'left'}}>
                <div style={{marginBottom:24}}><div style={{fontSize:11,color:'#9ca3af',letterSpacing:1,fontWeight:600,marginBottom:6}}>{t.demoBread}</div><h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-.8}}>{t.demoH1}</h2></div>
                {/* Analysis Card */}
                <div style={{background:'#fff',border:'.5px solid #e2e0db',borderRadius:14,padding:22,marginBottom:16}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}><div style={{display:'flex',alignItems:'center',gap:10}}><ChkSvg s={16}/><span style={{fontSize:14,fontWeight:800,color:'#15803d'}}>{t.demoComplete}</span></div><span style={{fontSize:11,color:'#9ca3af',fontFamily:F}}>47.2s total</span></div>
                  <div style={{display:'grid',gridTemplateColumns:'180px 1fr',gap:20,marginBottom:20}}>
                    <div style={{textAlign:'center',padding:14,background:'#f4f4f1',borderRadius:12}}>
                      <div style={{fontSize:9,color:'#9ca3af',letterSpacing:1,fontWeight:700,marginBottom:10}}>{t.demoWin}</div>
                      <div style={{position:'relative',width:110,height:110,margin:'0 auto'}}><svg width="110" height="110" viewBox="0 0 120 120" style={{transform:'rotate(-90deg)'}}><circle cx="60" cy="60" r="50" stroke="#e2e0db" strokeWidth="10" fill="none"/><circle cx="60" cy="60" r="50" stroke="#15803d" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray="314" strokeDashoffset="19"/></svg><div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}><div style={{fontSize:28,fontWeight:800,color:'#15803d',lineHeight:1,letterSpacing:-1.2}}>94%</div><div style={{fontSize:8,color:'#9ca3af',marginTop:2}}>{t.demoStrong}</div></div></div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,alignContent:'center'}}>
                      {t.demoMetrics.map((m,i) => <div key={i} style={{padding:14,background:m.amber?'#fef3c7':'#f4f4f1',borderRadius:10}}><div style={{fontSize:9,color:m.amber?'#b45309':'#9ca3af',letterSpacing:.5,fontWeight:700,marginBottom:4}}>{m.l}</div><div style={{fontSize:m.amber?14:24,fontWeight:800,color:m.amber?'#b45309':'#0a0a0f',letterSpacing:-.8}}>{m.v}</div></div>)}
                    </div>
                  </div>
                  <div style={{padding:'14px 18px',background:'#fef3c7',borderRadius:10,borderLeft:'3px solid #eab308',display:'flex',alignItems:'flex-start',gap:10}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" style={{flexShrink:0,marginTop:1}}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><div><div style={{fontSize:12,fontWeight:800,color:'#b45309',marginBottom:3}}>{t.demoRecTitle}</div><div style={{fontSize:12,color:'#78350f',lineHeight:1.5}}>{t.demoRecDesc}</div></div></div>
                </div>
                {/* Actions Card */}
                <div style={{background:'#fff',border:'.5px solid #e2e0db',borderRadius:14,padding:22}}>
                  <div style={{fontSize:10,color:'#9ca3af',letterSpacing:1.2,fontWeight:700,marginBottom:14}}>{t.demoChoose}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {t.demoActions.map((a,i) => <div key={i} style={{display:'grid',gridTemplateColumns:'52px 1fr auto',alignItems:'center',gap:16,padding:a.rec?'16px 18px':'14px 16px',background:a.rec?'#eff6ff':'#f4f4f1',borderRadius:12,border:a.rec?'2px solid #1a56db':'none',position:'relative'}}>{a.rec&&<div style={{position:'absolute',top:-10,left:18,background:'#1a56db',color:'#fff',padding:'3px 10px',borderRadius:10,fontSize:9,fontWeight:800,letterSpacing:.4}}>{'\u2605'} {isFr?'RECOMMAND\u00C9':'RECOMMENDED'}</div>}<div style={{width:40,height:40,borderRadius:10,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a.ic} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg></div><div><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}><span style={{fontSize:13,fontWeight:800,color:'#0a0a0f'}}>{a.t}</span><span style={{fontSize:9,fontWeight:700,color:a.btc,background:a.bc,padding:'2px 7px',borderRadius:8}}>{a.badge}</span></div><div style={{fontSize:11,color:a.rec?'#0c3a7a':'#555',lineHeight:1.5}}>{a.d}</div></div><button style={{padding:'10px 18px',fontSize:12,fontWeight:a.rec?800:700,borderRadius:10,background:a.rec?'#1a56db':'#fff',color:a.rec?'#fff':'#0a0a0f',border:a.rec?'none':'.5px solid #d1d5db',cursor:'pointer',whiteSpace:'nowrap'}}>{a.btn}</button></div>)}
                  </div>
                  <div style={{padding:'14px 16px',background:'#fafaf8',borderRadius:10,marginTop:18,display:'flex',alignItems:'flex-start',gap:10,border:'.5px solid #e2e0db'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{flexShrink:0,marginTop:2}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><div style={{fontSize:11,color:'#555',lineHeight:1.5}}>{t.demoDisclaimer}</div></div>
                </div>
              </div>
            </div>
          </div>
          <div style={{textAlign:'center',marginTop:32}}><div style={{display:'inline-flex',alignItems:'center',gap:10,background:'#fff',padding:'12px 22px',borderRadius:30,border:'.5px solid #e2e0db'}}><span style={{fontSize:12,color:'#555'}}>{t.demoFooter[0]}<strong style={{color:'#1a56db'}}>{t.demoFooter[1]}</strong>{t.demoFooter[2]}</span></div></div>
        </div>
      </div>

      {/* 3. ARCHITECTURE */}
      <div className="sw white">
        <div className="si" style={{textAlign:'center'}}>
          <div className="supra">{t.archSupra}</div>
          <h2 className="stitle">{t.archTitle[0]}<br /><span className="ac">{t.archTitle[1]}</span></h2>
          <p className="sdesc">{t.archDesc}</p>
          <div className="arch-d">
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(26,86,219,.4),transparent)'}}/>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:32}}><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:8,height:8,borderRadius:'50%',background:'#16a34a',boxShadow:'0 0 8px rgba(22,163,74,.6)'}}/><span style={{fontSize:11,color:'#16a34a',fontWeight:700,letterSpacing:1.5,fontFamily:F}}>ARCHER REASONING ENGINE · v3.2.1 · LIVE</span></div><div style={{display:'flex',gap:16,fontSize:10,color:'#666',fontFamily:F}}><span>P50: 47s</span><span>P99: 88s</span><span>Uptime: 99.98%</span></div></div>
            <div style={{display:'flex',flexDirection:'column',gap:2}}>
              {t.archSteps.map((s,i) => <div key={i} className={`arch-step${s.core?' core':''}${s.human?' human':''}`} style={s.blue?{border:'1px solid #1a56db'}:undefined}>
                <div className="arch-step-n">{s.n}</div>
                <div style={{textAlign:'left'}}>
                  <div style={{fontSize:14,color:'#fff',fontWeight:700,marginBottom:s.core?10:4}}>{s.t}{s.core&&<span style={{fontSize:10,color:'#1a56db',background:'rgba(26,86,219,.15)',padding:'2px 8px',borderRadius:10,fontWeight:700,letterSpacing:.3,marginLeft:4}}>CORE</span>}{s.human&&<span style={{fontSize:10,color:'#16a34a',background:'rgba(22,163,74,.15)',padding:'2px 8px',borderRadius:10,fontWeight:700,letterSpacing:.3,marginLeft:4}}>HUMAN · ON REQUEST</span>}</div>
                  {s.core ? <div style={{display:'flex',flexDirection:'column',gap:3,fontFamily:F,fontSize:10,color:'#888',lineHeight:1.5}}><div>{'\u251C\u2500'} claim identification + jurisprudence matching <span style={{color:'#666'}}>// pass 1-2</span></div><div>{'\u251C\u2500'} bayesian win scoring + strategy ranking <span style={{color:'#666'}}>// pass 3-4</span></div><div>{'\u2514\u2500'} consistency validation <span style={{color:'#666'}}>// pass 5 · logical coherence</span></div></div> : <div style={{fontSize:11,color:'#888',fontFamily:F}}>{s.d}</div>}
                </div>
                <div style={{textAlign:'right'}}><div style={{fontSize:10,color:'#666',fontFamily:F,marginBottom:3}}>{s.r}</div><div style={{fontSize:11,color:'#16a34a',fontWeight:700,fontFamily:F}}>{s.m}</div></div>
              </div>)}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginTop:36,textAlign:'left'}}>
            {t.archCards.map((c,i) => <div key={i} style={{background:'#f4f4f1',borderRadius:16,padding:26}}><div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg><h3 style={{fontSize:18,fontWeight:800,margin:0}}>{c.t}</h3></div><p style={{fontSize:13,color:'#555',lineHeight:1.6,margin:'0 0 12px'}} dangerouslySetInnerHTML={{__html:c.d1}}/><p style={{fontSize:13,color:'#555',lineHeight:1.6,margin:'0 0 16px'}} dangerouslySetInnerHTML={{__html:c.d2}}/><div style={{paddingTop:16,borderTop:'.5px solid #d1d5db',fontFamily:F,fontSize:11,color:'#555'}}>{[0,1,2].map(j=><div key={j}>{c.specs[j*2]}<span style={{color:'#1a56db',fontWeight:700}}>{c.specs[j*2+1]}</span></div>)}</div></div>)}
          </div>
        </div>
      </div>

      {/* 4. HUMAN LAYER */}
      <div className="sw gray">
        <div className="si" style={{textAlign:'center'}}>
          <div className="supra" style={{color:'#15803d'}}>{t.humanSupra}</div>
          <h2 className="stitle">{t.humanTitle[0]}<br /><span className="ac">{t.humanTitle[1]}</span></h2>
          <p className="sdesc">{t.humanDesc}</p>
          <div style={{background:'#fff',border:'.5px solid #e2e0db',borderRadius:16,padding:'40px 48px',marginTop:64,marginBottom:20,textAlign:'left'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><span style={{fontSize:11,fontWeight:800,color:'#b45309',letterSpacing:.5}}>{t.humanClar}</span></div>
            <h3 style={{fontSize:28,fontWeight:800,margin:'0 0 18px',letterSpacing:-.8,lineHeight:1.15}}>{t.humanClarH[0]}<br />{t.humanClarH[1]}</h3>
            <p style={{fontSize:15,color:'#555',lineHeight:1.6,margin:'0 0 24px',maxWidth:800}} dangerouslySetInnerHTML={{__html:t.humanClarP}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {t.humanSplit.map((s,i) => <div key={i} style={{padding:'20px 22px',background:s.bg,borderRadius:12,borderLeft:`3px solid ${s.bc}`}}><div style={{fontSize:10,fontWeight:800,color:s.bc,letterSpacing:.5,marginBottom:10}}>{s.pct}</div><div style={{fontSize:15,fontWeight:800,marginBottom:8,letterSpacing:-.3}}>{s.t}</div><div style={{fontSize:12,color:'#555',lineHeight:1.55}}>{s.d}</div></div>)}
            </div>
          </div>
          <div style={{marginTop:56}}><div style={{fontSize:11,letterSpacing:2,color:'#1a56db',fontWeight:600,marginBottom:12}}>{t.humanTeamSupra}</div><h3 style={{fontSize:32,fontWeight:800,margin:'0 0 48px',letterSpacing:-1}}>{t.humanTeamH}</h3></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:32,textAlign:'left'}}>
            {attorneys.map((a,i) => <div key={i} style={{background:'#fff',border:'.5px solid #e2e0db',borderRadius:16,padding:24}}><div style={{display:'flex',alignItems:'center',gap:14,marginBottom:18}}><div style={{width:56,height:56,borderRadius:'50%',background:a.bg,flexShrink:0}}/><div><div style={{fontSize:14,fontWeight:800,marginBottom:2}}>{a.name}</div><div style={{fontSize:10,color:'#9ca3af',fontFamily:F}}>{a.bar}</div></div></div><div style={{fontSize:10,color:'#9ca3af',letterSpacing:.8,fontWeight:600,marginBottom:6}}>{isFr?'SP\u00C9CIALIT\u00C9':'SPECIALTY'}</div><div style={{fontSize:12,fontWeight:600,lineHeight:1.4,marginBottom:14}}>{isFr?a.specFr:a.spec}</div><div style={{display:'flex',flexDirection:'column',gap:6,paddingTop:14,borderTop:'.5px solid #e2e0db'}}><div style={{display:'flex',justifyContent:'space-between',fontSize:11}}><span style={{color:'#9ca3af'}}>{isFr?'Exp\u00E9rience':'Experience'}</span><span style={{fontWeight:700}}>{a.yrs} {isFr?'ans':'years'}</span></div><div style={{display:'flex',justifyContent:'space-between',fontSize:11}}><span style={{color:'#9ca3af'}}>{isFr?'Dossiers trait\u00E9s':'Cases handled'}</span><span style={{fontWeight:700}}>{a.cases}</span></div></div></div>)}
          </div>
          <div style={{display:'inline-flex',alignItems:'center',gap:10,background:'#fff',padding:'14px 24px',borderRadius:30,border:'.5px solid #e2e0db'}}><span style={{fontSize:13,color:'#555'}}><strong>{t.humanMore.split(' across')[0]}</strong> across {t.humanMore.split(' across')[1]}</span></div>
        </div>
      </div>

      {/* 5. TIMELINE */}
      <div className="sw white">
        <div className="si" style={{textAlign:'center'}}>
          <div className="supra">{t.tlSupra}</div>
          <h2 className="stitle">{t.tlTitle[0]}<br /><span className="ac">{t.tlTitle[1]}</span></h2>
          <p className="sdesc">{t.tlDesc}</p>
          <div style={{maxWidth:1100,margin:'40px auto 0',textAlign:'left'}}>
            {t.tlSteps.map((s,i) => <div key={i} style={{display:'flex',gap:32,alignItems:'flex-start',marginBottom:24}}><div style={{width:80,textAlign:'right',paddingTop:14}}><div style={{fontFamily:F,fontSize:13,fontWeight:800,color:s.black?'#0a0a0f':'#1a56db'}}>{s.time}</div>{s.label&&<div style={{fontSize:9,color:'#9ca3af',marginTop:2}}>{s.label}</div>}</div><div style={{width:20,height:20,borderRadius:'50%',background:s.black?'#0a0a0f':'#fff',border:s.black?'none':'3px solid #1a56db',marginTop:18,flexShrink:0}}/><div style={{flex:1,background:s.black?'#0a0a0f':'#f4f4f1',borderRadius:12,padding:'14px 18px'}}><div style={{fontSize:13,fontWeight:800,color:s.black?'#fff':'#0a0a0f',marginBottom:2}}>{s.t}</div><div style={{fontSize:11,color:s.black?'#9ca3af':'#555'}}>{s.d}</div></div></div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,maxWidth:1100,margin:'0 auto',textAlign:'left'}}>
            {[t.pathA,t.pathB].map((p,pi) => {const isA=pi===0;const c=isA?'#15803d':'#1a56db';const bg=isA?'#ecfdf5':'#eff6ff';const dc=isA?'#14532d':'#0c3a7a';const sc=isA?'#166534':'#1e3a8a';return <div key={pi} style={{background:bg,border:`.5px solid ${c}`,borderRadius:16,padding:28,position:'relative'}}><div style={{position:'absolute',top:-12,left:24,background:c,color:'#fff',padding:'4px 12px',borderRadius:10,fontSize:10,fontWeight:800,letterSpacing:.4}}>{p.badge}</div><div style={{marginBottom:20,paddingTop:8}}><h4 style={{fontSize:18,fontWeight:800,color:dc,margin:'0 0 6px',letterSpacing:-.3}}>{p.t}</h4><p style={{fontSize:12,color:sc,lineHeight:1.5,margin:0}}>{p.d}</p></div><div style={{display:'flex',flexDirection:'column',gap:10}}>{p.steps.map((s,si) => <div key={si} style={{display:'flex',gap:12,alignItems:'center',padding:'10px 14px',background:'#fff',borderRadius:10}}><span style={{fontFamily:F,fontSize:11,color:c,fontWeight:800,minWidth:40}}>{s.time}</span><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700}}>{s.t}</div><div style={{fontSize:10,color:'#555'}}>{s.d}</div></div></div>)}{p.tracking&&<div style={{display:'flex',gap:12,alignItems:'flex-start',padding:'12px 14px',background:isA?'#dcfce7':'#dbeafe',borderRadius:10,border:`1px solid ${c}`}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" style={{flexShrink:0,marginTop:1}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><div><div style={{fontSize:12,fontWeight:800,color:dc,marginBottom:3}}>{p.tracking.t}</div><div style={{fontSize:10,color:sc,lineHeight:1.4}}>{p.tracking.d}</div></div></div>}<div style={{display:'flex',gap:12,alignItems:'center',padding:'12px 14px',background:isA?'#dcfce7':'#dbeafe',borderRadius:10,border:`1px solid ${c}`}}><ChkSvg c={c}/><div><div style={{fontSize:12,fontWeight:800,color:dc}}>{p.result}</div><div style={{fontSize:10,color:sc}}>{p.resultSub}</div></div></div></div></div>;})}
          </div>
        </div>
      </div>

      {/* 6. SAFEGUARDS */}
      <div className="sw gray">
        <div className="si" style={{textAlign:'center'}}>
          <div className="supra" style={{color:'#b91c1c'}}>{t.sgSupra}</div>
          <h2 className="stitle">{t.sgTitle[0]}<br /><span className="ac">{t.sgTitle[1]}</span></h2>
          <p className="sdesc">{t.sgDesc}</p>
          <div className="sg-grid">
            {t.sgCards.map((c,i) => <div key={i} className="sg-card"><div className="sg-q"><div className="sg-qi">?</div><h4 style={{fontSize:16,fontWeight:800,margin:0,lineHeight:1.35,textAlign:'left'}}>{c.q}</h4></div><p style={{fontSize:13,color:'#555',lineHeight:1.6,margin:'0 0 14px',paddingLeft:40,textAlign:'left'}}>{c.a}</p><div style={{padding:'12px 14px',background:'#dcfce7',borderRadius:10,marginLeft:40,display:'flex',alignItems:'center',gap:10}}><ChkSvg/><span style={{fontSize:12,color:'#15803d',fontWeight:700,textAlign:'left'}}>{c.stat}</span></div></div>)}
          </div>
          <div style={{background:'#fff',border:'.5px solid #e2e0db',borderRadius:16,padding:32,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20}}>
            {t.sgTrust.map((tr,i) => <div key={i} style={{textAlign:'center'}}><div style={{width:44,height:44,borderRadius:10,background:'#eff6ff',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:10}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div style={{fontSize:11,fontWeight:800,letterSpacing:.3}}>{tr.t}</div><div style={{fontSize:10,color:'#9ca3af',marginTop:2}}>{tr.s}</div></div>)}
          </div>
        </div>
      </div>

      {/* 7. REAL CASES */}
      <div className="sw white">
        <div className="si" style={{textAlign:'center'}}>
          <div className="supra" style={{color:'#15803d'}}>{t.rcSupra}</div>
          <h2 className="stitle">{t.rcTitle[0]}<br /><span className="ac">{t.rcTitle[1]}</span></h2>
          <p className="sdesc">{t.rcDesc}</p>
          <div className="rc-grid">
            {t.rcCases.map((c,i) => <div key={i} className={`rc-card${c.featured?' feat':''}`} style={{textAlign:'left'}}><div style={{display:'inline-flex',alignItems:'center',gap:8,background:c.bc,padding:'5px 11px',borderRadius:20,marginBottom:16}}><span style={{fontSize:10,fontWeight:800,color:c.btc,letterSpacing:.3}}>{c.badge}</span></div><h4 style={{fontSize:18,fontWeight:800,margin:'0 0 8px',letterSpacing:-.4,lineHeight:1.25}}>{c.h}</h4><div style={{fontSize:11,color:'#9ca3af',marginBottom:14}}>{c.who}</div><p style={{fontSize:12,color:'#555',lineHeight:1.6,margin:'0 0 16px'}}>{c.p}</p><div style={{display:'flex',flexDirection:'column',gap:8,padding:14,background:'#f4f4f1',borderRadius:10,marginBottom:16}}>{c.stats.map((s,si) => <div key={si} style={{display:'flex',justifyContent:'space-between',fontSize:11}}><span style={{color:'#9ca3af'}}>{s[0]}</span><span style={{color:s[2]?'#15803d':'#0a0a0f',fontWeight:s[2]?800:700}}>{s[1]}</span></div>)}</div><div style={{padding:'12px 14px',background:'#dcfce7',borderRadius:10,borderLeft:'3px solid #15803d',marginTop:'auto'}}><div style={{fontSize:10,fontWeight:800,color:'#15803d',letterSpacing:.3,marginBottom:4}}>{isFr?'R\u00C9SULTAT':'OUTCOME'}</div><div style={{fontSize:11,color:'#14532d',fontWeight:700,lineHeight:1.4}}>{c.outcome}</div></div></div>)}
          </div>
          <div style={{textAlign:'center',marginTop:36,padding:20,background:'#f4f4f1',borderRadius:12}}><p style={{fontSize:13,color:'#555',margin:'0 0 6px',fontWeight:700}}>{t.rcFoot1}</p><p style={{fontSize:11,color:'#9ca3af',maxWidth:640,margin:'0 auto',lineHeight:1.5}}>{t.rcFoot2}</p></div>
        </div>
      </div>

      {/* 8. FINAL CTA */}
      <div className="sw blue" style={{textAlign:'center'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.15)',padding:'10px 20px',borderRadius:30,marginBottom:28,border:'1px solid rgba(255,255,255,.25)'}}><ChkSvg s={14} c="#fff"/><span style={{fontSize:12,fontWeight:700,letterSpacing:.5,color:'#fff'}}>{t.ctaBadge}</span></div>
          <h2 style={{fontSize:72,fontWeight:500,lineHeight:.98,letterSpacing:-3,color:'#fff',margin:'0 0 24px'}}>{t.ctaTitle[0]}<br /><span style={{fontWeight:800}}>{t.ctaTitle[1]}</span></h2>
          <p style={{fontSize:20,color:'rgba(255,255,255,.85)',maxWidth:620,margin:'0 auto 44px',lineHeight:1.5}}>{t.ctaDesc}</p>
          <button onClick={() => navigate('/upload')} style={{padding:'20px 48px',fontSize:17,fontWeight:700,borderRadius:40,background:'#fff',color:'#1a56db',border:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:10,marginBottom:20}} data-testid="hiw-cta"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>{t.ctaBtn}</button>
          <div style={{fontSize:13,color:'rgba(255,255,255,.7)',marginBottom:40}}>{t.ctaSub}</div>
          <div style={{display:'flex',justifyContent:'center',gap:40,paddingTop:32,borderTop:'1px solid rgba(255,255,255,.15)'}}>
            {t.ctaStats.map((s,i) => <React.Fragment key={i}>{i>0&&<div style={{width:1,background:'rgba(255,255,255,.2)'}}/>}<div style={{textAlign:'center'}}><div style={{fontSize:24,fontWeight:800,color:'#fff'}}>{s.n}</div><div style={{fontSize:10,color:'rgba(255,255,255,.6)'}}>{s.l}</div></div></React.Fragment>)}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{padding:'32px 24px',background:'#111',textAlign:'center'}}><div style={{marginBottom:16}}><img src="/logos/archer-logo-mono-white.svg" alt="Archer" style={{height:36}}/></div><p style={{fontSize:11,color:'#666'}}>&copy; 2026 Archer Inc.</p></footer>
    </div>
  );
}
