import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Upload, RotateCw, CheckCircle2, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function resolveLang(lang) {
  const l = String(lang || 'en').slice(0, 2).toLowerCase();
  return l === 'fr' || l === 'nl' ? l : 'en';
}

const COPY = {
  fr: {
    title: 'Affine mon analyse',
    sub: "Plus tu donnes de contexte à Archer, plus l'analyse devient précise. Ajoute une info manquante ou un document complémentaire.",
    placeholder: "Ex : « J'ai un email du propriétaire qui reconnaît que… »",
    uploadTitle: 'Ajouter un document',
    uploadSub: 'PDF · DOCX · IMG · max 10MB',
    cta: "Relancer l'analyse",
    running: 'Archer affine ton analyse…',
    success: 'Analyse mise à jour ✓',
    eta: 'Temps estimé : ~45 secondes',
    errGeneric: 'Une erreur est survenue. Réessaie.',
    errOffTopic: "Info non retenue : elle ne concerne pas le dossier.",
  },
  en: {
    title: 'Refine my analysis',
    sub: "The more context you give Archer, the sharper the analysis. Add a missing detail or a supporting document.",
    placeholder: 'E.g. "I have an email from the landlord acknowledging…"',
    uploadTitle: 'Add a document',
    uploadSub: 'PDF · DOCX · IMG · max 10MB',
    cta: 'Rerun the analysis',
    running: 'Archer is refining your analysis…',
    success: 'Analysis updated ✓',
    eta: 'Estimated time: ~45 seconds',
    errGeneric: 'Something went wrong. Please try again.',
    errOffTopic: "Input not applied: it didn't relate to the case.",
  },
  nl: {
    title: 'Mijn analyse verfijnen',
    sub: 'Hoe meer context je Archer geeft, hoe scherper de analyse. Voeg een ontbrekend detail of een document toe.',
    placeholder: 'Bv.: "Ik heb een e-mail van de verhuurder die erkent dat…"',
    uploadTitle: 'Document toevoegen',
    uploadSub: 'PDF · DOCX · IMG · max 10MB',
    cta: 'Analyse opnieuw draaien',
    running: 'Archer verfijnt je analyse…',
    success: 'Analyse bijgewerkt ✓',
    eta: 'Geschatte tijd: ~45 seconden',
    errGeneric: 'Er ging iets mis. Probeer het opnieuw.',
    errOffTopic: 'Invoer niet toegepast: niet gerelateerd aan het dossier.',
  },
};

export default function V3RailRefine({ caseDoc, language, onSubmitStart, onRefined }) {
  const copy = COPY[resolveLang(language)];
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [state, setState] = useState('idle'); // idle | submitting | success | error
  const [err, setErr] = useState(null);

  const disabled = state === 'submitting' || !value.trim();

  const submit = async () => {
    if (disabled) return;
    setState('submitting');
    setErr(null);
    onSubmitStart && onSubmitStart();
    try {
      const res = await axios.post(
        `${API}/cases/${caseDoc?.case_id}/refine`,
        { user_input: value.trim() },
        { withCredentials: true },
      );
      if (res.data?.strategy === 'off_topic') {
        setErr(copy.errOffTopic);
        setState('error');
        return;
      }
      setState('success');
      setValue('');
      setTimeout(() => {
        onRefined && onRefined();
        setState('idle');
      }, 900);
    } catch (e) {
      setErr(copy.errGeneric);
      setState('error');
    }
  };

  return (
    <div className="refine-card" data-testid="rail-refine">
      <div className="refine-head">
        <div className="refine-icon"><Sparkles size={13} aria-hidden /></div>
        <div className="refine-title">{copy.title}</div>
      </div>
      <p className="refine-sub">{copy.sub}</p>

      <textarea
        className="refine-textarea"
        placeholder={copy.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, 4000))}
        disabled={state === 'submitting'}
        rows={4}
        data-testid="rail-refine-textarea"
      />

      <button
        type="button"
        className="refine-upload"
        onClick={() => navigate('/upload')}
        data-testid="rail-refine-upload"
      >
        <div className="refine-upload-icon"><Upload size={13} aria-hidden /></div>
        <div className="refine-upload-txt">
          <div className="refine-upload-title">{copy.uploadTitle}</div>
          <div className="refine-upload-sub">{copy.uploadSub}</div>
        </div>
      </button>

      <button
        type="button"
        className="refine-btn-primary"
        onClick={submit}
        disabled={disabled}
        data-testid="rail-refine-submit"
      >
        {state === 'submitting' ? <Loader2 size={12} className="animate-spin" aria-hidden />
          : state === 'success' ? <CheckCircle2 size={12} aria-hidden />
          : <RotateCw size={12} aria-hidden />}
        {state === 'submitting' ? copy.running
          : state === 'success' ? copy.success
          : copy.cta}
      </button>

      {err && state === 'error' && (
        <div style={{
          marginTop: 8, padding: '8px 10px',
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 8, color: '#b91c1c', fontSize: 11,
        }}>{err}</div>
      )}

      <div className="refine-footnote">{copy.eta}</div>
    </div>
  );
}
