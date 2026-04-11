import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import FloatingChatButton from './FloatingChatButton';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-[#f8f8f8]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <main className="main-content flex-1">
          <Outlet />
        </main>
      </div>
      <FloatingChatButton />
    </div>
  );
};

export default Layout;
