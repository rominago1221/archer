import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const attorneyApi = axios.create({
  baseURL: API,
  withCredentials: true,
});

export function useAttorneyApi() {
  return attorneyApi;
}
