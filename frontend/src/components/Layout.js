import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-[#f8f8f8]">
      <Sidebar />
      <main className="main-content flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
