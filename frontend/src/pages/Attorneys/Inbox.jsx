import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import CaseRow from '../../components/Attorneys/CaseRow';
import { useInboxCases } from '../../hooks/attorneys/useInboxCases';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';
import { useToast } from '../../components/Attorneys/Toasts';

function formatEuros(cents) {
  if (cents == null) return '—';
  return `€${(cents / 100).toFixed(2)}`;
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4">
      <div className="text-[11px] tracking-widest text-neutral-400 uppercase mb-1">{label}</div>
      <div className={`text-2xl font-medium ${accent || 'text-neutral-900'}`}>{value}</div>
    </div>
  );
}

export default function Inbox() {
  const nav = useNavigate();
  const { t } = useAttorneyT();
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const { cases, stats, activeCases, loading, error } = useInboxCases({ filter });
  const seenIdsRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    const ids = new Set(cases.map((c) => c.assignment_id));
    if (seenIdsRef.current === null) {
      seenIdsRef.current = ids;
      return;
    }
    const newly = cases.filter((c) => !seenIdsRef.current.has(c.assignment_id));
    newly.forEach((c) => {
      toast.push({
        kind: 'info',
        message: `🔔 Nouveau cas attribué : #${c.case_number}`,
        duration: 5000,
      });
    });
    seenIdsRef.current = ids;
  }, [cases, loading, toast]);

  const earningsWeek = activeCases.reduce((sum, c) => sum + (c.earnings_cents || 0), 0);

  return (
    <AttorneyLayout>
      <div className="max-w-6xl">
        <div className="mb-6">
          <h1 className="font-serif text-3xl text-neutral-900">{t.inbox?.title || 'Inbox'}</h1>
          <p className="text-neutral-600 text-sm mt-1">
            {(t.inbox?.subtitle || '{{count}} new cases waiting for your acceptance')
              .replace('{{count}}', stats.pending_count || 0)}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard label={t.inbox?.stats?.pending} value={stats.pending_count || 0}
                    accent={stats.expiring_soon_count > 0 ? 'text-red-600' : undefined} />
          <StatCard label={t.inbox?.stats?.active} value={activeCases.length} />
          <StatCard label={t.inbox?.stats?.earnings_week} value={formatEuros(earningsWeek)} />
          <StatCard label={t.inbox?.stats?.next_payout} value="Mon 09:00" />
        </div>

        <div className="flex items-center gap-2 mb-4">
          {['all', 'letter', 'live_counsel'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                filter === f
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500'
              }`}
            >
              {t.inbox?.filters?.[f] || f}
            </button>
          ))}
        </div>

        {error && <div className="text-sm text-red-600 mb-4">{error}</div>}

        <section className="space-y-3">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white border border-neutral-200 rounded-lg h-28 animate-pulse" />
              ))}
            </>
          ) : cases.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
              {t.inbox?.empty_state || "No new cases right now. We'll notify you when one arrives."}
            </div>
          ) : (
            cases.map((c) => (
              <CaseRow
                key={c.assignment_id}
                row={c}
                variant="pending"
                onClick={() => nav(`/attorneys/cases/${c.assignment_id}`)}
              />
            ))
          )}
        </section>

        {activeCases.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-widest mb-3">
              {(t.inbox?.active_cases_section || 'Active cases ({{count}})')
                .replace('{{count}}', activeCases.length)}
            </h2>
            <div className="space-y-3">
              {activeCases.map((c) => (
                <CaseRow
                  key={c.assignment_id}
                  row={c}
                  variant="active"
                  onClick={() => nav(`/attorneys/cases/${c.assignment_id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </AttorneyLayout>
  );
}
