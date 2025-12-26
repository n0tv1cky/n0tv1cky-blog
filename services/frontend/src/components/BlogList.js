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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                    <p className="text-gray-600">Loading blogs...</p>
                </div>
            </div>
        );
    }

    if (!blogs || blogs.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 text-lg">No blogs found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-6">
                <h1 className="text-4xl font-bold text-gray-900 mb-8 font-serif">All Blogs</h1>
                <div className="space-y-6">
                    {blogs.map(blog => (
                        <BlogCard key={blog.slug} blog={blog} />
                    ))}
                </div>
            </div>
        </div>
    );
}

