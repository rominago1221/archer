import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

const STEPS = {
  BE: {
    en: [
      {
        title: 'Welcome to Belgian Law',
        sub: 'James now applies Belgian legislation to your cases.',
        items: [
          { icon: '🏠', text: 'Housing: Belgian rental law differs significantly — bail locatif (3-month deposit max), strict eviction procedures, regional differences (Wallonia, Flanders, Brussels).' },
          { icon: '💼', text: 'Employment: Belgian labor law uses CDI (permanent) / CDD (fixed-term) contracts, mandatory notice periods based on seniority, and strict dismissal protections.' },
          { icon: '⚖️', text: 'Debt: Belgian debt recovery uses a formal "mise en demeure" process, bailiff (huissier) procedures, and judicial mediation before forced collection.' },
        ],
      },
      {
        title: 'How James adapts',
        sub: 'Everything changes automatically:',
        items: [
          { icon: '📜', text: 'Legal references: James cites Belgian codes (Code civil, Code judiciaire), regional decrees, and Belgian case law.' },
          { icon: '🌍', text: 'Three official languages: James understands and generates documents in French, Dutch, or German — matching your language preference.' },
          { icon: '💡', text: 'Jurisdiction-aware: James knows the difference between Walloon, Flemish, and Brussels Capital Region regulations.' },
        ],
      },
    ],
    fr: [
      {
        title: 'Bienvenue dans le droit belge',
        sub: 'James applique désormais la législation belge à vos dossiers.',
        items: [
          { icon: '🏠', text: 'Logement : Le droit locatif belge diffère considérablement — bail locatif (3 mois de garantie max), procédures d\'expulsion strictes, différences régionales (Wallonie, Flandre, Bruxelles).' },
          { icon: '💼', text: 'Emploi : Le droit du travail belge utilise les contrats CDI/CDD, des préavis obligatoires selon l\'ancienneté, et des protections strictes contre le licenciement.' },
          { icon: '⚖️', text: 'Dettes : Le recouvrement belge passe par la mise en demeure, les procédures d\'huissier, et la médiation judiciaire avant saisie.' },
        ],
      },
      {
        title: 'Comment James s\'adapte',
        sub: 'Tout change automatiquement :',
        items: [
          { icon: '📜', text: 'Références juridiques : James cite les codes belges (Code civil, Code judiciaire), les décrets régionaux et la jurisprudence belge.' },
          { icon: '🌍', text: 'Trois langues officielles : James comprend et génère des documents en français, néerlandais ou allemand — selon votre préférence.' },
          { icon: '💡', text: 'Conscience régionale : James connaît les différences entre la Wallonie, la Flandre et Bruxelles-Capitale.' },
        ],
      },
    ],
    nl: [
      {
        title: 'Welkom bij Belgisch recht',
        sub: 'James past nu Belgische wetgeving toe op uw dossiers.',
        items: [
          { icon: '🏠', text: 'Huur: Belgisch huurrecht verschilt aanzienlijk — huurwaarborg (max 3 maanden), strikte uitzettingsprocedures, regionale verschillen (Wallonië, Vlaanderen, Brussel).' },
          { icon: '💼', text: 'Arbeid: Belgisch arbeidsrecht gebruikt contracten van onbepaalde/bepaalde duur, verplichte opzegtermijnen op basis van anciënniteit, en strikte ontslagbescherming.' },
          { icon: '⚖️', text: 'Schulden: Belgische incasso gebruikt ingebrekestelling, deurwaarderprocedures en gerechtelijke bemiddeling vóór gedwongen invordering.' },
        ],
      },
      {
        title: 'Hoe James zich aanpast',
        sub: 'Alles verandert automatisch:',
        items: [
          { icon: '📜', text: 'Juridische referenties: James citeert Belgische wetboeken (Burgerlijk Wetboek, Gerechtelijk Wetboek), regionale decreten en Belgische rechtspraak.' },
          { icon: '🌍', text: 'Drie officiële talen: James begrijpt en genereert documenten in het Frans, Nederlands of Duits — afgestemd op uw taalvoorkeur.' },
          { icon: '💡', text: 'Regiobewust: James kent het verschil tussen Waalse, Vlaamse en Brusselse regelgeving.' },
        ],
      },
    ],
  },
  US: {
    en: [
      {
        title: 'Welcome to US Law',
        sub: 'James now applies US federal and state law to your cases.',
        items: [
          { icon: '🏠', text: 'Housing: US tenant protections vary by state — security deposit limits, eviction notice periods, and habitability standards differ in every jurisdiction.' },
          { icon: '💼', text: 'Employment: US labor law includes at-will employment (most states), FMLA, ADA protections, and state-specific wage & hour laws.' },
          { icon: '⚖️', text: 'Debt: US debt collection is governed by the FDCPA, with state-specific statutes of limitations and garnishment rules.' },
        ],
      },
      {
        title: 'How James adapts',
        sub: 'Everything changes automatically:',
        items: [
          { icon: '📜', text: 'Legal references: James cites federal statutes (USC), state codes, and US case law from CourtListener.' },
          { icon: '🏛️', text: 'State-aware: James applies the specific laws of your state of residence — Florida eviction law is different from California.' },
          { icon: '💡', text: 'Court systems: James understands federal vs. state court jurisdiction and recommends the appropriate venue.' },
        ],
      },
    ],
    fr: [
      {
        title: 'Bienvenue dans le droit américain',
        sub: 'James applique désormais le droit fédéral et étatique américain.',
        items: [
          { icon: '🏠', text: 'Logement : Les protections locataires varient par État — dépôts de garantie, préavis d\'expulsion et normes d\'habitabilité diffèrent selon la juridiction.' },
          { icon: '💼', text: 'Emploi : Le droit du travail américain inclut l\'emploi « at-will », le FMLA, les protections ADA et les lois salariales spécifiques à chaque État.' },
          { icon: '⚖️', text: 'Dettes : Le recouvrement est régi par le FDCPA, avec des délais de prescription et des règles de saisie propres à chaque État.' },
        ],
      },
      {
        title: 'Comment James s\'adapte',
        sub: 'Tout change automatiquement :',
        items: [
          { icon: '📜', text: 'Références : James cite les lois fédérales (USC), les codes étatiques et la jurisprudence américaine via CourtListener.' },
          { icon: '🏛️', text: 'Conscience étatique : James applique les lois spécifiques de votre État de résidence.' },
          { icon: '💡', text: 'Systèmes judiciaires : James comprend la juridiction fédérale vs. étatique et recommande le tribunal approprié.' },
        ],
      },
    ],
    nl: [
      {
        title: 'Welkom bij Amerikaans recht',
        sub: 'James past nu Amerikaans federaal en staatsrecht toe.',
        items: [
          { icon: '🏠', text: 'Huur: Amerikaanse huurbescherming verschilt per staat — borglimieten, opzegtermijnen en bewoonbaarheidsnormen zijn overal anders.' },
          { icon: '💼', text: 'Arbeid: Amerikaans arbeidsrecht omvat "at-will" dienstverband, FMLA, ADA-bescherming en staatsspecifieke loonwetten.' },
          { icon: '⚖️', text: 'Schulden: Amerikaans incasso wordt geregeld door de FDCPA, met staatsspecifieke verjaringstermijnen en beslagregels.' },
        ],
      },
      {
        title: 'Hoe James zich aanpast',
        sub: 'Alles verandert automatisch:',
        items: [
          { icon: '📜', text: 'Referenties: James citeert federale wetten (USC), staatswetboeken en Amerikaanse rechtspraak via CourtListener.' },
          { icon: '🏛️', text: 'Staatsbewust: James past de specifieke wetten van uw staat van verblijf toe.' },
          { icon: '💡', text: 'Rechtssystemen: James begrijpt federale vs. staatsrechtspraak en adviseert de juiste rechtbank.' },
        ],
      },
    ],
  },
};

const SEEN_KEY = 'jasper_jurisdiction_onboarded';

export const hasSeenOnboarding = (jurisdiction) => {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
    return seen[jurisdiction] === true;
  } catch { return false; }
};

export const markOnboardingSeen = (jurisdiction) => {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
    seen[jurisdiction] = true;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {}
};

const JurisdictionOnboarding = ({ jurisdiction, lang, onClose }) => {
  const [step, setStep] = useState(0);
  const content = STEPS[jurisdiction]?.[lang] || STEPS[jurisdiction]?.en || STEPS.US.en;
  const current = content[step];
  const isLast = step === content.length - 1;
  const btnLabel = { en: isLast ? 'Got it — let\'s go' : 'Next', fr: isLast ? 'Compris — allons-y' : 'Suivant', nl: isLast ? 'Begrepen — laten we beginnen' : 'Volgende' };

  const handleNext = () => {
    if (isLast) {
      markOnboardingSeen(jurisdiction);
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div data-testid="jurisdiction-onboarding" style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400,
    }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, padding: 28, position: 'relative' }}>
        {/* Close */}
        <button onClick={() => { markOnboardingSeen(jurisdiction); onClose(); }} data-testid="close-onboarding"
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={18} color="#9ca3af" />
        </button>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {content.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? '#1a56db' : '#e5e7eb', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Flag */}
        <div style={{ fontSize: 32, marginBottom: 8 }}>{jurisdiction === 'BE' ? '\u{1F1E7}\u{1F1EA}' : '\u{1F1FA}\u{1F1F8}'}</div>

        {/* Title */}
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{current.title}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 18 }}>{current.sub}</div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {current.items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12,
              background: '#f8f7f4', borderRadius: 10, border: '0.5px solid #e2e0db',
            }}>
              <div style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{item.text}</div>
            </div>
          ))}
        </div>

        {/* Button */}
        <button data-testid="onboarding-next-btn" onClick={handleNext}
          style={{
            width: '100%', padding: '12px 0', background: '#1a56db', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          {btnLabel[lang] || btnLabel.en}
          {!isLast && <ArrowRight size={14} />}
        </button>
      </div>
    </div>
  );
};

export default JurisdictionOnboarding;
