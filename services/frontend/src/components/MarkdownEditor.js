"use client";
import { useEffect, useState } from 'react';
import { createBlog, updateBlog, fetchBlog, fetchBlogAdmin, uploadImage, getBaseUrl } from '../lib/api';
import ImageUploader from './ImageUploader';
import DraftAutosave from './DraftAutosave';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import toast from 'react-hot-toast';
import 'highlight.js/styles/github.css';

export default function MarkdownEditor({ mode, slug }) {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [blogSlug, setBlogSlug] = useState(slug || '');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    const [published, setPublished] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('split'); // 'edit', 'preview', 'split'
    const [splitPosition, setSplitPosition] = useState(50); // Percentage for split view
    const [isDragging, setIsDragging] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved'
    const [autosaveEnabled, setAutosaveEnabled] = useState(true);
    const [showAutosaveMenu, setShowAutosaveMenu] = useState(false);
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [editorHeight, setEditorHeight] = useState(600);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        if (!isResizing) return;

        function handleMouseMove(e) {
            if (!isResizing) return;
            const container = document.querySelector('.markdown-editor-container');
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const height = e.clientY - rect.top;
            // Constrain between 200px and 1200px
            const constrained = Math.max(200, Math.min(1200, height));
            setEditorHeight(constrained);
        }

        function handleMouseUp() {
            setIsResizing(false);
        }

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    useEffect(() => {
        if (mode === 'edit' && slug) {
            let mounted = true;
            // Use admin endpoint to fetch blog (can fetch drafts too)
            fetchBlogAdmin(slug).then(data => {
                if (!mounted) return;
                if (data) {
                    setTitle(data.title || '');
                    setBlogSlug(data.slug || '');
                    setDescription(data.description || '');
                    setContent(data.content || '');
                    setPublished(!!data.published);
                }
            }).catch(err => {
                if (!mounted) return;
                console.error('Failed to fetch blog:', err);
                toast.error('Failed to load blog. Please check your authentication.');
            });
            return () => { mounted = false };
        } else if (mode === 'new') {
            // Try to load draft from localStorage
            const draftKey = `draft_new`;
            if (typeof window !== 'undefined') {
                const saved = localStorage.getItem(draftKey);
                if (saved) {
                    try {
                        const draft = JSON.parse(saved);
                        setTitle(draft.title || '');
                        setBlogSlug(draft.slug || '');
                        setDescription(draft.description || '');
                        setContent(draft.content || '');
                    } catch (e) {
                        console.error('Failed to load draft', e);
                    }
                }
            }
        }
    }, [mode, slug]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        function handlePaste(e) {
            const items = e.clipboardData && e.clipboardData.items;
            if (!items) return;
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file) {
                        // upload image with blog_slug
                        const currentSlug = blogSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        uploadImage(file, adminPassword, currentSlug).then(res => {
                            if (res && res.url) {
                                // insert markdown image at end
                                setContent(c => c + `\n\n![Image](${res.url})\n`);
                            }
                        }).catch(err => console.error('upload failed', err));
                    }
                }
            }
        }
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [adminPassword, blogSlug, title]);

    // Handle drag for split view divider
    useEffect(() => {
        if (!isDragging) return;

        function handleMouseMove(e) {
            if (!isDragging) return;
            const container = document.querySelector('.markdown-editor-container');
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = (x / rect.width) * 100;
            // Constrain between 20% and 80%
            const constrained = Math.max(20, Math.min(80, percentage));
            setSplitPosition(constrained);
        }

        function handleMouseUp() {
            setIsDragging(false);
        }

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    async function handleSave(publish = false) {
        setLoading(true);
        setSaveStatus('saving');
        setError(null);
        const payload = { title, slug: blogSlug, description, content, published: publish };
        try {
            if (mode === 'new') {
                await createBlog(payload, adminPassword);
                if (publish) {
                    toast.success('Blog published successfully!');
                } else {
                    toast.success('Blog saved as draft!');
                }
            } else {
                await updateBlog(slug, payload, adminPassword);
                if (publish) {
                    toast.success('Blog published successfully!');
                } else {
                    toast.success('Blog updated successfully!');
                }
            }
            setSaveStatus('saved');
            setLastSavedTime(new Date());
            setTimeout(() => {
                router.push('/admin');
            }, 1000);
        } catch (e) {
            const errorMsg = e.message || 'Save failed';
            setError(errorMsg);
            setSaveStatus('idle');
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="w-full px-6 py-12">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/admin')}
                    className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
                >
                    <svg
                        className="w-5 h-5 transition-transform group-hover:-translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="font-medium">Back to Admin</span>
                </button>

                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 font-serif mb-2">
                        {mode === 'new' ? 'New Blog' : `Edit: ${slug}`}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">Create or edit your blog post</p>
                </div>

                {/* Save Status Indicator at Top */}
                <div className="flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-700 mb-6">
                    {saveStatus === 'saving' && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm">Saving...</span>
                        </div>
                    )}
                    {saveStatus === 'saved' && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="text-sm">Saved</span>
                        </div>
                    )}
                    {saveStatus === 'idle' && (
                        <div
                            className="flex items-center gap-2 text-gray-400 dark:text-gray-500 group relative cursor-pointer"
                            title={lastSavedTime ? `Last saved: ${lastSavedTime.toLocaleString()}` : 'Not saved yet'}
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            {lastSavedTime && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {lastSavedTime.toLocaleString()}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            placeholder="Enter blog title"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Slug <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={blogSlug}
                            onChange={e => setBlogSlug(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all font-mono text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                            placeholder="blog-slug"
                        />
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                    </label>
                    <input
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Brief description of the blog"
                    />
                </div>

                <DraftAutosave
                    enabled={autosaveEnabled}
                    title={title}
                    slug={blogSlug}
                    description={description}
                    content={content}
                    onSave={(draft) => {
                        // Save to localStorage
                        if (typeof window !== 'undefined') {
                            const key = mode === 'new' ? 'draft_new' : `draft_${slug}`;
                            localStorage.setItem(key, JSON.stringify(draft));
                        }
                        // Update save status to show saved indicator
                        setSaveStatus('saved');
                        setLastSavedTime(new Date());
                        setTimeout(() => setSaveStatus('idle'), 2000);
                    }}
                    showUI={false}
                />

                {/* Markdown Editor */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Content (Markdown)
                        </label>
                        <div className="flex gap-0 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setViewMode('edit')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'edit'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('split')}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-x border-gray-300 dark:border-gray-600 ${viewMode === 'split'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                Split
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('preview')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'preview'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                Preview
                            </button>
                        </div>
                    </div>
                    <div className="markdown-editor-container flex flex-col gap-0 relative">
                        <div className="flex gap-0" style={{ height: `${editorHeight}px` }}>
                            {(viewMode === 'edit' || viewMode === 'split') && (
                                <div
                                    className={`${viewMode === 'split' ? '' : 'w-full'} h-full`}
                                    style={viewMode === 'split' ? { width: `${splitPosition}%` } : {}}
                                >
                                    <textarea
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        className={`w-full h-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all font-mono text-sm resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 overflow-auto ${viewMode === 'split' ? 'rounded-tl-lg' : 'rounded-t-lg'
                                            }`}
                                        placeholder="Write your markdown content here..."
                                    />
                                </div>
                            )}
                            {viewMode === 'split' && (
                                <div
                                    className="w-1 bg-gray-300 dark:bg-gray-600 hover:bg-primary-500 dark:hover:bg-primary-400 cursor-col-resize transition-colors flex items-center justify-center group relative z-10"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                >
                                    <div className="w-1 h-12 bg-gray-400 dark:bg-gray-500 group-hover:bg-primary-600 dark:group-hover:bg-primary-500 rounded transition-colors"></div>
                                </div>
                            )}
                            {(viewMode === 'preview' || viewMode === 'split') && (
                                <div
                                    className={`${viewMode === 'split' ? 'border-l-0' : 'w-full'} h-full border border-gray-300 dark:border-gray-600 p-6 bg-white dark:bg-gray-800 overflow-auto ${viewMode === 'split' ? 'rounded-tr-lg' : 'rounded-t-lg'
                                        }`}
                                    style={viewMode === 'split' ? { width: `${100 - splitPosition}%` } : {}}
                                >
                                    <div className="prose prose-lg max-w-none dark:prose-invert">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeHighlight]}
                                            components={{
                                                h1: ({ node, ...props }) => (
                                                    <h1 className="text-4xl font-bold mb-6 mt-8 text-gray-900 dark:text-gray-100" {...props} />
                                                ),
                                                h2: ({ node, ...props }) => (
                                                    <h2 className="text-3xl font-semibold mb-4 mt-6 text-gray-900 dark:text-gray-100" {...props} />
                                                ),
                                                h3: ({ node, ...props }) => (
                                                    <h3 className="text-2xl font-semibold mb-3 mt-5 text-gray-900 dark:text-gray-100" {...props} />
                                                ),
                                                p: ({ node, ...props }) => (
                                                    <p className="mb-4 text-gray-800 dark:text-gray-200" {...props} />
                                                ),
                                                li: ({ node, ...props }) => (
                                                    <li className="mb-2 text-gray-800 dark:text-gray-200" {...props} />
                                                ),
                                                a: ({ node, ...props }) => (
                                                    <a className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 underline" {...props} />
                                                ),
                                                blockquote: ({ node, ...props }) => (
                                                    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4 text-gray-700 dark:text-gray-300" {...props} />
                                                ),
                                                code: ({ node, inline, ...props }) =>
                                                    inline ? (
                                                        <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200" {...props} />
                                                    ) : (
                                                        <code className="text-gray-100 dark:text-gray-100" {...props} />
                                                    ),
                                                pre: ({ node, ...props }) => (
                                                    <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto mb-4 border border-gray-200 dark:border-gray-700" {...props} />
                                                ),
                                                img: ({ node, ...props }) => {
                                                    let src = props.src || '';
                                                    if (src && src.startsWith('/images/')) {
                                                        const base = getBaseUrl();
                                                        src = base ? `${base}${src}` : src;
                                                    }
                                                    return <img {...props} src={src} className="max-w-full rounded-lg" />;
                                                }
                                            }}
                                        >
                                            {content || '*No content yet*'}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Vertical Resize Handle */}
                        <div
                            className="h-2 bg-gray-200 dark:bg-gray-700 hover:bg-primary-500 dark:hover:bg-primary-400 cursor-row-resize transition-colors flex items-center justify-center group relative w-full rounded-b-lg"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsResizing(true);
                            }}
                        >
                            <div className="h-1 w-12 bg-gray-400 dark:bg-gray-500 group-hover:bg-primary-600 dark:group-hover:bg-primary-500 rounded transition-colors"></div>
                        </div>
                    </div>
                </div>

                {/* Admin Password */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Admin Password <span className="text-red-500">*</span>
                    </label>
                    <input
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        type="password"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Enter admin password"
                    />
                </div>

                {/* Image Upload */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Upload Image
                    </label>
                    <ImageUploader
                        adminPassword={adminPassword}
                        blogSlug={blogSlug}
                        onUpload={(url) => setContent(c => c + `\n\n![Image](${url})\n`)}
                    />
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm mb-6">
                        {error}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Settings Menu (Cog Wheel) */}
                    <div className="relative settings-menu-container">
                        <button
                            type="button"
                            onClick={() => setShowAutosaveMenu(!showAutosaveMenu)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Settings"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        {showAutosaveMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                                <label className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autosaveEnabled}
                                        onChange={(e) => setAutosaveEnabled(e.target.checked)}
                                        className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 bg-white dark:bg-gray-700"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Auto-save drafts (every 30s)</span>
                                </label>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => router.push('/admin')}
                        className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gray-600 hover:bg-gray-700 shadow-sm hover:shadow-md'
                            } text-white`}
                    >
                        {loading && saveStatus === 'saving' ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow-md'
                            } text-white`}
                    >
                        {loading && saveStatus === 'saving' ? 'Publishing...' : 'Publish'}
                    </button>
                </div>
            </div>
        </main>
    );
}