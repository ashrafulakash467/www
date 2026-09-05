const API_PREFIX = '/api/v1';

const WEB_ENDPOINTS = new Map([
    ['/login', '/login'],
    ['/patient/login', '/login'],
    ['/doctor/login', '/login'],
    ['/admin/login', '/login'],
    ['/logout', '/logout'],
    ['/patient/register', '/register'],
    ['/doctor/register', '/doctor/register'],
    ['/patient/forgot-password', '/forgot-password'],
    ['/patient/reset-password', '/reset-password'],
]);

export const API_BASE_URL = '';

export function apiUrl(path = '') {
    if (!path) {
        return API_PREFIX;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return WEB_ENDPOINTS.get(normalizedPath) ?? `${API_PREFIX}${normalizedPath}`;
}

export async function apiFetch(path, options = {}) {
    const headers = new Headers(options.headers ?? {});
    const hasBody = options.body !== undefined && options.body !== null;
    const method = String(options.method ?? 'GET').toUpperCase();

    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json');
    }

    if (hasBody && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !headers.has('X-CSRF-TOKEN')) {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (token) {
            headers.set('X-CSRF-TOKEN', token);
        }
    }

    return fetch(apiUrl(path), {
        ...options,
        credentials: 'same-origin',
        headers,
    });
}

export function getStoredToken(role) {
    const activeRole = String(window.__healthcareAuth?.role ?? '').trim().toLowerCase();
    const requestedRole = String(role ?? '').trim().toLowerCase();
    const isAdminRole = activeRole === 'admin' || activeRole === 'super-admin';

    if (requestedRole === 'admin' && isAdminRole) {
        return 'session';
    }

    if (requestedRole === 'super-admin' && activeRole === 'admin') {
        return 'session';
    }

    return activeRole === requestedRole ? 'session' : '';
}

export function getStoredUser(role) {
    return getStoredToken(role) ? window.__healthcareAuth?.user ?? null : null;
}

export function persistAuthSession(role, _token, user) {
    window.__healthcareAuth = { role, user };
    window.dispatchEvent(new Event('auth-change'));
}

export function clearAuthSession(role) {
    if (window.__healthcareAuth?.role === role) {
        window.__healthcareAuth = { role: null, user: null };
    }
    window.dispatchEvent(new Event('auth-change'));
}

export function clearAllAuthSessions() {
    window.__healthcareAuth = { role: null, user: null };
    window.dispatchEvent(new Event('auth-change'));
}

export function getActiveDashboardPath() {
    const role = window.__healthcareAuth?.role;
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'doctor') return '/doctor/dashboard';
    if (role === 'patient') return '/patient/dashboard';
    return '/login';
}
