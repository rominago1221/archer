import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import JurisdictionPills from './JurisdictionPills';
import { useAuth } from '../contexts/AuthContext';
import translations, { getStoredLocale, setStoredLocale, getLocaleFromPrefs } from '../data/landingTranslations';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PublicNavbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const stored = getStoredLocale();
  const [locale, setLocale] = useState(stored);
  const [jurisdiction, setJurisdiction] = useState(stored.startsWith('be') ? 'BE' : 'US');
  const [language, setLanguage] = useState(stored.split('-')[1] || stored.split('-')[0] || 'en');
  const t = translations[locale] || translations['us-en'];

  const handleJurisdictionChange = (j) => {
    setJurisdiction(j);
    const newLocale = getLocaleFromPrefs(j, language);
    setLocale(newLocale);
    setStoredLocale(newLocale);
    if (user) axios.put(`${API}/profile`, { jurisdiction: j, country: j }, { withCredentials: true }).catch(() => {});
  };

  const handleLanguageChange = (l) => {
    setLanguage(l);
    const newLocale = getLocaleFromPrefs(jurisdiction, l);
    setLocale(newLocale);
    setStoredLocale(newLocale);
    if (user) axios.put(`${API}/profile`, { language: l }, { withCredentials: true }).catch(() => {});
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-[#ebebeb] z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div onClick={() => navigate('/')} style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 500, letterSpacing: '-0.5px', color: '#1a56db', cursor: 'pointer' }} data-testid="public-nav-logo">Jasper</div>
        <div className="hidden md:flex items-center gap-6 text-sm text-[#555]">
          <span onClick={() => navigate('/')} className="hover:text-[#1a56db] cursor-pointer">{t.nav.howItWorks}</span>
          <span onClick={() => navigate('/pricing')} className="hover:text-[#1a56db] cursor-pointer">{t.nav.pricing}</span>
          <span onClick={() => navigate('/winning-cases')} className="hover:text-[#1a56db] cursor-pointer">{t.nav.wins}</span>
        </div>
        <div className="flex items-center gap-3">
          <JurisdictionPills
            jurisdiction={jurisdiction}
            language={language}
            onSwitch={handleJurisdictionChange}
            onLanguageChange={handleLanguageChange}
          />
          {user ? (
            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-[#1a56db] text-white text-sm font-medium rounded-full hover:bg-[#1546b3] transition-colors">
              {locale.includes('fr') ? 'Mon Dashboard' : 'My Dashboard'}
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="text-sm text-[#555] hover:text-[#1a56db]">{t.nav.signIn}</button>
              <button onClick={() => navigate('/signup')} className="px-4 py-2 bg-[#1a56db] text-white text-sm font-medium rounded-full hover:bg-[#1546b3] transition-colors">{t.nav.getStarted}</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;
