import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCinematicT } from '../hooks/useCinematicT';
import { PRICING } from '../../../config/pricing';

const AUTO_REDIRECT_MS = 5000;

export default function Scene07_Landing({ data, language, jurisdiction = 'BE', caseId }) {
  const navigate = useNavigate();
  const t = useCinematicT(language);
  const [phase, setPhase] = useState(0);

  const scoreData = data?.score_ready?.score || {};
  const findings = data?.findings_ready?.findings || [];
  const battle = data?.battle_ready || {};
  const strat = data?.strategy_ready || {};
  const sp = strat.success_probability || {};

  const total = scoreData.total || 0;
  const scoreColor = total > 70 ? '#b91c1c' : total > 40 ? '#b45309' : '#15803d';
  const levelKey = total > 85 ? 'scene03.risk_critical' : total > 70 ? 'scene03.risk_high' : total > 40 ? 'scene03.risk_moderate' : 'scene03.risk_low';
  const level = t(levelKey);

  const userArgs = battle.user_side?.strongest_arguments || battle.user_side?.strong_arguments || [];
  const oppArgs = battle.opposing_side?.opposing_arguments || [];
  const userScore = userArgs.length;
  const oppScore = oppArgs.length;

  const favorable = (sp.full_resolution_in_favor || sp.resolution_favorable || 0) + (sp.negotiated_settlement || sp.compromis_negocie || 0) + (sp.partial_loss || sp.perte_partielle || 0);
  const steps = strat.next_steps || [];
  const critFindings = findings.filter(f => f.type === 'risk' || f.type === 'deadline');
  const goodFindings = findings.filter(f => f.type === 'opportunity' || f.type === 'neutral');

  const attorneyPriceDisplay = PRICING[jurisdiction]?.attorney_letter?.display || PRICING.US.attorney_letter.display;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1200);
    // Auto-redirect to case detail after AUTO_REDIRECT_MS so the cinematic ends gracefully
    // even when the user does not click a CTA. User can still click any CTA earlier.
    const t3 = setTimeout(() => navigate(`/cases/${caseId}`, { replace: true }), AUTO_REDIRECT_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [caseId, navigate]);

  const stepColors = ['#b91c1c', '#b45309', '#15803d'];

  return (
    <div data-testid="scene-07" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', padding: '32px 24px',
    }}>
      <div style={{
        background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 16, padding: 24,
        maxWidth: 1000, width: '100%', boxShadow: '0 24px 60px rgba(10,10,15,0.08)',
        opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? 'scale(1)' : 'scale(0.95)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '0.5px solid #e2e0db' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: '#fef3c7', borderRadius: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: '#b45309', letterSpacing: '0.5px' }}>{t('scene07.dashboard_type')}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.5 }}>
              {data?.complete?.full_result?.suggested_case_title || data?.score_ready?.tagline || t('scene07.case_default_title')}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              {t('scene07.updated_just_now')}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 20px', background: `${scoreColor}15`, borderRadius: 12 }}>
            <div style={{ fontSize: 9, color: scoreColor, fontWeight: 800, letterSpacing: '0.5px', marginBottom: 2 }}>{t('scene07.score_label')}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: scoreColor, letterSpacing: -1, lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: 9, color: scoreColor, fontWeight: 700 }}>{level}</div>
          </div>
        </div>

        {/* 3 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {/* Findings */}
          <div>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 800, letterSpacing: '0.8px', marginBottom: 10 }}>{t('scene07.findings_header', { count: findings.length })}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...critFindings, ...goodFindings].slice(0, 4).map((f, i) => (
                <div key={i} style={{
                  background: '#fafaf8', borderLeft: `2px solid ${f.type === 'opportunity' || f.type === 'neutral' ? '#15803d' : '#b91c1c'}`,
                  padding: '8px 10px', borderRadius: 6,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#0a0a0f' }}>{(f.text || '').substring(0, 50)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Battle */}
          <div>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 800, letterSpacing: '0.8px', marginBottom: 10 }}>
              {t('scene07.battle_header', { user: userScore, opp: oppScore })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {userArgs.slice(0, 3).map((a, i) => (
                <div key={`u${i}`} style={{ background: '#eff6ff', padding: '6px 8px', borderRadius: 4, fontSize: 9, color: '#1a56db', fontWeight: 700 }}>
                  {(a.argument || '').substring(0, 20)}
                </div>
              ))}
              {oppArgs.slice(0, 2).map((a, i) => (
                <div key={`o${i}`} style={{ background: '#fee2e2', padding: '6px 8px', borderRadius: 4, fontSize: 9, color: '#b91c1c', fontWeight: 700 }}>
                  {(a.argument || '').substring(0, 20)}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: '8px 10px', background: '#eff6ff', borderRadius: 6, textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#1a56db' }}>
              {t('scene07.advantage', { user: userScore, opp: oppScore })}
            </div>
          </div>

          {/* Plan */}
          <div>
            <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 800, letterSpacing: '0.8px', marginBottom: 10 }}>
              {t('scene07.plan_header', { count: steps.length })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {steps.slice(0, 3).map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: stepColors[i], color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: 10, color: '#0a0a0f', fontWeight: 700 }}>{(s.title || '').substring(0, 30)}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'linear-gradient(135deg, #eff6ff, #dcfce7)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: '#1a56db', fontWeight: 800, letterSpacing: '0.3px' }}>
                {t('scene07.chances_header')}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1a56db', letterSpacing: -0.8 }}>{favorable}%</div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{
          marginTop: 20, paddingTop: 16, borderTop: '0.5px solid #e2e0db',
          display: 'flex', gap: 8,
          opacity: phase >= 2 ? 1 : 0, transition: 'opacity 0.5s ease',
        }}>
          <button
            data-testid="attorney-letter-cta"
            onClick={() => navigate(`/cases/${caseId}`)}
            style={{ flex: 2, padding: 12, border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: '#1a56db', color: '#fff' }}
          >
            {t('scene07.attorney_letter_cta', { price: attorneyPriceDisplay })}
          </button>
          <button
            data-testid="diy-letter-cta"
            onClick={() => navigate(`/cases/${caseId}`)}
            style={{ flex: 1, padding: 12, borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: '#fff', color: '#0a0a0f', border: '0.5px solid #e2e0db' }}
          >
            {t('scene07.diy_letter_cta')}
          </button>
          <button
            data-testid="ask-archer-cta"
            onClick={() => navigate(`/cases/${caseId}`)}
            style={{ flex: 1, padding: 12, borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', background: '#fff', color: '#0a0a0f', border: '0.5px solid #e2e0db' }}
          >
            {t('scene07.ask_archer_cta')}
          </button>
        </div>
      </div>
    </div>
  );
}
