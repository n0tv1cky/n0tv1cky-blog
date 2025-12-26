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
                        Welcome to n0tv1cky Blog
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                        A modern, minimal blog platform for markdown publishing.
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
            </div>
        </main>
    );
}
