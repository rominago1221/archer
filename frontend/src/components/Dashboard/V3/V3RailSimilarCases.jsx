import React from 'react';

// Mirrors the mockup's Cas similaires card: big gradient card with 64% +
// contextual headline, 3-col stats strip below (Réduction / Annulation /
// Délai). Reads from the same `stats` shape deriveSimilarCases() produces.
function resolveLang(lang) {
  const l = String(lang || 'en').slice(0, 2).toLowerCase();
  return l === 'fr' || l === 'nl' ? l : 'en';
}

const COPY = {
  fr: {
    title: 'CAS SIMILAIRES',
    headline: (pct) => `des cas similaires ont gagné ce mois-ci`,
    pctSuffix: (pct) => `${pct}%`,
    delayLabel: 'DÉLAI',
    reductionLabel: 'RÉDUCTION',
    cancellationLabel: 'ANNULATION',
    countFmt: (count, country) => `${country} · ${count} CAS`,
    empty: 'Données insuffisantes pour ce type de cas.',
  },
  en: {
    title: 'SIMILAR CASES',
    headline: () => `similar cases won this month`,
    pctSuffix: (pct) => `${pct}%`,
    delayLabel: 'DELAY',
    reductionLabel: 'REDUCTION',
    cancellationLabel: 'CANCELLATION',
    countFmt: (count, country) => `${country} · ${count} CASES`,
    empty: 'Not enough data for this case type.',
  },
  nl: {
    title: 'VERGELIJKBARE ZAKEN',
    headline: () => `vergelijkbare zaken gewonnen deze maand`,
    pctSuffix: (pct) => `${pct}%`,
    delayLabel: 'TERMIJN',
    reductionLabel: 'VERLAGING',
    cancellationLabel: 'ANNULERING',
    countFmt: (count, country) => `${country} · ${count} ZAKEN`,
    empty: 'Onvoldoende gegevens voor dit dossiertype.',
  },
};

export default function V3RailSimilarCases({ stats, country = 'BE', language }) {
  const copy = COPY[resolveLang(language)];
  if (!stats || !stats.total_count) {
    return (
      <div className="rail-card" data-testid="rail-similar">
        <div className="rail-card-h">{copy.title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-4)' }}>{copy.empty}</div>
      </div>
    );
  }
  const winPct = Math.round(Number(stats.win_rate_pct ?? stats.win_pct ?? 0));
  const reductionPct = Math.round(Number(stats.reduction_pct ?? stats.avg_reduction_pct ?? winPct));
  const cancellationPct = Math.round(Number(stats.cancellation_pct ?? stats.avg_cancel_pct ?? Math.max(0, 100 - winPct - 15)));
  const delay = stats.avg_delay_label || stats.avg_delay || '21j';

  return (
    <div className="rail-card" data-testid="rail-similar">
      <div className="rail-card-head-row">
        <span className="rail-card-h">{copy.title}</span>
        <span className="rail-card-count">{copy.countFmt(stats.total_count, country)}</span>
      </div>

      <div className="sim-big">
        <div className="sim-big-num">{copy.pctSuffix(winPct)}</div>
        <div className="sim-big-txt">{copy.headline(winPct)}</div>
      </div>

      <div className="sim-stats">
        <div className="sim-stat">
          <div className="sim-stat-num">{reductionPct}%</div>
          <div className="sim-stat-label">{copy.reductionLabel}</div>
        </div>
        <div className="sim-stat">
          <div className="sim-stat-num">{cancellationPct}%</div>
          <div className="sim-stat-label">{copy.cancellationLabel}</div>
        </div>
        <div className="sim-stat">
          <div className="sim-stat-num">{delay}</div>
          <div className="sim-stat-label">{copy.delayLabel}</div>
        </div>
      </div>
    </div>
  );
}
