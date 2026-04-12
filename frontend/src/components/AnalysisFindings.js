import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { sanitizeHtml } from '../utils/sanitize';

const SECTION_CONFIG = {
  CRITICAL: {
    borderColor: '#dc2626',
    badgeBg: '#fff5f5', badgeColor: '#dc2626', badgeBorder: '#fca5a5',
    labels: {
      en: { badge: 'Critical points', sub: (n) => `${n} item${n > 1 ? 's' : ''} — act now` },
      fr: { badge: 'Points critiques', sub: (n) => `${n} élément${n > 1 ? 's' : ''} — agissez maintenant` },
      nl: { badge: 'Kritieke punten', sub: (n) => `${n} element${n > 1 ? 'en' : ''} — onderneem nu actie` },
      de: { badge: 'Kritische Punkte', sub: (n) => `${n} Element${n > 1 ? 'e' : ''} — jetzt handeln` },
      es: { badge: 'Puntos críticos', sub: (n) => `${n} elemento${n > 1 ? 's' : ''} — actúe ahora` },
    },
  },
  IMPORTANT: {
    borderColor: '#d97706',
    badgeBg: '#fffbeb', badgeColor: '#d97706', badgeBorder: '#fcd34d',
    labels: {
      en: { badge: 'Important points', sub: (n) => `${n} item${n > 1 ? 's' : ''} — strengthen your case` },
      fr: { badge: 'Points importants', sub: (n) => `${n} élément${n > 1 ? 's' : ''} — renforcent votre position` },
      nl: { badge: 'Belangrijke punten', sub: (n) => `${n} element${n > 1 ? 'en' : ''} — versterken uw positie` },
      de: { badge: 'Wichtige Punkte', sub: (n) => `${n} Element${n > 1 ? 'e' : ''} — stärken Ihre Position` },
      es: { badge: 'Puntos importantes', sub: (n) => `${n} elemento${n > 1 ? 's' : ''} — fortalecen su caso` },
    },
  },
  ATTENTION: {
    borderColor: '#1a56db',
    badgeBg: '#eff6ff', badgeColor: '#1a56db', badgeBorder: '#bfdbfe',
    labels: {
      en: { badge: 'Points to note', sub: (n) => `${n} item${n > 1 ? 's' : ''} — complicate but not blocking` },
      fr: { badge: "Points d'attention", sub: (n) => `${n} élément${n > 1 ? 's' : ''} — compliquent mais pas bloquants` },
      nl: { badge: 'Aandachtspunten', sub: (n) => `${n} element${n > 1 ? 'en' : ''} — compliceren maar niet blokkerend` },
      de: { badge: 'Aufmerksamkeitspunkte', sub: (n) => `${n} Element${n > 1 ? 'e' : ''} — komplizieren aber nicht blockierend` },
      es: { badge: 'Puntos de atención', sub: (n) => `${n} elemento${n > 1 ? 's' : ''} — complican pero no bloquean` },
    },
  },
};

function classifyFinding(f) {
  const text = ((f.text || '') + ' ' + (f.legal_ref || '') + ' ' + (f.risk_if_ignored || '') + ' ' + (f.do_now || '') + ' ' + (f.impact_description || '')).toLowerCase();
  const impact = (f.impact || '').toLowerCase();
  const type = (f.type || '').toLowerCase();

  // CRITICAL: deadline, void/invalid, immediate right, violation, permanent loss
  if (type === 'deadline' || impact === 'high' || type === 'risk') {
    const criticalSignals = [
      'deadline', 'délai', 'void', 'invalid', 'nulle', 'nul', 'illegal',
      'violation', 'perte', 'loss', 'lose', 'perdez', 'irréversible',
      'irreversible', 'impératif', 'imperative', 'définitif', 'definitive',
      'critical', 'critique', 'immediately', 'immédiatement', 'urgent',
      'days', 'jours', 'mois', 'months', 'within',
    ];
    if (criticalSignals.some(s => text.includes(s))) return 'CRITICAL';
    if (impact === 'high') return 'CRITICAL';
  }

  // IMPORTANT: strengthens position, calculation, presumption
  const importantSignals = [
    'strengthen', 'renforce', 'calcul', 'formula', 'formule', 'claeys',
    'presumption', 'présomption', 'error', 'erreur', 'prouver', 'prove',
    'advantage', 'avantage', 'levier', 'leverage', 'incorrect', 'favorable',
  ];
  if (importantSignals.some(s => text.includes(s))) return 'IMPORTANT';
  if (impact === 'medium') return 'IMPORTANT';

  return 'ATTENTION';
}

const FindingCard = ({ finding, sectionType, isCompact }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = SECTION_CONFIG[sectionType];
  const titleSize = isCompact ? 11 : 12;
  const bodySize = isCompact ? 10 : 11;
  const chipSize = isCompact ? 9 : 10;

  return (
    <div
      data-testid={`finding-card-${sectionType.toLowerCase()}`}
      style={{ display: 'flex', overflow: 'hidden', border: '0.5px solid #e2e0db', borderRadius: 8, background: '#fff', marginBottom: 6, cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Left accent bar */}
      <div style={{ width: 3, flexShrink: 0, background: cfg.borderColor }} />

      {/* Body */}
      <div style={{ flex: 1, padding: isCompact ? '8px 10px' : '10px 12px' }}>
        {/* Title */}
        <div style={{ fontSize: titleSize, fontWeight: 500, color: '#0a0a0f', marginBottom: 3, lineHeight: 1.4 }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(finding.text || '') }}
        />

        {/* Law reference */}
        {finding.legal_ref && (
          <div style={{ fontSize: chipSize, color: '#1a56db', fontWeight: 500, marginBottom: 5 }}>
            {finding.legal_ref}{finding.jurisprudence ? ` · ${finding.jurisprudence}` : ''}
          </div>
        )}

        {/* Expanded content */}
        {expanded && (
          <>
            {/* Impact description */}
            {finding.impact_description && (
              <div style={{ fontSize: bodySize, color: '#4b5563', lineHeight: 1.5, marginBottom: 5 }}>
                {finding.impact_description}
              </div>
            )}

            {/* Action chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {finding.do_now && (
                <span style={{ background: '#f0fdf4', color: '#16a34a', border: '0.5px solid #86efac', borderRadius: 12, padding: '2px 8px', fontSize: chipSize, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {finding.do_now}
                </span>
              )}
              {sectionType === 'CRITICAL' && finding.risk_if_ignored && (
                <span style={{ background: '#fff5f5', color: '#dc2626', border: '0.5px solid #fca5a5', borderRadius: 12, padding: '2px 8px', fontSize: chipSize, fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {finding.risk_if_ignored}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Chevron */}
      <div style={{ padding: isCompact ? '8px 10px' : '10px 12px', alignSelf: 'flex-start', color: '#9ca3af', flexShrink: 0 }}>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
    </div>
  );
};

const SectionHeader = ({ type, count, lang, isFirst, isCompact }) => {
  const cfg = SECTION_CONFIG[type];
  const l = cfg.labels[lang] || cfg.labels.en;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: isFirst ? 0 : (isCompact ? 10 : 14) }}>
      <span style={{
        fontSize: isCompact ? 9 : 10, fontWeight: 500, padding: '3px 10px', borderRadius: 12,
        background: cfg.badgeBg, color: cfg.badgeColor, border: `0.5px solid ${cfg.badgeBorder}`,
      }}>
        {l.badge}
      </span>
      <span style={{ fontSize: isCompact ? 9 : 10, color: '#9ca3af' }}>{l.sub(count)}</span>
    </div>
  );
};

const AnalysisFindings = ({ findings, lang, isCompact = false }) => {
  if (!findings || findings.length === 0) return null;

  const classified = { CRITICAL: [], IMPORTANT: [], ATTENTION: [] };
  findings.forEach(f => {
    const cat = classifyFinding(f);
    classified[cat].push(f);
  });

  const sections = ['CRITICAL', 'IMPORTANT', 'ATTENTION'];
  let isFirst = true;

  return (
    <div data-testid="analysis-findings-sections">
      {sections.map(type => {
        if (classified[type].length === 0) return null;
        const wasFirst = isFirst;
        isFirst = false;
        return (
          <div key={type} data-testid={`section-${type.toLowerCase()}`}>
            <SectionHeader type={type} count={classified[type].length} lang={lang} isFirst={wasFirst} isCompact={isCompact} />
            {classified[type].map((f, idx) => (
              <FindingCard
                key={`${type}-${idx}-${(f.text || '').slice(0, 20)}`}
                finding={f}
                sectionType={type}
                isCompact={isCompact}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default AnalysisFindings;
