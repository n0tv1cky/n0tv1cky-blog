"use client";
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getBaseUrl } from '../lib/api';

const BASE = (typeof window !== 'undefined') ? getBaseUrl() : (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '');

export default function CommentSection({ blogSlug }) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [authorName, setAuthorName] = useState('');
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
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                Comments ({comments.length})
            </h2>

            <form onSubmit={handleSubmit} className="mb-8 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="mb-4">
                    <input
                        type="text"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        required
                        maxLength={100}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Your name"
                    />
                </div>

                <div className="mb-4">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        minLength={3}
                        maxLength={5000}
                        rows={4}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Write your comment..."
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                        {content.length}/5000
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${submitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow-md'
                        } text-white`}
                >
                    {submitting ? 'Submitting...' : 'Post Comment'}
                </button>
            </form>

            <div className="space-y-3">
                {comments.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 italic text-center py-8">No comments yet. Be the first to comment!</p>
                ) : (
                    comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="bg-white dark:bg-gray-800 rounded-lg border-l-2 border-primary-500 dark:border-primary-400 p-4 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <strong className="text-gray-900 dark:text-gray-100 font-medium text-sm">{comment.author_name}</strong>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {comment.created_at ? new Date(comment.created_at).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) : ''}
                                </span>
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">
                                {comment.content}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
