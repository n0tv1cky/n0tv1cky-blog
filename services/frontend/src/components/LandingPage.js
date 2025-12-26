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
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-4xl mx-auto px-6 py-16">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-serif">
                        Welcome to n0tv1cky's Blog
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                        A repository of my journey as an AI Engineer, trying to capture the essence of my learnings and experiences.
                    </p>
                    <Link href="/blogs">
                        <button className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors duration-200 shadow-sm hover:shadow-md">
                            View All Blogs
                        </button>
                    </Link>
                </div>

                {/* About Section */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
                    </div>
                ) : aboutContent ? (
                    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 md:p-12">
                        <div className="prose prose-lg max-w-none">
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
                                        return <img {...props} src={src} className="max-w-full rounded-lg" />;
                                    }
                                }}
                            >
                                {aboutContent}
                            </ReactMarkdown>
                        </div>
                    </section>
                ) : null}

                {/* Footer with Social Links */}
                <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center gap-6">
                        <a
                            href="https://www.linkedin.com/in/vikhyathraj/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            aria-label="LinkedIn Profile"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                        </a>

                        <a
                            href="mailto:itsvikhyathraj@gmail.com"
                            className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            aria-label="Email"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </a>
                    </div>
                </footer>
            </div>
        </main>
    );
}