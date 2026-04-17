import React from 'react';
import {
  Home, Building2, UserX, Coins, Shield, AlertOctagon,
  ShoppingCart, CreditCard, Umbrella, FileText, KeyRound,
  Stethoscope, Accessibility, Users, Gavel, Globe, Car, HelpCircle,
} from 'lucide-react';
import { CASE_TYPE_FAMILIES } from '../constants/caseTypes';

const ICONS = {
  eviction: Home,
  real_estate: Building2,
  wrongful_termination: UserX,
  severance: Coins,
  workplace_discrimination: Shield,
  harassment: AlertOctagon,
  consumer_disputes: ShoppingCart,
  debt: CreditCard,
  insurance_disputes: Umbrella,
  tax_disputes: FileText,
  identity_theft: KeyRound,
  medical_malpractice: Stethoscope,
  disability_claims: Accessibility,
  family: Users,
  criminal: Gavel,
  immigration: Globe,
  traffic: Car,
  other: HelpCircle,
};

const COPY = {
  fr: {
    title: 'Quel est votre cas\u00a0?',
    subtitle: 'Choisissez la cat\u00e9gorie qui correspond le mieux. Nos analyses sont expertes sur 17 domaines sp\u00e9cialis\u00e9s.',
    required: 'Cat\u00e9gorie requise\u00a0*',
    families: {
      housing: 'Logement',
      employment: 'Travail',
      financial: 'Argent',
      health: 'Sant\u00e9',
      personal: 'Personnel',
      catchall: 'Autre',
    },
    labels: {
      eviction: 'Expulsion / Bail',
      real_estate: 'Immobilier / Copropri\u00e9t\u00e9',
      wrongful_termination: 'Licenciement abusif',
      severance: 'Indemnit\u00e9 de d\u00e9part',
      workplace_discrimination: 'Discrimination',
      harassment: 'Harc\u00e8lement',
      consumer_disputes: 'Litige consommation',
      debt: 'Dette / recouvrement',
      insurance_disputes: 'Litige assurance',
      tax_disputes: 'Litige fiscal',
      identity_theft: 'Vol d\u2019identit\u00e9',
      medical_malpractice: 'Erreur m\u00e9dicale',
      disability_claims: 'Invalidit\u00e9',
      family: 'Famille / divorce',
      criminal: 'P\u00e9nal',
      immigration: 'Immigration',
      traffic: 'Contravention / roulage',
      other: 'Autre',
    },
    descs: {
      eviction: 'Pr\u00e9avis, garantie, bail r\u00e9sidentiel',
      real_estate: 'Achat-vente, voisinage, vices cach\u00e9s',
      wrongful_termination: 'Motif grave, C4, pr\u00e9avis',
      severance: 'Calcul indemnit\u00e9, Claeys',
      workplace_discrimination: 'Crit\u00e8res prot\u00e9g\u00e9s, adapt.',
      harassment: 'Harc\u00e8lement moral/sexuel',
      consumer_disputes: 'Produits d\u00e9fectueux, garantie',
      debt: 'Mise en demeure, saisie',
      insurance_disputes: 'Refus, mauvaise foi',
      tax_disputes: 'Contr\u00f4le, r\u00e9clamation',
      identity_theft: 'Fraude carte/compte',
      medical_malpractice: 'Faute, consentement',
      disability_claims: 'INAMI, allocations',
      family: 'Divorce, garde, pension',
      criminal: 'Proc\u00e9dure p\u00e9nale, droits',
      immigration: 'Titre de s\u00e9jour, asile',
      traffic: 'PV, d\u00e9ch\u00e9ance permis',
      other: 'Autre sujet juridique',
    },
    otherDisclaimer: 'Notre IA est optimis\u00e9e sur 17 cat\u00e9gories sp\u00e9cialis\u00e9es. Pour les autres sujets, l\u2019analyse reste solide mais moins approfondie. Pour les d\u00e9cisions importantes, une consultation avec un avocat sp\u00e9cialis\u00e9 est fortement recommand\u00e9e.',
  },
  nl: {
    title: 'Wat is uw zaak?',
    subtitle: 'Kies de categorie die het beste past. Onze analyses zijn expert op 17 gespecialiseerde domeinen.',
    required: 'Categorie vereist *',
    families: {
      housing: 'Wonen',
      employment: 'Werk',
      financial: 'Financi\u00EBn',
      health: 'Gezondheid',
      personal: 'Persoonlijk',
      catchall: 'Andere',
    },
    labels: {
      eviction: 'Uitzetting / Huur',
      real_estate: 'Vastgoed / Mede-eigendom',
      wrongful_termination: 'Onrechtmatig ontslag',
      severance: 'Opzegvergoeding',
      workplace_discrimination: 'Discriminatie',
      harassment: 'Pesten',
      consumer_disputes: 'Consumentengeschil',
      debt: 'Schuld / inning',
      insurance_disputes: 'Verzekeringsgeschil',
      tax_disputes: 'Fiscaal geschil',
      identity_theft: 'Identiteitsdiefstal',
      medical_malpractice: 'Medische fout',
      disability_claims: 'Invaliditeit',
      family: 'Familie / scheiding',
      criminal: 'Strafrecht',
      immigration: 'Immigratie',
      traffic: 'Verkeersovertreding',
      other: 'Andere',
    },
    descs: {
      eviction: 'Opzeg, waarborg, huurcontract',
      real_estate: 'Verkoop, buren, verborgen gebreken',
      wrongful_termination: 'Dringende reden, C4, opzeg',
      severance: 'Berekening, Claeys-formule',
      workplace_discrimination: 'Beschermde criteria',
      harassment: 'Moreel/seksueel',
      consumer_disputes: 'Defecte producten, garantie',
      debt: 'Ingebrekestelling, beslag',
      insurance_disputes: 'Weigering, kwade trouw',
      tax_disputes: 'Controle, bezwaar',
      identity_theft: 'Fraude kaart/rekening',
      medical_malpractice: 'Fout, toestemming',
      disability_claims: 'RIZIV, uitkeringen',
      family: 'Scheiding, voogdij, alimentatie',
      criminal: 'Strafprocedure, rechten',
      immigration: 'Verblijfsvergunning, asiel',
      traffic: 'PV, rijbewijs',
      other: 'Ander juridisch onderwerp',
    },
    otherDisclaimer: 'Onze AI is geoptimaliseerd voor 17 gespecialiseerde categorie\u00EBn. Voor andere onderwerpen blijft de analyse solide maar minder diepgaand. Voor belangrijke beslissingen wordt raadpleging van een gespecialiseerde advocaat sterk aanbevolen.',
  },
  en: {
    title: 'What is your case about?',
    subtitle: 'Pick the category that best matches. Our AI is expert across 17 specialised domains.',
    required: 'Category required *',
    families: {
      housing: 'Housing',
      employment: 'Employment',
      financial: 'Financial',
      health: 'Health',
      personal: 'Personal',
      catchall: 'Other',
    },
    labels: {
      eviction: 'Eviction / Lease',
      real_estate: 'Real estate / HOA',
      wrongful_termination: 'Wrongful termination',
      severance: 'Severance',
      workplace_discrimination: 'Discrimination',
      harassment: 'Harassment',
      consumer_disputes: 'Consumer dispute',
      debt: 'Debt / collection',
      insurance_disputes: 'Insurance dispute',
      tax_disputes: 'Tax dispute',
      identity_theft: 'Identity theft',
      medical_malpractice: 'Medical malpractice',
      disability_claims: 'Disability claims',
      family: 'Family / divorce',
      criminal: 'Criminal',
      immigration: 'Immigration',
      traffic: 'Traffic / moving violation',
      other: 'Other',
    },
    descs: {
      eviction: 'Notice, deposit, lease',
      real_estate: 'Sale, neighbour, defects',
      wrongful_termination: 'At-will, retaliation',
      severance: 'Package, OWBPA, non-compete',
      workplace_discrimination: 'Title VII, ADA, ADEA',
      harassment: 'Hostile env., sexual',
      consumer_disputes: 'Defective products, warranty',
      debt: 'Collection, FDCPA',
      insurance_disputes: 'Denial, bad faith',
      tax_disputes: 'Audit, IRS, Tax Court',
      identity_theft: 'Fraud, FCRA',
      medical_malpractice: 'Standard of care',
      disability_claims: 'SSDI, ERISA',
      family: 'Divorce, custody, support',
      criminal: 'Rights, plea, expungement',
      immigration: 'Visa, asylum, USCIS',
      traffic: 'Ticket, DUI, license',
      other: 'Other legal matter',
    },
    otherDisclaimer: 'Our AI is optimised across 17 specialised categories. For other topics the analysis stays solid but less in-depth. For important decisions we strongly recommend consulting a specialised attorney.',
  },
};

function pickCopy(lang) {
  const l = String(lang || 'en').toLowerCase();
  if (l.startsWith('fr')) return COPY.fr;
  if (l.startsWith('nl')) return COPY.nl;
  return COPY.en;
}

export default function CaseTypePicker({ value, onChange, language = 'en' }) {
  const t = pickCopy(language);

  const renderCard = (type) => {
    const Icon = ICONS[type] || HelpCircle;
    const selected = value === type;
    const isOther = type === 'other';
    return (
      <button
        key={type}
        type="button"
        data-testid={`case-type-${type}`}
        onClick={() => onChange(type)}
        style={{
          textAlign: 'left',
          padding: '12px 14px',
          borderRadius: 12,
          border: `1px solid ${selected ? '#1a56db' : '#e2e0db'}`,
          background: selected ? '#eff6ff' : (isOther ? '#fafaf8' : '#ffffff'),
          boxShadow: selected ? 'inset 0 0 0 1px #1a56db' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          minHeight: 64,
          transition: 'all 0.12s ease',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: selected ? '#1a56db' : (isOther ? '#e5e7eb' : '#f3f4f6'),
          color: selected ? '#ffffff' : (isOther ? '#6b7280' : '#374151'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0a0a0f', lineHeight: 1.25 }}>
            {t.labels[type]}
          </div>
          <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>
            {t.descs[type]}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="card p-4 mb-4" data-testid="case-type-picker">
      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
        {t.title}{' '}
        <span style={{ color: '#dc2626', fontWeight: 800 }}>*</span>
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 14, lineHeight: 1.5 }}>
        {t.subtitle}
      </div>

      {CASE_TYPE_FAMILIES.map((family) => (
        <div key={family.id} style={{ marginBottom: family.id === 'catchall' ? 0 : 16 }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: '#9ca3af', letterSpacing: 1.1,
            textTransform: 'uppercase', marginBottom: 6,
          }}>
            {t.families[family.id]}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: family.id === 'catchall' ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 8,
          }}>
            {family.types.map(renderCard)}
          </div>
        </div>
      ))}

      {value === 'other' && (
        <div
          data-testid="case-type-other-disclaimer"
          style={{
            marginTop: 14, padding: '12px 14px', background: '#fef3c7',
            border: '1px solid #f59e0b', borderRadius: 10, fontSize: 11,
            color: '#78350f', lineHeight: 1.5,
          }}
        >
          {t.otherDisclaimer}
        </div>
      )}
    </div>
  );
}
