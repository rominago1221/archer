import React, { useState } from 'react';
import { attorneyApi, setAttorneyToken } from '../../hooks/attorneys/useAttorneyApi';
import { useAttorneyT } from '../../hooks/attorneys/useAttorneyT';

export default function AttorneyLogin() {
  const { t } = useAttorneyT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [magicMsg, setMagicMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await attorneyApi.post('/attorneys/login', { email, password });

      // [DIAG] Inspect what the backend actually returned. Multiple field
      // names tried — backends differ; pick whichever the deployed build sends.
      console.log('[AttorneyLogin] response.data:', data);
      console.log('[AttorneyLogin] response.data keys:', data ? Object.keys(data) : null);
      const tokenCandidate =
        (data && (data.token || data.session_token || data.access_token || data.key)) || null;
      console.log('[AttorneyLogin] token candidate found?', !!tokenCandidate,
                  'value preview:', tokenCandidate ? String(tokenCandidate).slice(0, 8) + '…' : 'NONE');

      if (tokenCandidate) {
        setAttorneyToken(tokenCandidate);
        console.log('[AttorneyLogin] localStorage.attorney_token after store:',
                    localStorage.getItem('attorney_token'));
      } else {
        // Loud failure — backend response had no usable token field.
        console.error('[AttorneyLogin] NO TOKEN FIELD in response — backend not deployed with bearer token support');
        // eslint-disable-next-line no-alert
        alert(
          'Pas de token dans la réponse backend.\n\n' +
          'Réponse complète :\n' + JSON.stringify(data, null, 2) +
          '\n\nVérifier que Emergent a déployé un commit ≥ 62e39f4 ' +
          '(la modif qui ajoute `token` dans le body de POST /attorneys/login).'
        );
        // Don't redirect — staying on the login page so the user sees the alert
        // and the console output.
        return;
      }

      // Full page reload — guarantees the auth guard re-runs with a fresh
      // app state and the bearer token from localStorage. React Router's
      // nav() can keep stale auth state in memory and bounce back to login.
      window.location.href = '/attorneys/dashboard';
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) setError(t.login.notActive);
      else setError(t.login.invalidCredentials);
    } finally {
      setLoading(false);
    }
  };

  const sendMagic = async () => {
    setError(null);
    setMagicMsg(null);
    if (!email) { setError(t.login.email); return; }
    try {
      await attorneyApi.post('/attorneys/login/magic-link', { email });
      setMagicMsg(t.login.magicLinkSent);
    } catch (_) {
      setMagicMsg(t.login.magicLinkSent);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl p-8 shadow-sm">
        <div className="mb-6">
          <div className="font-serif text-2xl text-neutral-900">{t.login.title}</div>
          <div className="text-sm text-neutral-500 mt-1">{t.login.subtitle}</div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-600">{t.login.email}</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">{t.login.password}</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {magicMsg && <div className="text-sm text-emerald-700">{magicMsg}</div>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-neutral-900 text-white rounded-md py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? '...' : t.login.signIn}
          </button>
        </form>

        <div className="mt-4 border-t border-neutral-200 pt-4">
          <button
            type="button" onClick={sendMagic}
            className="w-full text-sm text-neutral-700 border border-neutral-300 rounded-md py-2 hover:bg-neutral-50"
          >
            {t.login.magicLink}
          </button>
          <div className="mt-3 text-center">
            <button type="button" onClick={sendMagic} className="text-xs text-neutral-500 hover:text-neutral-900 underline">
              {t.login.forgotPassword}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
