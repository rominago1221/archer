import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AttorneyLayout from './components/AttorneyLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import Upload from './pages/Upload';
import Lawyers from './pages/Lawyers';
import LawyerBook from './pages/LawyerBook';
import Settings from './pages/Settings';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import LegalChat from './pages/LegalChat';
import SharedCase from './pages/SharedCase';
import DocumentLibrary from './pages/DocumentLibrary';
import FloatingChatButton from './components/FloatingChatButton';
import AttorneyApply from './pages/AttorneyApply';
import AttorneyDashboard from './pages/AttorneyDashboard';
import AttorneyCalls from './pages/AttorneyCalls';
import AttorneyCases from './pages/AttorneyCases';
import AttorneyResearch from './pages/AttorneyResearch';
import AttorneyProfile from './pages/AttorneyProfile';
import AttorneyEarnings from './pages/AttorneyEarnings';
import AttorneySettings from './pages/AttorneySettings';
import PublicAttorneyProfile from './pages/PublicAttorneyProfile';
import AdminAttorneys from './pages/AdminAttorneys';
import DocumentViewer from './pages/DocumentViewer';
import VideoCall from './pages/VideoCall';
import Pricing from './pages/Pricing';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Keep-alive: ping backend every 4 minutes to prevent cold starts
const useKeepAlive = () => {
  useEffect(() => {
    const ping = () => fetch(`${BACKEND_URL}/api/health`).catch(() => {});
    ping();
    const id = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
};

// Attorney route guard
const AttorneyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.account_type !== 'attorney') return <Navigate to="/dashboard" replace />;
  return children;
};

// Component to handle session_id in URL hash
const AppRouter = () => {
  const location = useLocation();
  
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/shared/:token" element={<SharedCase />} />
      <Route path="/attorney/apply" element={<AttorneyApply />} />
      <Route path="/attorneys/:slug" element={<PublicAttorneyProfile />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/:lang/pricing" element={<Pricing />} />
      <Route path="/admin/attorneys" element={<ProtectedRoute><AdminAttorneys /></ProtectedRoute>} />
      <Route path="/documents/:documentId" element={<ProtectedRoute><DocumentViewer /></ProtectedRoute>} />
      
      {/* Attorney protected routes */}
      <Route path="/attorney" element={<AttorneyRoute><AttorneyLayout /></AttorneyRoute>}>
        <Route path="dashboard" element={<AttorneyDashboard />} />
        <Route path="calls" element={<AttorneyCalls />} />
        <Route path="calls/:callId" element={<AttorneyCalls />} />
        <Route path="cases" element={<AttorneyCases />} />
        <Route path="research" element={<AttorneyResearch />} />
        <Route path="profile" element={<AttorneyProfile />} />
        <Route path="earnings" element={<AttorneyEarnings />} />
        <Route path="settings" element={<AttorneySettings />} />
      </Route>

      {/* Video call (both attorney and client) */}
      <Route path="/video-call/:callId" element={<ProtectedRoute><VideoCall /></ProtectedRoute>} />
      <Route path="/attorney-call-confirmed" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />

      {/* Client protected routes with Layout */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/:caseId" element={<CaseDetail />} />
        <Route path="documents" element={<DocumentLibrary />} />
        <Route path="upload" element={<Upload />} />
        <Route path="lawyers" element={<Lawyers />} />
        <Route path="lawyers/book" element={<LawyerBook />} />
        <Route path="settings" element={<Settings />} />
        <Route path="chat" element={<LegalChat />} />
        <Route path="payment/success" element={<PaymentSuccess />} />
        <Route path="payment/cancel" element={<PaymentCancel />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
