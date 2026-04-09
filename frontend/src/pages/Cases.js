import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, ChevronRight } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Cases = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchCases = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/cases`, { withCredentials: true });
      setCases(res.data);
    } catch (error) {
      console.error('Cases fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const getRiskColor = (score) => {
    if (score <= 30) return { text: '#16a34a', bg: '#f0fdf4' };
    if (score <= 60) return { text: '#d97706', bg: '#fffbeb' };
    return { text: '#dc2626', bg: '#fef2f2' };
  };

  const getCaseBorderClass = (status, score) => {
    if (status === 'resolved') return 'case-resolved';
    if (score > 60) return 'case-urgent';
    if (score > 30) return 'case-medium';
    return 'case-resolved';
  };

  const filteredCases = cases.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'active') return c.status === 'active';
    if (filter === 'high') return c.risk_score > 60;
    if (filter === 'resolved') return c.status === 'resolved';
    return true;
  });

  const counts = {
    all: cases.length,
    active: cases.filter(c => c.status === 'active').length,
    high: cases.filter(c => c.risk_score > 60).length,
    resolved: cases.filter(c => c.status === 'resolved').length
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-32"></div>
        <div className="skeleton h-5 w-48"></div>
        <div className="flex gap-2 mt-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-10 w-24 rounded-full"></div>)}
        </div>
        <div className="space-y-3 mt-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-[14px]"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="cases-page">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">My cases</h1>
          <p className="page-sub">All your legal cases in one place</p>
        </div>
        <button 
          onClick={() => navigate('/upload')} 
          className="btn-pill btn-blue flex items-center gap-2"
          data-testid="new-case-btn"
        >
          <Plus size={16} />
          New case
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div 
          className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
          data-testid="filter-all"
        >
          All ({counts.all})
        </div>
        <div 
          className={`filter-pill ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
          data-testid="filter-active"
        >
          Active ({counts.active})
        </div>
        <div 
          className={`filter-pill ${filter === 'high' ? 'active' : ''}`}
          onClick={() => setFilter('high')}
          data-testid="filter-high-risk"
        >
          High risk
        </div>
        <div 
          className={`filter-pill ${filter === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilter('resolved')}
          data-testid="filter-resolved"
        >
          Resolved ({counts.resolved})
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        {filteredCases.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-[#6b7280]">
              {filter === 'all' ? 'No cases yet. Upload a document to create your first case.' : 'No cases match this filter.'}
            </p>
          </div>
        ) : (
          filteredCases.map((caseItem) => {
            const riskColor = getRiskColor(caseItem.risk_score);
            return (
              <div
                key={caseItem.case_id}
                className={`card p-4 cursor-pointer hover:shadow-md transition-shadow ${getCaseBorderClass(caseItem.status, caseItem.risk_score)}`}
                onClick={() => navigate(`/cases/${caseItem.case_id}`)}
                data-testid={`case-card-${caseItem.case_id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-[#6b7280] mb-2">
                      <span className="capitalize">{caseItem.type}</span> · {caseItem.document_count} document{caseItem.document_count !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm font-medium text-[#111827] mb-1">{caseItem.title}</div>
                    <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                      <span>Risk score: {caseItem.risk_score}/100</span>
                      <span className="w-1 h-1 rounded-full bg-[#d1d5db]"></span>
                      {caseItem.deadline && (
                        <>
                          <span style={{ color: riskColor.text, fontWeight: 500 }}>
                            {caseItem.deadline_description || `Due ${caseItem.deadline}`}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-[#d1d5db]"></span>
                        </>
                      )}
                      <span>Updated {new Date(caseItem.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span 
                      className="badge text-xs font-semibold"
                      style={{ backgroundColor: riskColor.bg, color: riskColor.text }}
                    >
                      {caseItem.risk_score}/100
                    </span>
                    <div className="text-xs text-[#6b7280] mt-2">
                      {caseItem.status === 'resolved' ? 'Resolved' : 
                       caseItem.risk_score > 60 ? 'High risk' : 
                       caseItem.risk_score > 30 ? 'Medium risk' : 'Low risk'}
                    </div>
                    <div className="text-xs text-[#1a56db] mt-2 cursor-pointer flex items-center justify-end gap-1">
                      {caseItem.status === 'resolved' ? 'View' : 'Open'} <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Cases;
