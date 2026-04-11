import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import FloatingChatButton from './FloatingChatButton';
import JurisdictionLanguageBar from './JurisdictionLanguageBar';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Layout = () => {
  const { user, updateUser } = useAuth();

  const handleJurisdictionChange = async (j) => {
    updateUser({ jurisdiction: j, country: j });
    try {
      await axios.put(`${API}/profile`, { jurisdiction: j, country: j }, { withCredentials: true });
    } catch (e) { console.error('Failed to save jurisdiction:', e); }
  };

  const handleLanguageChange = async (lang) => {
    updateUser({ language: lang });
    try {
      await axios.put(`${API}/profile`, { language: lang }, { withCredentials: true });
    } catch (e) { console.error('Failed to save language:', e); }
  };

  return (
    <div className="flex min-h-screen bg-[#f8f8f8]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#ebebeb] px-6 py-2.5 flex items-center justify-end" data-testid="top-bar">
          <JurisdictionLanguageBar
            jurisdiction={user?.jurisdiction || user?.country || 'US'}
            language={user?.language || 'en'}
            onJurisdictionChange={handleJurisdictionChange}
            onLanguageChange={handleLanguageChange}
          />
        </header>
        <main className="main-content flex-1">
          <Outlet />
        </main>
      </div>
      <FloatingChatButton />
    </div>
  );
};

export default Layout;
