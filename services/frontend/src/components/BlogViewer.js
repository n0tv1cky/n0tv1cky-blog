"use client";
import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { fetchBlog, getBaseUrl } from '../lib/api';
import { useMetrics } from '../lib/useMetrics';
import CommentSection from './CommentSection';
import ReactionButtons from './ReactionButtons';
import toast from 'react-hot-toast';
import 'highlight.js/styles/github.css';

export default function BlogViewer({ slug }) {
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toc, setToc] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [tocOpen, setTocOpen] = useState(true);
    const [collapsedHeadings, setCollapsedHeadings] = useState({});
    const articleRef = useRef(null);
    const { trackInteraction } = useMetrics(slug);

    const generateId = (text) => {
        if (typeof text === 'string') {
            return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        }
        return '';
    };

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
                        let inCodeBlock = false;

                        lines.forEach((line, index) => {
                            // Toggle code block state when encountering triple backticks
                            if (line.trim().startsWith('```')) {
                                inCodeBlock = !inCodeBlock;
                                return;
                            }

                            // Only match headers outside of code blocks
                            if (!inCodeBlock) {
                                const match = line.match(/^(#{1,6})\s+(.+)$/);
                                if (match) {
                                    const level = match[1].length;
                                    const text = match[2];
                                    const id = generateId(text);
                                    headers.push({ level, text, id, line: index });
                                }
                            }
                        });
                        setToc(headers);

                        // Initialize all headings with children as collapsed
                        const initialCollapsedState = {};
                        headers.forEach((item, idx) => {
                            const hasChildren = idx < headers.length - 1 && headers[idx + 1].level > item.level;
                            if (hasChildren) {
                                initialCollapsedState[idx] = true;
                            }
                        });
                        setCollapsedHeadings(initialCollapsedState);
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
                        trackInteraction('copy_code', 'code-block', { index });
                        setTimeout(() => btn.textContent = 'Copy', 2000);
                    };
                    pre.classList.add('relative');
                    pre.appendChild(btn);
                }
            });
        }
    }, [blog, trackInteraction]);

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

    const markdownComponents = {
        h1: ({ node, ...props }) => {
            const extractText = (children) => {
                if (typeof children === 'string') return children;
                if (Array.isArray(children)) return children.map(extractText).join('');
                if (children?.props?.children) return extractText(children.props.children);
                return '';
            };

            const text = extractText(props.children);
            const id = generateId(text);
            return <h1 id={id} className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 mt-6 sm:mt-8 text-gray-900 dark:text-gray-100" {...props} />;
        },
        h2: ({ node, ...props }) => {
            const extractText = (children) => {
                if (typeof children === 'string') return children;
                if (Array.isArray(children)) return children.map(extractText).join('');
                if (children?.props?.children) return extractText(children.props.children);
                return '';
            };

            const text = extractText(props.children);
            const id = generateId(text);
            return <h2 id={id} className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-3 sm:mb-4 mt-5 sm:mt-6 text-gray-900 dark:text-gray-100" {...props} />;
        },
        h3: ({ node, ...props }) => {
            const extractText = (children) => {
                if (typeof children === 'string') return children;
                if (Array.isArray(children)) return children.map(extractText).join('');
                if (children?.props?.children) return extractText(children.props.children);
                return '';
            };

            const text = extractText(props.children);
            const id = generateId(text);
            return <h3 id={id} className="text-lg sm:text-xl lg:text-2xl font-semibold mb-2 sm:mb-3 mt-4 sm:mt-5 text-gray-900 dark:text-gray-100" {...props} />;
        },
        img: ({ node, ...props }) => {
            let src = props.src || '';
            if (src && src.startsWith('/images/')) {
                const base = getBaseUrl();
                src = base ? `${base}${src}` : src;
            }
            return (
                <img
                    {...props}
                    src={src}
                    className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedImage(src)}
                />
            );
        },
        p: ({ node, ...props }) => (
            <p className="text-gray-800 dark:text-gray-100 text-sm sm:text-base leading-relaxed" {...props} />
        ),
        ul: ({ node, ...props }) => (
            <ul className="text-gray-800 dark:text-gray-100 text-sm sm:text-base" {...props} />
        ),
        ol: ({ node, ...props }) => (
            <ol className="text-gray-800 dark:text-gray-100 text-sm sm:text-base" {...props} />
        ),
        li: ({ node, ...props }) => (
            <li className="text-gray-800 dark:text-gray-100 text-sm sm:text-base" {...props} />
        ),
        blockquote: ({ node, ...props }) => (
            <blockquote className="text-gray-700 dark:text-gray-200 border-l-4 border-gray-300 dark:border-gray-600 pl-3 sm:pl-4 italic text-sm sm:text-base" {...props} />
        ),
    };

    return (
        <>
            <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
                    {/* Back Button */}
                    <button
                        onClick={() => window.location.href = '/blogs'}
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
                        <span className="text-sm sm:text-base font-medium">Back to All Blogs</span>
                    </button>

                    {/* Header */}
                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 font-serif leading-tight">
                            {blog.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                            {blog.published_at && (
                                <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {blog.reading_time} min read
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Table of Contents */}
                    {toc.length > 0 && (
                        <nav className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <button
                                onClick={() => setTocOpen(!tocOpen)}
                                className="w-full text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 flex items-center gap-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            >
                                <svg
                                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${tocOpen ? 'rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                Table of Contents
                            </button>
                            {tocOpen && (
                                <ul className="space-y-0.5 sm:space-y-1">
                                    {toc.map((item, idx) => {
                                        // Find children (next items with higher level until we hit same or lower level)
                                        const hasChildren = idx < toc.length - 1 && toc[idx + 1].level > item.level;
                                        const isCollapsed = collapsedHeadings[idx];

                                        // Determine if this item should be hidden because its IMMEDIATE parent is collapsed
                                        let isHidden = false;
                                        // Find the immediate parent (closest previous item with level = current level - 1)
                                        for (let i = idx - 1; i >= 0; i--) {
                                            if (toc[i].level === item.level - 1) {
                                                // Found immediate parent, check if it's collapsed
                                                if (collapsedHeadings[i]) {
                                                    isHidden = true;
                                                }
                                                break; // Stop after finding immediate parent
                                            }
                                        }

                                        if (isHidden) return null;

                                        const toggleCollapse = (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setCollapsedHeadings(prev => ({
                                                ...prev,
                                                [idx]: !prev[idx]
                                            }));
                                        };

                                        return (
                                            <li
                                                key={idx}
                                                className="relative"
                                                style={{
                                                    paddingLeft: item.level > 1 ? `${(item.level - 1) * 16}px` : '0px'
                                                }}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {hasChildren && (
                                                        <button
                                                            onClick={toggleCollapse}
                                                            className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                        >
                                                            <svg
                                                                className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {!hasChildren && <span className="w-5" />}
                                                    <a
                                                        href={`#${item.id}`}
                                                        className={`flex-1 block py-1.5 sm:py-2 px-2 sm:px-3 rounded-md sm:rounded-lg transition-all group text-sm sm:text-base ${item.level === 1
                                                            ? 'text-gray-900 dark:text-gray-100 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700/70'
                                                            : item.level === 2
                                                                ? 'text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                            }`}
                                                    >
                                                        {item.text}
                                                    </a>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </nav>
                    )}

                    {/* Article Content */}
                    <article ref={articleRef} className="prose prose-sm sm:prose-base lg:prose-lg max-w-none bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 lg:p-12 shadow-sm border border-gray-200 dark:border-gray-700 mb-6 sm:mb-8 !text-gray-800 dark:!text-gray-100">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={markdownComponents}
                        >
                            {blog.content}
                        </ReactMarkdown>
                    </article>

                    {/* Separator border */}
                    <div className="border-t border-gray-200 dark:border-gray-700 mb-6 sm:mb-8"></div>

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