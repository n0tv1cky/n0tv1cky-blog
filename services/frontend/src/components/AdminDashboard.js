"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchBlogs } from '../lib/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasToken, setHasToken] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check token only on client side after mount to avoid hydration mismatch
        const token = typeof window !== 'undefined' ? !!localStorage.getItem('admin_token') : false;
        setHasToken(token);
    }, []);

    useEffect(() => {
        let isMounted = true;
        fetchBlogs().then((data) => {
            if (isMounted) setBlogs(data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
        return () => { isMounted = false; };
    }, []);

    function handleLogout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_token');
            setHasToken(false);
            toast.success('Logged out successfully');
            router.refresh();
        }
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 font-serif">Admin Dashboard</h1>
                    <div className="flex gap-3">
                        {hasToken ? (
                            <>
                                <Link href="/admin/new">
                                    <button className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md">
                                        Create New Blog
                                    </button>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                >
                                    Log out
                                </button>
                            </>
                        ) : (
                            <Link href="/admin/login">
                                <button className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md">
                                    Log in
                                </button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Blog List */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">All Blogs</h2>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : blogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-lg">No blogs yet.</p>
                            {hasToken && (
                                <Link href="/admin/new">
                                    <button className="mt-4 px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                                        Create Your First Blog
                                    </button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {blogs.map(b => (
                                <Link
                                    key={b.slug}
                                    href={`/admin/edit/${b.slug}`}
                                    className="block p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                                                {b.title}
                                            </h3>
                                            {b.description && (
                                                <p className="text-sm text-gray-600 mt-1 line-clamp-1">{b.description}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 ml-4">
                                            {b.published ? (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    Published
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                                    Draft
                                                </span>
                                            )}
                                            <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
