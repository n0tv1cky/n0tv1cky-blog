"use client";
import { useRef, useState } from 'react';
import { uploadImage } from '../lib/api';

export default function ImageUploader({ adminPassword, blogSlug, onUpload }) {
    const inputRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const maxSize = typeof window !== 'undefined' && window.NEXT_PUBLIC_MAX_UPLOAD_SIZE ? Number(window.NEXT_PUBLIC_MAX_UPLOAD_SIZE) : (5 * 1024 * 1024);

    function handleXHRUpload(file) {
        return new Promise((resolve, reject) => {
            const form = new FormData();
            form.append('file', file, file.name);
            if (blogSlug) {
                form.append('blog_slug', blogSlug);
            }

            const xhr = new XMLHttpRequest();
            // Get base URL from environment variable (NEXT_PUBLIC_BACKEND_URL)
            // Always use absolute URL to backend, never relative (which would go to frontend)
            let baseUrl = 'http://localhost:8000'; // Default fallback
            if (typeof window !== 'undefined') {
                // Try window.NEXT_PUBLIC_BACKEND_URL first (set in layout.js), then process.env
                const envUrl = window.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
                if (envUrl && envUrl.trim()) {
                    // If it's a Docker service name (contains underscore or no dots), convert to localhost
                    if (envUrl.includes('_') || (!envUrl.includes('.') && !envUrl.startsWith('http://localhost') && !envUrl.startsWith('https://'))) {
                        const port = envUrl.match(/:(\d+)/)?.[1] || '8000';
                        baseUrl = `http://localhost:${port}`;
                    } else if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
                        // Valid absolute URL from env variable
                        baseUrl = envUrl;
                    }
                }
            }
            const url = `${baseUrl}/api/uploads/image`;
            xhr.open('POST', url);
            if (adminPassword) xhr.setRequestHeader('X-ADMIN-PASSWORD', adminPassword);
            if (typeof window !== 'undefined' && window.NEXT_PUBLIC_ADMIN_TOKEN) xhr.setRequestHeader('Authorization', `Bearer ${window.NEXT_PUBLIC_ADMIN_TOKEN}`);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        // Check if response is JSON
                        const contentType = xhr.getResponseHeader('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            const json = JSON.parse(xhr.responseText);
                            resolve(json);
                        } else {
                            // If not JSON, might be HTML error page
                            reject(new Error('Server returned non-JSON response. Status: ' + xhr.status));
                        }
                    } catch (err) {
                        reject(new Error('Failed to parse response: ' + err.message));
                    }
                } else {
                    // Try to extract error message from response
                    let errorMsg = 'Upload failed';
                    try {
                        const contentType = xhr.getResponseHeader('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            const json = JSON.parse(xhr.responseText);
                            errorMsg = json.detail || json.message || errorMsg;
                        } else if (xhr.responseText && xhr.responseText.length < 200) {
                            // Only use short text responses as error messages
                            errorMsg = xhr.responseText;
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                    reject(new Error(errorMsg));
                }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(form);
        });
    }

    async function handleFile(e) {
        const f = e.target.files[0];
        if (!f) return;
        if (f.size > maxSize) {
            alert(`File is too large. Max size is ${maxSize} bytes`);
            return;
        }
        try {
            const res = await handleXHRUpload(f);
            if (res && res.url) onUpload(res.url);
        } catch (err) {
            console.error(err);
            alert('Upload failed: ' + err.message);
        } finally {
            setProgress(0);
        }
    }

    return (
        <div>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} />
            {progress > 0 && <div>Uploading: {progress}%</div>}
        </div>
    );
}
