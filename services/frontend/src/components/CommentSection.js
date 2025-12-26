"use client";
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

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
            toast.error('Comment must be at least 3 characters');
            return;
        }
        if (content.length > 5000) {
            toast.error('Comment too long (max 5000 characters)');
            return;
        }
        if (!authorName.trim()) {
            toast.error('Name is required');
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
                    ...(authorEmail.trim() && { author_email: authorEmail.trim() }),
                    content: content.trim()
                })
            });

            if (res.status === 429) {
                toast.error('Rate limit exceeded. Please try again later.');
                return;
            }

            if (!res.ok) {
                const text = await res.text();
                toast.error(text || 'Failed to submit comment');
                return;
            }

            const newComment = await res.json();
            setComments([newComment, ...comments]);
            setContent('');
            setAuthorName('');
            setAuthorEmail('');
            toast.success('Comment submitted successfully!');
        } catch (e) {
            toast.error('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="py-8">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Comments ({comments.length})
            </h2>

            <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        required
                        maxLength={100}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        placeholder="Your name"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email (optional)
                    </label>
                    <input
                        type="email"
                        value={authorEmail}
                        onChange={(e) => setAuthorEmail(e.target.value)}
                        maxLength={255}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        placeholder="your.email@example.com"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comment <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        minLength={3}
                        maxLength={5000}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
                        placeholder="Write your comment here..."
                    />
                    <div className="text-sm text-gray-500 mt-1">
                        {content.length}/5000 characters
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${submitting
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow-md'
                        } text-white`}
                >
                    {submitting ? 'Submitting...' : 'Submit Comment'}
                </button>
            </form>

            <div className="space-y-4">
                {comments.length === 0 ? (
                    <p className="text-gray-500 italic text-center py-8">No comments yet. Be the first to comment!</p>
                ) : (
                    comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="bg-white rounded-lg border-l-4 border-primary-500 p-5 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <strong className="text-gray-900 font-medium">{comment.author_name}</strong>
                                    {comment.author_email && (
                                        <span className="text-sm text-gray-500 ml-2">({comment.author_email})</span>
                                    )}
                                </div>
                                <span className="text-sm text-gray-500">
                                    {comment.created_at ? new Date(comment.created_at).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : ''}
                                </span>
                            </div>
                            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {comment.content}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
