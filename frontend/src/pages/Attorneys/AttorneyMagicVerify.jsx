import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { attorneyApi, setAttorneyToken } from '../../hooks/attorneys/useAttorneyApi';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

export default function AttorneyMagicVerify() {
  const { t } = useAttorneyT();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }
    attorneyApi
      .get(`/attorneys/login/verify-magic/${encodeURIComponent(token)}`)
      .then((res) => {
        if (res?.data?.token) setAttorneyToken(res.data.token);
        nav('/attorneys/dashboard');
      })
      .catch(() => setStatus('error'));
  }, [params, nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="text-center">
        {status === 'verifying' ? (
          <div className="text-neutral-600">{t.verify.verifying}</div>
        ) : (
          <>
            <div className="text-red-600 mb-4">{t.verify.expired}</div>
            <Link to="/attorneys/login" className="text-sm underline text-neutral-700">
              {t.verify.backToLogin}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
