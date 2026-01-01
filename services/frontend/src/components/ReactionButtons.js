"use client";
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getBaseUrl } from '../lib/api';

const BASE = (typeof window !== 'undefined') ? getBaseUrl() : (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || '');

export default function ReactionButtons({ blogSlug }) {
    const [reactions, setReactions] = useState({ likes: 0, dislikes: 0 });
    const [userReaction, setUserReaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

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

        try {
            const url = BASE ? `${BASE}/api/blogs/${blogSlug}/react?reaction_type=${type}` : `/api/blogs/${blogSlug}/react?reaction_type=${type}`;
            const res = await fetch(url, {
                method: 'POST'
            });

            if (res.status === 429) {
                toast.error('Rate limit exceeded. Please try again later.');
                setSubmitting(false);
                return;
            }

            if (!res.ok) {
                toast.error('Failed to submit reaction');
                setSubmitting(false);
                return;
            }

            const result = await res.json();

            // Update user reaction state
            if (result.reaction_type === null) {
                setUserReaction(null);
                toast.success('Reaction removed');
            } else {
                setUserReaction(result.reaction_type);
                toast.success(`Reaction ${result.reaction_type === 'like' ? 'liked' : 'disliked'}!`);
            }

            // Reload reactions to get updated counts
            await loadReactions();
        } catch (e) {
            toast.error('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="py-4 border-y border-gray-200">
                <div className="animate-pulse flex gap-4">
                    <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
                    <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-3">
            <button
                onClick={() => handleReaction('like')}
                disabled={submitting}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${userReaction === 'like'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span>👍</span>
                <span>Like ({reactions.likes})</span>
            </button>

            <button
                onClick={() => handleReaction('dislike')}
                disabled={submitting}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${userReaction === 'dislike'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span>👎</span>
                <span>Dislike ({reactions.dislikes})</span>
            </button>
        </div>
    );
}

