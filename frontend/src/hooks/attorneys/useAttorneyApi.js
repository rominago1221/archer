import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Bearer token storage. Cross-site cookies can be blocked on the Emergent
// preview environment (frontend and backend live on different domains), so
// we keep a bearer token as a fallback. The backend's _extract_token in
// utils/attorney_auth.py accepts both `Authorization: Bearer <token>` and
// the `attorney_session` cookie — first one that matches wins.
const TOKEN_KEY = 'attorney_token';

export function setAttorneyToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAttorneyToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAttorneyToken() {
  setAttorneyToken(null);
}

export const attorneyApi = axios.create({
  baseURL: API,
  withCredentials: true,
});

attorneyApi.interceptors.request.use((config) => {
  const token = getAttorneyToken();
  // [DIAG] Surface for every request so we can confirm the interceptor is
  // reading localStorage correctly after the page reload.
  // eslint-disable-next-line no-console
  console.log(
    `[attorneyApi] ${(config.method || 'get').toUpperCase()} ${config.url} — `
    + `token in localStorage: ${token ? token.slice(0, 8) + '…' : 'NONE'}`
  );
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

export function useAttorneyApi() {
  return attorneyApi;
}
