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

// Split one "combo" reference string into multiple short pill labels.
// Many legacy findings arrive as a single string like
//   "Ordonnance bruxelloise 27/07/2017 + Ordonnance 28/10/2021; art. 224"
// which overflows the pill. We split on `+` / `;` / ` · ` / ` | `, trim
// each, and compact long prefixes (Ordonnance → Ord., Arrêté → AR,
// Code civil → C. civ., etc.).
const ABBREV_FR = [
  [/\bordonnance\s+(bruxelloise|wallonne|flamande)?\s*/i, (_, w) => `Ord.${w ? ' ' + w.slice(0, 3).toLowerCase() + '.' : ''} `],
  [/\barticle\s+/ig, 'art. '],
  [/\barr[êe]t[ée]s?\s+royal/gi, 'AR'],
  [/\barr[êe]t[ée]s?\s+ministeriel/gi, 'AM'],
  [/\bcode\s+civil\s+(ancien|nouveau)?\s*/gi, (_, w) => `${w ? 'nv ' : ''}C. civ. `],
  [/\bcode\s+judiciaire/gi, 'C. jud.'],
  [/\bcode\s+p[ée]nal/gi, 'C. pén.'],
  [/\bcode\s+du\s+travail/gi, 'C. trav.'],
  [/\s+(d[eu]?\s+la\s+)?bail\s+d.habitation\b/gi, ''],
  [/\s+r[ée]sidentiel(s)?\b/gi, ''],
  [/\bcassation\b/gi, 'Cass.'],
  [/\s+\([^)]+\)/g, ''], // drop parenthetical clarifiers
];

function compactLabel(raw) {
  let s = String(raw).trim();
  if (!s) return '';
  for (const [re, repl] of ABBREV_FR) {
    s = s.replace(re, repl);
  }
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > 30) s = s.slice(0, 29) + '…';
  return s;
}

function splitRef(rawRef) {
  const label = typeof rawRef === 'string' ? rawRef : (rawRef?.label || rawRef?.reference || '');
  if (!label) return [];
  return String(label)
    .split(/\s*[+;]\s*|\s+\|\s+|\s+·\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function LawRefPill({ label, rawRef, country, variant = '' }) {
  const url = getLegalRefUrl(label, country);
  const title = typeof rawRef === 'object'
    ? (rawRef?.archer_explanation || rawRef?.explanation || label)
    : label;
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

function expandRefs(rawRefs) {
  const out = [];
  for (const r of rawRefs) {
    const parts = splitRef(r);
    if (parts.length === 0) {
      const label = typeof r === 'string' ? r : (r?.label || r?.reference || '');
      if (label) out.push({ label: compactLabel(label), raw: r });
    } else {
      for (const p of parts) out.push({ label: compactLabel(p), raw: r });
    }
  }
  return out.filter(p => p.label);
}

// Normalise a confidence value that may arrive as either 0-1 (ratio) or
// 0-100 (percentage). Anything ≤1 is treated as a ratio and scaled up.
// Null / 0 falls back to 75 so the donut shows a green-ish default rather
// than the alarming "1%" we saw with legacy findings.
function normaliseConfidence(raw) {
  if (raw == null) return 75;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 75;
  if (n <= 1) return Math.round(n * 100);
  return Math.round(Math.min(100, n));
}

function ArmCard({ num, finding, country, t }) {
  const refs = Array.isArray(finding.legal_refs) ? finding.legal_refs : [];
  const jurisCount = Number(finding.jurisprudence_count) || 0;
  const similarStat = finding.similar_cases_won != null && finding.similar_cases_total
    ? `${finding.similar_cases_won}/${finding.similar_cases_total}`
    : null;
  const confidence = normaliseConfidence(finding.confidence_score);

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
              {expandRefs(refs).map((p, i) => (
                <LawRefPill key={i} label={p.label} rawRef={p.raw} country={country} />
              ))}
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
