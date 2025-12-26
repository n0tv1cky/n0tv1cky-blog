"use client";
import { useEffect, useState } from 'react';
import { createBlog, updateBlog, fetchBlog, uploadImage } from '../lib/api';
import ImageUploader from './ImageUploader';
import DraftAutosave from './DraftAutosave';
import { useRouter } from 'next/navigation';

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
                <label>Content (Markdown)</label>
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={12} style={{ width: '100%' }} />
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
