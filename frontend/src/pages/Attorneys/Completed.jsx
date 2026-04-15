import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AttorneyLayout from '../../components/Attorneys/AttorneyLayout';
import CaseRow from '../../components/Attorneys/CaseRow';
import { attorneyApi } from '../../hooks/attorneys/useAttorneyApi';

function inMonthOffset(iso, offset) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() - offset;
}

export default function Completed() {
  const nav = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    attorneyApi.get('/attorneys/cases/completed').then((r) => {
      if (mounted) { setCases(r.data.cases); setLoading(false); }
    });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'this_month') return cases.filter((c) => inMonthOffset(c.completed_at, 0));
    if (filter === 'last_month') return cases.filter((c) => inMonthOffset(c.completed_at, 1));
    return cases;
  }, [filter, cases]);

  return (
    <AttorneyLayout>
      <div className="max-w-6xl">
        <h1 className="font-serif text-3xl text-neutral-900 mb-6">Completed</h1>

        <div className="flex items-center gap-2 mb-4">
          {[['this_month', 'This month'], ['last_month', 'Last month'], ['all', 'All time']].map(([f, label]) => (
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
              No completed cases yet.
            </div>
          ) : (
            filtered.map((c) => (
              <CaseRow
                key={c.assignment_id}
                row={c}
                variant="completed"
                onClick={() => nav(`/attorneys/cases/${c.assignment_id}`)}
              />
            ))
          )}
        </section>
      </div>
    </AttorneyLayout>
  );
}
