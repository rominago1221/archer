import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Star, User } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Lawyers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchLawyers = useCallback(async () => {
    try {
      const params = {};
      if (user?.country) params.country = user.country;
      const res = await axios.get(`${API}/lawyers`, { params });
      setLawyers(res.data);
    } catch (error) {
      console.error('Lawyers fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.country]);

  useEffect(() => {
    fetchLawyers();
    // Refresh every 60 seconds
    const interval = setInterval(fetchLawyers, 60000);
    return () => clearInterval(interval);
  }, [fetchLawyers]);

  const getAvailabilityDisplay = (status, minutes) => {
    if (status === 'now') return { text: 'Available now', color: '#16a34a', dotColor: '#22c55e' };
    if (status === 'soon') return { text: `${minutes} min wait`, color: '#16a34a', dotColor: '#22c55e' };
    return { text: 'Tomorrow AM', color: '#9ca3af', dotColor: '#e0e0e0' };
  };

  const filteredLawyers = lawyers.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'now') return l.availability_status === 'now';
    return l.specialty.toLowerCase().includes(filter.toLowerCase());
  });

  const isBelgian = user?.country === 'BE';

  const filters = isBelgian ? [
    { key: 'all', label: 'Tous' },
    { key: 'now', label: 'Disponible maintenant' },
    { key: 'travail', label: 'Droit du travail' },
    { key: 'bail', label: 'Droit du bail' },
    { key: 'consommation', label: 'Consommation' },
    { key: 'contrat', label: 'Contrats' },
    { key: 'famille', label: 'Famille' }
  ] : [
    { key: 'all', label: 'All' },
    { key: 'now', label: 'Available now' },
    { key: 'employment', label: 'Employment law' },
    { key: 'contract', label: 'Contract law' },
    { key: 'tenant', label: 'Housing' },
    { key: 'immigration', label: 'Immigration' }
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-32"></div>
        <div className="skeleton h-5 w-64"></div>
        <div className="flex gap-2 mt-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-10 w-24 rounded-full"></div>)}
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton h-64 rounded-[14px]"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="lawyers-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">{isBelgian ? 'Appels avocat' : 'Lawyer calls'}</h1>
        <p className="page-sub">{isBelgian
          ? 'Avocats belges agrees, disponibles a la demande · 149 EUR pour 30 minutes'
          : 'Licensed US attorneys, available on demand · $149 for 30 minutes'
        }</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <div
            key={f.key}
            className={`filter-pill ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
            data-testid={`filter-${f.key}`}
          >
            {f.label}
          </div>
        ))}
      </div>

      {/* Lawyers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLawyers.map((lawyer) => {
          const avail = getAvailabilityDisplay(lawyer.availability_status, lawyer.availability_minutes);
          return (
            <div 
              key={lawyer.lawyer_id} 
              className="card overflow-hidden hover:shadow-md transition-shadow"
              data-testid={`lawyer-card-${lawyer.lawyer_id}`}
            >
              {/* Photo header */}
              <div className="h-32 bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] flex items-center justify-center relative">
                {lawyer.photo_url ? (
                  <img 
                    src={lawyer.photo_url} 
                    alt={lawyer.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#1a56db] flex items-center justify-center">
                    <User size={28} className="text-white" />
                  </div>
                )}
                {/* Availability pill */}
                <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-white rounded-full shadow-sm flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: avail.dotColor }}></span>
                  <span style={{ color: avail.color }} className="font-medium">{avail.text}</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="text-sm font-semibold text-[#111827] mb-1">{lawyer.name}</div>
                <div className="text-xs text-[#6b7280] mb-3">
                  {lawyer.specialty} · {lawyer.bar_state} Bar · {lawyer.years_experience} yrs
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {lawyer.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="badge badge-blue text-[10px]">{tag}</span>
                  ))}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 text-xs text-[#6b7280] mb-4">
                  <div className="flex text-[#f59e0b]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill={i < Math.floor(lawyer.rating) ? '#f59e0b' : 'none'} />
                    ))}
                  </div>
                  <span>{lawyer.rating} · {lawyer.sessions_count} sessions</span>
                </div>

                {/* Book button */}
                <button
                  onClick={() => navigate(`/lawyers/book?lawyer=${lawyer.lawyer_id}`)}
                  className="w-full btn-pill btn-blue py-2.5"
                  data-testid={`book-lawyer-${lawyer.lawyer_id}-btn`}
                >
                  Book a call — {isBelgian ? '149 EUR' : '$149'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredLawyers.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-[#6b7280]">No lawyers match this filter. Try a different selection.</p>
        </div>
      )}
    </div>
  );
};

export default Lawyers;
