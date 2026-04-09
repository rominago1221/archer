import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import FloatingChatButton from './FloatingChatButton';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-[#f8f8f8]">
      <Sidebar />
      <main className="main-content flex-1 overflow-auto">
        <Outlet />
      </main>
      <FloatingChatButton />
    </div>
  );
};

export default Layout;
