import React, { useState } from 'react';
import { X, Download, Loader2, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const T = {
  en: {
    header: 'Archer is drafting your letter',
    name: 'Your full name', address: 'Your address', email: 'Your email',
    recipientName: 'Recipient name', recipientAddress: 'Recipient address',
    docDate: 'Date of the document', amount: 'Key amount',
    note: 'Add a personal note for Archer', noteMax: '200 characters',
    generate: 'Generate letter with Archer', generating: 'Archer is writing',
    downloadPdf: 'Download PDF', sendHelloSign: 'Send via HelloSign',
    editArcher: 'Edit with Archer', close: 'Close',
    preview: 'Letter Preview',
    detected: 'Detected by Archer from your document',
    profileLocked: 'From your profile',
    incompleteProfile: 'Complete your profile to never fill this again',
    completeProfile: 'Complete profile',
  },
  fr: {
    header: 'Archer rédige votre lettre',
    name: 'Votre nom complet', address: 'Votre adresse', email: 'Votre email',
    recipientName: 'Nom du destinataire', recipientAddress: 'Adresse du destinataire',
    docDate: 'Date du document', amount: 'Montant clé',
    note: 'Ajoutez une note personnelle pour Archer', noteMax: '200 caractères',
    generate: 'Générer la lettre avec Archer', generating: 'Archer rédige',
    downloadPdf: 'Télécharger PDF', sendHelloSign: 'Envoyer via HelloSign',
    editArcher: 'Modifier avec Archer', close: 'Fermer',
    preview: 'Aperçu de la lettre',
    detected: 'Détecté par Archer dans votre document',
    profileLocked: 'De votre profil',
    incompleteProfile: 'Complétez votre profil pour ne plus remplir ceci',
    completeProfile: 'Compléter le profil',
  },
  nl: {
    header: 'Archer stelt uw brief op',
    name: 'Uw volledige naam', address: 'Uw adres', email: 'Uw email',
    recipientName: 'Naam ontvanger', recipientAddress: 'Adres ontvanger',
    docDate: 'Datum van het document', amount: 'Belangrijkst bedrag',
    note: 'Voeg een persoonlijke noot toe voor Archer', noteMax: '200 tekens',
    generate: 'Genereer brief met Archer', generating: 'Archer schrijft',
    downloadPdf: 'Download PDF', sendHelloSign: 'Verstuur via HelloSign',
    editArcher: 'Bewerk met Archer', close: 'Sluiten',
    preview: 'Briefvoorbeeld',
    detected: 'Gedetecteerd door Archer uit uw document',
    profileLocked: 'Van uw profiel',
    incompleteProfile: 'Vul uw profiel aan zodat u dit nooit meer hoeft in te vullen',
    completeProfile: 'Profiel aanvullen',
  },
};

const Field = ({ label, value, onChange, locked, hint, autoComplete }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ fontSize: 10, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>{label}</label>
    <input
      value={value}
      onChange={e => !locked && onChange(e.target.value)}
      readOnly={locked}
      autoComplete={autoComplete || 'on'}
      style={{
        width: '100%', padding: '7px 10px', fontSize: 11,
        border: '0.5px solid #e2e0db', borderRadius: 7,
        background: locked ? '#f3f4f6' : '#fafafa',
        color: locked ? '#6b7280' : '#374151',
        cursor: locked ? 'default' : 'text',
      }}
    />
    {hint && <div style={{ fontSize: 8, color: '#9ca3af', marginTop: 2, fontStyle: 'italic' }}>{hint}</div>}
  </div>
);

const LetterFormModal = ({ step, caseId, caseData, userName, userEmail, userAddress, lang, onClose, onOpenChat, onNavigate, tone }) => {
  const t = T[lang] || T.en;

  // Determine profile completeness
  const hasName = !!userName;
  const hasAddress = !!userAddress;
  const profileComplete = hasName && hasAddress;

  // Pre-fill from case data (extracted by Archer)
  const oppName = caseData?.opposing_party_name || '';
  const oppAddr = caseData?.opposing_party_address || '';
  const docDate = caseData?.document_date || '';
  const amount = caseData?.primary_amount ? String(caseData.primary_amount) : (caseData?.financial_exposure || '');

  const [form, setForm] = useState({
    senderName: userName || '',
    senderAddress: userAddress || '',
    senderEmail: userEmail || '',
    recipientName: oppName,
    recipientAddress: oppAddr,
    docDate: docDate,
    amount: typeof amount === 'number' ? String(amount) : (amount || ''),
    note: '',
  });
  const [generating, setGenerating] = useState(false);
  const [letter, setLetter] = useState(null);

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/cases/${caseId}/generate-action-letter`, {
        action_title: step.title || '',
        action_description: step.description || '',
        tone: tone || 'citizen',
        sender_name: form.senderName,
        sender_address: form.senderAddress,
        recipient_name: form.recipientName,
        recipient_address: form.recipientAddress,
        doc_date: form.docDate,
        amount: form.amount,
        personal_note: form.note,
      }, { withCredentials: true });
      setLetter(res.data);
    } catch (e) {
      setLetter({ body: lang === 'fr' ? 'Erreur de génération. Réessayez.' : 'Generation failed. Please try again.' });
    }
    setGenerating(false);
  };

  const handleDownloadPdf = () => {
    if (!letter) return;
    const doc = new jsPDF();
    doc.setFontSize(11);
    if (form.senderName) doc.text(form.senderName, 20, 20);
    if (form.senderAddress) doc.text(form.senderAddress, 20, 26);
    if (form.recipientName) doc.text(form.recipientName, 120, 20);
    if (form.recipientAddress) doc.text(form.recipientAddress, 120, 26);
    doc.setFontSize(12);
    if (letter.subject) doc.text(letter.subject, 20, 42);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(letter.body || '', 170);
    doc.text(lines, 20, 52);
    doc.save(`${step.title || 'letter'}.pdf`);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div data-testid="letter-form-modal" style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>{t.header}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{step.title}</div>
          </div>
          <button onClick={onClose} data-testid="close-letter-form" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#6b7280" /></button>
        </div>

        {!letter ? (
          <>
            {/* Incomplete profile banner */}
            {!profileComplete && (
              <div data-testid="incomplete-profile-banner" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 14,
                background: '#fef3c7', borderRadius: 8, border: '0.5px solid #fde68a',
              }}>
                <AlertTriangle size={14} color="#92400e" />
                <span style={{ fontSize: 11, color: '#92400e', flex: 1 }}>{t.incompleteProfile}</span>
                <button onClick={() => { onClose(); onNavigate?.('/settings'); }} data-testid="complete-profile-btn"
                  style={{ fontSize: 10, color: '#1a56db', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t.completeProfile} →
                </button>
              </div>
            )}

            {/* Form — YOUR INFO section */}
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Your information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Field label={t.name} value={form.senderName} onChange={set('senderName')} locked={hasName} hint={hasName ? t.profileLocked : null} />
              <Field label={t.email} value={form.senderEmail} onChange={set('senderEmail')} locked={!!userEmail} hint={userEmail ? t.profileLocked : null} />
            </div>
            <Field label={t.address} value={form.senderAddress} onChange={set('senderAddress')} locked={hasAddress} hint={hasAddress ? t.profileLocked : null} />

            {/* RECIPIENT INFO section */}
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, marginTop: 8 }}>Recipient information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Field label={t.recipientName} value={form.recipientName} onChange={set('recipientName')} hint={oppName ? t.detected : null} autoComplete="off" />
              <Field label={t.docDate} value={form.docDate} onChange={set('docDate')} hint={docDate ? t.detected : null} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Field label={t.recipientAddress} value={form.recipientAddress} onChange={set('recipientAddress')} hint={oppAddr ? t.detected : null} autoComplete="off" />
              <Field label={t.amount} value={form.amount} onChange={set('amount')} hint={amount ? t.detected : null} />
            </div>

            {/* Personal note */}
            <div style={{ marginBottom: 10, marginTop: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>{t.note}</label>
              <textarea value={form.note} onChange={e => set('note')(e.target.value.slice(0, 200))}
                placeholder={lang === 'fr' ? 'Contexte supplémentaire pour Archer...' : 'Additional context for Archer...'}
                style={{ width: '100%', minHeight: 56, padding: '7px 10px', fontSize: 11, border: '0.5px solid #e2e0db', borderRadius: 7, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, background: '#fafafa', color: '#374151' }} />
              <div style={{ fontSize: 8, color: '#9ca3af', textAlign: 'right' }}>{form.note.length}/200</div>
            </div>

            <button data-testid="generate-letter-btn" onClick={handleGenerate} disabled={generating}
              style={{
                width: '100%', padding: '12px 0', background: generating ? '#93b4f0' : '#1a56db', color: '#fff',
                border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: generating ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
              }}>
              {generating ? <><Loader2 size={14} className="animate-spin" />{t.generating}...</> : t.generate}
            </button>
          </>
        ) : (
          <>
            {/* Letter Preview */}
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{t.preview}</div>
            {letter.subject && <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{letter.subject}</div>}
            {letter.recipient && <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 8 }}>To: {letter.recipient}</div>}
            <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: 14, background: '#f8f7f4', borderRadius: 10, border: '0.5px solid #e2e0db', marginBottom: 12, maxHeight: 280, overflowY: 'auto' }}>
              {letter.body}
            </div>
            {letter.legal_citations && (
              <div style={{ fontSize: 9, color: '#1d4ed8', marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {letter.legal_citations.map((c) => <span key={c} style={{ padding: '2px 8px', background: '#eff6ff', borderRadius: 4 }}>{c}</span>)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleDownloadPdf} data-testid="download-letter-pdf" style={{ flex: 1, padding: '10px 0', background: '#1a56db', color: '#fff', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Download size={13} />{t.downloadPdf}
              </button>
              <button style={{ flex: 1, padding: '10px 0', background: '#f8f7f4', color: '#6b7280', border: '0.5px solid #e2e0db', borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                {t.sendHelloSign}
              </button>
            </div>
            {onOpenChat && (
              <button onClick={() => { onOpenChat(`Help me edit this letter: "${step.title}". Here is the current draft:\n\n${letter.body?.substring(0, 300)}...`); onClose(); }}
                data-testid="edit-with-archer" style={{ width: '100%', marginTop: 8, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#1a56db', fontWeight: 500 }}>
                {t.editArcher} →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LetterFormModal;
