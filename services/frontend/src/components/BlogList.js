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

    if (loading) return <div>Loading blogs...</div>;
    if (!blogs || blogs.length === 0) return <div>No blogs found.</div>;

    return (
        <div style={{ padding: '1.25rem' }}>
            {blogs.map(blog => (
                <BlogCard key={blog.slug} blog={blog} />
            ))}
        </div>
    );
}

