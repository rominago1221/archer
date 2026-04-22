/**
 * AttorneyDesk — /attorneys/desk
 *
 * The attorney-facing marketplace. Shows anonymized qualified cases for
 * unlock (Stripe Checkout per case), plus the attorney's already-acquired
 * cases. Polls every 30 s so race-condition "taken" states propagate.
 *
 * Three API sources:
 *   GET /api/attorney/marketplace         → available listings
 *   GET /api/attorney/marketplace/stats   → hero KPIs
 *   GET /api/attorney/marketplace/my-cases → already-unlocked cases
 *
 * Unlock flow:
 *   POST /api/attorney/marketplace/:id/checkout → { checkout_url }
 *   window.location = checkout_url (Stripe Checkout)
 *   Stripe redirects back with ?payment=success&listing=<id>
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import { attorneyApi } from '../../hooks/attorneys/useAttorneyApi';
import '../../styles/attorney-desk.css';

const POLL_INTERVAL_MS = 30000;

function formatDate(locale = 'fr-BE') {
  try {
    return new Date().toLocaleDateString(locale, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return '';
  }
}

function formatEuros(cents) {
  if (cents == null) return '€0';
  const v = Math.round(cents / 100);
  if (v >= 1000) {
    const k = (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1);
    return `€${k}k`;
  }
  return `€${v}`;
}

function formatStakes(n) {
  if (!n) return '€0';
  if (n >= 10000) return `€${Math.round(n / 1000)}k`;
  return `€${n.toLocaleString('fr-BE')}`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'à l’instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function expiresLabel(iso) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return { text: 'expiré', urgent: true };
  const h = Math.floor(diff / 3_600_000);
  if (h <= 2) return { text: `expire dans ${h}h`, urgent: true };
  if (h <= 12) return { text: `expire dans ${h}h`, urgent: false };
  return null;
}

function statusBucket(c) {
  const s = (c.status || '').toLowerCase();
  if (['closed', 'resolved', 'archived', 'won'].includes(s)) return 'done';
  if (['analyzing', 'waiting_assignment', 'pending'].includes(s)) return 'pending';
  return 'active';
}

// Build a filter list from the listings we actually have — avoids empty chips.
function buildFilters(listings) {
  const counts = new Map();
  for (const l of listings) {
    if (!l.case_type) continue;
    counts.set(l.case_type, (counts.get(l.case_type) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([k, v]) => ({ key: k, label: buildFilters.labels[k] || k, count: v }))
    .sort((a, b) => b.count - a.count);
}
// Short labels for filter chips (kept inline so the page stays self-contained).
buildFilters.labels = {
  housing: 'Logement', rental: 'Bail', lease: 'Bail', real_estate: 'Immobilier',
  eviction: 'Expulsion',
  employment: 'Travail', labor: 'Travail', dismissal: 'Licenciement',
  wrongful_termination: 'Licenciement', severance: 'Indemnité',
  workplace_discrimination: 'Discrimination', harassment: 'Harcèlement',
  consumer_disputes: 'Consommation', consumer: 'Consommation',
  debt: 'Dette', insurance_disputes: 'Assurance', insurance: 'Assurance',
  tax_disputes: 'Fiscal', identity_theft: 'Identité',
  medical_malpractice: 'Médical', disability_claims: 'Invalidité',
  family: 'Famille', divorce: 'Divorce', custody: 'Garde',
  criminal: 'Pénal', penal: 'Pénal',
  immigration: 'Immigration', traffic: 'Roulage', driving: 'Roulage',
  contract: 'Contrats', commercial: 'Commercial', banking: 'Banque',
  inheritance: 'Succession', neighbor: 'Voisinage',
  other: 'Autre', general: 'Autre',
};

export default function AttorneyDesk() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ available: 0, acquired_this_month: 0, total_stakes: 0 });
  const [listings, setListings] = useState([]);
  const [myCases, setMyCases] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [unlocking, setUnlocking] = useState(null); // listing_id currently unlocking
  const [attorney, setAttorney] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [meRes, statsRes, listingsRes, casesRes] = await Promise.all([
        attorneyApi.get('/attorneys/me').catch(() => null),
        attorneyApi.get('/attorney/marketplace/stats'),
        attorneyApi.get('/attorney/marketplace'),
        attorneyApi.get('/attorney/marketplace/my-cases'),
      ]);
      if (meRes?.data) setAttorney(meRes.data);
      setStats(statsRes.data || { available: 0, acquired_this_month: 0, total_stakes: 0 });
      setListings(Array.isArray(listingsRes.data) ? listingsRes.data : []);
      setMyCases(Array.isArray(casesRes.data) ? casesRes.data : []);
    } catch (e) {
      // Silent: 401 will be handled by the layout's auth guard.
      // Other failures leave stale data rather than crash the page.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  // Pickup Stripe redirect query flags on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setToast({ type: 'success', text: 'Dossier débloqué ✓  —  accès complet côté "Mes dossiers".' });
      window.history.replaceState({}, '', '/attorneys/desk');
      fetchAll();
    } else if (params.get('payment') === 'cancelled') {
      setToast({ type: 'warning', text: 'Paiement annulé.' });
      window.history.replaceState({}, '', '/attorneys/desk');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const handleUnlock = async (listing) => {
    if (unlocking || listing.status !== 'available') return;
    setUnlocking(listing.listing_id);
    try {
      const res = await attorneyApi.post(`/attorney/marketplace/${listing.listing_id}/checkout`);
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
        return; // navigating away — no need to unset state
      }
      setToast({ type: 'error', text: 'Redirection Stripe indisponible.' });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const taken = err?.response?.status === 409 || (detail && detail.error === 'case_taken');
      if (taken) {
        setToast({ type: 'warning', text: 'Ce dossier vient d\'être acquis par un confrère.' });
        fetchAll();
      } else {
        const msg = (typeof detail === 'string' ? detail : detail?.message) || 'Paiement indisponible. Réessayez.';
        setToast({ type: 'error', text: msg });
      }
    } finally {
      setUnlocking(null);
    }
  };

  const filters = useMemo(() => {
    return [{ key: 'all', label: 'Tous', count: listings.length }, ...buildFilters(listings)];
  }, [listings]);

  const filteredListings = useMemo(() => {
    if (filter === 'all') return listings;
    return listings.filter((l) => l.case_type === filter);
  }, [listings, filter]);

  const greetingName = useMemo(() => {
    const ln = attorney?.last_name || '';
    if (ln) return `Me ${ln}`;
    return attorney?.first_name ? `Me ${attorney.first_name}` : 'Confrère';
  }, [attorney]);

  const heroLine = stats.available > 0
    ? <><strong>{stats.available} dossiers qualifiés</strong> attendent votre expertise. Chaque dossier a été pré-analysé par notre IA. Premier arrivé, premier servi.</>
    : <>Aucun dossier disponible pour l'instant. Les nouveaux dossiers qualifiés apparaissent en temps réel.</>;

  return (
    <AttorneyLayout>
      <div className="attorney-desk" data-testid="attorney-desk">
        {/* Top */}
        <div className="ad-top">
          <div className="ad-top-date">{formatDate()}</div>
        </div>

        {/* Hero */}
        <div className="ad-hero">
          <div>
            <div className="ad-hero-greeting">
              Bonjour, <span className="hl">{greetingName}</span>.
            </div>
            <p className="ad-hero-sub">{heroLine}</p>
          </div>
          <div className="ad-hero-kpis">
            <div className="ad-hero-kpi">
              <div className="ad-hero-kpi-num gold">{stats.available}</div>
              <div className="ad-hero-kpi-label">Disponibles</div>
            </div>
            <div className="ad-hero-kpi">
              <div className="ad-hero-kpi-num white">{stats.acquired_this_month}</div>
              <div className="ad-hero-kpi-label">Acquis ce mois</div>
            </div>
            <div className="ad-hero-kpi">
              <div className="ad-hero-kpi-num green">{formatEuros(stats.total_stakes * 100)}</div>
              <div className="ad-hero-kpi-label">Enjeux en cours</div>
            </div>
          </div>
        </div>

        {/* Section: dossiers dispo */}
        <div className="ad-sec">
          <div className="ad-sec-title">Dossiers disponibles</div>
          <div className="ad-sec-line" />
          <div className="ad-sec-badge">{filteredListings.length}</div>
        </div>

        {/* Filters */}
        {filters.length > 1 && (
          <div className="ad-filters" data-testid="ad-filters">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`ad-fchip${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
                data-testid={`ad-filter-${f.key}`}
              >
                {f.label} {f.count > 0 && <span>· {f.count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Leads */}
        {loading ? (
          <div className="ad-leads">
            {[1, 2, 3].map((i) => <div key={i} className="ad-skeleton" />)}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="ad-empty" data-testid="ad-empty">
            {stats.available === 0
              ? 'Aucun dossier qualifié disponible aujourd\'hui. Revenez demain matin — les nouveaux dossiers arrivent à toute heure.'
              : 'Aucun dossier ne correspond à ce filtre.'}
          </div>
        ) : (
          <div className="ad-leads" data-testid="ad-leads">
            {filteredListings.map((l) => {
              const isFresh = l.view_count < 3;
              const taken = l.status !== 'available';
              const expires = expiresLabel(l.expires_at);
              const riskDot = (l.risk_level || 'mid').toLowerCase();
              const isUnlocking = unlocking === l.listing_id;
              return (
                <div
                  key={l.listing_id}
                  className={`ad-lead${isFresh && !taken ? ' fresh' : ''}${taken ? ' taken' : ''}`}
                  data-testid={`ad-lead-${l.listing_id}`}
                >
                  <div className="ad-lead-body">
                    <div className="ad-lead-top">
                      <span className="ad-lead-cat">
                        {l.case_type_icon || '📁'} {l.case_type_label || l.case_type}
                      </span>
                      <span className="ad-lead-where">📍 {l.region || 'BE'}</span>
                      <span className={`ad-lead-when${expires?.urgent ? ' urgent' : ''}`}>
                        {expires ? expires.text : timeAgo(l.created_at)}
                      </span>
                    </div>
                    <div className="ad-lead-title">{l.title || 'Dossier qualifié'}</div>
                    {l.summary && <div className="ad-lead-desc">{l.summary}</div>}
                    <div className="ad-lead-facts">
                      {l.financial_stakes > 0 && (
                        <span className="ad-lead-fact">
                          <span className="ad-lead-dot mid" />
                          Enjeu <strong>{formatStakes(l.financial_stakes)}</strong>
                        </span>
                      )}
                      <span className="ad-lead-fact">
                        <span className={`ad-lead-dot ${riskDot}`} />
                        Risque <strong>{l.risk_score ?? 50}/100</strong>
                      </span>
                      {l.document_count > 0 && (
                        <span className="ad-lead-fact">
                          📎 <strong>{l.document_count}</strong> doc{l.document_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ad-lead-panel">
                    <span className="ad-lead-panel-label">Débloquer</span>
                    <span className="ad-lead-panel-price">
                      {formatEuros(l.price_cents)}
                    </span>
                    <button
                      type="button"
                      className="ad-lead-panel-cta"
                      onClick={() => handleUnlock(l)}
                      disabled={taken || isUnlocking}
                      data-testid={`ad-unlock-${l.listing_id}`}
                    >
                      {taken ? 'Pris' : isUnlocking ? '…' : 'Accéder →'}
                    </button>
                    {!taken && l.viewers_count > 1 && (
                      <span className="ad-lead-panel-watchers">
                        <span className="ad-lead-panel-watchers-dot" />
                        {l.viewers_count} confrères
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* My cases */}
        {myCases.length > 0 && (
          <>
            <div className="ad-sec" style={{ marginTop: 8 }}>
              <div className="ad-sec-title">Mes dossiers</div>
              <div className="ad-sec-line" />
              <div className="ad-sec-badge">{myCases.length}</div>
            </div>
            <div className="ad-mycases" data-testid="ad-mycases">
              {myCases.map((c) => {
                const bucket = statusBucket(c);
                return (
                  <div
                    key={c.case_id}
                    className="ad-mycase"
                    onClick={() => navigate(`/attorneys/cases/${c.case_id}`)}
                    data-testid={`ad-mycase-${c.case_id}`}
                  >
                    <div className="ad-mycase-icon">📁</div>
                    <div>
                      <div className="ad-mycase-name">{c.title || 'Dossier'}</div>
                      <div className="ad-mycase-meta">
                        <span>{c.type || 'dossier'}</span>
                        <span className="ad-mycase-meta-dot" />
                        <span>{timeAgo(c.acquired_at || c.updated_at)}</span>
                      </div>
                    </div>
                    <div className="ad-mycase-amount">
                      {c.financial_exposure ? formatStakes(c.financial_exposure) : '—'}
                    </div>
                    <span className={`ad-mycase-status ${bucket}`}>
                      {bucket === 'active' ? 'Actif' : bucket === 'pending' ? 'En cours' : 'Clôturé'}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {toast && (
          <div className={`ad-toast${toast.type !== 'success' ? ' ' + toast.type : ''}`} role="status">
            {toast.text}
          </div>
        )}
      </div>
    </AttorneyLayout>
  );
}
