import React, { useEffect, useState } from 'react';

const ANIM = {
  fadeUp: 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  fadeIn: 'fadeIn 0.4s ease forwards',
};

const Dot = () => (
  <span style={{
    width: 7, height: 7, borderRadius: '50%', background: '#16a34a',
    animation: 'livepulse 1.8s ease-in-out infinite', display: 'inline-block',
  }} />
);

export default function Scene00_Opening({ data }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(true); }, []);
  const msg = data?.started?.message || 'Archer ouvre votre dossier…';

  return (
    <div data-testid="scene-00" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#fafaf8', flexDirection: 'column', gap: 0, padding: '0 24px',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
        opacity: show ? 1 : 0, transition: 'opacity 0.6s ease',
      }}>
        {/* Document mini + dashed line + Archer avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {/* Document mini */}
          <div style={{
            width: 90, height: 116, background: '#fff', border: '0.5px solid #e2e0db',
            borderRadius: 8, padding: '12px 10px', boxShadow: '0 12px 32px rgba(10,10,15,0.08)',
            transform: 'rotate(-3deg)', animation: show ? ANIM.fadeUp : 'none',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ height: 4, width: '60%', background: '#1a56db', borderRadius: 1 }} />
            <div style={{ height: 3, width: '90%', background: '#e2e0db', borderRadius: 1 }} />
            <div style={{ height: 3, width: '75%', background: '#e2e0db', borderRadius: 1 }} />
            <div style={{ height: 3, width: '85%', background: '#e2e0db', borderRadius: 1 }} />
            <div style={{ height: 3, width: '50%', background: '#e2e0db', borderRadius: 1, marginTop: 4 }} />
            <div style={{ height: 3, width: '80%', background: '#e2e0db', borderRadius: 1 }} />
            <div style={{ height: 3, width: '70%', background: '#e2e0db', borderRadius: 1 }} />
            <div style={{ height: 3, width: '55%', background: '#fef3c7', borderRadius: 1 }} />
            <div style={{ height: 3, width: '65%', background: '#e2e0db', borderRadius: 1 }} />
          </div>

          {/* Dashed line */}
          <div style={{
            width: 60, borderTop: '2px dashed #e2e0db', position: 'relative',
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: 'absolute', right: -6, top: -5 }}>
              <polygon points="0,0 10,5 0,10" fill="#e2e0db" />
            </svg>
          </div>

          {/* Archer avatar */}
          <div style={{
            position: 'relative', width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a56db, #1e40af)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 32, fontWeight: 800,
            boxShadow: '0 16px 40px rgba(26,86,219,0.25)', border: '4px solid #fff',
            animation: show ? 'scaleIn 0.4s ease-out forwards' : 'none',
          }}>
            A
            <span style={{
              position: 'absolute', bottom: 2, right: 2, width: 18, height: 18,
              borderRadius: '50%', background: '#16a34a', border: '3px solid #fff',
              animation: 'livepulse 1.8s ease-in-out infinite',
            }} />
          </div>
        </div>

        {/* Filename */}
        <div style={{
          fontSize: 13, color: '#9ca3af', fontFamily: '"SF Mono", Monaco, monospace',
          animation: show ? 'fadeIn 0.5s 0.4s ease forwards' : 'none',
          opacity: 0,
        }}>
          <Dot /> <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#15803d', letterSpacing: '0.8px' }}>EN LIGNE</span>
        </div>

        {/* Action text */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 22, fontWeight: 800, color: '#0a0a0f', letterSpacing: -0.6,
            marginBottom: 6, animation: show ? 'fadeUp 0.5s 0.5s ease forwards' : 'none', opacity: 0,
          }}>
            {msg}
          </div>
          <div style={{
            fontSize: 13, color: '#9ca3af',
            animation: show ? 'fadeUp 0.5s 0.7s ease forwards' : 'none', opacity: 0,
          }}>
            {data?.started?.message?.includes('ouvre')
              ? 'Conseiller juridique senior · 20 ans d\'expérience · Belgique'
              : 'Senior legal advisor · 20 years of experience'}
          </div>
        </div>

        {/* Loader dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {[0.9, 0.6, 0.3].map((op, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: '#1a56db',
              animation: `dotPulse 1.2s ${i * 0.2}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
