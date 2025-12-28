"use client";
import { useEffect, useState } from 'react';
import BlogCard from './BlogCard';
import { fetchBlogs } from '../lib/api';

export default function BlogList() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        fetchBlogs().then((data) => {
            if (mounted) setBlogs(data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
        return () => { mounted = false; };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading blogs...</p>
                </div>
            </div>
        );
    }

    if (!blogs || blogs.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-lg">No blogs found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-0 sm:py-2">
                {/* Back Button */}
                <button
                    onClick={() => window.location.href = '/'}
                    className="mb-4 sm:mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
                >
                    <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:-translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-sm sm:text-base font-medium">Back to Home Page</span>
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-6">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-8 font-serif">All Blogs</h1>
                <div className="space-y-6">
                    {blogs.map(blog => (
                        <BlogCard key={blog.slug} blog={blog} />
                    ))}
                </div>
            </div>
        </div>
    );
}

