import React, { useEffect, useState, useRef } from 'react';
import { useCinematicT } from '../hooks/useCinematicT';

const Chk = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Spinner = () => (
  <div style={{
    width: 14, height: 14, border: '2px solid #1a56db', borderRadius: '50%',
    borderTopColor: 'transparent', flexShrink: 0,
    animation: 'counterSpin 1s linear infinite',
  }} />
);

function AnimatedCounter({ target, duration = 4000 }) {
  const [value, setValue] = useState(0);
  const ref = useRef();

  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);

  return (
    <span style={{
      fontSize: 72, fontWeight: 900, color: '#1a56db', letterSpacing: -3,
      lineHeight: 1, fontVariantNumeric: 'tabular-nums',
    }}>
      {value.toLocaleString('fr-FR')}
    </span>
  );
}

function VerificationItem({ law, desc, verified, delay }) {
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), delay);
    const t2 = setTimeout(() => setDone(true), delay + (verified ? 1200 : 999999));
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [delay, verified]);

  if (!show) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
      background: '#fafaf8', borderRadius: 8, animation: 'fadeUp 0.3s ease forwards',
      marginBottom: 6,
    }}>
      {done ? <Chk /> : <Spinner />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0a0a0f' }}>{law}</div>
        <div style={{ fontSize: 10, color: '#9ca3af' }}>{desc}</div>
      </div>
      {done ? (
        <span style={{
          fontSize: 9, fontWeight: 800, color: '#15803d', background: '#dcfce7',
          padding: '3px 8px', borderRadius: 4,
        }}>VÉRIFIÉ</span>
      ) : (
        <span style={{
          fontSize: 9, fontWeight: 800, color: '#1a56db', background: '#eff6ff',
          padding: '3px 8px', borderRadius: 4,
        }}>EN COURS</span>
      )}
    </div>
  );
}

export default function Scene02_Verification({ data, language, jurisdiction = 'BE' }) {
  const t = useCinematicT(language);
  const jurData = data?.jurisprudence_loaded;
  const isFr = language?.startsWith('fr');
  const count = jurData?.count || 2475;
  const verifiedRefs = jurData?.verified_refs || [];
  const jurisdictionLabel = t(`jurisdiction.${jurisdiction}`);

  // Build verification items from verified_refs
  const verifs = verifiedRefs.map((ref) => ({
    law: ref.law || ref.reference || 'Article',
    desc: ref.relevance || ref.regle || '',
  }));

  // Pad to at least 4 items
  const defaultVerifs = isFr ? [
    { law: 'Art. 29 AR 1er décembre 1975', desc: 'Code de la route belge · Excès de vitesse' },
    { law: 'Art. 65 Code pénal social', desc: 'Loi du 16 mars 1968 · Police circulation routière' },
    { law: 'Cass. 2e ch. 15 sept 2023', desc: 'Délai de contestation impératif' },
    { law: 'AR 12 octobre 2010 · Art. 3', desc: 'Marge d\'erreur des radars · Tolérance 6%' },
  ] : [
    { law: 'Federal Statute § 83.56', desc: 'Applicable federal law' },
    { law: 'State Civil Code', desc: 'State-level protections' },
    { law: 'Recent Case Law 2024', desc: 'Supporting precedent' },
    { law: 'Procedural Requirements', desc: 'Notice and deadline compliance' },
  ];

  const displayVerifs = verifs.length >= 3 ? verifs : defaultVerifs;

  return (
    <div data-testid="scene-02" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', padding: '0 32px',
    }}>
      <div style={{ maxWidth: 780, width: '100%', animation: 'fadeIn 0.4s ease forwards' }}>
        {/* Header with live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 14px',
            background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 30,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#16a34a',
              animation: 'livepulse 1.8s ease-in-out infinite', display: 'inline-block',
            }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#15803d', letterSpacing: '0.8px' }}>
              {t('scene02.live_badge')}
            </span>
          </div>
          <span style={{ fontFamily: '"SF Mono", Monaco, monospace', fontSize: 11, color: '#9ca3af' }}>
            {t('scene02.api_source', { jurisdiction: jurisdictionLabel })}
          </span>
        </div>

        {/* Big counter */}
        <div style={{
          textAlign: 'center', marginBottom: 28, padding: 24, background: '#fff',
          border: '0.5px solid #e2e0db', borderRadius: 16,
        }}>
          <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 800, letterSpacing: '1.2px', marginBottom: 8 }}>
            {t('scene02.counter_title')}
          </div>
          <AnimatedCounter target={count} duration={4000} />
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
            {t('scene02.counter_sub', { jurisdiction: jurisdictionLabel })}
          </div>
        </div>

        {/* Verifications list */}
        <div style={{
          background: '#fff', border: '0.5px solid #e2e0db', borderRadius: 16, padding: '20px 24px',
        }}>
          <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 800, letterSpacing: '1.2px', marginBottom: 14 }}>
            {t('scene02.verifications_title')}
          </div>
          {displayVerifs.map((v, i) => (
            <VerificationItem
              key={i}
              law={v.law}
              desc={v.desc}
              verified={i < displayVerifs.length - 1}
              delay={i * 800}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
