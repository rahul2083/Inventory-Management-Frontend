import axios from 'axios';
import { clearSession, getStoredToken } from '../utils/auth';

// Shared axios instance for the legacy `/Inventory/*` endpoints.
// Falls back to '' so the Vite dev proxy handles requests when VITE_API_URL is unset.
const resolveBaseUrl = () => {
    const raw = import.meta.env.VITE_API_URL;
    if (!raw) return '';
    try {
        return new URL(raw).origin;
    } catch {
        return '';
    }
};

export const API_BASE_URL = resolveBaseUrl();

export const legacyApi = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
});

legacyApi.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

legacyApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) clearSession();
        return Promise.reject(error);
    }
);
