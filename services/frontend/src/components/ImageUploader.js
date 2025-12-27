"use client";
import { useRef, useState } from 'react';
import { uploadImage, getBaseUrl } from '../lib/api';
import toast from 'react-hot-toast';

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
            const base = (typeof window !== 'undefined') ? getBaseUrl() : (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8000');
            const url = base ? `${base}/api/uploads/image` : `/api/uploads/image`;
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
            toast.error(`File is too large. Max size is ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
            return;
        }
        try {
            const res = await handleXHRUpload(f);
            if (res && res.url) {
                onUpload(res.url);
                toast.success('Image uploaded successfully!');
            }
        } catch (err) {
            console.error(err);
            toast.error('Upload failed: ' + err.message);
        } finally {
            setProgress(0);
            // Reset input
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    return (
        <div className="space-y-3">
            <label className="block">
                <div className="flex items-center gap-3">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFile}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors border border-gray-300"
                    >
                        Choose Image
                    </button>
                    <span className="text-sm text-gray-500">
                        Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
                    </span>
                </div>
            </label>
            {progress > 0 && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Uploading...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
}
