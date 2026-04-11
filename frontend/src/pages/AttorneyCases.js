import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FolderOpen, FileText, Loader2, MessageSquare, ChevronRight } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AttorneyCases = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/attorney/cases`, { withCredentials: true });
        setCases(res.data);
      } catch (e) { /* ok */ }
      setLoading(false);
    };
    fetch();
  }, []);

  const saveNotes = async (caseId) => {
    setSavingNotes(true);
    try {
      await axios.post(`${API}/attorney/cases/${caseId}/notes`, { notes }, { withCredentials: true });
    } catch (e) { /* ok */ }
    setSavingNotes(false);
  };

  const riskColor = (score) => {
    if (score >= 70) return { bg: '#fef2f2', text: '#dc2626' };
    if (score >= 40) return { bg: '#fef3c7', text: '#d97706' };
    return { bg: '#f0fdf4', text: '#16a34a' };
  };

  return (
    <div data-testid="attorney-cases-page">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-[#111827]">Client cases</h1>
        <p className="text-[11px] text-[#6b7280]">Cases shared with you by clients and from completed sessions</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-[#1a56db]" /></div>
      ) : cases.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#ebebeb] rounded-xl">
          <FolderOpen size={24} className="mx-auto text-[#ccc] mb-2" />
          <p className="text-xs text-[#999]">No cases shared with you yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cases.map(c => {
            const rc = riskColor(c.risk_score || 0);
            return (
              <div key={c.case_id} className="bg-white border border-[#ebebeb] rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => { setSelectedCase(selectedCase === c.case_id ? null : c.case_id); setNotes(c.attorney_notes || ''); }}
                data-testid={`atty-case-${c.case_id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#eff6ff] flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-[#1a56db]" />
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-[#111827]">{c.title || 'Untitled case'}</div>
                      <div className="text-[10px] text-[#6b7280] capitalize">{c.type || 'Other'} · {c.document_count || 0} documents</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: rc.bg }}>
                    <span className="text-[11px] font-bold" style={{ color: rc.text }}>{c.risk_score || '—'}</span>
                    <span className="text-[8px]" style={{ color: rc.text }}>/100</span>
                  </div>
                </div>

                {selectedCase === c.case_id && (
                  <div className="mt-3 pt-3 border-t border-[#f0f0f0]" onClick={e => e.stopPropagation()}>
                    <div className="text-[10px] font-medium text-[#555] mb-1">
                      <MessageSquare size={10} className="inline mr-1" /> Private notes (only you can see)
                    </div>
                    <textarea className="w-full text-[11px] border border-[#e5e5e5] rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#1a56db]"
                      rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add your private notes about this case..." data-testid={`notes-${c.case_id}`} />
                    <button onClick={() => saveNotes(c.case_id)} disabled={savingNotes}
                      className="mt-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[#1a56db] text-white hover:bg-[#1546b3] disabled:opacity-60" data-testid={`save-notes-${c.case_id}`}>
                      {savingNotes ? 'Saving...' : 'Save notes'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttorneyCases;
