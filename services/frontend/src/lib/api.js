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
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-ADMIN-PASSWORD': adminPassword || ''
            },
            body: JSON.stringify(payload)
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
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-ADMIN-PASSWORD': adminPassword || ''
            },
            body: JSON.stringify(payload)
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

export async function uploadImage(file, adminPassword) {
    const url = BASE ? `${BASE}/api/uploads/image` : `/api/uploads/image`;
    const form = new FormData();
    form.append('file', file, file.name);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'X-ADMIN-PASSWORD': adminPassword || ''
            },
            body: form
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
