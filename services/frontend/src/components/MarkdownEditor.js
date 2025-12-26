"use client";
import { useEffect, useState } from 'react';
import { createBlog, updateBlog, fetchBlog, uploadImage } from '../lib/api';
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
    const [viewMode, setViewMode] = useState('edit'); // 'edit', 'preview', 'split'
    const [splitPosition, setSplitPosition] = useState(50); // Percentage for split view
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (mode === 'edit' && slug) {
            let mounted = true;
            fetchBlog(slug).then(data => {
                if (!mounted) return;
                if (data) {
                    setTitle(data.title || '');
                    setBlogSlug(data.slug || '');
                    setDescription(data.description || '');
                    setContent(data.content || '');
                    setPublished(!!data.published);
                }
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

    async function handleSave() {
        setLoading(true);
        setError(null);
        const payload = { title, slug: blogSlug, description, content, published };
        try {
            if (mode === 'new') {
                await createBlog(payload, adminPassword);
                if (published) {
                    toast.success('Blog published successfully!');
                } else {
                    toast.success('Blog saved as draft!');
                }
            } else {
                await updateBlog(slug, payload, adminPassword);
                if (published) {
                    toast.success('Blog published successfully!');
                } else {
                    toast.success('Blog updated successfully!');
                }
            }
            router.push('/admin');
        } catch (e) {
            const errorMsg = e.message || 'Save failed';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="w-full px-6 py-12">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 font-serif mb-2">
                        {mode === 'new' ? 'New Blog' : `Edit: ${slug}`}
                    </h1>
                    <p className="text-gray-600">Create or edit your blog post</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input 
                                value={title} 
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                placeholder="Enter blog title"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Slug <span className="text-red-500">*</span>
                            </label>
                            <input 
                                value={blogSlug} 
                                onChange={e => setBlogSlug(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                placeholder="blog-slug"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <input 
                            value={description} 
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            placeholder="Brief description of the blog"
                        />
                    </div>

                    <DraftAutosave
                        enabled={true}
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
                        }}
                    />

                    {/* Markdown Editor */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                                Content (Markdown)
                            </label>
                            <div className="flex gap-0 border border-gray-300 rounded-lg overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('edit')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                                        viewMode === 'edit'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('split')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors border-x border-gray-300 ${
                                        viewMode === 'split'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    Split
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('preview')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                                        viewMode === 'preview'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    Preview
                                </button>
                            </div>
                        </div>
                        <div className="markdown-editor-container flex gap-0 min-h-[500px] relative">
                            {(viewMode === 'edit' || viewMode === 'split') && (
                                <div 
                                    className={`${viewMode === 'split' ? '' : 'w-full'}`}
                                    style={viewMode === 'split' ? { width: `${splitPosition}%` } : {}}
                                >
                                    <textarea
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        className={`w-full h-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all font-mono text-sm resize-none ${
                                            viewMode === 'split' ? 'rounded-l-lg' : 'rounded-lg'
                                        }`}
                                        placeholder="Write your markdown content here..."
                                    />
                                </div>
                            )}
                            {viewMode === 'split' && (
                                <div
                                    className="w-1 bg-gray-300 hover:bg-primary-500 cursor-col-resize transition-colors flex items-center justify-center group relative z-10"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                >
                                    <div className="w-1 h-12 bg-gray-400 group-hover:bg-primary-600 rounded transition-colors"></div>
                                </div>
                            )}
                            {(viewMode === 'preview' || viewMode === 'split') && (
                                <div 
                                    className={`${viewMode === 'split' ? 'border-l-0' : 'w-full'} border border-gray-300 p-6 bg-white overflow-auto ${
                                        viewMode === 'split' ? 'rounded-r-lg' : 'rounded-lg'
                                    }`}
                                    style={viewMode === 'split' ? { width: `${100 - splitPosition}%` } : {}}
                                >
                                    <div className="prose max-w-none">
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
                                            {content || '*No content yet*'}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={published} 
                                onChange={e => setPublished(e.target.checked)}
                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Published</span>
                        </label>
                    </div>

                    {/* Admin Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Admin Password <span className="text-red-500">*</span>
                        </label>
                        <input 
                            value={adminPassword} 
                            onChange={e => setAdminPassword(e.target.value)}
                            type="password"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            placeholder="Enter admin password"
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Image
                        </label>
                        <ImageUploader 
                            adminPassword={adminPassword} 
                            blogSlug={blogSlug} 
                            onUpload={(url) => setContent(c => c + `\n\n![Image](${url})\n`)} 
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button 
                            onClick={() => router.push('/admin')}
                            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={loading}
                            className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                                loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow-md'
                            } text-white`}
                        >
                            {loading ? 'Saving...' : 'Save Blog'}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
