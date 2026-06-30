import axios from 'axios';
import { clearSession, getStoredToken } from '../utils/auth';

const normalizeApiUrl = (url) => {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        return parsed.origin;
    } catch {
        console.warn(`Invalid VITE_API_URL value '${url}', falling back to empty string`);
        return '';
    }
};

export const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL).replace(/\/$/, '');
export const API_URL = `${API_BASE_URL}/api`;

// =============================================
// HELPERS
// =============================================
export const toNumber = (val, fallback = 0) => {
    if (val === null || val === undefined || val === '') return fallback;
    const num = Number(val);
    return Number.isNaN(num) ? fallback : num;
};

export const toNullableNumber = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return Number.isNaN(num) ? null : num;
};

export const toTrimmedString = (val, fallback = '') => {
    if (val === null || val === undefined) return fallback;
    return String(val).trim();
};

export const toNullableString = (val) => {
    const str = toTrimmedString(val, '');
    return str ? str : null;
};

export const collapseDuplicateColumnValue = (val) => {
    if (!Array.isArray(val)) return val;
    const meaningfulValues = val.filter(
        (entry) => entry !== null && entry !== undefined && String(entry).trim() !== ''
    );
    if (meaningfulValues.length > 0) return meaningfulValues[meaningfulValues.length - 1];
    return val.length > 0 ? val[val.length - 1] : null;
};

export const toBoolean = (val) => {
    return (
        val === true || val === 1 || val === '1' || val === 'true' ||
        val === 'TRUE' || val === 'Yes' || val === 'YES' || val === 'yes'
    );
};

export const normalizeDispatchStatus = (status) => {
    const safeStatus = toTrimmedString(status, '');
    if (!safeStatus) return 'Pending';
    return safeStatus;
};

export const normalizeLogisticsStatus = (status) => {
    const safeStatus = toTrimmedString(status, '');
    if (!safeStatus) return null;
    if (safeStatus === 'Ready for Dispatch') return 'Packing in Process';
    return safeStatus;
};

// Axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 12000
});

export const checkHealth = () =>
    axios.get(API_BASE_URL ? `${API_BASE_URL}/health` : '/health', { timeout: 8000 });

const withAuthHeaders = (config = {}) => {
    const nextConfig = { ...config };
    nextConfig.headers = { ...(config.headers || {}) };
    const token = getStoredToken();
    if (token) {
        nextConfig.headers.Authorization = `Bearer ${token}`;
    } else {
        delete nextConfig.headers.Authorization;
    }
    return nextConfig;
};

axios.interceptors.request.use(withAuthHeaders);
api.interceptors.request.use(withAuthHeaders);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) clearSession();
        console.error('API Error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || error.message || 'Something went wrong';
        const enhancedError = new Error(errorMessage);
        enhancedError.response = error.response;
        return Promise.reject(enhancedError);
    }
);

export default api;
