import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { getCaseTypeIcon, getCaseTypeLabel } from '../utils/caseTypeIcons';
import '../styles/my-desk.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURT = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];

const TIMELINE_DAYS = 60;

function formatDateFR(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateShortFR(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MOIS_COURT[d.getMonth()]} ${d.getFullYear()}`;
}

function getDaysUntil(deadline) {
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  if (Number.isNaN(dl.getTime())) return null;
  dl.setHours(0, 0, 0, 0);
  return Math.ceil((dl - now) / (1000 * 60 * 60 * 24));
}

// Backend `case.type` mirrors `case_type`. Prefer explicit case_type when set.
function getCaseType(c) {
  return c.case_type || c.type || 'other';
}

function getRiskColor(score) {
  const s = Number(score) || 0;
  if (s <= 30) return 'green';
  if (s <= 60) return 'amber';
  return 'red';
}

function getRiskLabel(score) {
  const s = Number(score) || 0;
  if (s <= 30) return 'FAIBLE';
  if (s <= 60) return 'MODÉRÉ';
  return 'ÉLEVÉ';
}

function getDeadlineColor(days) {
  if (days === null) return 'gray';
  if (days <= 7) return 'red';
  if (days <= 30) return 'amber';
  return 'green';
}

// Parse `financial_exposure` from mixed string/numeric shapes. Backend may
// store "6 200€", "6200", "€6,200", 6200, etc.
function parseFinancial(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const str = String(value).replace(/[^0-9.,]/g, '');
  if (!str) return 0;
  // Heuristic: if both `,` and `.` appear, `,` is the thousand separator.
  // If only `,`, treat it as decimal.
  if (str.includes('.') && str.includes(',')) {
    return parseFloat(str.replace(/,/g, '')) || 0;
  }
  if (str.includes(',') && !str.includes('.')) {
    const parts = str.split(',');
    if (parts[parts.length - 1].length === 3) return parseFloat(str.replace(/,/g, '')) || 0;
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
}

function getFinancialStakes(c) {
  if (typeof c.financial_stakes === 'number') return c.financial_stakes;
  return parseFinancial(c.financial_exposure);
}

function getPotentialSavings(c) {
  if (typeof c.potential_savings === 'number') return c.potential_savings;
  if (typeof c.economie_potentielle === 'number') return c.economie_potentielle;
  return 0;
}

// Derive a step label + progress from backend state when the field isn't set
// explicitly. Keeps the UI meaningful without needing a backend migration.
function getCaseStep(c) {
  if (c.current_step && c.total_steps && c.current_step_label) {
    return { current: c.current_step, total: c.total_steps, label: c.current_step_label };
  }
  const status = String(c.status || '').toLowerCase();
  if (status === 'resolved' || status === 'won') {
    return { current: 6, total: 6, label: 'DOSSIER RÉSOLU' };
  }
  if (status === 'analyzing') {
    return { current: 1, total: 6, label: 'ANALYSE EN COURS' };
  }
  if (status === 'error') {
    return { current: 1, total: 6, label: 'ANALYSE INTERROMPUE' };
  }
  // 'active' — case has been analyzed successfully. If an AI next step is
  // available, we consider the strategy is defined (step 4/6).
  const hasNext = Array.isArray(c.ai_next_steps) ? c.ai_next_steps.length > 0 : !!c.next_action;
  if (hasNext) return { current: 4, total: 6, label: 'STRATÉGIE DÉFINIE' };
  return { current: 2, total: 6, label: 'ANALYSE COMPLÈTE' };
}

function getNextAction(c) {
  if (c.next_action) return String(c.next_action);
  if (Array.isArray(c.ai_next_steps) && c.ai_next_steps.length > 0) {
    const first = c.ai_next_steps[0];
    if (typeof first === 'string') return first;
    return first?.action || first?.title || first?.text || '';
  }
  return '';
}

function formatDeadlineBadge(c, days) {
  const status = String(c.status || '').toLowerCase();
  if (status === 'resolved' || status === 'won') return '✓ RÉSOLU';
  if (days === null) return 'PAS DE DEADLINE';
  if (days <= 0) return 'URGENT';
  return `J+${days}`;
}

function getFirstName(user) {
  const name = (user?.name || '').trim();
  if (!name) return 'Utilisateur';
  return name.split(/\s+/)[0];
}

function useClientCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    axios.get(`${API}/cases`, { withCredentials: true })
      .then((res) => {
        if (!alive) return;
        const list = Array.isArray(res.data) ? res.data : (res.data?.cases || []);
        setCases(list);
      })
      .catch(() => { if (alive) setCases([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { cases, loading };
}

// Theme buckets — 5 always visible, aggregated from real cases. The keys
// here map to the CSS gradient variants (.real-estate, .traffic, .work,
// .consumer, .contract) defined in my-desk.css.
const THEME_BUCKETS = [
  { key: 'real-estate', label: 'Immobilier · Bail', icon: '🏠', match: ['housing', 'rental', 'real_estate', 'lease', 'eviction', 'logement'] },
  { key: 'traffic', label: 'Routier · Infractions', icon: '🚗', match: ['traffic', 'driving'] },
  { key: 'contract', label: 'Contrats', icon: '📝', match: ['contract', 'commercial', 'contrat', 'nda', 'business'] },
  { key: 'work', label: 'Travail', icon: '💼', match: ['employment', 'labor', 'workplace', 'dismissal', 'work', 'travail'] },
  { key: 'consumer', label: 'Consommation', icon: '🛒', match: ['consumer', 'telecom', 'conso', 'purchase'] },
];

function getBucketForType(type) {
  const normalized = String(type || '').toLowerCase().replace(/[- ]/g, '_');
  return THEME_BUCKETS.find((b) => b.match.includes(normalized))?.key || null;
}

function TimelinePin({ c, position, anchor }) {
  const navigate = useNavigate();
  const days = getDaysUntil(c.deadline);
  const color = getDeadlineColor(days);
  const anchorCls = anchor ? ` anchor-${anchor}` : '';
  return (
    <div
      className={`tl-pin-wrap ${color}${anchorCls}`}
      style={{ left: `${position}%` }}
      onClick={() => navigate(`/cases/${c.case_id || c._id}`)}
      role="button"
      tabIndex={0}
    >
      <div className="tl-pin" />
      <div className="tl-pin-mini">
        <span className="tl-pin-mini-date">dans {days} jours</span>
      </div>
      <div className="tl-card">
        <div className="tl-card-head">
          <span className="tl-card-theme">{getCaseTypeIcon(getCaseType(c))} {getCaseTypeLabel(getCaseType(c))}</span>
          <span className="tl-card-days">{days} j</span>
        </div>
        <div className="tl-card-title">{c.title || '—'}</div>
        <div className="tl-card-action">{getNextAction(c) || '—'}</div>
        <div className="tl-card-date">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          {formatDateFR(c.deadline)}
        </div>
      </div>
    </div>
  );
}

function UrgentCard({ c }) {
  const navigate = useNavigate();
  const days = getDaysUntil(c.deadline);
  const tone = days !== null && days <= 3 ? 'red' : 'amber';
  const nextAction = getNextAction(c);
  const caseId = c.case_id || c._id;
  return (
    <div
      className={`urgent-card ${tone === 'amber' ? 'amber' : ''}`}
      onClick={() => navigate(`/cases/${caseId}`)}
    >
      <div className="urgent-top">
        <span className="urgent-theme">
          <span className="urgent-theme-icon">{getCaseTypeIcon(getCaseType(c))}</span>
          {getCaseTypeLabel(getCaseType(c)).toUpperCase()}
        </span>
        <span className="urgent-deadline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          {days !== null ? `DANS ${days} JOUR${days > 1 ? 'S' : ''}` : 'URGENT'}
        </span>
      </div>
      <div className="urgent-title">{c.title || '—'}</div>
      {nextAction && (
        <div className="urgent-next-action">
          <div className="urgent-na-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </div>
          <div className="urgent-na-body">
            <div className="urgent-na-label">PROCHAINE ACTION</div>
            <div className="urgent-na-text">{nextAction}</div>
          </div>
        </div>
      )}
      <div className="urgent-bottom">
        <div className="urgent-meta">
          <span className="urgent-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            Ouvert {formatDateShortFR(c.created_at)}
          </span>
          {c.risk_score != null && (
            <span className="urgent-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              Risque {c.risk_score}
            </span>
          )}
        </div>
        <button
          className="urgent-cta"
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/cases/${caseId}`); }}
        >
          Ouvrir le dossier
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </button>
      </div>
    </div>
  );
}

function CaseCard({ c }) {
  const navigate = useNavigate();
  const days = getDaysUntil(c.deadline);
  const step = getCaseStep(c);
  const riskColor = getRiskColor(c.risk_score);
  const deadlineColor = getDeadlineColor(days);
  const nextAction = getNextAction(c);
  const progressPct = Math.round((step.current / step.total) * 100);
  const resolved = String(c.status || '').toLowerCase() === 'resolved' || String(c.status || '').toLowerCase() === 'won';
  const caseId = c.case_id || c._id;
  return (
    <div className="case-card" onClick={() => navigate(`/cases/${caseId}`)}>
      <div className="case-card-top">
        <span className="case-card-theme">
          <span className="case-card-theme-ico">{getCaseTypeIcon(getCaseType(c))}</span>
          {getCaseTypeLabel(getCaseType(c)).toUpperCase()}
        </span>
        <span className={`case-card-risk ${riskColor}`}>
          <span className="case-card-risk-dot" />
          {c.risk_score != null ? `${c.risk_score} · ${getRiskLabel(c.risk_score)}` : '—'}
        </span>
      </div>
      <div className="case-card-title">{c.title || '—'}</div>
      <div className="case-card-progress">
        <div className="case-card-progress-row">
          <span>{step.label}</span>
          <span className="case-card-progress-val">{step.current} / {step.total} ÉTAPES</span>
        </div>
        <div className="case-card-progress-bar">
          <div
            className={`case-card-progress-fill${resolved ? ' resolved' : ''}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      {nextAction && (
        <div className="case-card-next">
          <div className={`case-card-next-icon${resolved ? ' resolved' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <span>{nextAction}</span>
        </div>
      )}
      <div className="case-card-meta">
        <span className="case-card-date">{formatDateShortFR(c.created_at).toUpperCase()}</span>
        <span className={`case-card-deadline ${deadlineColor}`}>
          {deadlineColor !== 'gray' && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          )}
          {formatDeadlineBadge(c, days)}
        </span>
      </div>
    </div>
  );
}

export default function MyDesk() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cases, loading } = useClientCases();
  const [filter, setFilter] = useState('all');

  const today = useMemo(() => new Date(), []);
  const firstName = getFirstName(user);

  const activeCases = useMemo(
    () => cases.filter((c) => String(c.status || '').toLowerCase() !== 'archived'),
    [cases]
  );

  const urgentCases = useMemo(() => {
    return activeCases
      .filter((c) => {
        const d = getDaysUntil(c.deadline);
        return d !== null && d <= 10;
      })
      .sort((a, b) => getDaysUntil(a.deadline) - getDaysUntil(b.deadline));
  }, [activeCases]);

  const totalAtStake = useMemo(
    () => activeCases.reduce((sum, c) => sum + (getPotentialSavings(c) || getFinancialStakes(c) || 0), 0),
    [activeCases]
  );

  const distinctThemes = useMemo(
    () => new Set(activeCases.map((c) => getCaseType(c))).size,
    [activeCases]
  );

  const nextDeadlineCase = useMemo(() => {
    const sorted = activeCases
      .filter((c) => getDaysUntil(c.deadline) !== null && getDaysUntil(c.deadline) >= 0)
      .sort((a, b) => getDaysUntil(a.deadline) - getDaysUntil(b.deadline));
    return sorted[0] || null;
  }, [activeCases]);

  const daysToNext = nextDeadlineCase ? getDaysUntil(nextDeadlineCase.deadline) : null;

  // Timeline pins: every active case whose deadline is within TIMELINE_DAYS.
  const timelinePins = useMemo(() => {
    return activeCases
      .map((c) => ({ c, days: getDaysUntil(c.deadline) }))
      .filter(({ days }) => days !== null && days >= 0 && days <= TIMELINE_DAYS)
      .sort((a, b) => a.days - b.days);
  }, [activeCases]);

  // 3 month headers covering the rolling 60-day window.
  const monthHeaders = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (let i = 0; i <= TIMELINE_DAYS; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ key, month: d.getMonth(), year: d.getFullYear() });
      }
      if (out.length === 3) break;
    }
    // Day ranges per month header, for readability.
    return out.map((h, idx) => {
      const first = idx === 0 ? today.getDate() : 1;
      const nextMonthStart = new Date(h.year, h.month + 1, 0).getDate();
      const last = idx === out.length - 1
        ? Math.min(nextMonthStart, today.getDate() + (TIMELINE_DAYS - (out.length - 1 - idx) * 30))
        : nextMonthStart;
      return { ...h, first, last };
    });
  }, [today]);

  // All-cases filter tabs + counts.
  const filterCounts = useMemo(() => {
    const counts = {
      all: cases.length,
      urgent: cases.filter((c) => {
        const d = getDaysUntil(c.deadline);
        return d !== null && d <= 10 && String(c.status).toLowerCase() !== 'archived';
      }).length,
      active: cases.filter((c) => {
        const s = String(c.status || '').toLowerCase();
        return s === 'active' || s === 'in_progress' || s === 'analyzing';
      }).length,
      resolved: cases.filter((c) => {
        const s = String(c.status || '').toLowerCase();
        return s === 'resolved' || s === 'won';
      }).length,
      archived: cases.filter((c) => String(c.status || '').toLowerCase() === 'archived').length,
    };
    return counts;
  }, [cases]);

  const filteredCases = useMemo(() => {
    const sorted = [...cases].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (filter === 'urgent') {
      return sorted.filter((c) => {
        const d = getDaysUntil(c.deadline);
        return d !== null && d <= 10 && String(c.status).toLowerCase() !== 'archived';
      });
    }
    if (filter === 'active') {
      return sorted.filter((c) => {
        const s = String(c.status || '').toLowerCase();
        return s === 'active' || s === 'in_progress' || s === 'analyzing';
      });
    }
    if (filter === 'resolved') {
      return sorted.filter((c) => {
        const s = String(c.status || '').toLowerCase();
        return s === 'resolved' || s === 'won';
      });
    }
    if (filter === 'archived') {
      return sorted.filter((c) => String(c.status || '').toLowerCase() === 'archived');
    }
    return sorted;
  }, [cases, filter]);

  // Theme bucket counts.
  const themeCounts = useMemo(() => {
    const counts = Object.fromEntries(THEME_BUCKETS.map((b) => [b.key, 0]));
    activeCases.forEach((c) => {
      const bucket = getBucketForType(getCaseType(c));
      if (bucket) counts[bucket] = (counts[bucket] || 0) + 1;
    });
    return counts;
  }, [activeCases]);

  if (loading) {
    return (
      <div className="my-desk" data-testid="my-desk-loading">
        <div style={{ padding: 40, color: '#8a8a95' }}>Chargement de ton bureau…</div>
      </div>
    );
  }

  const hasCases = cases.length > 0;
  const totalStakeFmt = new Intl.NumberFormat('fr-FR').format(Math.round(totalAtStake));

  return (
    <div className="my-desk" data-testid="my-desk">
      {/* ── HERO HEADER ────────────────────────── */}
      <div className="hero-header">
        <div className="hero-body">
          <div className="hero-eyebrow">{formatDateFR(today)}</div>
          <h1 className="hero-title">
            Hello <span className="accent">{firstName}</span>.
          </h1>
          <div className="hero-sub">
            <span><strong>{activeCases.length}</strong> dossier{activeCases.length > 1 ? 's' : ''} actif{activeCases.length > 1 ? 's' : ''}</span>
            {urgentCases.length > 0 && (
              <>
                <span className="hero-sub-dot" />
                <span className="urg"><strong>{urgentCases.length}</strong> urgent{urgentCases.length > 1 ? 's' : ''} cette semaine</span>
              </>
            )}
            {daysToNext !== null && (
              <>
                <span className="hero-sub-dot" />
                <span>prochaine deadline dans <strong>{daysToNext} jour{daysToNext > 1 ? 's' : ''}</strong></span>
              </>
            )}
          </div>
        </div>

        <div className="hero-stats-wrap">
          <span className="hero-stats-pill">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            En jeu cette semaine
          </span>
          <div className="hero-stats-row">
            <div className="hero-stat">
              <div className="hero-stat-top">
                <div className="hero-stat-icon blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <span className="hero-stat-num blue">{activeCases.length}</span>
              </div>
              <span className="hero-stat-label">Dossiers actifs</span>
              <span className="hero-stat-sub">{distinctThemes} thème{distinctThemes > 1 ? 's' : ''} juridique{distinctThemes > 1 ? 's' : ''}</span>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-top">
                <div className="hero-stat-icon red">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14.5" /></svg>
                </div>
                <span className="hero-stat-num urg">{urgentCases.length}</span>
              </div>
              <span className="hero-stat-label">Urgents</span>
              <span className="hero-stat-sub urg">Sous 10 jours</span>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-top">
                <div className="hero-stat-icon green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                </div>
                <span className="hero-stat-num good">{totalStakeFmt}€</span>
              </div>
              <span className="hero-stat-label">À récupérer</span>
              <span className="hero-stat-sub good">Potentiel estimé</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── EMPTY STATE ─────────────────────────── */}
      {!hasCases && (
        <div className="my-desk-empty">
          <h3>Ouvre ton premier dossier</h3>
          <p>Upload un document ou raconte ta situation — Archer analyse en quelques secondes et prépare ta stratégie.</p>
          <button type="button" onClick={() => navigate('/documents')}>+ Ouvrir un nouveau dossier</button>
        </div>
      )}

      {/* ── TIMELINE ────────────────────────────── */}
      {hasCases && timelinePins.length > 0 && (
        <section className="timeline-section">
          <div className="section-title-row">
            <h2 className="section-title">📅 Timeline des deadlines</h2>
            <div className="section-title-rule" />
            <span className="section-title-link">60 JOURS À VENIR</span>
          </div>
          <div className="timeline-card">
            <div className="timeline-months">
              {monthHeaders.map((m, idx) => (
                <div key={m.key} className={`timeline-month${idx === 0 ? ' current' : ''}`}>
                  <span>{MOIS[m.month].charAt(0).toUpperCase() + MOIS[m.month].slice(1)} {m.year}</span>
                  <span className="timeline-month-days">{m.first} → {m.last}</span>
                </div>
              ))}
            </div>
            <div className="timeline-track">
              <div className="timeline-line" />
              <div className="timeline-ticks">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="timeline-tick" />)}
              </div>
              <div className="timeline-today">
                <div className="timeline-today-flag">AUJ.</div>
              </div>
              {timelinePins.map(({ c, days }, idx) => {
                const position = Math.max(2, Math.min(98, (days / TIMELINE_DAYS) * 100));
                // Anchor popovers near the edges so they stay on-screen.
                const anchor = position < 15 ? 'left' : position > 85 ? 'right' : null;
                return (
                  <TimelinePin
                    key={c.case_id || c._id || idx}
                    c={c}
                    position={position}
                    anchor={anchor}
                  />
                );
              })}
            </div>
            <div className="timeline-legend">
              <div className="timeline-legend-left">
                <span className="timeline-legend-item"><span className="timeline-legend-dot red" />Moins de 7 jours</span>
                <span className="timeline-legend-item"><span className="timeline-legend-dot amber" />7 à 30 jours</span>
                <span className="timeline-legend-item"><span className="timeline-legend-dot green" />Plus de 30 jours</span>
              </div>
              <span className="timeline-range">
                <span>{formatDateShortFR(today).toUpperCase()} → {formatDateShortFR(new Date(today.getTime() + TIMELINE_DAYS * 86400000)).toUpperCase()}</span>
                <span className="timeline-range-count">{timelinePins.length} deadline{timelinePins.length > 1 ? 's' : ''}</span>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── URGENT SECTION ──────────────────────── */}
      {urgentCases.length > 0 && (
        <section className="urgent-section">
          <div className="section-title-row">
            <h2 className="section-title">
              ⚡ À faire maintenant
              <span className="section-title-badge red">{urgentCases.length} URGENT{urgentCases.length > 1 ? 'S' : ''}</span>
            </h2>
            <div className="section-title-rule" />
            <button type="button" className="section-title-link" onClick={() => { setFilter('urgent'); }}>
              TOUT VOIR →
            </button>
          </div>
          <div className="urgent-grid">
            {urgentCases.slice(0, 4).map((c) => (
              <UrgentCard key={c.case_id || c._id} c={c} />
            ))}
          </div>
        </section>
      )}

      {/* ── THEMES ─────────────────────────────── */}
      {hasCases && (
        <section className="themes-section">
          <div className="section-title-row">
            <h2 className="section-title">🗂 Par thème juridique</h2>
            <div className="section-title-rule" />
          </div>
          <div className="themes-grid">
            {THEME_BUCKETS.map((b) => {
              const count = themeCounts[b.key] || 0;
              return (
                <div key={b.key} className={`theme-bucket${count === 0 ? ' theme-bucket-empty' : ''}`}>
                  <div className={`theme-bucket-icon ${b.key}`}>{b.icon}</div>
                  <div className="theme-bucket-label">{b.label}</div>
                  <div className="theme-bucket-count">
                    {count > 0
                      ? <><strong>{count}</strong> dossier{count > 1 ? 's' : ''}</>
                      : 'Aucun dossier'}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── ALL CASES ──────────────────────────── */}
      {hasCases && (
        <section className="all-cases-section">
          <div className="section-title-row">
            <h2 className="section-title">📁 Tous mes dossiers</h2>
            <div className="section-title-rule" />
            <span className="section-title-link">TRIER PAR : RÉCENT ▾</span>
          </div>
          <div className="all-cases-filters">
            <button type="button" className={`all-cases-filter${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
              Tous <span className="count">{filterCounts.all}</span>
            </button>
            <button type="button" className={`all-cases-filter${filter === 'urgent' ? ' active' : ''}`} onClick={() => setFilter('urgent')}>
              Urgents <span className="count">{filterCounts.urgent}</span>
            </button>
            <button type="button" className={`all-cases-filter${filter === 'active' ? ' active' : ''}`} onClick={() => setFilter('active')}>
              En cours <span className="count">{filterCounts.active}</span>
            </button>
            <button type="button" className={`all-cases-filter${filter === 'resolved' ? ' active' : ''}`} onClick={() => setFilter('resolved')}>
              Résolus <span className="count">{filterCounts.resolved}</span>
            </button>
            <button type="button" className={`all-cases-filter${filter === 'archived' ? ' active' : ''}`} onClick={() => setFilter('archived')}>
              Archivés <span className="count">{filterCounts.archived}</span>
            </button>
          </div>
          <div className="all-cases-grid">
            {filteredCases.map((c) => (
              <CaseCard key={c.case_id || c._id} c={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
