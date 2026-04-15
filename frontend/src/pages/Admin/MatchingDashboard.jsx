import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import AdminStatsBar from '../../components/Admin/AdminStatsBar';
import AttorneysWorkloadTable from '../../components/Admin/AttorneysWorkloadTable';
import UnmatchedCasesList from '../../components/Admin/UnmatchedCasesList';
import ManualAssignModal from '../../components/Admin/ManualAssignModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MatchingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null); // case_id

  const fetch = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/admin/matching/dashboard`, { withCredentials: true });
      setData(r.data);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.detail || 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 30 * 1000);
    return () => clearInterval(id);
  }, [fetch]);

  const handleAssign = async (caseId, attorneyId) => {
    try {
      await axios.post(
        `${API}/admin/matching/cases/${caseId}/manual-assign`,
        { attorney_id: attorneyId },
        { withCredentials: true },
      );
      setAssignTarget(null);
      await fetch();
    } catch (e) {
      alert(e.response?.data?.detail || 'Assignment failed');
    }
  };

  if (loading) return <div className="p-8 text-neutral-500">Loading matching dashboard...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl text-neutral-900">Matching Dashboard</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Auto-matching overview · refreshes every 30s
            </p>
          </div>
          <button
            onClick={fetch}
            className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          >
            Refresh now
          </button>
        </div>

        <AdminStatsBar today={data.today} />

        <section className="mt-8">
          <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
            Attorneys ({data.attorneys.length})
          </h2>
          <AttorneysWorkloadTable attorneys={data.attorneys} />
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
            Unmatched cases ({data.unmatched_cases.length})
          </h2>
          <UnmatchedCasesList
            cases={data.unmatched_cases}
            onAssign={(caseId) => setAssignTarget(caseId)}
          />
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-semibold tracking-widest text-neutral-500 uppercase mb-3">
            Recent events
          </h2>
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Time</th>
                  <th className="text-left px-4 py-2 font-medium">Action</th>
                  <th className="text-left px-4 py-2 font-medium">Case</th>
                  <th className="text-left px-4 py-2 font-medium">Attorney</th>
                  <th className="text-right px-4 py-2 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_events.map((e, i) => (
                  <tr key={i} className="border-t border-neutral-100">
                    <td className="px-4 py-2 text-neutral-500 tabular-nums">
                      {new Date(e.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs uppercase tracking-widest px-2 py-0.5 rounded ${
                        e.action === 'auto_matched' ? 'bg-emerald-50 text-emerald-700' :
                        e.action === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                        e.action === 'no_match' ? 'bg-red-50 text-red-700' :
                        e.action === 'expired_no_response' ? 'bg-amber-50 text-amber-700' :
                        e.action === 'declined' ? 'bg-neutral-100 text-neutral-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>{e.action}</span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-neutral-600">
                      {e.case_id?.slice(-8)}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-neutral-600">
                      {e.attorney_id ? e.attorney_id.slice(-8) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-600">
                      {e.match_score != null ? e.match_score.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
                {data.recent_events.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-500">No events yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <ManualAssignModal
        open={!!assignTarget}
        caseId={assignTarget}
        attorneys={data.attorneys}
        onClose={() => setAssignTarget(null)}
        onAssign={handleAssign}
      />
    </div>
  );
}
