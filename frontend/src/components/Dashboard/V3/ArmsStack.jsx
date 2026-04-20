import React from 'react';
import { BookOpen, Scale } from 'lucide-react';
import { getLegalRefUrl } from '../../../utils/dashboard/legalRefs';

// Small 44px donut used in the right column of each arm-card.
function ConfDonut({ value }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const R = 18;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - v / 100);
  const color = v >= 80 ? '#16a34a' : v >= 60 ? '#f59e0b' : '#dc2626';
  return (
    <div className="arm-conf-circ" data-testid="act3-arm-confidence">
      <svg viewBox="0 0 44 44" width="44" height="44">
        <circle cx="22" cy="22" r={R} fill="none" stroke="var(--line)" strokeWidth="4" />
        <circle
          cx="22" cy="22" r={R}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform="rotate(-90 22 22)"
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.23, 1, 0.32, 1)' }}
        />
      </svg>
      <div className="arm-conf-val" style={{ color }}>{Math.round(v)}%</div>
    </div>
  );
}

function LawRefPill({ reference, country, variant = '' }) {
  const url = getLegalRefUrl(reference, country);
  const label = typeof reference === 'string' ? reference : (reference?.label || reference?.reference || '');
  const title = typeof reference === 'object' ? (reference?.archer_explanation || reference?.explanation || label) : label;
  if (!label) return null;
  return (
    <a
      className={`law-ref ${variant}`.trim()}
      href={url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
    >
      {label}
    </a>
  );
}

function ArmCard({ num, finding, country, t }) {
  const refs = Array.isArray(finding.legal_refs) ? finding.legal_refs : [];
  const jurisCount = Number(finding.jurisprudence_count) || 0;
  const similarStat = finding.similar_cases_won != null && finding.similar_cases_total
    ? `${finding.similar_cases_won}/${finding.similar_cases_total}`
    : null;
  const confidence = finding.confidence_score != null ? finding.confidence_score : 75;

  // Build a pseudo-juris pill when we have a count but no explicit refs.
  const jurisPills = jurisCount > 0 ? [{
    label: similarStat
      ? `${similarStat} · ${jurisCount} cas`
      : `${jurisCount} cas`,
    searchQuery: finding.title,
  }] : [];

  return (
    <div className="arm-card" data-testid={`act3-arm-${num}`}>
      <div className="arm-num">{String(num).padStart(2, '0')}</div>
      <div className="arm-body">
        <div className="arm-title">{finding.title}</div>
        {(finding.reasoning || finding.pedagogy_text) && (
          <div
            className="arm-legal-desc"
            dangerouslySetInnerHTML={{ __html: finding.reasoning || finding.pedagogy_text }}
          />
        )}

        {refs.length > 0 && (
          <div className="arm-refs-row">
            <span className="law-ref-label">
              <BookOpen size={11} aria-hidden /> {t('v3.act3.arms.legal_base')}
            </span>
            <div className="law-ref-group">
              {refs.map((r, i) => <LawRefPill key={i} reference={r} country={country} />)}
            </div>
          </div>
        )}

        {jurisPills.length > 0 && (
          <div className="arm-refs-row">
            <span className="law-ref-label">
              <Scale size={11} aria-hidden /> {t('v3.act3.arms.jurisprudences')}
            </span>
            <div className="law-ref-group">
              {jurisPills.map((p, i) => (
                <a
                  key={i}
                  className="law-ref juris"
                  href={`https://juportal.be/content/search?q=${encodeURIComponent(p.searchQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={p.searchQuery}
                >
                  {p.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      <ConfDonut value={confidence} />
    </div>
  );
}

export default function ArmsStack({ findings, country = 'BE', t }) {
  const list = Array.isArray(findings) ? findings.slice(0, 5) : [];
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
    <div className="arms-stack" data-testid="act3-arms-stack">
      {list.map((f, i) => (
        <ArmCard key={f.id || i} num={i + 1} finding={f} country={country} t={t} />
      ))}
    </div>
  );
}
