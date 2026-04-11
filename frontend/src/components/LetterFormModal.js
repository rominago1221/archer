import React, { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const T = {
  en: {
    header: 'James is drafting your letter',
    name: 'Your full name', address: 'Your address',
    recipientName: 'Recipient name', recipientAddress: 'Recipient address',
    docDate: 'Date of the document', amount: 'Key amount (if relevant)',
    note: 'Add a personal note for James', noteMax: '200 characters',
    generate: 'Generate letter with James', generating: 'James is writing',
    downloadPdf: 'Download PDF', sendHelloSign: 'Send via HelloSign',
    editJames: 'Edit with James', close: 'Close',
    preview: 'Letter Preview',
  },
  fr: {
    header: 'James rédige votre lettre',
    name: 'Votre nom complet', address: 'Votre adresse',
    recipientName: 'Nom du destinataire', recipientAddress: 'Adresse du destinataire',
    docDate: 'Date du document', amount: 'Montant clé (si pertinent)',
    note: 'Ajoutez une note personnelle pour James', noteMax: '200 caractères',
    generate: 'Générer la lettre avec James', generating: 'James rédige',
    downloadPdf: 'Télécharger PDF', sendHelloSign: 'Envoyer via HelloSign',
    editJames: 'Modifier avec James', close: 'Fermer',
    preview: 'Aperçu de la lettre',
  },
  nl: {
    header: 'James stelt uw brief op',
    name: 'Uw volledige naam', address: 'Uw adres',
    recipientName: 'Naam ontvanger', recipientAddress: 'Adres ontvanger',
    docDate: 'Datum van het document', amount: 'Belangrijkst bedrag (indien relevant)',
    note: 'Voeg een persoonlijke noot toe voor James', noteMax: '200 tekens',
    generate: 'Genereer brief met James', generating: 'James schrijft',
    downloadPdf: 'Download PDF', sendHelloSign: 'Verstuur via HelloSign',
    editJames: 'Bewerk met James', close: 'Sluiten',
    preview: 'Briefvoorbeeld',
  },
};

const Field = ({ label, value, onChange, placeholder, multiline, maxLen }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ fontSize: 10, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>{label}</label>
    {multiline ? (
      <>
        <textarea value={value} onChange={e => onChange(e.target.value.slice(0, maxLen || 500))} placeholder={placeholder}
          style={{ width: '100%', minHeight: 56, padding: '7px 10px', fontSize: 11, border: '0.5px solid #e2e0db', borderRadius: 7, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, background: '#fafafa', color: '#374151' }} />
        {maxLen && <div style={{ fontSize: 8, color: '#9ca3af', textAlign: 'right' }}>{value.length}/{maxLen}</div>}
      </>
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '7px 10px', fontSize: 11, border: '0.5px solid #e2e0db', borderRadius: 7, background: '#fafafa', color: '#374151' }} />
    )}
  </div>
);

const LetterFormModal = ({ step, caseId, caseData, userName, lang, onClose, onOpenChat }) => {
  const t = T[lang] || T.en;
  const [form, setForm] = useState({
    senderName: userName || '',
    senderAddress: '',
    recipientName: '',
    recipientAddress: '',
    docDate: '',
    amount: '',
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
    if (form.recipientName) { doc.text(form.recipientName, 120, 20); }
    if (form.recipientAddress) { doc.text(form.recipientAddress, 120, 26); }
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
            {/* Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Field label={t.name} value={form.senderName} onChange={set('senderName')} />
              <Field label={t.recipientName} value={form.recipientName} onChange={set('recipientName')} />
              <Field label={t.address} value={form.senderAddress} onChange={set('senderAddress')} />
              <Field label={t.recipientAddress} value={form.recipientAddress} onChange={set('recipientAddress')} />
              <Field label={t.docDate} value={form.docDate} onChange={set('docDate')} />
              <Field label={t.amount} value={form.amount} onChange={set('amount')} />
            </div>
            <Field label={t.note} value={form.note} onChange={set('note')} multiline maxLen={200} placeholder={lang === 'fr' ? 'Contexte supplémentaire pour James...' : 'Additional context for James...'} />

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
                {letter.legal_citations.map((c, i) => <span key={i} style={{ padding: '2px 8px', background: '#eff6ff', borderRadius: 4 }}>{c}</span>)}
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
                data-testid="edit-with-james" style={{ width: '100%', marginTop: 8, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#1a56db', fontWeight: 500 }}>
                {t.editJames} →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LetterFormModal;
