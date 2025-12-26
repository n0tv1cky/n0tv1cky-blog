const BASE = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_URL ? process.env.NEXT_PUBLIC_BACKEND_URL : '';

async function safeFetch(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

async function postJson(url, body, extraHeaders = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, extraHeaders);
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    return res;
}

function getAuthHeaders(adminPassword) {
    const headers = {};
    const token = (typeof window !== 'undefined') ? (localStorage.getItem('admin_token') || '') : '';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (adminPassword) headers['X-ADMIN-PASSWORD'] = adminPassword;
    return headers;
}

export async function fetchBlogs() {
    const url = BASE ? `${BASE}/api/blogs` : `/api/blogs`;
    const data = await safeFetch(url);
    if (data) return data;
    // fallback mock
    return [];
}

export async function fetchBlog(slug) {
    const url = BASE ? `${BASE}/api/blogs/${slug}` : `/api/blogs/${slug}`;
    const data = await safeFetch(url);
    if (data) return data;
    // fallback mock
    return null;
}

export async function createBlog(payload, adminPassword) {
    const url = BASE ? `${BASE}/api/admin/blogs` : `/api/admin/blogs`;
    try {
        const res = await authFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            adminPassword
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Create failed');
        }
        return await res.json();
    } catch (e) {
        throw e;
    }
}

export async function updateBlog(slug, payload, adminPassword) {
    const url = BASE ? `${BASE}/api/admin/blogs/${slug}` : `/api/admin/blogs/${slug}`;
    try {
        const res = await authFetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            adminPassword
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Update failed');
        }
        return await res.json();
    } catch (e) {
        throw e;
    }
}

export async function uploadImage(file, adminPassword, blogSlug = null) {
    const url = BASE ? `${BASE}/api/uploads/image` : `/api/uploads/image`;
    const form = new FormData();
    form.append('file', file, file.name);
    if (blogSlug) {
        form.append('blog_slug', blogSlug);
    }
    try {
        // We can't include Content-Type here; rely on authFetch to set headers and refresh tokens if needed
        const res = await authFetch(url, {
            method: 'POST',
            body: form,
            adminPassword
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Upload failed');
        }
        return await res.json();
    } catch (e) {
        throw e;
    }
}

export async function login(password) {
    const url = BASE ? `${BASE}/api/admin/auth` : `/api/admin/auth`;
    const res = await postJson(url, { password });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    if (typeof window !== 'undefined') {
        if (data.access_token) localStorage.setItem('admin_token', data.access_token);
        if (data.refresh_token) localStorage.setItem('admin_refresh', data.refresh_token);
    }
    return data;
}

export async function refreshToken() {
    const url = BASE ? `${BASE}/api/admin/auth/refresh` : `/api/admin/auth/refresh`;
    const refresh = (typeof window !== 'undefined') ? localStorage.getItem('admin_refresh') : null;
    if (!refresh) return null;
    const res = await postJson(url, { refresh_token: refresh });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.access_token) {
        if (typeof window !== 'undefined') localStorage.setItem('admin_token', data.access_token);
        return data.access_token;
    }
    return null;
}

export function logout() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh');
    }
}

async function authFetch(url, opts = {}) {
    // opts: {method, headers, body, adminPassword}
    const adminPassword = opts.adminPassword;
    const method = opts.method || 'GET';
    const body = opts.body;
    let headers = opts.headers || {};

    // Attach auth headers
    headers = Object.assign({}, headers, getAuthHeaders(adminPassword));

    // If it's a form (FormData), do not set content-type
    const fetchOpts = { method, headers, body };

    let res = await fetch(url, fetchOpts);
    if (res.status === 401) {
        // try refresh
        const newToken = await refreshToken();
        if (newToken) {
            headers = Object.assign({}, opts.headers || {}, getAuthHeaders(adminPassword));
            // retry once
            res = await fetch(url, { method, headers, body });
        } else {
            // logout if refresh failed
            logout();
        }
    }
    return res;
}
