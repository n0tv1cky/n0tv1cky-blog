"use client";
import { useEffect, useState } from 'react';
import { createBlog, updateBlog, fetchBlog, uploadImage } from '../lib/api';
import ImageUploader from './ImageUploader';
import DraftAutosave from './DraftAutosave';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
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

    async function handleSave() {
        setLoading(true);
        setError(null);
        const payload = { title, slug: blogSlug, description, content, published };
        try {
            if (mode === 'new') {
                await createBlog(payload, adminPassword);
            } else {
                await updateBlog(slug, payload, adminPassword);
            }
            router.push('/admin');
        } catch (e) {
            setError(e.message || 'Save failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main style={{ padding: 16 }}>
            <h1>{mode === 'new' ? 'New Blog' : `Edit: ${slug}`}</h1>

            <div style={{ marginBottom: 8 }}>
                <label>Title</label>
                <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div style={{ marginBottom: 8 }}>
                <label>Slug</label>
                <input value={blogSlug} onChange={e => setBlogSlug(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div style={{ marginBottom: 8 }}>
                <label>Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%' }} />
            </div>

            <div style={{ marginBottom: 8 }}>
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
            </div>

            <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label>Content (Markdown)</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            type="button"
                            onClick={() => setViewMode('edit')}
                            style={{
                                padding: '4px 12px',
                                fontSize: '14px',
                                backgroundColor: viewMode === 'edit' ? '#0070f3' : '#f0f0f0',
                                color: viewMode === 'edit' ? 'white' : 'black',
                                border: '1px solid #ccc',
                                borderRadius: '4px 0 0 4px',
                                cursor: 'pointer'
                            }}
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('split')}
                            style={{
                                padding: '4px 12px',
                                fontSize: '14px',
                                backgroundColor: viewMode === 'split' ? '#0070f3' : '#f0f0f0',
                                color: viewMode === 'split' ? 'white' : 'black',
                                border: '1px solid #ccc',
                                borderLeft: 'none',
                                borderRight: 'none',
                                borderRadius: '0',
                                cursor: 'pointer'
                            }}
                        >
                            Split
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('preview')}
                            style={{
                                padding: '4px 12px',
                                fontSize: '14px',
                                backgroundColor: viewMode === 'preview' ? '#0070f3' : '#f0f0f0',
                                color: viewMode === 'preview' ? 'white' : 'black',
                                border: '1px solid #ccc',
                                borderRadius: '0 4px 4px 0',
                                cursor: 'pointer'
                            }}
                        >
                            Preview
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', minHeight: '400px' }}>
                    {(viewMode === 'edit' || viewMode === 'split') && (
                        <div style={{ flex: viewMode === 'split' ? 1 : 'none', width: viewMode === 'split' ? '50%' : '100%' }}>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                rows={viewMode === 'split' ? 20 : 12}
                                style={{
                                    width: '100%',
                                    height: viewMode === 'split' ? '100%' : 'auto',
                                    fontFamily: 'monospace',
                                    fontSize: '14px',
                                    padding: '8px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    resize: 'none'
                                }}
                            />
                        </div>
                    )}
                    {(viewMode === 'preview' || viewMode === 'split') && (
                        <div style={{
                            flex: viewMode === 'split' ? 1 : 'none',
                            width: viewMode === 'split' ? '50%' : '100%',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            padding: '12px',
                            minHeight: viewMode === 'split' ? '100%' : '300px',
                            backgroundColor: '#fff',
                            overflow: 'auto'
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
                                {content || '*No content yet*'}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ marginBottom: 8 }}>
                <label>
                    <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} /> Published
                </label>
            </div>

            <div style={{ marginBottom: 8 }}>
                <label>Admin Password</label>
                <input value={adminPassword} onChange={e => setAdminPassword(e.target.value)} style={{ width: '100%' }} type="password" />
            </div>

            <div style={{ marginBottom: 8 }}>
                <label>Upload Image</label>
                <ImageUploader adminPassword={adminPassword} blogSlug={blogSlug} onUpload={(url) => setContent(c => c + `\n\n![Image](${url})\n`)} />
            </div>

            {error && <div style={{ color: 'red' }}>{error}</div>}

            <div>
                <button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
            </div>
        </main>
    );
}
