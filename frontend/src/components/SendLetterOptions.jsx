import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  FileText, Send, Briefcase, ShieldCheck, AlertTriangle,
  AlertCircle, CheckCircle2, X, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent } from '../hooks/useBehaviorTracking';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ─── Copy ─────────────────────────────────────────────────────────────────
const COPY = {
  fr: {
    title: 'Envoyer ma lettre',
    subtitle: 'Choisissez comment vous voulez faire parvenir votre lettre à la partie adverse.',
    close: 'Fermer',

    diy_title: 'Lettre à envoyer vous-même',
    diy_badge: 'GRATUIT',
    diy_desc: 'Archer rédige votre lettre. Vous la téléchargez et l\u2019envoyez vous-même (email, courrier, etc.).',
    diy_perks: [
      'Gratuit, inclus dans votre plan',
      'Lettre prête en 2 minutes',
      'Format PDF professionnel',
      'Vous gardez le contrôle complet',
    ],
    diy_cta: 'Générer ma lettre',

    er_title: 'Recommandé électronique avec suivi',
    er_price: '€9',
    er_desc: 'Archer rédige et envoie votre lettre en recommandé électronique. Suivi automatique par email avec tracking temps réel.',
    er_pill: 'MÊME VALEUR JURIDIQUE qu\u2019un recommandé papier',
    er_pill_expand: 'Voir la référence légale',
    er_legal_note: 'Loi du 9 juillet 2001 sur la signature électronique · Règlement européen eIDAS 910/2014 · Opposable devant tous les tribunaux belges.',
    er_perks: [
      'Reconnu par la loi du 9 juillet 2001',
      'Conforme au règlement européen eIDAS',
      'Opposable devant tous les tribunaux belges',
      'Preuve de dépôt et accusé de réception inclus',
      'Plus rapide qu\u2019un recommandé papier (envoi instantané)',
      'Tracking automatique en temps réel',
    ],
    er_cta_phase2: 'Envoyer en eRecommandé — €9',
    er_cta_phase1: 'Bientôt disponible — Notifiez-moi',
    er_waitlist_title: 'Être notifié au lancement',
    er_waitlist_desc: 'Nous vous écrivons dès que le recommandé électronique est actif (semaine 2 post-lancement).',
    er_waitlist_email_label: 'Votre email',
    er_waitlist_submit: 'M\u2019inscrire',
    er_waitlist_joined: 'Vous êtes sur la liste ✓',
    er_required_banner: 'ENVOI RECOMMANDÉ REQUIS POUR CE CAS',
    er_recommended_banner: 'FORTEMENT RECOMMANDÉ POUR CE CAS',

    att_title: 'Lettre signée par avocat',
    att_price: '€39',
    att_desc: 'Lettre rédigée par Archer, validée, modifiée si besoin et signée par un avocat du réseau. L\u2019avocat envoie depuis son cabinet.',
    att_perks: [
      'Impact juridique maximum',
      'Signée par avocat inscrit au Barreau',
      'L\u2019avocat peut modifier selon son expertise',
      'Envoi direct depuis le cabinet',
      'Suivi du dossier avec votre avocat dédié',
    ],
    att_cta: 'Demander Attorney Letter — €39',

    warn_required_inline: 'Un recommandé est requis pour ce cas. En continuant sans, vous risquez :',
    warn_continue_anyway: 'Continuer quand même',
    warn_switch_to_er: 'Passer au recommandé',
    warn_required_pill: 'Recommandé requis',

    err_generic: 'Une erreur est survenue. Réessayez.',
  },
  en: {
    title: 'Send my letter',
    subtitle: 'Choose how you want your letter delivered to the other party.',
    close: 'Close',

    diy_title: 'Letter you send yourself',
    diy_badge: 'FREE',
    diy_desc: 'Archer drafts your letter. You download it and send it yourself (email, mail, etc.).',
    diy_perks: [
      'Free, included in your plan',
      'Ready in 2 minutes',
      'Professional PDF format',
      'You stay fully in control',
    ],
    diy_cta: 'Generate my letter',

    er_title: 'Electronic registered mail with tracking',
    er_price: '€9',
    er_desc: 'Archer drafts and sends your letter as an electronic registered letter. Automatic tracking with real-time delivery status.',
    er_pill: 'SAME LEGAL VALUE as traditional paper registered mail',
    er_pill_expand: 'See legal reference',
    er_legal_note: 'Belgian law of 9 July 2001 on electronic signatures · EU Regulation eIDAS 910/2014 · Admissible before every Belgian court.',
    er_perks: [
      'Recognised by the law of 9 July 2001',
      'Compliant with the EU eIDAS regulation',
      'Admissible before every Belgian court',
      'Proof of deposit and receipt included',
      'Faster than paper (instant delivery)',
      'Automatic real-time tracking',
    ],
    er_cta_phase2: 'Send as eRecommandé — €9',
    er_cta_phase1: 'Coming soon — Notify me',
    er_waitlist_title: 'Notify me at launch',
    er_waitlist_desc: 'We\u2019ll email you as soon as electronic registered mail goes live (week 2 post-launch).',
    er_waitlist_email_label: 'Your email',
    er_waitlist_submit: 'Add me',
    er_waitlist_joined: 'You\u2019re on the list ✓',
    er_required_banner: 'REGISTERED MAIL REQUIRED FOR THIS CASE',
    er_recommended_banner: 'STRONGLY RECOMMENDED FOR THIS CASE',

    att_title: 'Attorney-signed letter',
    att_price: '€39',
    att_desc: 'Letter drafted by Archer, validated, edited if needed and signed by a network attorney. The attorney sends it from their office.',
    att_perks: [
      'Maximum legal impact',
      'Signed by a bar-admitted attorney',
      'Attorney may edit based on their expertise',
      'Sent directly from the attorney\u2019s office',
      'Dedicated attorney follows the case',
    ],
    att_cta: 'Request Attorney Letter — €39',

    warn_required_inline: 'A registered letter is required for this case. Continuing without risks:',
    warn_continue_anyway: 'Continue anyway',
    warn_switch_to_er: 'Switch to registered',
    warn_required_pill: 'Registered required',

    err_generic: 'Something went wrong. Please try again.',
  },
  nl: {
    title: 'Mijn brief versturen',
    subtitle: 'Kies hoe u uw brief wilt laten afleveren bij de tegenpartij.',
    close: 'Sluiten',

    diy_title: 'Brief om zelf te versturen',
    diy_badge: 'GRATIS',
    diy_desc: 'Archer schrijft uw brief. U downloadt en verstuurt zelf (email, post, enz.).',
    diy_perks: [
      'Gratis, inbegrepen in uw plan',
      'Klaar in 2 minuten',
      'Professioneel PDF-formaat',
      'U behoudt volledige controle',
    ],
    diy_cta: 'Mijn brief genereren',

    er_title: 'Elektronische aangetekende brief met tracking',
    er_price: '€9',
    er_desc: 'Archer schrijft en verstuurt uw brief als elektronisch aangetekend. Automatische opvolging met real-time tracking.',
    er_pill: 'DEZELFDE JURIDISCHE WAARDE als een traditionele papieren aangetekende zending',
    er_pill_expand: 'Zie juridische referentie',
    er_legal_note: 'Wet van 9 juli 2001 op de elektronische handtekening · EU-verordening eIDAS 910/2014 · Ontvankelijk voor alle Belgische rechtbanken.',
    er_perks: [
      'Erkend door de wet van 9 juli 2001',
      'Conform eIDAS-verordening',
      'Ontvankelijk voor alle Belgische rechtbanken',
      'Bewijs van afgifte + ontvangstbewijs inbegrepen',
      'Sneller dan papier (direct verzonden)',
      'Automatische real-time tracking',
    ],
    er_cta_phase2: 'Verzenden als eRecommandé — €9',
    er_cta_phase1: 'Binnenkort beschikbaar — Houd me op de hoogte',
    er_waitlist_title: 'Op de hoogte houden bij lancering',
    er_waitlist_desc: 'We mailen u zodra elektronisch aangetekend beschikbaar is (week 2 na lancering).',
    er_waitlist_email_label: 'Uw email',
    er_waitlist_submit: 'Inschrijven',
    er_waitlist_joined: 'U staat op de lijst ✓',
    er_required_banner: 'AANGETEKEND VERZENDEN VEREIST VOOR DIT DOSSIER',
    er_recommended_banner: 'STERK AANBEVOLEN VOOR DIT DOSSIER',

    att_title: 'Brief ondertekend door advocaat',
    att_price: '€39',
    att_desc: 'Brief geschreven door Archer, gevalideerd en eventueel aangepast en ondertekend door een advocaat van het netwerk. De advocaat verstuurt vanuit zijn kantoor.',
    att_perks: [
      'Maximale juridische impact',
      'Ondertekend door advocaat aan de Balie',
      'De advocaat kan aanpassen naar zijn expertise',
      'Rechtstreeks verzonden vanuit het kantoor',
      'Eigen advocaat volgt uw dossier',
    ],
    att_cta: 'Attorney Letter aanvragen — €39',

    warn_required_inline: 'Een aangetekend schrijven is vereist voor dit dossier. Zonder dit riskeert u:',
    warn_continue_anyway: 'Toch doorgaan',
    warn_switch_to_er: 'Overschakelen naar aangetekend',
    warn_required_pill: 'Aangetekend vereist',

    err_generic: 'Er is iets misgegaan. Probeer het opnieuw.',
  },
  de: {
    title: 'Brief versenden',
    subtitle: 'Wählen Sie, wie Ihr Brief die Gegenseite erreichen soll.',
    close: 'Schließen',

    diy_title: 'Brief zum Selbstversenden',
    diy_badge: 'GRATIS',
    diy_desc: 'Archer verfasst Ihren Brief. Sie laden ihn herunter und versenden ihn selbst.',
    diy_perks: [
      'Gratis, in Ihrem Plan enthalten',
      'Fertig in 2 Minuten',
      'Professionelles PDF-Format',
      'Sie behalten die volle Kontrolle',
    ],
    diy_cta: 'Meinen Brief erstellen',

    er_title: 'Elektronischer Einschreibebrief mit Tracking',
    er_price: '€9',
    er_desc: 'Archer verfasst und versendet Ihren Brief als elektronisches Einschreiben. Automatisches Tracking in Echtzeit.',
    er_pill: 'GLEICHE RECHTSWIRKUNG wie ein traditioneller Papier-Einschreibebrief',
    er_pill_expand: 'Rechtsgrundlage anzeigen',
    er_legal_note: 'Gesetz vom 9. Juli 2001 über die elektronische Signatur · EU-Verordnung eIDAS 910/2014 · Vor allen belgischen Gerichten zulässig.',
    er_perks: [
      'Anerkannt durch Gesetz vom 9. Juli 2001',
      'eIDAS-konform',
      'Vor allen belgischen Gerichten zulässig',
      'Einlieferungs- und Empfangsnachweis inklusive',
      'Schneller als Papier (Sofortversand)',
      'Automatisches Echtzeit-Tracking',
    ],
    er_cta_phase2: 'Als eRecommandé versenden — €9',
    er_cta_phase1: 'Bald verfügbar — Benachrichtigen',
    er_waitlist_title: 'Bei Start benachrichtigen',
    er_waitlist_desc: 'Wir schreiben Ihnen, sobald elektronische Einschreibebriefe verfügbar sind.',
    er_waitlist_email_label: 'Ihre E-Mail',
    er_waitlist_submit: 'Eintragen',
    er_waitlist_joined: 'Sie sind auf der Liste ✓',
    er_required_banner: 'EINSCHREIBEN FÜR DIESEN FALL ERFORDERLICH',
    er_recommended_banner: 'FÜR DIESEN FALL DRINGEND EMPFOHLEN',

    att_title: 'Vom Anwalt unterzeichneter Brief',
    att_price: '€39',
    att_desc: 'Brief von Archer verfasst, geprüft, gegebenenfalls angepasst und von einem Netzwerk-Anwalt unterzeichnet. Versand aus der Kanzlei.',
    att_perks: [
      'Maximale juristische Wirkung',
      'Von Anwalt mit Kammerzulassung unterzeichnet',
      'Anwalt kann nach seiner Expertise anpassen',
      'Direkt aus der Kanzlei versendet',
      'Fester Anwalt begleitet den Fall',
    ],
    att_cta: 'Attorney Letter anfragen — €39',

    warn_required_inline: 'Ein Einschreiben ist für diesen Fall erforderlich. Ohne riskieren Sie:',
    warn_continue_anyway: 'Trotzdem fortfahren',
    warn_switch_to_er: 'Zu Einschreiben wechseln',
    warn_required_pill: 'Einschreiben erforderlich',

    err_generic: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.',
  },
};

function pickCopy(lang) {
  const l = String(lang || 'en').toLowerCase();
  if (l.startsWith('fr')) return COPY.fr;
  if (l.startsWith('nl')) return COPY.nl;
  if (l.startsWith('de')) return COPY.de;
  return COPY.en;
}

function Perk({ children }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
      <CheckCircle2 size={14} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </div>
  );
}

function PriceBadge({ text, tone = 'neutral' }) {
  const palette = tone === 'free'
    ? { bg: '#dcfce7', fg: '#15803d', border: '#86efac' }
    : { bg: '#eef2ff', fg: '#3730a3', border: '#c7d2fe' };
  return (
    <span style={{
      background: palette.bg, color: palette.fg, border: `1px solid ${palette.border}`,
      padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
    }}>{text}</span>
  );
}

function LevelBanner({ level, reason, legalBasis, consequence, copy }) {
  if (level !== 'required' && level !== 'recommended') return null;
  const isRequired = level === 'required';
  const palette = isRequired
    ? { bg: '#fee2e2', border: '#dc2626', fg: '#b91c1c', iconColor: '#dc2626', accent: '#b91c1c' }
    : { bg: '#fef3c7', border: '#f59e0b', fg: '#78350f', iconColor: '#b45309', accent: '#b45309' };
  const title = isRequired ? copy.er_required_banner : copy.er_recommended_banner;
  const Icon = isRequired ? AlertCircle : AlertTriangle;
  return (
    <div style={{
      background: palette.bg, border: `1px solid ${palette.border}`,
      borderRadius: 10, padding: '11px 14px', marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: palette.accent }}>
        <Icon size={15} color={palette.iconColor} />
        {title}
      </div>
      {reason && (
        <div style={{ marginTop: 7, fontSize: 12, color: palette.fg, lineHeight: 1.5 }}>
          {reason}
        </div>
      )}
      {legalBasis && (
        <div style={{ marginTop: 4, fontSize: 11, color: palette.fg, fontStyle: 'italic' }}>
          {legalBasis}
        </div>
      )}
      {isRequired && consequence && (
        <div style={{ marginTop: 6, fontSize: 12, color: palette.fg, fontWeight: 700 }}>
          {consequence}
        </div>
      )}
    </div>
  );
}

/**
 * Props:
 *   isOpen, onClose
 *   caseDoc — full case object (needed for jurisdiction, registered_mail_recommendation)
 *   language ('fr' | 'en' | 'nl' | 'de')
 *   onChoose(choice: 'basic' | 'signed') — the parent handles DIY + Attorney flows (existing handleChoiceSelect)
 */
export default function SendLetterOptions({ isOpen, onClose, caseDoc, language = 'fr', onChoose }) {
  const { user } = useAuth();
  const copy = pickCopy(language);

  const rmr = caseDoc?.registered_mail_recommendation || {};
  const level = rmr.level || 'optional';
  const isUSCase = (caseDoc?.jurisdiction || caseDoc?.country || '').toUpperCase() === 'US';
  const showERCard = !isUSCase; // Phase 1: BE-only

  const [legalNoteOpen, setLegalNoteOpen] = useState(false);
  const [showRequiredWarn, setShowRequiredWarn] = useState(null); // 'basic' | 'signed' | null
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState(user?.email || '');
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [waitlistError, setWaitlistError] = useState(null);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

  // Reset transient state each time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setLegalNoteOpen(false);
    setShowRequiredWarn(null);
    setWaitlistOpen(false);
    setWaitlistJoined(false);
    setWaitlistError(null);
    setWaitlistEmail(user?.email || '');
    trackEvent('letter_options_viewed', caseDoc?.case_id, {
      jurisdiction: caseDoc?.jurisdiction || caseDoc?.country,
      level,
    });
    trackEvent('registered_mail_level_shown', caseDoc?.case_id, { level });
  }, [isOpen, caseDoc, level, user]);

  if (!isOpen) return null;

  const triggerChoice = (choice) => {
    // For required cases, force an inline confirm on DIY + Attorney.
    if (level === 'required' && (choice === 'basic' || choice === 'signed') && showERCard && showRequiredWarn !== choice) {
      setShowRequiredWarn(choice);
      return;
    }
    if (choice === 'basic') trackEvent('diy_letter_chosen', caseDoc?.case_id);
    if (choice === 'signed') trackEvent('attorney_letter_chosen', caseDoc?.case_id);
    setShowRequiredWarn(null);
    onChoose && onChoose(choice);
  };

  const onEROpen = () => {
    trackEvent('erecommanded_notify_me_clicked', caseDoc?.case_id, { level });
    setWaitlistOpen(true);
  };

  const submitWaitlist = async () => {
    const email = (waitlistEmail || '').trim();
    if (!email || !email.includes('@')) {
      setWaitlistError('invalid_email');
      return;
    }
    setWaitlistSubmitting(true);
    setWaitlistError(null);
    try {
      await axios.post(`${API}/waitlist/erecommanded`, {
        email, case_id: caseDoc?.case_id || null,
      }, { withCredentials: true });
      setWaitlistJoined(true);
    } catch (e) {
      setWaitlistError(copy.err_generic);
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  const warnInline = (choice) => {
    if (showRequiredWarn !== choice) return null;
    const consequence = rmr.consequence_if_not_done || '';
    return (
      <div style={{
        background: '#fee2e2', border: '1px solid #dc2626', borderRadius: 10,
        padding: '12px 14px', marginTop: 12, fontSize: 12, color: '#b91c1c', lineHeight: 1.55,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{copy.warn_required_inline}</div>
        {consequence && <div style={{ marginBottom: 10 }}>{consequence}</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (choice === 'basic') trackEvent('diy_letter_chosen', caseDoc?.case_id, { after_required_warn: true });
              if (choice === 'signed') trackEvent('attorney_letter_chosen', caseDoc?.case_id, { after_required_warn: true });
              setShowRequiredWarn(null);
              onChoose && onChoose(choice);
            }}
            style={{
              padding: '7px 14px', background: '#ffffff', color: '#b91c1c',
              border: '1px solid #b91c1c', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {copy.warn_continue_anyway}
          </button>
          <button
            onClick={() => { setShowRequiredWarn(null); onEROpen(); }}
            style={{
              padding: '7px 14px', background: '#1a56db', color: '#ffffff',
              border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {copy.warn_switch_to_er}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid="send-letter-modal"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10, 10, 15, 0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 20px', zIndex: 80, overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#faf8f4', borderRadius: 20, padding: '28px 28px 24px',
          maxWidth: 720, width: '100%', boxShadow: '0 24px 60px rgba(10,10,15,0.25)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label={copy.close}
          style={{
            position: 'absolute', top: 14, right: 14, background: '#ffffff',
            border: '1px solid #e2e0db', borderRadius: '50%', width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>

        <div style={{ fontSize: 19, fontWeight: 800, color: '#0a0a0f', marginBottom: 4 }}>{copy.title}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>{copy.subtitle}</div>

        {/* ─── CARD 1 — DIY ───────────────────────────────────────────── */}
        <div data-testid="send-letter-card-diy" style={cardStyle()}>
          <div style={cardHeader()}>
            <div style={cardIcon('#dcfce7', '#15803d')}>
              <FileText size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0a0a0f' }}>{copy.diy_title}</div>
                <PriceBadge text={copy.diy_badge} tone="free" />
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55 }}>{copy.diy_desc}</div>
            </div>
          </div>

          {level === 'required' && showERCard && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef3c7',
                          border: '1px solid #f59e0b', borderRadius: 8, fontSize: 11, color: '#78350f',
                          display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={13} color="#b45309" />
              <span><strong>{copy.warn_required_pill}</strong></span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
            {copy.diy_perks.map((p, i) => <Perk key={i}>{p}</Perk>)}
          </div>
          <button
            data-testid="send-letter-diy-cta"
            onClick={() => triggerChoice('basic')}
            style={ctaStyle('#16a34a')}
          >
            {copy.diy_cta}
          </button>
          {warnInline('basic')}
        </div>

        {/* ─── CARD 2 — eRecommandé (BE only) ─────────────────────────── */}
        {showERCard && (
          <div data-testid="send-letter-card-erecommanded" style={{
            ...cardStyle(),
            border: level === 'required' ? '2px solid #dc2626' : cardStyle().border,
          }}>
            <LevelBanner
              level={level}
              reason={rmr.reason}
              legalBasis={rmr.legal_basis}
              consequence={rmr.consequence_if_not_done}
              copy={copy}
            />

            <div style={cardHeader()}>
              <div style={cardIcon('#dbeafe', '#1e40af')}>
                <Send size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0a0a0f' }}>{copy.er_title}</div>
                  <PriceBadge text={copy.er_price} />
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55 }}>{copy.er_desc}</div>
              </div>
            </div>

            {/* Legal-value pill — the conversion-critical callout */}
            <div style={{
              background: '#eff6ff', border: '1.5px solid #1a56db', borderRadius: 12,
              padding: '12px 14px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <ShieldCheck size={18} color="#1a56db" />
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a56db', letterSpacing: -0.2, lineHeight: 1.25 }}>
                  {copy.er_pill}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLegalNoteOpen((v) => !v)}
                style={{
                  marginTop: 4, padding: 0, background: 'transparent', border: 'none',
                  color: '#1a56db', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                {copy.er_pill_expand}
                {legalNoteOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {legalNoteOpen && (
                <div style={{
                  marginTop: 8, padding: '8px 10px', background: '#ffffff', border: '1px solid #dbeafe',
                  borderRadius: 8, fontSize: 11, color: '#1e40af', lineHeight: 1.55, display: 'flex',
                  alignItems: 'flex-start', gap: 8,
                }}>
                  <ExternalLink size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{copy.er_legal_note}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
              {copy.er_perks.map((p, i) => <Perk key={i}>{p}</Perk>)}
            </div>

            {!waitlistOpen ? (
              <button
                data-testid="send-letter-er-cta"
                onClick={onEROpen}
                style={ctaStyle('#1a56db')}
              >
                {copy.er_cta_phase1}
              </button>
            ) : (
              <div style={{ background: '#ffffff', border: '1px solid #dbeafe', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0a0a0f', marginBottom: 4 }}>{copy.er_waitlist_title}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, lineHeight: 1.5 }}>{copy.er_waitlist_desc}</div>
                {!waitlistJoined ? (
                  <>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5 }}>
                      {copy.er_waitlist_email_label.toUpperCase()}
                    </label>
                    <input
                      data-testid="send-letter-waitlist-email"
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      style={{
                        width: '100%', padding: '9px 12px', marginTop: 4, marginBottom: 10,
                        fontSize: 13, border: '1px solid #d1d5db', borderRadius: 8,
                      }}
                    />
                    {waitlistError && (
                      <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 8 }}>{waitlistError}</div>
                    )}
                    <button
                      data-testid="send-letter-waitlist-submit"
                      onClick={submitWaitlist}
                      disabled={waitlistSubmitting || !waitlistEmail.includes('@')}
                      style={{
                        ...ctaStyle('#1a56db'),
                        opacity: (waitlistSubmitting || !waitlistEmail.includes('@')) ? 0.5 : 1,
                      }}
                    >
                      {copy.er_waitlist_submit}
                    </button>
                  </>
                ) : (
                  <div style={{
                    background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10,
                    padding: '10px 12px', fontSize: 12, color: '#166534', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <CheckCircle2 size={14} /> {copy.er_waitlist_joined}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── CARD 3 — Attorney Letter ──────────────────────────────── */}
        <div data-testid="send-letter-card-attorney" style={cardStyle()}>
          <div style={cardHeader()}>
            <div style={cardIcon('#f3e8ff', '#6d28d9')}>
              <Briefcase size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0a0a0f' }}>{copy.att_title}</div>
                <PriceBadge text={copy.att_price} />
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55 }}>{copy.att_desc}</div>
            </div>
          </div>

          {level === 'required' && showERCard && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef3c7',
                          border: '1px solid #f59e0b', borderRadius: 8, fontSize: 11, color: '#78350f',
                          display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={13} color="#b45309" />
              <span><strong>{copy.warn_required_pill}</strong></span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
            {copy.att_perks.map((p, i) => <Perk key={i}>{p}</Perk>)}
          </div>
          <button
            data-testid="send-letter-attorney-cta"
            onClick={() => triggerChoice('signed')}
            style={ctaStyle('#6d28d9')}
          >
            {copy.att_cta}
          </button>
          {warnInline('signed')}
        </div>
      </div>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────
function cardStyle() {
  return {
    background: '#ffffff', border: '1px solid #e2e0db', borderRadius: 14,
    padding: 18, marginBottom: 14,
  };
}
function cardHeader() {
  return { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 };
}
function cardIcon(bg, fg) {
  return {
    width: 36, height: 36, borderRadius: 10,
    background: bg, color: fg,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
}
function ctaStyle(color) {
  return {
    width: '100%', padding: '11px 16px', background: color, color: '#ffffff',
    border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer',
    fontFamily: 'inherit', letterSpacing: -0.2,
  };
}
