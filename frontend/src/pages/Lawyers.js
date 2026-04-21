import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import '../styles/lawyers-v2.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Map the existing /api/lawyers payload (lawyer_id/specialty/bar_state/...)
// onto the fields the new UI wants (is_live, available_in_minutes, ...).
function normalizeLawyer(raw) {
  const status = raw.availability_status || 'later';
  const mins = raw.availability_minutes || 0;
  return {
    ...raw,
    is_live: status === 'now',
    available_in_minutes: status === 'soon' ? mins : null,
    available_label: status === 'later' ? (raw.availability_label || 'Demain matin') : null,
  };
}

function getStatusClass(lawyer) {
  if (lawyer.is_live) return 'now';
  if (lawyer.available_in_minutes) return 'soon';
  return 'later';
}

function getStatusLabel(lawyer, lang) {
  if (lawyer.is_live) return 'ONLINE';
  if (lawyer.available_in_minutes) {
    return lang === 'fr' ? `Dans ${lawyer.available_in_minutes} min` : `In ${lawyer.available_in_minutes} min`;
  }
  return lawyer.available_label || (lang === 'fr' ? 'Bientôt' : 'Later');
}

function getInitials(name) {
  if (!name) return '?';
  const clean = name.replace(/^Me\.?\s+/i, '').trim();
  const parts = clean.split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function displayName(lawyer, isBelgian) {
  if (!lawyer.name) return '';
  if (isBelgian && !/^Me\b/i.test(lawyer.name)) return `Me ${lawyer.name}`;
  return lawyer.name;
}

const Lawyers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const isBelgian = user?.jurisdiction === 'BE' || user?.country === 'BE';
  const lang = isBelgian ? 'fr' : 'en';

  const plan = (user?.plan || 'free').toLowerCase();
  const canBookCall = plan !== 'free';

  const fetchLawyers = useCallback(async () => {
    try {
      const params = {};
      if (user?.jurisdiction) params.country = user.jurisdiction;
      const res = await axios.get(`${API}/lawyers`, { params });
      setLawyers((res.data || []).map(normalizeLawyer));
    } catch (error) {
      console.error('Lawyers fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.jurisdiction]);

  useEffect(() => {
    fetchLawyers();
    const interval = setInterval(fetchLawyers, 60000);
    return () => clearInterval(interval);
  }, [fetchLawyers]);

  const onlineCount = useMemo(() => lawyers.filter(l => l.is_live).length, [lawyers]);

  const specialtyFilters = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const l of lawyers) {
      if (l.specialty && !seen.has(l.specialty)) {
        seen.add(l.specialty);
        out.push(l.specialty);
      }
    }
    return out;
  }, [lawyers]);

  const filteredLawyers = useMemo(() => {
    if (filter === 'all') return lawyers;
    if (filter === 'now') return lawyers.filter(l => l.is_live);
    return lawyers.filter(l => (l.specialty || '').toLowerCase() === filter.toLowerCase());
  }, [lawyers, filter]);

  const onlineLawyers = filteredLawyers.filter(l => l.is_live);
  const laterLawyers = filteredLawyers.filter(l => !l.is_live);

  const handleBook = (lawyer) => {
    if (!canBookCall) {
      navigate('/pricing');
      return;
    }
    navigate(`/lawyers/book?lawyer=${lawyer.lawyer_id}`);
  };

  if (loading) {
    return (
      <div className="lawyers-v2" data-testid="lawyers-page">
        <div className="hero">
          <div>
            <div className="hero-eyebrow">{isBelgian ? 'Appels avocat' : 'Lawyer calls'}</div>
            <h1 className="hero-title">
              {isBelgian ? 'Parlez à un avocat dans la minute' : 'Talk to a lawyer in under a minute'}
            </h1>
          </div>
        </div>
        <div className="lawyers-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="lawyer-card" style={{ minHeight: 220, opacity: 0.5 }} />
          ))}
        </div>
      </div>
    );
  }

  const filters = isBelgian ? [
    { key: 'all', label: 'Tous', count: lawyers.length },
    { key: 'now', label: 'Online maintenant', count: onlineCount },
    ...specialtyFilters.map(s => ({ key: s, label: s })),
  ] : [
    { key: 'all', label: 'All', count: lawyers.length },
    { key: 'now', label: 'Online now', count: onlineCount },
    ...specialtyFilters.map(s => ({ key: s, label: s })),
  ];

  return (
    <div className="lawyers-v2" data-testid="lawyers-page">
      {/* HERO */}
      <div className="hero">
        <div className="hero-body">
          <div className="hero-eyebrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            {isBelgian ? 'Appels avocat' : 'Lawyer calls'}
          </div>
          <h1 className="hero-title">
            {isBelgian ? 'Parlez à un avocat dans la minute' : 'Talk to a lawyer in under a minute'}
          </h1>
          <p className="hero-sub">
            {isBelgian ? (
              <>Avocats belges agréés, disponibles à la demande. <strong>Sessions illimitées</strong> de 30 minutes — déjà incluses dans ton abonnement.</>
            ) : (
              <>Licensed attorneys, available on demand. <strong>Unlimited sessions</strong> of 30 minutes — included in your plan.</>
            )}
          </p>
        </div>
        <div className="plan-badge">
          {canBookCall ? (
            <>
              <span className="plan-pill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M8 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                {isBelgian ? 'Unlimited · Book for free' : 'Unlimited · Book for free'}
              </span>
              <span className="plan-sub">
                {isBelgian ? <><strong>Inclus</strong> dans ton plan {plan}</> : <><strong>Included</strong> in your {plan} plan</>}
              </span>
            </>
          ) : (
            <>
              <span className="plan-pill locked" onClick={() => navigate('/pricing')} role="button" style={{ cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                {isBelgian ? "S'abonner pour débloquer" : 'Subscribe to unlock'}
              </span>
              <span className="plan-sub">
                {isBelgian ? <>Plan <strong>Free</strong> actif</> : <>Plan <strong>Free</strong> active</>}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ONLINE BANNER — hidden if nobody online */}
      {onlineCount > 0 && (
        <div className="online-banner" data-testid="online-banner">
          <div className="online-banner-icon" />
          <div className="online-banner-body">
            <div className="online-banner-title">
              {isBelgian ? (
                <><strong>{onlineCount} {onlineCount > 1 ? 'avocats sont en ligne' : 'avocat est en ligne'}</strong> et {onlineCount > 1 ? 'prêts' : 'prêt'} à te répondre maintenant</>
              ) : (
                <><strong>{onlineCount} {onlineCount > 1 ? 'lawyers are online' : 'lawyer is online'}</strong> and ready to help you now</>
              )}
            </div>
            <div className="online-banner-sub">
              {isBelgian ? 'Connection en moins de 2 minutes — direct video ou chat' : 'Connect in under 2 minutes — video or chat'}
            </div>
          </div>
          <span className="online-banner-count">LIVE · {onlineCount}</span>
        </div>
      )}

      {/* FILTERS */}
      <div className="filters" data-testid="filters">
        {filters.map(f => (
          <button
            key={f.key}
            type="button"
            className={`filter-chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
            data-testid={`filter-${f.key}`}
          >
            {f.label}
            {typeof f.count === 'number' && <span className="count">{f.count}</span>}
          </button>
        ))}
      </div>

      {/* ONLINE SECTION */}
      {onlineLawyers.length > 0 && (
        <>
          <div className="section-title-break online">
            <span>⚡ <strong>{isBelgian ? 'Online maintenant' : 'Online now'}</strong> · {onlineLawyers.length} {isBelgian ? (onlineLawyers.length > 1 ? 'avocats prêts à te répondre' : 'avocat prêt à te répondre') : (onlineLawyers.length > 1 ? 'lawyers ready to help' : 'lawyer ready to help')}</span>
          </div>
          <div className="lawyers-grid">
            {onlineLawyers.map(lawyer => (
              <LawyerCard
                key={lawyer.lawyer_id}
                lawyer={lawyer}
                isBelgian={isBelgian}
                lang={lang}
                canBookCall={canBookCall}
                onBook={handleBook}
              />
            ))}
          </div>
        </>
      )}

      {/* LATER SECTION */}
      {laterLawyers.length > 0 && (
        <>
          <div className="section-title-break">
            <span>{isBelgian ? 'Disponibles plus tard' : 'Available later'} · {laterLawyers.length}</span>
          </div>
          <div className="lawyers-grid">
            {laterLawyers.map(lawyer => (
              <LawyerCard
                key={lawyer.lawyer_id}
                lawyer={lawyer}
                isBelgian={isBelgian}
                lang={lang}
                canBookCall={canBookCall}
                onBook={handleBook}
              />
            ))}
          </div>
        </>
      )}

      {filteredLawyers.length === 0 && (
        <div className="empty-state">
          {isBelgian ? 'Aucun avocat ne correspond à ce filtre.' : 'No lawyer matches this filter.'}
        </div>
      )}
    </div>
  );
};

function LawyerCard({ lawyer, isBelgian, lang, canBookCall, onBook }) {
  const statusClass = getStatusClass(lawyer);
  const statusLabel = getStatusLabel(lawyer, lang);
  const name = displayName(lawyer, isBelgian);
  const cardClass = lawyer.is_live ? 'lawyer-card premium' : 'lawyer-card';
  const tags = Array.isArray(lawyer.tags) ? lawyer.tags.slice(0, 3) : [];

  return (
    <div
      className={cardClass}
      onClick={() => onBook(lawyer)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onBook(lawyer); }}
      data-testid={`lawyer-card-${lawyer.lawyer_id}`}
    >
      <div className="lawyer-photo-wrap">
        <div className="lawyer-photo">
          {lawyer.photo_url ? (
            <img src={lawyer.photo_url} alt={name} />
          ) : (
            <span aria-hidden="true">{getInitials(name)}</span>
          )}
        </div>
        <div className={`lawyer-status ${statusClass}`}>{statusLabel}</div>
      </div>

      <div className="lawyer-body">
        <div className="lawyer-head">
          <div>
            <div className="lawyer-name">{name}</div>
          </div>
          <div className="lawyer-rating">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {Number(lawyer.rating || 0).toFixed(1)}
            <span className="sessions">· {lawyer.sessions_count || 0}</span>
          </div>
        </div>

        <div className="lawyer-meta">
          {lawyer.specialty && <span>{lawyer.specialty}</span>}
          {lawyer.specialty && lawyer.bar_state && <span className="lawyer-meta-dot" />}
          {lawyer.bar_state && <span>{lawyer.bar_state}</span>}
          {lawyer.years_experience > 0 && <span className="lawyer-meta-dot" />}
          {lawyer.years_experience > 0 && (
            <span className="years">
              {lawyer.years_experience} {isBelgian ? 'ans' : 'yrs'}
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="lawyer-tags">
            {tags.map((tag, i) => (
              <span key={i} className="lawyer-tag">{tag}</span>
            ))}
          </div>
        )}

        <div className="lawyer-footer">
          <div className="lawyer-free-block">
            <div className="lawyer-free-main">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="lawyer-free-text">
                {isBelgian ? (
                  <>Book a call — <strong>for free</strong></>
                ) : (
                  <>Book a call — <strong>for free</strong></>
                )}
              </span>
            </div>
            <span className="lawyer-free-sub">
              {canBookCall
                ? (isBelgian ? 'Unlimited avec ton plan' : 'Unlimited with your plan')
                : (isBelgian ? 'Débloqué avec Solo+' : 'Unlocked with Solo+')}
            </span>
          </div>
          <button
            type="button"
            className={`lawyer-cta${canBookCall ? '' : ' locked'}`}
            onClick={(e) => { e.stopPropagation(); onBook(lawyer); }}
            data-testid={`book-lawyer-${lawyer.lawyer_id}-btn`}
          >
            {canBookCall
              ? (isBelgian ? 'Réserver' : 'Book')
              : (isBelgian ? "S'abonner" : 'Subscribe')}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Lawyers;
