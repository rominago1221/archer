import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { getLegalRefUrl } from '../../../utils/dashboard/legalRefs';

function CritItem({ finding, country, t }) {
  const refs = Array.isArray(finding.legal_refs) ? finding.legal_refs : [];
  return (
    <div className="crit-box" data-testid={`act3-critical-${finding.id}`}>
      <div className="crit-title">
        <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--red)' }} aria-hidden />
        {finding.title}
      </div>
      {finding.pedagogy_text && (
        <div className="crit-desc" dangerouslySetInnerHTML={{ __html: finding.pedagogy_text }} />
      )}
      {finding.do_now && finding.do_now !== finding.pedagogy_text && (
        <div className="crit-desc">
          <strong style={{ color: 'var(--ink)' }}>{t('v3.act3.critical.action_label')}</strong>{' '}
          <span dangerouslySetInnerHTML={{ __html: finding.do_now }} />
        </div>
      )}
      {refs.length > 0 && (
        <div className="crit-refs">
          <span className="law-ref-label" style={{ fontSize: 9.5, color: 'var(--ink-4)', marginRight: 6 }}>
            {t('v3.act3.critical.refs_label')}
          </span>
          {refs.map((r, i) => {
            const url = getLegalRefUrl(r, country);
            const label = typeof r === 'string' ? r : (r?.label || r?.reference || '');
            if (!label) return null;
            return (
              <a
                key={i}
                className="law-ref red"
                href={url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                title={typeof r === 'object' ? (r?.archer_explanation || label) : label}
              >
                {label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CritBox({ findings, country = 'BE', t }) {
  const list = Array.isArray(findings) ? findings : [];
  if (list.length === 0) {
    return (
      <div style={{
        padding: '18px 22px', background: 'var(--bg-soft)',
        border: '1px dashed var(--line-2)', borderRadius: 10,
        color: 'var(--ink-4)', fontSize: 12,
      }}>
        —
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="act3-crit-list">
      {list.map((f) => <CritItem key={f.id} finding={f} country={country} t={t} />)}
    </div>
  );
}
