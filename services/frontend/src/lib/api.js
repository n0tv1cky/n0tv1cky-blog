// For client-side requests, use localhost or the public URL
// Docker service names only work server-side
export function getBaseUrl() {
    if (typeof window === 'undefined') {
        // Server-side: can use Docker service name
        return process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
    } else {
        // Client-side: prefer same-origin relative paths for production
        // Check window.NEXT_PUBLIC_BACKEND_URL first (set in layout.js), then process.env
        let url = window.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
        if (url) {
            try {
                const parsed = new URL(url, window.location.origin);
                // If the backend URL is the same origin as the page, use relative paths to avoid CORS/mixed-content
                if (parsed.origin === window.location.origin) {
                    console.log('getBaseUrl returning (same origin):', '');
                    return '';
                }
                // If the page is served over HTTPS but backend URL uses HTTP, upgrade to HTTPS
                if (window.location.protocol === 'https:' && parsed.protocol === 'http:') {
                    parsed.protocol = 'https:';
                    const result = parsed.toString().replace(/\/$/, '');
                    console.log('getBaseUrl returning (upgraded):', result);
                    return result;
                }
                const result = parsed.toString().replace(/\/$/, '');
                console.log('getBaseUrl returning (absolute):', result);
                return result;
            } catch (e) {
                // If URL parsing fails, fall through to other heuristics
            }
        }

        // If we're running in production (hostname matches domain), use relative paths
        try {
            const hostname = window.location.hostname || '';
            if (hostname && (hostname === 'n0tv1cky.com' || hostname === 'www.n0tv1cky.com')) {
                console.log('getBaseUrl returning (production relative):', '');
                return '';
            }
        } catch (e) {
            // ignore
        }

        // Default to localhost:8000 for local development (explicit localhost over HTTPS is uncommon)
        console.log('getBaseUrl returning (localhost fallback):', 'http://localhost:8000');
        return 'http://localhost:8000';
    }
}

async function safeFetch(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
            return null;
        }
        return await res.json();
    } catch (e) {
        console.error(`Error fetching ${url}:`, e);
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
    const BASE = getBaseUrl();
    const url = BASE ? `${BASE}/api/blogs` : `/api/blogs`;
    console.log('fetchBlogs BASE:', BASE, 'url:', url);
    const data = await safeFetch(url);
    if (data) return data;
    // fallback mock
    return [];
}

export async function fetchAllBlogs() {
    // Admin endpoint - returns all blogs (published and drafts)
    const BASE = getBaseUrl();
    const url = BASE ? `${BASE}/api/admin/blogs` : `/api/admin/blogs`;
    try {
        const res = await authFetch(url, {
            method: 'GET'
        });
        if (res.status === 403) {
            const error = new Error('Invalid credentials');
            error.status = 403;
            throw error;
        }
        if (!res.ok) {
            return [];
        }
        return await res.json();
    } catch (e) {
        if (e.status === 403) {
            throw e; // Re-throw 403 errors to be handled by component
        }
        return [];
    }
}

export async function fetchBlog(slug) {
    const BASE = getBaseUrl();
    const url = BASE ? `${BASE}/api/blogs/${slug}` : `/api/blogs/${slug}`;
    const data = await safeFetch(url);
    if (data) return data;
    // fallback mock
    return null;
}

export async function fetchBlogAdmin(slug) {
    // Admin endpoint - can fetch published and draft blogs
    const BASE = getBaseUrl();
    const url = BASE ? `${BASE}/api/admin/blogs/${slug}` : `/api/admin/blogs/${slug}`;
    try {
        const res = await authFetch(url, {
            method: 'GET'
        });
        if (res.status === 403) {
            const error = new Error('Invalid credentials');
            error.status = 403;
            throw error;
        }
        if (!res.ok) {
            return null;
        }
        return await res.json();
    } catch (e) {
        if (e.status === 403) {
            throw e; // Re-throw 403 errors to be handled by component
        }
        return null;
    }
}

export async function createBlog(payload, adminPassword) {
    const BASE = getBaseUrl();
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
    const BASE = getBaseUrl();
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
    const BASE = getBaseUrl();
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
    const BASE = getBaseUrl();
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
    const BASE = getBaseUrl();
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

export async function deleteBlog(slug, adminPassword) {
    const BASE = getBaseUrl();
    const url = BASE ? `${BASE}/api/admin/blogs/${slug}` : `/api/admin/blogs/${slug}`;
    try {
        const res = await authFetch(url, {
            method: 'DELETE',
            adminPassword
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Delete failed');
        }
        return await res.json();
    } catch (e) {
        throw e;
    }
}

export function logout() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh');
    }
}

export async function authFetch(url, opts = {}) {
    // opts: {method, headers, body, adminPassword}
    const adminPassword = opts.adminPassword;
    const method = opts.method || 'GET';
    const body = opts.body;
    let headers = opts.headers || {};

    // Prepend base URL if the URL is relative
    const BASE = getBaseUrl();
    const fullUrl = url.startsWith('http') ? url : (BASE ? `${BASE}${url}` : url);

    // Attach auth headers
    headers = Object.assign({}, headers, getAuthHeaders(adminPassword));

    // If it's a form (FormData), do not set content-type
    const fetchOpts = { method, headers, body };

    let res = await fetch(fullUrl, fetchOpts);
    if (res.status === 401) {
        // try refresh
        const newToken = await refreshToken();
        if (newToken) {
            headers = Object.assign({}, opts.headers || {}, getAuthHeaders(adminPassword));
            // retry once
            res = await fetch(fullUrl, { method, headers, body });
        } else {
            // logout if refresh failed
            logout();
        }
    } else if (res.status === 403) {
        // Handle 403 Forbidden - invalid credentials
        if (typeof window !== 'undefined') {
            // Dynamic import to avoid SSR issues
            import('react-hot-toast').then(({ default: toast }) => {
                toast.error('Invalid credentials. Please log in again.');
            });
            logout();
        }
    }
    return res;
}
