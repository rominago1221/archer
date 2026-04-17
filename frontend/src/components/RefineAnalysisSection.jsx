import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAX_CHARS = 4000;

function copyFor(language) {
  const isFr = String(language || '').toLowerCase().startsWith('fr');
  const isNl = String(language || '').toLowerCase().startsWith('nl');
  if (isFr) {
    return {
      title: 'Affiner l\u2019analyse',
      subtitle: 'Ajoutez des d\u00e9tails que l\u2019IA n\u2019a pas pu voir dans votre document\u00a0: contexte, t\u00e9moins, \u00e9changes pr\u00e9c\u00e9dents, dates cl\u00e9s, etc. Plus vous donnez d\u2019infos, plus l\u2019analyse sera pr\u00e9cise.',
      placeholder: 'Exemple\u00a0: Mon bailleur a refus\u00e9 d\u2019enregistrer le bail. J\u2019ai envoy\u00e9 un recommand\u00e9 le 12 mars...',
      submit: 'Affiner mon analyse',
      submitting: 'Archer affine votre analyse avec les nouvelles infos\u2026',
      successTitle: 'Analyse mise \u00e0 jour',
      successDesc: (v) => `Version ${v} disponible.`,
      counter: (n) => `${n} / ${MAX_CHARS} caract\u00e8res`,
      multiDocBanner: 'Le refinement n\u2019est pas encore disponible pour les dossiers avec plusieurs documents.',
      lockMsg: 'Une r\u00e9-analyse est d\u00e9j\u00e0 en cours\u2026',
      quotaTitle: 'Quota gratuit atteint',
      quotaDesc: 'Vous avez utilis\u00e9 vos 2 refinements gratuits. Passez \u00e0 Solo pour un acc\u00e8s illimit\u00e9.',
      upgradeCta: 'Passer \u00e0 Solo',
      maxReachedTitle: 'Limite atteinte',
      maxReachedDesc: 'Vous avez atteint le maximum de 10 refinements pour ce dossier.',
      offTopicTitle: 'Info non retenue',
      genericError: 'Une erreur est survenue. R\u00e9essayez dans un instant.',
      freeCounter: (used) => `${used} / 2 refinements gratuits utilis\u00e9s`,
      paidCounter: (used) => `${used} / 10 refinements utilis\u00e9s`,
    };
  }
  if (isNl) {
    return {
      title: 'Analyse verfijnen',
      subtitle: 'Voeg details toe die de AI niet kon zien in uw document: context, getuigen, eerdere uitwisselingen, belangrijke data, enz. Hoe meer info u geeft, hoe preciezer de analyse.',
      placeholder: 'Bijvoorbeeld: Mijn verhuurder weigerde de huurovereenkomst te registreren\u2026',
      submit: 'Analyse verfijnen',
      submitting: 'Archer werkt uw analyse bij met de nieuwe info\u2026',
      successTitle: 'Analyse bijgewerkt',
      successDesc: (v) => `Versie ${v} beschikbaar.`,
      counter: (n) => `${n} / ${MAX_CHARS} tekens`,
      multiDocBanner: 'Verfijning is nog niet beschikbaar voor dossiers met meerdere documenten.',
      lockMsg: 'Er loopt al een nieuwe analyse\u2026',
      quotaTitle: 'Gratis quotum bereikt',
      quotaDesc: 'U heeft uw 2 gratis verfijningen gebruikt. Upgrade naar Solo voor onbeperkt gebruik.',
      upgradeCta: 'Upgrade naar Solo',
      maxReachedTitle: 'Limiet bereikt',
      maxReachedDesc: 'U heeft het maximum van 10 verfijningen voor dit dossier bereikt.',
      offTopicTitle: 'Info niet verwerkt',
      genericError: 'Er is een fout opgetreden. Probeer het zo opnieuw.',
      freeCounter: (used) => `${used} / 2 gratis verfijningen gebruikt`,
      paidCounter: (used) => `${used} / 10 verfijningen gebruikt`,
    };
  }
  return {
    title: 'Refine the analysis',
    subtitle: 'Add details the AI could not see in your document: context, witnesses, prior exchanges, key dates, etc. The more you share, the more accurate the analysis.',
    placeholder: 'Example: My landlord refused to register the lease. I sent a certified letter on March 12\u2026',
    submit: 'Refine my analysis',
    submitting: 'Archer is refining your analysis with the new info\u2026',
    successTitle: 'Analysis updated',
    successDesc: (v) => `Version ${v} is ready.`,
    counter: (n) => `${n} / ${MAX_CHARS} characters`,
    multiDocBanner: 'Refinement is not yet available for cases with multiple documents.',
    lockMsg: 'A refinement is already in progress\u2026',
    quotaTitle: 'Free quota reached',
    quotaDesc: 'You\u2019ve used your 2 free refinements. Upgrade to Solo for unlimited access.',
    upgradeCta: 'Upgrade to Solo',
    maxReachedTitle: 'Limit reached',
    maxReachedDesc: 'You\u2019ve reached the 10-refinement limit for this case.',
    offTopicTitle: 'Input not applied',
    genericError: 'Something went wrong. Please try again.',
    freeCounter: (used) => `${used} / 2 free refinements used`,
    paidCounter: (used) => `${used} / 10 refinements used`,
  };
}

export default function RefineAnalysisSection({ caseDoc, language, onRefined }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const c = copyFor(language);

  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const refinementCount = Number(caseDoc?.refinement_count || 0);
  const isFree = !user?.plan || user.plan === 'free';
  const quotaUsed = refinementCount;
  const freeQuotaHit = isFree && refinementCount >= 2;
  const maxHit = refinementCount >= 10;
  const multiDoc = (caseDoc?.document_count || 0) > 1;
  const lockedBusy = !!caseDoc?.refinement_in_progress;

  const disabled = submitting || multiDoc || maxHit || lockedBusy || !value.trim();

  const scrollToAnalysis = () => {
    const el = document.querySelector('[data-testid="case-detail-v7"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    if (disabled) return;
    if (freeQuotaHit) {
      setShowUpgrade(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API}/cases/${caseDoc.case_id}/refine`,
        { user_input: value.trim() },
        { withCredentials: true }
      );
      if (res.data?.strategy === 'off_topic') {
        toast({ title: c.offTopicTitle, description: res.data.message || '' });
      } else {
        toast({
          title: c.successTitle,
          description: c.successDesc(res.data?.version || '\u2014'),
        });
        setValue('');
        onRefined && onRefined(res.data);
        setTimeout(scrollToAnalysis, 120);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail === 'multi_doc_refinement_unsupported') {
        toast({ title: c.multiDocBanner });
      } else if (detail === 'refinement_in_progress') {
        toast({ title: c.lockMsg });
      } else if (detail === 'upgrade_required') {
        setShowUpgrade(true);
      } else if (detail === 'max_refinements_reached') {
        toast({ title: c.maxReachedTitle, description: c.maxReachedDesc });
      } else {
        toast({ title: c.genericError });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (multiDoc) {
    return (
      <div
        data-testid="refine-multi-doc-banner"
        style={{
          background: '#fef3c7', border: '1px solid #f59e0b',
          borderRadius: 12, padding: 16, marginTop: 32, marginBottom: 16,
          fontSize: 13, color: '#78350f',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.title}</div>
        {c.multiDocBanner}
      </div>
    );
  }

  return (
    <div
      data-testid="refine-analysis-section"
      style={{
        background: '#ffffff', border: '1px solid #e2e0db',
        borderRadius: 14, padding: 22, marginTop: 32, marginBottom: 24,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: '#0a0a0f', marginBottom: 6 }}>
        {c.title}
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, marginBottom: 14 }}>
        {c.subtitle}
      </div>

      <textarea
        data-testid="refine-textarea"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS))}
        placeholder={c.placeholder}
        rows={6}
        disabled={submitting || maxHit || lockedBusy}
        style={{
          width: '100%', padding: '12px 14px', fontSize: 13,
          border: '1px solid #d1d5db', borderRadius: 10, resize: 'vertical',
          lineHeight: 1.5, fontFamily: 'inherit',
          opacity: (submitting || maxHit || lockedBusy) ? 0.6 : 1,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: 10, marginBottom: 14, fontSize: 11, color: '#6b7280' }}>
        <span>
          {isFree ? c.freeCounter(quotaUsed) : c.paidCounter(quotaUsed)}
        </span>
        <span>{c.counter(value.length)}</span>
      </div>

      {submitting && (
        <div
          data-testid="refine-submitting"
          style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
            padding: 12, fontSize: 12, color: '#1e40af', marginBottom: 12, textAlign: 'center',
          }}
        >
          {c.submitting}
        </div>
      )}

      <button
        data-testid="refine-submit"
        onClick={submit}
        disabled={disabled}
        style={{
          padding: '11px 18px', background: disabled ? '#9ca3af' : '#1a56db',
          color: '#ffffff', border: 'none', borderRadius: 10,
          fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? c.submitting : c.submit}
      </button>

      {showUpgrade && (
        <UpgradeModal
          language={language}
          copy={c}
          caseId={caseDoc?.case_id}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}

function UpgradeModal({ language, copy, caseId, onClose }) {
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    setLoading(true);
    try {
      // Best-effort: try a dedicated plan-upgrade endpoint; fall back to settings redirect.
      const res = await axios.post(
        `${API}/billing/upgrade-checkout`,
        { plan: 'solo', case_id: caseId },
        { withCredentials: true }
      );
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
        return;
      }
    } catch (e) {
      // fall through to settings redirect
    } finally {
      setLoading(false);
    }
    window.location.href = '/settings?upgrade=solo';
  };

  return (
    <div
      data-testid="refine-upgrade-modal"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10, 10, 15, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff', borderRadius: 16, padding: 28, maxWidth: 440, width: '92%',
          boxShadow: '0 24px 60px rgba(10, 10, 15, 0.22)',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0f', marginBottom: 10 }}>
          {copy.quotaTitle}
        </div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 22 }}>
          {copy.quotaDesc}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 16px', background: '#ffffff', color: '#374151',
              border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {language?.startsWith('fr') ? 'Plus tard' : language?.startsWith('nl') ? 'Later' : 'Not now'}
          </button>
          <button
            data-testid="refine-upgrade-cta"
            onClick={startCheckout}
            disabled={loading}
            style={{
              padding: '9px 16px', background: '#1a56db', color: '#ffffff',
              border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {copy.upgradeCta}
          </button>
        </div>
      </div>
    </div>
  );
}
