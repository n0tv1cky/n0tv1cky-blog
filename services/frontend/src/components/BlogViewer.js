"use client";
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { fetchBlog } from '../lib/api';

export default function BlogViewer({ slug }) {
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        fetchBlog(slug)
            .then((data) => {
                if (mounted) setBlog(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
        return () => {
            mounted = false;
        };
    }, [slug]);

    if (loading) return <div>Loading...</div>;
    if (!blog) return <div>Blog not found.</div>;

    return (
        <main style={{ padding: '1.5rem' }}>
            <h1>{blog.title}</h1>
            <div style={{ color: '#666', marginBottom: 12 }}>{blog.published_at}</div>
            <article>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}> {blog.content} </ReactMarkdown>
            </article>
        </main>
    );
}
