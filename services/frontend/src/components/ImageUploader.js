import { useRef, useState } from 'react';
import { uploadImage } from '../lib/api';

export default function ImageUploader({ adminPassword, onUpload }) {
    const inputRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const maxSize = typeof window !== 'undefined' && window.NEXT_PUBLIC_MAX_UPLOAD_SIZE ? Number(window.NEXT_PUBLIC_MAX_UPLOAD_SIZE) : (5 * 1024 * 1024);

    function handleXHRUpload(file) {
        return new Promise((resolve, reject) => {
            const form = new FormData();
            form.append('file', file, file.name);

            const xhr = new XMLHttpRequest();
            const url = (typeof window !== 'undefined' && window.NEXT_PUBLIC_BACKEND_URL) ? `${window.NEXT_PUBLIC_BACKEND_URL}/api/uploads/image` : `/api/uploads/image`;
            xhr.open('POST', url);
            if (adminPassword) xhr.setRequestHeader('X-ADMIN-PASSWORD', adminPassword);
            if (typeof window !== 'undefined' && window.NEXT_PUBLIC_ADMIN_TOKEN) xhr.setRequestHeader('Authorization', `Bearer ${window.NEXT_PUBLIC_ADMIN_TOKEN}`);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const json = JSON.parse(xhr.responseText);
                        resolve(json);
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    reject(new Error(xhr.responseText || 'Upload failed'));
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
