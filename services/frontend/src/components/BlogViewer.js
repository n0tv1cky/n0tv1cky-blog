"use client";
import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { fetchBlog } from '../lib/api';
import 'highlight.js/styles/github.css';

export default function BlogViewer({ slug }) {
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toc, setToc] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const articleRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        fetchBlog(slug)
            .then((data) => {
                if (mounted) {
                    setBlog(data);
                    // Generate table of contents from headers
                    if (data.content) {
                        const headers = [];
                        const lines = data.content.split('\n');
                        lines.forEach((line, index) => {
                            const match = line.match(/^(#{1,6})\s+(.+)$/);
                            if (match) {
                                const level = match[1].length;
                                const text = match[2];
                                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                headers.push({ level, text, id, line: index });
                            }
                        });
                        setToc(headers);
                    }
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
        return () => {
            mounted = false;
        };
    }, [slug]);

    useEffect(() => {
        // Add click handlers to images
        if (articleRef.current) {
            const images = articleRef.current.querySelectorAll('img');
            images.forEach(img => {
                img.style.cursor = 'pointer';
                img.onclick = () => setSelectedImage(img.src);
            });
        }
    }, [blog]);

    // Add copy button to code blocks
    useEffect(() => {
        if (articleRef.current) {
            const codeBlocks = articleRef.current.querySelectorAll('pre code');
            codeBlocks.forEach((code, index) => {
                const pre = code.parentElement;
                if (!pre.querySelector('.copy-code-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'copy-code-btn';
                    btn.textContent = 'Copy';
                    btn.style.cssText = 'position:absolute;top:8px;right:8px;padding:4px 8px;background:#333;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;';
                    btn.onclick = () => {
                        navigator.clipboard.writeText(code.textContent);
                        btn.textContent = 'Copied!';
                        setTimeout(() => btn.textContent = 'Copy', 2000);
                    };
                    pre.style.position = 'relative';
                    pre.appendChild(btn);
                }
            });
        }
    }, [blog]);

    if (loading) return <div>Loading...</div>;
    if (!blog) return <div>Blog not found.</div>;

    return (
        <>
            <main style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
                <h1>{blog.title}</h1>
                <div style={{ color: '#666', marginBottom: 12 }}>
                    {blog.published_at && new Date(blog.published_at).toLocaleDateString()}
                    {blog.reading_time && ` • ${blog.reading_time} min read`}
                </div>

                {toc.length > 0 && (
                    <nav style={{ marginBottom: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0 }}>Table of Contents</h3>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                            {toc.map((item, idx) => (
                                <li key={idx} style={{ marginLeft: `${(item.level - 1) * 1}rem`, marginBottom: '0.5rem' }}>
                                    <a href={`#${item.id}`} style={{ color: '#0066cc', textDecoration: 'none' }}>
                                        {item.text}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}

                <article ref={articleRef}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                            h1: ({ node, ...props }) => {
                                const text = props.children[0];
                                const id = typeof text === 'string' ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
                                return <h1 id={id} {...props} />;
                            },
                            h2: ({ node, ...props }) => {
                                const text = props.children[0];
                                const id = typeof text === 'string' ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
                                return <h2 id={id} {...props} />;
                            },
                            h3: ({ node, ...props }) => {
                                const text = props.children[0];
                                const id = typeof text === 'string' ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
                                return <h3 id={id} {...props} />;
                            },
                            img: ({ node, ...props }) => (
                                <img {...props} style={{ maxWidth: '100%', cursor: 'pointer' }} />
                            )
                        }}
                    >
                        {blog.content}
                    </ReactMarkdown>
                </article>
            </main>

            {selectedImage && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        cursor: 'pointer'
                    }}
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        alt="Fullscreen"
                        style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setSelectedImage(null)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            fontSize: '24px',
                            cursor: 'pointer'
                        }}
                    >
                        ×
                    </button>
                </div>
            )}
        </>
    );
}
