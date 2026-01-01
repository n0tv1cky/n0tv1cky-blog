"use client";
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAllBlogs, deleteBlog } from '../lib/api';
import MetricsDashboard from './MetricsDashboard';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasToken, setHasToken] = useState(false);
    const [mode, setMode] = useState('view'); // 'view' or 'edit'
    const [selectedBlogs, setSelectedBlogs] = useState(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [invalidCreds, setInvalidCreds] = useState(false);
    const [activeTab, setActiveTab] = useState('blogs'); // 'blogs' or 'metrics'
    const selectAllRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        // Check token only on client side after mount to avoid hydration mismatch
        const token = typeof window !== 'undefined' ? !!localStorage.getItem('admin_token') : false;
        setHasToken(token);
    }, []);

    useEffect(() => {
        let isMounted = true;
        fetchAllBlogs().then((data) => {
            if (isMounted) {
                setBlogs(data || []);
                setLoading(false);
            }
        }).catch((error) => {
            if (isMounted) {
                setLoading(false);
                // Check if it's a 403 error
                if (error?.status === 403 || error?.message?.includes('403')) {
                    setInvalidCreds(true);
                    // Optionally, remove token to avoid future confusion:
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('admin_token');
                    }
                } else {
                    toast.error('Error loading blogs');
                }
            }
        });
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

    function handleSelectAll(e) {
        if (e.target.checked) {
            setSelectedBlogs(new Set(blogs.map(b => b.slug)));
        } else {
            setSelectedBlogs(new Set());
        }
    }

    function handleSelectBlog(slug, checked) {
        const newSelected = new Set(selectedBlogs);
        if (checked) {
            newSelected.add(slug);
        } else {
            newSelected.delete(slug);
        }
        setSelectedBlogs(newSelected);
    }

    function handleEnterEditMode() {
        setMode('edit');
    }

    function handleCancelEditMode() {
        setMode('view');
        setSelectedBlogs(new Set()); // Clear selection when exiting edit mode
    }

    function handleBlogClick(e, slug) {
        if (mode === 'edit') {
            e.preventDefault();
            e.stopPropagation();
            handleSelectBlog(slug, !selectedBlogs.has(slug));
        }
    }

    async function handleDeleteSelected() {
        if (selectedBlogs.size === 0) {
            toast.error('Please select at least one blog to delete');
            return;
        }

        const confirmMessage = selectedBlogs.size === 1
            ? 'Are you sure you want to delete this blog?'
            : `Are you sure you want to delete ${selectedBlogs.size} blogs?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        setIsDeleting(true);

        try {
            const deletePromises = Array.from(selectedBlogs).map(slug =>
                deleteBlog(slug, null).catch(err => {
                    console.error(`Failed to delete ${slug}:`, err);
                    return { error: true, slug, message: err.message };
                })
            );

            const results = await Promise.all(deletePromises);
            const errors = results.filter(r => r?.error);
            const successCount = results.length - errors.length;

            if (successCount > 0) {
                toast.success(`Successfully deleted ${successCount} blog${successCount > 1 ? 's' : ''}`);
            }
            if (errors.length > 0) {
                toast.error(`Failed to delete ${errors.length} blog${errors.length > 1 ? 's' : ''}`);
            }

            // Refresh the blog list
            setSelectedBlogs(new Set());
            const data = await fetchAllBlogs();
            setBlogs(data || []);
        } catch (err) {
            toast.error('Failed to delete blogs: ' + err.message);
        } finally {
            setIsDeleting(false);
        }
    }

    const allSelected = blogs.length > 0 && selectedBlogs.size === blogs.length;
    const someSelected = selectedBlogs.size > 0 && selectedBlogs.size < blogs.length;

    // Update indeterminate state of select all checkbox
    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = someSelected;
        }
    }, [someSelected]);

    if (invalidCreds) {
        // Show login page instead of dashboard
        return (
            <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-sm w-full text-center">
                    <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Session Expired</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Your admin session is invalid or expired. Please log in again.</p>
                    <Link href="/admin/login">
                        <button className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors shadow-sm hover:shadow-md w-full">
                            Log in
                        </button>
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 font-serif">Admin Dashboard</h1>
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
                                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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

                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('blogs')}
                        className={`px-6 py-3 font-medium transition-colors relative ${
                            activeTab === 'blogs'
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                    >
                        Blogs
                        {activeTab === 'blogs' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"></div>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('metrics')}
                        className={`px-6 py-3 font-medium transition-colors relative ${
                            activeTab === 'metrics'
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                    >
                        Metrics
                        {activeTab === 'metrics' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400"></div>
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'metrics' ? (
                    <MetricsDashboard />
                ) : (
                    /* Blog List */
                    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">All Blogs</h2>
                            {hasToken && blogs.length > 0 && (
                                <div className="flex items-center gap-4">
                                    {mode === 'view' ? (
                                        <button
                                            onClick={handleEnterEditMode}
                                            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md text-sm"
                                        >
                                            Edit Mode
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleCancelEditMode}
                                                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-sm hover:shadow-md text-sm"
                                            >
                                                Cancel
                                            </button>
                                        {selectedBlogs.size > 0 && (
                                            <button
                                                onClick={handleDeleteSelected}
                                                disabled={isDeleting}
                                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isDeleting
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : 'bg-red-600 hover:bg-red-700 shadow-sm hover:shadow-md'
                                                    } text-white text-sm`}
                                            >
                                                {isDeleting ? 'Deleting...' : `Delete Selected (${selectedBlogs.size})`}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
                        </div>
                    ) : blogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
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
                            {hasToken && mode === 'edit' && blogs.length > 0 && (
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            ref={selectAllRef}
                                            checked={allSelected}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 bg-white dark:bg-gray-700"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Select All
                                        </span>
                                    </label>
                                </div>
                            )}
                            {blogs.map(b => (
                                <div
                                    key={b.slug}
                                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${mode === 'edit' && selectedBlogs.has(b.slug)
                                        ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md'
                                        } ${mode === 'edit' ? 'cursor-pointer' : ''}`}
                                    onClick={(e) => mode === 'edit' && handleBlogClick(e, b.slug)}
                                >
                                    {hasToken && mode === 'edit' && (
                                        <input
                                            type="checkbox"
                                            checked={selectedBlogs.has(b.slug)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                handleSelectBlog(b.slug, e.target.checked);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 cursor-pointer bg-white dark:bg-gray-700"
                                        />
                                    )}
                                    {mode === 'view' ? (
                                        <Link
                                            href={`/admin/edit/${b.slug}`}
                                            className="flex-1 flex justify-between items-center group"
                                        >
                                            <div className="flex-1">
                                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                    {b.title}
                                                </h3>
                                                {b.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{b.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 ml-4">
                                                {b.published ? (
                                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                                                        Published
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                                                        Draft
                                                    </span>
                                                )}
                                                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="flex-1 flex justify-between items-center">
                                            <div className="flex-1">
                                                <h3 className={`text-lg font-medium transition-colors ${selectedBlogs.has(b.slug)
                                                    ? 'text-primary-700 dark:text-primary-300'
                                                    : 'text-gray-900 dark:text-gray-100'
                                                    }`}>
                                                    {b.title}
                                                </h3>
                                                {b.description && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{b.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 ml-4">
                                                {b.published ? (
                                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                                                        Published
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
                                                        Draft
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
                )}
            </div>
        </main>
    );
}
