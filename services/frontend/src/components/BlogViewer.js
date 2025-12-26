"use client";
import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { fetchBlog } from '../lib/api';
import CommentSection from './CommentSection';
import ReactionButtons from './ReactionButtons';
import toast from 'react-hot-toast';
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
                    btn.className = 'copy-code-btn absolute top-2 right-2 px-3 py-1.5 bg-gray-700 dark:bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors';
                    btn.textContent = 'Copy';
                    btn.onclick = () => {
                        navigator.clipboard.writeText(code.textContent);
                        btn.textContent = 'Copied!';
                        toast.success('Code copied to clipboard!');
                        setTimeout(() => btn.textContent = 'Copy', 2000);
                    };
                    pre.classList.add('relative');
                    pre.appendChild(btn);
                }
            });
        }
    }, [blog]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400 mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading blog...</p>
                </div>
            </div>
        );
    }
    
    if (!blog) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Blog not found.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="max-w-4xl mx-auto px-6 py-12">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-serif">
                            {blog.title}
                        </h1>
                        <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400 text-sm">
                            {blog.published_at && (
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {new Date(blog.published_at).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            )}
                            {blog.reading_time && (
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {blog.reading_time} min read
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Table of Contents */}
                    {toc.length > 0 && (
                        <nav className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Table of Contents</h3>
                            <ul className="space-y-0.5 toc-tree">
                                {toc.map((item, idx) => {
                                    const nextItem = idx < toc.length - 1 ? toc[idx + 1] : null;
                                    const isLastInLevel = !nextItem || nextItem.level <= item.level;
                                    const hasChildren = nextItem && nextItem.level > item.level;
                                    
                                    // Calculate which parent levels need vertical lines
                                    const parentLevels = [];
                                    for (let i = item.level - 1; i >= 1; i--) {
                                        // Check if there's a sibling at this level after this item
                                        let hasSiblingAfter = false;
                                        for (let j = idx + 1; j < toc.length; j++) {
                                            if (toc[j].level === i) {
                                                hasSiblingAfter = true;
                                                break;
                                            }
                                            if (toc[j].level < i) break;
                                        }
                                        if (hasSiblingAfter) {
                                            parentLevels.push(i);
                                        }
                                    }
                                    
                                    return (
                                        <li 
                                            key={idx} 
                                            className={`toc-item toc-level-${item.level} ${item.level > 1 ? 'has-parent' : ''} ${isLastInLevel ? 'last-in-level' : ''} ${hasChildren ? 'has-children' : ''}`}
                                        >
                                            {/* Vertical lines for parent levels */}
                                            {parentLevels.map(level => (
                                                <div
                                                    key={level}
                                                    className="absolute top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"
                                                    style={{ left: `${(level - 1) * 24 + 12}px` }}
                                                />
                                            ))}
                                            {/* Horizontal connector */}
                                            {item.level > 1 && (
                                                <div 
                                                    className="absolute left-0 top-2.5 w-4 h-px bg-gray-300 dark:bg-gray-600"
                                                    style={{ left: `${(item.level - 2) * 24 + 12}px` }}
                                                />
                                            )}
                                            <a 
                                                href={`#${item.id}`} 
                                                className={`relative block py-1.5 px-2 rounded-md transition-all text-sm ${
                                                    item.level === 1 
                                                        ? 'text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-100 dark:hover:bg-gray-700' 
                                                        : item.level === 2
                                                        ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                }`}
                                                style={{ paddingLeft: item.level > 1 ? `${(item.level - 1) * 24 + 8}px` : '8px' }}
                                            >
                                                {item.text}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    )}

                    {/* Article Content */}
                    <article ref={articleRef} className="prose prose-lg max-w-none bg-white dark:bg-gray-800 rounded-xl p-8 md:p-12 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                                h1: ({ node, ...props }) => {
                                    const text = props.children[0];
                                    const id = typeof text === 'string' ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
                                    return <h1 id={id} className="text-4xl font-bold mb-6 mt-8 text-gray-900 dark:text-gray-100" {...props} />;
                                },
                                h2: ({ node, ...props }) => {
                                    const text = props.children[0];
                                    const id = typeof text === 'string' ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
                                    return <h2 id={id} className="text-3xl font-semibold mb-4 mt-6 text-gray-900 dark:text-gray-100" {...props} />;
                                },
                                h3: ({ node, ...props }) => {
                                    const text = props.children[0];
                                    const id = typeof text === 'string' ? text.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
                                    return <h3 id={id} className="text-2xl font-semibold mb-3 mt-5 text-gray-900 dark:text-gray-100" {...props} />;
                                },
                                img: ({ node, ...props }) => {
                                    // Fix image URLs to point to backend
                                    let src = props.src || '';
                                    if (src && src.startsWith('/images/')) {
                                        // Get backend URL from env
                                        const backendUrl = typeof window !== 'undefined'
                                            ? (window.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000')
                                            : 'http://localhost:8000';
                                        // Convert Docker service name to localhost if needed
                                        const baseUrl = backendUrl.includes('_') || (!backendUrl.includes('.') && !backendUrl.startsWith('http://localhost') && !backendUrl.startsWith('https://'))
                                            ? `http://localhost:${backendUrl.match(/:(\d+)/)?.[1] || '8000'}`
                                            : backendUrl;
                                        src = `${baseUrl}${src}`;
                                    }
                                    return (
                                        <img
                                            {...props}
                                            src={src}
                                            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => setSelectedImage(src)}
                                        />
                                    );
                                }
                            }}
                        >
                            {blog.content}
                        </ReactMarkdown>
            </article>

                    <ReactionButtons blogSlug={slug} />
                    <CommentSection blogSlug={slug} />
                </div>
        </main>

            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 cursor-pointer"
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        alt="Fullscreen"
                        className="max-w-[90%] max-h-[90%] object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-6 right-6 w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl font-bold hover:bg-gray-100 transition-colors"
                    >
                        ×
                    </button>
                </div>
            )}
        </>
    );
}
