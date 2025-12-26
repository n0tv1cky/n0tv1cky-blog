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

export default function CommentSection({ blogSlug }) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [authorName, setAuthorName] = useState('');
    const [authorEmail, setAuthorEmail] = useState('');
    const [content, setContent] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        loadComments();
    }, [blogSlug]);

    async function loadComments() {
        try {
            const url = BASE ? `${BASE}/api/blogs/${blogSlug}/comments` : `/api/blogs/${blogSlug}/comments`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setComments(data || []);
            }
        } catch (e) {
            console.error('Failed to load comments', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!content.trim() || content.trim().length < 3) {
            setError('Comment must be at least 3 characters');
            return;
        }
        if (content.length > 5000) {
            setError('Comment too long (max 5000 characters)');
            return;
        }
        if (!authorName.trim()) {
            setError('Name is required');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const url = BASE ? `${BASE}/api/blogs/${blogSlug}/comments` : `/api/blogs/${blogSlug}/comments`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author_name: authorName.trim(),
                    author_email: authorEmail.trim() || undefined,
                    content: content.trim()
                })
            });

            if (res.status === 429) {
                setError('Rate limit exceeded. Please try again later.');
                return;
            }

            if (!res.ok) {
                const text = await res.text();
                setError(text || 'Failed to submit comment');
                return;
            }

            const newComment = await res.json();
            setComments([newComment, ...comments]);
            setContent('');
            setAuthorName('');
            setAuthorEmail('');
            setError(null);
        } catch (e) {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div style={{ padding: '1rem' }}>Loading comments...</div>;
    }

    return (
        <div style={{ padding: '1.5rem', marginTop: '2rem', borderTop: '1px solid #e0e0e0' }}>
            <h2 style={{ marginTop: 0 }}>Comments ({comments.length})</h2>

            <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
                        Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        required
                        maxLength={100}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
                        Email (optional)
                    </label>
                    <input
                        type="email"
                        value={authorEmail}
                        onChange={(e) => setAuthorEmail(e.target.value)}
                        maxLength={255}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
                        Comment <span style={{ color: 'red' }}>*</span>
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        minLength={3}
                        maxLength={5000}
                        rows={4}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'inherit' }}
                    />
                    <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.25rem' }}>
                        {content.length}/5000 characters
                    </div>
                </div>

                {error && (
                    <div style={{ color: 'red', marginBottom: '0.75rem', padding: '0.5rem', background: '#ffe6e6', borderRadius: '4px' }}>
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={submitting}
                    style={{
                        padding: '0.5rem 1rem',
                        background: submitting ? '#ccc' : '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {submitting ? 'Submitting...' : 'Submit Comment'}
                </button>
            </form>

            <div>
                {comments.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No comments yet. Be the first to comment!</p>
                ) : (
                    comments.map((comment) => (
                        <div
                            key={comment.id}
                            style={{
                                marginBottom: '1.5rem',
                                padding: '1rem',
                                background: '#f9f9f9',
                                borderRadius: '8px',
                                borderLeft: '3px solid #0066cc'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <strong style={{ color: '#0066cc' }}>{comment.author_name}</strong>
                                <span style={{ fontSize: '0.875rem', color: '#666' }}>
                                    {comment.created_at ? new Date(comment.created_at).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : ''}
                                </span>
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                {comment.content}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
