import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import AttorneyLayout from './components/AttorneyLayout';
import Landing from './pages/Landing';
import HomePage from './pages/HomePage';
import AttorneysPage from './pages/AttorneysPage';
import PricingPlansPage from './pages/PricingPlansPage';
import CreditHistoryPage from './pages/CreditHistoryPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MyDesk from './pages/MyDesk';
import Cases from './pages/Cases';
import CaseDetailV7 from './pages/CaseDetailV7';
import Upload from './pages/Upload';
import Lawyers from './pages/Lawyers';
import LawyerBook from './pages/LawyerBook';
import Settings from './pages/Settings';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import LegalChat from './pages/LegalChat';
import SharedCase from './pages/SharedCase';
import AnalyzeDocument from './pages/AnalyzeDocument';
import ContractGuard from './pages/ContractGuard';
import MobileScan from './pages/MobileScan';
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
import AdminMatchingDashboard from './pages/Admin/MatchingDashboard';
import DocumentViewer from './pages/DocumentViewer';
import VideoCall from './pages/VideoCall';
import Pricing from './pages/Pricing';
import WinningCases from './pages/WinningCases';
import HowItWorks from './pages/HowItWorks';
import CinematicAnalysis from './components/CinematicAnalysis/CinematicAnalysis';
// Sprint A — Attorney Portal (parallel to legacy /attorney/*)
import AttorneyPortalJoin from './pages/Attorneys/AttorneyJoin';
import AttorneyPortalLogin from './pages/Attorneys/AttorneyLogin';
import AttorneyPortalMagicVerify from './pages/Attorneys/AttorneyMagicVerify';
import AttorneyPortalDashboard from './pages/Attorneys/AttorneyDashboard';
import AttorneyPortalInbox from './pages/Attorneys/Inbox';
import AttorneyPortalMyCases from './pages/Attorneys/MyCases';
import AttorneyPortalCompleted from './pages/Attorneys/Completed';
import AttorneyPortalCaseDetail from './pages/Attorneys/CaseDetail';
import AttorneyPortalEarnings from './pages/Attorneys/Earnings';
import AttorneyPortalStripeOnboarding from './pages/Attorneys/StripeOnboarding';
import AttorneyPortalStripeComplete from './pages/Attorneys/StripeOnboardingComplete';
import AttorneyPortalLiveCounsel from './pages/Attorneys/LiveCounsel';
import AttorneyPortalProfile from './pages/Attorneys/Profile';
import RequireAttorneyAuth from './components/Attorneys/RequireAttorneyAuth';
// Internal admin dashboard
import InternalAdminLogin from './pages/Internal/AdminLogin';
import InternalAdminLayout from './components/Internal/AdminLayout';
import InternalAdminDashboard from './pages/Internal/AdminDashboard';
import InternalAdminAttorneys from './pages/Internal/AdminAttorneys';
import InternalAdminCustomers from './pages/Internal/AdminCustomers';
import InternalAdminCases from './pages/Internal/AdminCases';
import InternalAdminOperations from './pages/Internal/AdminOperations';
import InternalAdminModeration from './pages/Internal/AdminModeration';
import InternalAdminAnalytics from './pages/Internal/AdminAnalytics';
import InternalAdminSettings from './pages/Internal/AdminSettings';
// SEO pages
import Blog from './pages/Blog';
import BlogArticle from './pages/BlogArticle';
import PillarPage from './pages/PillarPage';
import EnginePage from './pages/EnginePage';
// Toast feedback — must be mounted once at root so useToast() from anywhere in the app is visible.
import { Toaster } from './components/ui/toaster';
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
      <Route path="/" element={<HomePage />} />
      {/* Legacy landing archived under /legacy-landing for rollback / diff during v3 rollout. */}
      <Route path="/legacy-landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/shared/:token" element={<SharedCase />} />
      <Route path="/attorney/apply" element={<AttorneyApply />} />
      {/* Mobile-only: landing page for the QR-scan cross-device upload flow.
          Desktop creates a token, shows a QR; phone opens /m/scan/:token, uploads. */}
      <Route path="/m/scan/:token" element={<MobileScan />} />

      {/* SEO: Blog + Pillar pages + State pages */}
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogArticle />} />
      <Route path="/eviction-help" element={<PillarPage />} />
      <Route path="/eviction-help/:state" element={<PillarPage />} />
      <Route path="/wrongful-termination" element={<PillarPage />} />
      <Route path="/wrongful-termination/:state" element={<PillarPage />} />
      <Route path="/severance-negotiation" element={<PillarPage />} />
      <Route path="/ai-legal-assistant" element={<PillarPage />} />

      {/* Sprint A — Attorney Portal (must be declared BEFORE /attorneys/:slug) */}
      <Route path="/attorneys" element={<AttorneysPage />} />
      <Route path="/engine" element={<EnginePage />} />
      <Route path="/plans" element={<PricingPlansPage />} />
      <Route path="/account/credits" element={<ProtectedRoute><CreditHistoryPage /></ProtectedRoute>} />
      <Route path="/attorneys/join" element={<AttorneyPortalJoin />} />
      <Route path="/attorneys/login" element={<AttorneyPortalLogin />} />
      <Route path="/attorneys/login/verify" element={<AttorneyPortalMagicVerify />} />
      <Route path="/attorneys/dashboard" element={<RequireAttorneyAuth><AttorneyPortalDashboard /></RequireAttorneyAuth>} />
      <Route path="/attorneys/inbox" element={<RequireAttorneyAuth><AttorneyPortalInbox /></RequireAttorneyAuth>} />
      <Route path="/attorneys/my-cases" element={<RequireAttorneyAuth><AttorneyPortalMyCases /></RequireAttorneyAuth>} />
      <Route path="/attorneys/completed" element={<RequireAttorneyAuth><AttorneyPortalCompleted /></RequireAttorneyAuth>} />
      <Route path="/attorneys/cases/:assignmentId" element={<RequireAttorneyAuth><AttorneyPortalCaseDetail /></RequireAttorneyAuth>} />
      <Route path="/attorneys/earnings" element={<RequireAttorneyAuth><AttorneyPortalEarnings /></RequireAttorneyAuth>} />
      <Route path="/attorneys/live-counsel" element={<RequireAttorneyAuth><AttorneyPortalLiveCounsel /></RequireAttorneyAuth>} />
      <Route path="/attorneys/profile" element={<RequireAttorneyAuth><AttorneyPortalProfile /></RequireAttorneyAuth>} />
      <Route path="/attorneys/onboarding/stripe" element={<RequireAttorneyAuth><AttorneyPortalStripeOnboarding /></RequireAttorneyAuth>} />
      <Route path="/attorneys/onboarding/stripe/complete" element={<RequireAttorneyAuth><AttorneyPortalStripeComplete /></RequireAttorneyAuth>} />
      <Route path="/attorneys/onboarding/stripe/refresh" element={<RequireAttorneyAuth><AttorneyPortalStripeOnboarding /></RequireAttorneyAuth>} />

      <Route path="/attorneys/:slug" element={<PublicAttorneyProfile />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/:lang/pricing" element={<Pricing />} />
      <Route path="/winning-cases" element={<WinningCases />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/:lang/how-it-works" element={<HowItWorks />} />
      <Route path="/admin/attorneys" element={<ProtectedRoute><AdminAttorneys /></ProtectedRoute>} />
      <Route path="/admin/matching" element={<ProtectedRoute><AdminMatchingDashboard /></ProtectedRoute>} />

      {/* Internal admin dashboard (new auth system) */}
      <Route path="/internal/dashboard-x9k7/login" element={<InternalAdminLogin />} />
      <Route path="/internal/dashboard-x9k7" element={<InternalAdminLayout />}>
        <Route index element={<InternalAdminDashboard />} />
        <Route path="attorneys" element={<InternalAdminAttorneys />} />
        <Route path="customers" element={<InternalAdminCustomers />} />
        <Route path="cases" element={<InternalAdminCases />} />
        <Route path="operations" element={<InternalAdminOperations />} />
        <Route path="moderation" element={<InternalAdminModeration />} />
        <Route path="analytics" element={<InternalAdminAnalytics />} />
        <Route path="settings" element={<InternalAdminSettings />} />
      </Route>

      <Route path="/documents/:documentId" element={<ProtectedRoute><DocumentViewer /></ProtectedRoute>} />
      <Route path="/analyze/:caseId" element={<ProtectedRoute><CinematicAnalysis /></ProtectedRoute>} />
      
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
        <Route path="dashboard" element={<MyDesk />} />
        <Route path="dashboard-legacy" element={<Dashboard />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/:caseId" element={<CaseDetailV7 />} />
        <Route path="documents" element={<AnalyzeDocument />} />
        <Route path="upload" element={<Upload />} />
        <Route path="lawyers" element={<Lawyers />} />
        <Route path="lawyers/book" element={<LawyerBook />} />
        <Route path="contract-guard" element={<ContractGuard />} />
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
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
