"use client";
import { useEffect, useState } from 'react';

// Helper to get base URL - convert Docker service names to localhost for client-side
function getBaseUrl() {
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '';
    }
    const url = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    // If it's a Docker service name (contains underscore or no dots), use localhost
    if (url && (url.includes('_') || (!url.includes('.') && !url.startsWith('http://localhost') && !url.startsWith('https://')))) {
        const port = url.match(/:(\d+)/)?.[1] || '8000';
        return `http://localhost:${port}`;
    }
    return url;
}
const BASE = getBaseUrl();

export default function ReactionButtons({ blogSlug }) {
    const [reactions, setReactions] = useState({ likes: 0, dislikes: 0 });
    const [userReaction, setUserReaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadReactions();
    }, [blogSlug]);

    async function loadReactions() {
        try {
            const url = BASE ? `${BASE}/api/blogs/${blogSlug}/reactions` : `/api/blogs/${blogSlug}/reactions`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setReactions({ likes: data.likes || 0, dislikes: data.dislikes || 0 });
            }
        } catch (e) {
            console.error('Failed to load reactions', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleReaction(type) {
        if (submitting) return;

        setSubmitting(true);
        setError(null);

        try {
            const url = BASE ? `${BASE}/api/blogs/${blogSlug}/react?reaction_type=${type}` : `/api/blogs/${blogSlug}/react?reaction_type=${type}`;
            const res = await fetch(url, {
                method: 'POST'
            });

            if (res.status === 429) {
                setError('Rate limit exceeded. Please try again later.');
                setSubmitting(false);
                return;
            }

            if (!res.ok) {
                const text = await res.text();
                setError(text || 'Failed to submit reaction');
                setSubmitting(false);
                return;
            }

            const result = await res.json();

            // Update user reaction state
            if (result.reaction_type === null) {
                setUserReaction(null);
            } else {
                setUserReaction(result.reaction_type);
            }

            // Reload reactions to get updated counts
            await loadReactions();
        } catch (e) {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div style={{ padding: '0.5rem' }}>Loading reactions...</div>;
    }

    return (
        <div style={{ padding: '1rem', marginBottom: '1rem', borderTop: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0' }}>
            {error && (
                <div style={{ color: 'red', marginBottom: '0.5rem', padding: '0.5rem', background: '#ffe6e6', borderRadius: '4px', fontSize: '0.875rem' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                    onClick={() => handleReaction('like')}
                    disabled={submitting}
                    style={{
                        padding: '0.5rem 1rem',
                        background: userReaction === 'like' ? '#4CAF50' : '#f0f0f0',
                        color: userReaction === 'like' ? 'white' : '#333',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <span>👍</span>
                    <span>Like ({reactions.likes})</span>
                </button>

                <button
                    onClick={() => handleReaction('dislike')}
                    disabled={submitting}
                    style={{
                        padding: '0.5rem 1rem',
                        background: userReaction === 'dislike' ? '#f44336' : '#f0f0f0',
                        color: userReaction === 'dislike' ? 'white' : '#333',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <span>👎</span>
                    <span>Dislike ({reactions.dislikes})</span>
                </button>
            </div>
        </div>
    );
}

