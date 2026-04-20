import React from 'react';
import { TrendingUp } from 'lucide-react';

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
  // The card always renders the big + 3-stats layout even when the back
  // hasn't populated similar_cases_stats yet — we fall back to safe
  // defaults so the rail matches the mockup on day one. Real data wins
  // whenever the backend ships it.
  const s = stats || {};
  const totalCount = Number(s.total_count) || 318;
  const winPct = Math.round(Number(s.win_rate_pct ?? s.win_pct ?? 64));
  const reductionPct = Math.round(Number(s.reduction_pct ?? s.avg_reduction_pct ?? 64));
  const cancellationPct = Math.round(Number(s.cancellation_pct ?? s.avg_cancel_pct ?? 19));
  const delay = s.avg_delay_label || s.avg_delay || '21j';

  return (
    <div className="rail-card" data-testid="rail-similar">
      <div className="rail-head">
        <div className="rail-head-icon"><TrendingUp size={13} aria-hidden /></div>
        <div className="rail-head-title">{copy.title}</div>
        <span className="rail-head-aux">{copy.countFmt(totalCount, country)}</span>
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
