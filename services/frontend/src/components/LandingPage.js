"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { fetchBlog } from '../lib/api';
import 'highlight.js/styles/github.css';

export default function LandingPage() {
    const [aboutContent, setAboutContent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch the about.md file
        fetchBlog('about')
            .then((data) => {
                if (data && data.content) {
                    setAboutContent(data.content);
                }
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, []);

    return (
        <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1>Welcome to n0tv1cky Blog</h1>
                <p style={{ fontSize: '18px', color: '#666' }}>A modern, minimal blog platform for markdown publishing.</p>
                <div style={{ marginTop: '2rem' }}>
                    <Link href="/blogs">
                        <button style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            backgroundColor: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}>
                            View All Blogs
                        </button>
                    </Link>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
            ) : aboutContent ? (
                <section style={{
                    marginTop: '3rem',
                    padding: '2rem',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                }}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                            img: ({ node, ...props }) => {
                                // Fix image URLs to point to backend
                                let src = props.src || '';
                                if (src && src.startsWith('/images/')) {
                                    const backendUrl = typeof window !== 'undefined'
                                        ? (window.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000')
                                        : 'http://localhost:8000';
                                    const baseUrl = backendUrl.includes('_') || (!backendUrl.includes('.') && !backendUrl.startsWith('http://localhost') && !backendUrl.startsWith('https://'))
                                        ? `http://localhost:${backendUrl.match(/:(\d+)/)?.[1] || '8000'}`
                                        : backendUrl;
                                    src = `${baseUrl}${src}`;
                                }
                                return <img {...props} src={src} style={{ maxWidth: '100%' }} />;
                            }
                        }}
                    >
                        {aboutContent}
                    </ReactMarkdown>
                </section>
            ) : null}
        </main>
    );
}
