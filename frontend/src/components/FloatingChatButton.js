import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';

const FloatingChatButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tooltip, setTooltip] = useState(false);

  // Hide on chat page and public pages
  if (location.pathname === '/chat' || location.pathname.startsWith('/shared/')) return null;

  const caseMatch = location.pathname.match(/\/cases\/(.+)/);
  const caseId = caseMatch ? caseMatch[1] : null;

  const handleClick = () => {
    const url = caseId ? `/chat?case=${caseId}` : '/chat';
    navigate(url);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40" data-testid="floating-chat-btn">
      {tooltip && (
        <div className="absolute bottom-16 right-0 bg-[#1e3a5f] text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
          Ask James a legal question
        </div>
      )}
      <button
        onClick={handleClick}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        className="w-14 h-14 rounded-full bg-[#1e3a5f] text-white shadow-lg hover:bg-[#162d4a] flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        <span className="text-lg font-bold">J</span>
      </button>
    </div>
  );
};

export default FloatingChatButton;
