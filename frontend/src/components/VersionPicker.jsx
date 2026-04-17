import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function copyFor(language) {
  const isFr = String(language || '').toLowerCase().startsWith('fr');
  const isNl = String(language || '').toLowerCase().startsWith('nl');
  if (isFr) {
    return {
      version: (n) => `Version ${n}`,
      latest: 'la plus r\u00e9cente',
      mostRecentBadge: 'Actuelle',
      initialLabel: 'Analyse initiale',
      readonlyBanner: (n) => `Vous consultez la version ${n} (lecture seule).`,
      backToLatest: 'Retour \u00e0 la version actuelle',
      loading: 'Chargement\u2026',
    };
  }
  if (isNl) {
    return {
      version: (n) => `Versie ${n}`,
      latest: 'meest recente',
      mostRecentBadge: 'Huidig',
      initialLabel: 'Initi\u00eble analyse',
      readonlyBanner: (n) => `U bekijkt versie ${n} (alleen-lezen).`,
      backToLatest: 'Terug naar huidige versie',
      loading: 'Laden\u2026',
    };
  }
  return {
    version: (n) => `Version ${n}`,
    latest: 'most recent',
    mostRecentBadge: 'Current',
    initialLabel: 'Initial analysis',
    readonlyBanner: (n) => `You are viewing version ${n} (read-only).`,
    backToLatest: 'Back to current version',
    loading: 'Loading\u2026',
  };
}

function formatDate(iso, language) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const isFr = String(language || '').toLowerCase().startsWith('fr');
    const isNl = String(language || '').toLowerCase().startsWith('nl');
    const locale = isFr ? 'fr-BE' : isNl ? 'nl-BE' : 'en-US';
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * VersionPicker — dropdown at the top of the case detail view.
 *
 * Props:
 *   caseId, currentVersion (int), language
 *   viewingVersion (int) — which version the user has actively selected
 *   onChangeVersion(version, analysis|null) — parent handler; pass null to reset to live case
 */
export default function VersionPicker({ caseId, currentVersion, language,
                                        viewingVersion, onChangeVersion }) {
  const c = copyFor(language);
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef(null);

  const selected = viewingVersion || currentVersion || 1;
  const isOnOld = selected !== (currentVersion || 1);

  useEffect(() => {
    if (!open || !caseId) return;
    let cancelled = false;
    setLoading(true);
    axios.get(`${API}/cases/${caseId}/versions`, { withCredentials: true })
      .then((res) => { if (!cancelled) setVersions(res.data?.versions || []); })
      .catch(() => { if (!cancelled) setVersions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, caseId]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (!triggerRef.current) return;
      if (triggerRef.current.contains(e.target)) return;
      setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const triggerLabel = useMemo(() => {
    const lbl = c.version(selected);
    if (!isOnOld) return `${lbl} (${c.latest})`;
    return lbl;
  }, [selected, isOnOld, c]);

  const pick = async (version) => {
    setOpen(false);
    if (version === currentVersion) {
      onChangeVersion && onChangeVersion(version, null);
      return;
    }
    try {
      const res = await axios.get(
        `${API}/cases/${caseId}/versions/${version}`,
        { withCredentials: true }
      );
      onChangeVersion && onChangeVersion(version, res.data?.analysis || {});
    } catch (e) {
      // keep current view on failure; no hard error
    }
  };

  // Only show when there's more than 1 version to pick from.
  if ((currentVersion || 1) <= 1 && versions.length <= 1) return null;

  return (
    <div data-testid="version-picker-wrapper" style={{ marginBottom: 14 }}>
      <div ref={triggerRef} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          data-testid="version-picker-trigger"
          onClick={() => setOpen((o) => !o)}
          style={{
            padding: '7px 12px', background: isOnOld ? '#fef3c7' : '#ffffff',
            border: `1px solid ${isOnOld ? '#f59e0b' : '#d1d5db'}`,
            borderRadius: 8, fontSize: 12, fontWeight: 700,
            color: isOnOld ? '#78350f' : '#111827', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          {triggerLabel}
          <span style={{ fontSize: 10, opacity: 0.7 }}>\u25BC</span>
        </button>

        {open && (
          <div
            data-testid="version-picker-menu"
            style={{
              position: 'absolute', top: '110%', left: 0, minWidth: 280,
              background: '#ffffff', border: '1px solid #e2e0db', borderRadius: 10,
              boxShadow: '0 12px 28px rgba(10, 10, 15, 0.12)', zIndex: 40,
              padding: 6, maxHeight: 320, overflowY: 'auto',
            }}
          >
            {loading && (
              <div style={{ padding: 12, fontSize: 12, color: '#6b7280' }}>{c.loading}</div>
            )}
            {!loading && versions.map((v) => {
              const isCurrent = v.is_current;
              const isSelected = v.version === selected;
              const excerpt = v.refinement_excerpt
                ? v.refinement_excerpt
                : (v.version === 1 ? c.initialLabel : '');
              return (
                <button
                  key={v.version}
                  data-testid={`version-pick-${v.version}`}
                  onClick={() => pick(v.version)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 10px', background: isSelected ? '#f1f5f9' : '#ffffff',
                    border: 'none', borderRadius: 6, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0a0a0f' }}>
                      {c.version(v.version)}
                    </span>
                    {isCurrent && (
                      <span style={{
                        padding: '2px 7px', background: '#dbeafe', color: '#1e40af',
                        borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                      }}>
                        {c.mostRecentBadge}
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280' }}>
                      {formatDate(v.created_at, language)}
                    </span>
                  </div>
                  {excerpt && (
                    <div style={{
                      marginTop: 3, fontSize: 11, color: '#6b7280', fontStyle: 'italic',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      \u201c{excerpt}\u201d
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isOnOld && (
        <div
          data-testid="version-readonly-banner"
          style={{
            marginTop: 10, padding: '9px 12px', background: '#fef3c7',
            border: '1px solid #f59e0b', borderRadius: 8, fontSize: 12,
            color: '#78350f', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: 10,
          }}
        >
          <span>{c.readonlyBanner(selected)}</span>
          <button
            onClick={() => onChangeVersion && onChangeVersion(currentVersion, null)}
            style={{
              padding: '5px 10px', background: '#78350f', color: '#ffffff',
              border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {c.backToLatest}
          </button>
        </div>
      )}
    </div>
  );
}
