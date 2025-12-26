"use client";
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export default function DraftAutosave({ enabled = true, title, slug, description, content, onSave }) {
    const [status, setStatus] = useState('');
    const [isEnabled, setIsEnabled] = useState(enabled);
    const saveIntervalRef = useRef(null);
    const lastSavedRef = useRef(null);

    useEffect(() => {
        if (!isEnabled || !title || !content) return;

        // Clear existing interval
        if (saveIntervalRef.current) {
            clearInterval(saveIntervalRef.current);
        }

        // Auto-save every 30 seconds
        saveIntervalRef.current = setInterval(() => {
            if (onSave) {
                const draftData = {
                    title,
                    slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    description,
                    content,
                    timestamp: Date.now()
                };

                // Save to localStorage as backup
                localStorage.setItem(`draft_${slug || 'new'}`, JSON.stringify(draftData));

                // Call onSave callback if provided
                onSave(draftData);

                setStatus('Saved');
                lastSavedRef.current = new Date();
                toast.success('Draft saved', { duration: 2000 });
                setTimeout(() => setStatus(''), 2000);
            }
        }, 30000); // 30 seconds

        return () => {
            if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
            }
        };
    }, [isEnabled, title, slug, description, content, onSave]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                />
                <span>Auto-save drafts (every 30s)</span>
            </label>
            {status && <span style={{ color: '#666', fontSize: '12px' }}>{status}</span>}
            {lastSavedRef.current && (
                <span style={{ color: '#999', fontSize: '12px' }}>
                    Last saved: {lastSavedRef.current.toLocaleTimeString()}
                </span>
            )}
        </div>
    );
}
