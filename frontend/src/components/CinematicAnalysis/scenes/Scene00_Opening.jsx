import React, { useEffect, useState } from 'react';
import { useCinematicT } from '../hooks/useCinematicT';

export default function Scene00_Opening({ data, language, jurisdiction = 'BE' }) {
  const t = useCinematicT(language);
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(true); }, []);

  const jurisdictionLabel = t(`jurisdiction.${jurisdiction}`);
  const title = data?.started?.message || t('scene00.opening_title');
  const subtitle = t('scene00.opening_subtitle', { jurisdiction: jurisdictionLabel });

  return (
    <div data-testid="scene-00" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', flexDirection: 'column', gap: 0, padding: '0 32px',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40,
        opacity: show ? 1 : 0, transition: 'opacity 0.6s ease',
      }}>
        {/* Document + dashed line + Archer avatar — LARGE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
          {/* Document mockup */}
          <div style={{
            width: 140, height: 180, background: '#fff', border: '0.5px solid #e2e0db',
            borderRadius: 12, padding: '20px 16px', boxShadow: '0 20px 48px rgba(10,10,15,0.1)',
            transform: 'rotate(-3deg)', animation: show ? 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ height: 6, width: '60%', background: '#1a56db', borderRadius: 2 }} />
            <div style={{ height: 4, width: '90%', background: '#e2e0db', borderRadius: 2 }} />
            <div style={{ height: 4, width: '75%', background: '#e2e0db', borderRadius: 2 }} />
            <div style={{ height: 4, width: '85%', background: '#fef3c7', borderRadius: 2 }} />
            <div style={{ height: 4, width: '55%', background: '#e2e0db', borderRadius: 2, marginTop: 6 }} />
            <div style={{ height: 4, width: '80%', background: '#e2e0db', borderRadius: 2 }} />
            <div style={{ height: 4, width: '70%', background: '#fef3c7', borderRadius: 2 }} />
            <div style={{ height: 4, width: '65%', background: '#e2e0db', borderRadius: 2 }} />
            <div style={{ height: 4, width: '50%', background: '#e2e0db', borderRadius: 2 }} />
            <div style={{ height: 4, width: '60%', background: '#fef3c7', borderRadius: 2 }} />
          </div>

          {/* Dashed line */}
          <div style={{ width: 90, borderTop: '2.5px dashed #d1d5db', position: 'relative' }}>
            <svg width="12" height="12" viewBox="0 0 10 10" style={{ position: 'absolute', right: -7, top: -6 }}>
              <polygon points="0,0 10,5 0,10" fill="#d1d5db" />
            </svg>
          </div>

          {/* Archer avatar */}
          <div style={{
            position: 'relative', width: 120, height: 120, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a56db, #1e40af)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 48, fontWeight: 800,
            boxShadow: '0 24px 60px rgba(26,86,219,0.3)', border: '5px solid #fff',
            animation: show ? 'scaleIn 0.4s ease-out forwards' : 'none',
          }}>
            A
            <span style={{
              position: 'absolute', bottom: 4, right: 4, width: 24, height: 24,
              borderRadius: '50%', background: '#16a34a', border: '4px solid #fff',
              animation: 'livepulse 1.8s ease-in-out infinite',
            }} />
          </div>
        </div>

        {/* Status line */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          animation: show ? 'fadeIn 0.5s 0.4s ease forwards' : 'none', opacity: 0,
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%', background: '#16a34a',
            animation: 'livepulse 1.8s ease-in-out infinite', display: 'inline-block',
          }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#15803d', letterSpacing: '1px', fontFamily: '"SF Mono", Monaco, monospace' }}>
            {t('scene00.online_badge')}
          </span>
        </div>

        {/* Main text */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 32, fontWeight: 800, color: '#0a0a0f', letterSpacing: -1,
            marginBottom: 10, animation: show ? 'fadeUp 0.5s 0.5s ease forwards' : 'none', opacity: 0,
          }}>
            {title}
          </div>
          <div style={{
            fontSize: 16, color: '#9ca3af', lineHeight: 1.5,
            animation: show ? 'fadeUp 0.5s 0.7s ease forwards' : 'none', opacity: 0,
          }}>
            {subtitle}
          </div>
        </div>

        {/* Loader dots */}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%', background: '#1a56db',
              animation: `dotPulse 1.2s ${i * 0.2}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
