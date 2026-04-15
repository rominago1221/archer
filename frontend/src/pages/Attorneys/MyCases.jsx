import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import CaseRow from '../../components/Attorneys/CaseRow';
import { attorneyApi } from '../../hooks/attorneys/useAttorneyApi';

function withinHours(iso, hours) {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff <= hours * 3600 * 1000;
}

export default function MyCases() {
  const nav = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    attorneyApi.get('/attorneys/cases/active').then((r) => {
      if (mounted) { setCases(r.data.cases); setLoading(false); }
    });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'today') return cases.filter((c) => withinHours(c.deadline_at, 24));
    if (filter === 'week') return cases.filter((c) => withinHours(c.deadline_at, 24 * 7));
    return cases;
  }, [filter, cases]);

  return (
    <AttorneyLayout>
      <div className="max-w-6xl">
        <h1 className="font-serif text-3xl text-neutral-900 mb-6">My Cases</h1>

        <div className="flex items-center gap-2 mb-4">
          {[['all', 'All'], ['today', 'Due today'], ['week', 'Due this week']].map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                filter === f
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:border-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="space-y-3">
          {loading ? (
            [0, 1].map((i) => (
              <div key={i} className="bg-white border border-neutral-200 rounded-lg h-28 animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-300 rounded-lg p-10 text-center text-neutral-500">
              No active cases.
            </div>
          ) : (
            filtered.map((c) => (
              <CaseRow
                key={c.assignment_id}
                row={c}
                variant="active"
                onClick={() => nav(`/attorneys/cases/${c.assignment_id}`)}
              />
            ))
          )}
        </section>
      </div>
    </AttorneyLayout>
  );
}
