import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div data-testid="payment-cancel-page" className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center">
        <div className="card p-8">
          <div className="w-16 h-16 rounded-full bg-[#fffbeb] flex items-center justify-center mx-auto mb-4">
            <X size={32} className="text-[#d97706]" />
          </div>
          <div className="text-xl font-semibold text-[#111827] mb-2">Payment Cancelled</div>
          <div className="text-sm text-[#6b7280] mb-6">
            No charge was made. You can try again whenever you're ready.
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/settings')} className="btn-pill btn-outline" data-testid="back-settings-btn">
              Back to Settings
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-pill btn-blue" data-testid="go-dashboard-btn">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
