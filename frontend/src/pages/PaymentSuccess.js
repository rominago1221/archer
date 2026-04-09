import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('checking');
  const [packageId, setPackageId] = useState('');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    let attempts = 0;
    const maxAttempts = 8;

    const pollStatus = async () => {
      try {
        const res = await axios.get(`${API}/payments/status/${sessionId}`, { withCredentials: true });
        setPackageId(res.data.package_id || '');

        if (res.data.payment_status === 'paid') {
          setStatus('success');
          if (refreshUser) refreshUser();
          return;
        }
        if (res.data.status === 'expired') {
          setStatus('expired');
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollStatus, 2000);
        } else {
          setStatus('timeout');
        }
      } catch {
        setStatus('error');
      }
    };

    pollStatus();
  }, [sessionId, refreshUser]);

  const getTitle = () => {
    if (packageId === 'pro_monthly') return 'Pro Plan Activated';
    if (packageId === 'lawyer_call') return 'Attorney Call Confirmed';
    return 'Payment Confirmed';
  };

  const getDescription = () => {
    if (packageId === 'pro_monthly') return 'You now have unlimited document analyses, full risk reports, and live case files.';
    if (packageId === 'lawyer_call') return 'Your attorney call has been confirmed. You will receive a confirmation email shortly.';
    return 'Your payment has been processed successfully.';
  };

  return (
    <div data-testid="payment-success-page" className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center">
        {status === 'checking' && (
          <div className="card p-8">
            <Loader2 size={48} className="mx-auto mb-4 text-[#1a56db] animate-spin" />
            <div className="text-lg font-semibold text-[#111827] mb-2">Processing payment...</div>
            <div className="text-sm text-[#6b7280]">Please wait while we confirm your payment.</div>
          </div>
        )}

        {status === 'success' && (
          <div className="card p-8">
            <div className="w-16 h-16 rounded-full bg-[#f0fdf4] flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-[#16a34a]" />
            </div>
            <div className="text-xl font-semibold text-[#111827] mb-2">{getTitle()}</div>
            <div className="text-sm text-[#6b7280] mb-6">{getDescription()}</div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate('/dashboard')} className="btn-pill btn-blue" data-testid="go-dashboard-btn">
                Go to Dashboard
              </button>
              {packageId === 'pro_monthly' && (
                <button onClick={() => navigate('/upload')} className="btn-pill btn-outline" data-testid="upload-doc-btn">
                  Upload a document
                </button>
              )}
            </div>
          </div>
        )}

        {(status === 'error' || status === 'expired' || status === 'timeout') && (
          <div className="card p-8">
            <div className="w-16 h-16 rounded-full bg-[#fef2f2] flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-[#dc2626]" />
            </div>
            <div className="text-xl font-semibold text-[#111827] mb-2">
              {status === 'expired' ? 'Payment Expired' : 'Payment Issue'}
            </div>
            <div className="text-sm text-[#6b7280] mb-6">
              {status === 'expired'
                ? 'Your payment session has expired. Please try again.'
                : 'We could not confirm your payment. If you were charged, please contact support.'}
            </div>
            <button onClick={() => navigate('/settings')} className="btn-pill btn-outline" data-testid="back-settings-btn">
              Back to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
