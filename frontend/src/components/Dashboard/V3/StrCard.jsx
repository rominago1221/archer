import React, { useState } from 'react';
import axios from 'axios';
import {
  Check, Pen, Mail, Scale, Download, Lock, Star, CheckCircle2,
} from 'lucide-react';
import { deriveStrCard } from '../../../utils/dashboard/v3/strCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function ProjBar({ proj }) {
  return (
    <div className="str-proj-bar-wrap" data-testid="act2-projection-bar">
      <div className="str-proj-seg-win"  style={{ flex: proj.win }} />
      <div className="str-proj-seg-deal" style={{ flex: proj.deal }} />
      <div className="str-proj-seg-loss" style={{ flex: proj.loss }} />
    </div>
  );
}

function Opt({ tone, children }) {
  // Wrapper adds the tone class (diy / mail / reco)
  return <div className={`v1-opt ${tone}`} data-testid={`act2-option-${tone}`}>{children}</div>;
}

export default function StrCard({
  caseDoc, strategy, userPlan, language, t,
  onDiy, onAttorney,
}) {
  const { confidence, title, jurisCount, checklist, proj, projPlaceholder } = deriveStrCard(caseDoc, strategy);
  const [waitlistState, setWaitlistState] = useState({ submitting: false, joined: false, error: null });

  const isFree = userPlan === 'free';

  const submitWaitlist = async () => {
    if (waitlistState.submitting || waitlistState.joined) return;
    setWaitlistState({ submitting: true, joined: false, error: null });
    try {
      await axios.post(`${API}/waitlist/erecommanded`, {
        case_id: caseDoc?.case_id || caseDoc?.id || null,
      }, { withCredentials: true });
      setWaitlistState({ submitting: false, joined: true, error: null });
    } catch (e) {
      setWaitlistState({ submitting: false, joined: false, error: e });
    }
  };

  // Mockup subtitle: "Basé sur X jurisprudences BE similaires. Rapport
  // de force en ta faveur sur les N points." We append the second
  // sentence only when we have N checklist items so the sub reads clean
  // on cases without a strategy narrative.
  const baseSub = t('v3.act2.based_on', { count: jurisCount || '—' });
  const strengthSuffix = checklist.length > 0
    ? ` ${t('v3.act2.strength_suffix', { count: checklist.length })}`
    : '';
  const subtitleText = baseSub + strengthSuffix;

  return (
    <div className="str-card" data-testid="act2-str-card">
      {/* ── HEAD ────────────────────────────────────────────────── */}
      <div className="str-head">
        <span className="str-eyebrow">
          {t('v3.act2.recommended_pill')} · {confidence}% {t('v3.act2.confidence_suffix')}
        </span>
        {title && <h2 className="str-title">{title}</h2>}
        {jurisCount > 0 && <p className="str-sub">{subtitleText}</p>}
      </div>

      {/* ── CONTENT (checklist + projection) ────────────────────── */}
      <div className="str-content">
        <div>
          <div className="str-col-label green">{t('v3.act2.letter_content_label')}</div>
          <div className="str-checklist" data-testid="act2-checklist">
            {checklist.length > 0 ? checklist.map((c, i) => (
              <div className="str-check" key={i}>
                <div className="str-check-icon"><Check size={11} strokeWidth={3.5} aria-hidden /></div>
                <div className="str-check-txt">
                  <strong>{c.text}</strong>
                  {c.ref && <span className="str-check-ref">{c.ref}</span>}
                </div>
              </div>
            )) : (
              <div className="str-check">
                <div className="str-check-icon"><Check size={11} strokeWidth={3.5} aria-hidden /></div>
                <div className="str-check-txt">{t('strategy.fallback.intro_default') || '—'}</div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="str-col-label neutral">
            {t('v3.act2.projection_label')}
            {jurisCount > 0 && ` · ${t('v3.act2.projection_sub', { count: jurisCount })}`}
          </div>
          <div className="str-proj">
            <ProjBar proj={proj} />
            <div className="str-proj-legend">
              <div className="str-proj-item">
                <div className="str-proj-dot" style={{ background: 'var(--green)' }} />
                <span className="str-proj-item-label">{t('v3.act2.proj_won')}</span>
                <span className="str-proj-item-val">{proj.win}%</span>
              </div>
              <div className="str-proj-item">
                <div className="str-proj-dot" style={{ background: 'var(--amber-bright)' }} />
                <span className="str-proj-item-label">{t('v3.act2.proj_deal')}</span>
                <span className="str-proj-item-val">{proj.deal}%</span>
              </div>
              <div className="str-proj-item">
                <div className="str-proj-dot" style={{ background: 'var(--red)' }} />
                <span className="str-proj-item-label">{t('v3.act2.proj_refused')}</span>
                <span className="str-proj-item-val">{proj.loss}%</span>
              </div>
            </div>
            {projPlaceholder && (
              <div style={{ fontSize: 10, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                {/* TODO(back): populate caseDoc.success_probability structure. */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3 OPTIONS ───────────────────────────────────────────── */}
      <div className="str-actions">
        <div className="str-actions-h">
          <span className="str-actions-title">{t('v3.act2.how_to_send')}</span>
          <span className="str-actions-sub">{t('v3.act2.options_count')}</span>
        </div>

        <div className="v1-options">
          {/* OPTION 1 — DIY */}
          <Opt tone="diy">
            <div className="v1-opt-header">
              <div className="v1-opt-icon-wrap">
                <div className="v1-opt-icon"><Pen size={17} aria-hidden /></div>
              </div>
              <div className="v1-opt-price">
                <span className="v1-opt-price-val included">
                  <Check size={11} strokeWidth={3.5} aria-hidden /> {t('v3.act2.option_diy.tag')}
                </span>
              </div>
            </div>
            <div className="v1-opt-title">{t('v3.act2.option_diy.title')}</div>
            <div className="v1-opt-desc">{t('v3.act2.option_diy.desc')}</div>
            <div className="v1-opt-bullets">
              <div className="v1-opt-bullet"><div className="v1-opt-bullet-dot" />{t('v3.act2.option_diy.bullet_1')}</div>
              <div className="v1-opt-bullet"><div className="v1-opt-bullet-dot" />{t('v3.act2.option_diy.bullet_2')}</div>
              <div className="v1-opt-bullet"><div className="v1-opt-bullet-dot" />{t('v3.act2.option_diy.bullet_3')}</div>
            </div>
            <button
              type="button"
              className="v1-opt-cta ghost"
              data-testid="act2-option-diy-cta"
              onClick={onDiy}
            >
              <Download size={13} aria-hidden /> {t('v3.act2.option_diy.cta')}
            </button>
          </Opt>

          {/* OPTION 2 — POSTAL REGISTERED MAIL (coming soon)
              Product decision: the postal flow isn't wired backend yet, but
              the marketing surface lives here so users see the future
              option. The CTA is a disabled "Bientôt disponible" with a
              title tooltip; clicking POSTs to the eRecommandé waitlist the
              same way as before so early interest is captured. */}
          <Opt tone="mail">
            <div className="v1-opt-header">
              <div className="v1-opt-icon-wrap">
                <div className="v1-opt-icon"><Mail size={17} aria-hidden /></div>
              </div>
              <div className="v1-opt-price">
                <span className="v1-opt-price-val">{t('v3.act2.option_erecommande.tag')}</span>
              </div>
            </div>
            <div className="v1-opt-title">{t('v3.act2.option_erecommande.title')}</div>
            <div
              className="v1-opt-desc"
              dangerouslySetInnerHTML={{ __html: t('v3.act2.option_erecommande.desc') }}
            />
            <div className="v1-opt-bullets">
              <div className="v1-opt-bullet"><div className="v1-opt-bullet-dot" />{t('v3.act2.option_erecommande.bullet_1')}</div>
              <div className="v1-opt-bullet"><div className="v1-opt-bullet-dot" />{t('v3.act2.option_erecommande.bullet_2')}</div>
              <div className="v1-opt-bullet"><div className="v1-opt-bullet-dot" />{t('v3.act2.option_erecommande.bullet_3')}</div>
            </div>
            <button
              type="button"
              className="v1-opt-cta ghost"
              data-testid="act2-option-erecommande-cta"
              onClick={submitWaitlist}
              disabled
              aria-disabled="true"
              title={t('v3.act2.option_erecommande.cta_soon')}
              style={{ opacity: 0.55, cursor: 'not-allowed' }}
            >
              {waitlistState.joined
                ? <><CheckCircle2 size={13} aria-hidden /> {t('v3.act2.option_erecommande.joined')}</>
                : t('v3.act2.option_erecommande.cta_soon')}
            </button>
          </Opt>

          {/* OPTION 3 — ATTORNEY SIGNED (reco) */}
          <Opt tone="reco">
            <span className="v1-opt-reco-badge">
              <Star size={9} fill="currentColor" aria-hidden /> {t('v3.act2.option_lawyer.badge')}
            </span>
            <div className="v1-opt-header">
              <div className="v1-opt-icon-wrap">
                <div className="v1-opt-icon"><Scale size={17} aria-hidden /></div>
                {isFree && (
                  <div className="v1-opt-lock-badge" data-testid="act2-option-lawyer-lock">
                    <Lock size={9} strokeWidth={3} aria-hidden />
                  </div>
                )}
              </div>
              <div className="v1-opt-price">
                <span className="v1-opt-price-sub tier">
                  <Lock size={8} strokeWidth={3} aria-hidden /> {t('v3.act2.option_lawyer.tier_label')}
                </span>
              </div>
            </div>
            <div className="v1-opt-title">{t('v3.act2.option_lawyer.title')}</div>
            <div
              className="v1-opt-desc"
              dangerouslySetInnerHTML={{ __html: t('v3.act2.option_lawyer.desc') }}
            />
            <div className="v1-opt-bullets">
              <div className="v1-opt-bullet"><div className="v1-opt-bullet-dot" />{t('v3.act2.option_lawyer.bullet_1')}</div>
              <div className="v1-opt-bullet"><div className="v1-opt-bullet-dot" />{t('v3.act2.option_lawyer.bullet_2')}</div>
              <div className="v1-opt-bullet"><div className="v1-opt-bullet-dot" />{t('v3.act2.option_lawyer.bullet_3')}</div>
            </div>
            <button
              type="button"
              className="v1-opt-cta primary"
              data-testid="act2-option-lawyer-cta"
              onClick={onAttorney}
            >
              {isFree && <Lock size={13} strokeWidth={2.5} aria-hidden />}
              {t('v3.act2.option_lawyer.cta')}
            </button>
          </Opt>
        </div>
      </div>
    </div>
  );
}
