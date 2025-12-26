"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchBlogs } from '../lib/api';

export default function AdminDashboard() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let mounted = true;
        fetchBlogs().then((data) => {
            if (mounted) setBlogs(data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
        return () => { mounted = false; };
    }, []);

    function handleLogout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_token');
            router.refresh();
        }
    }

    const hasToken = (typeof window !== 'undefined') ? !!localStorage.getItem('admin_token') : false;

    return (
        <main style={{ padding: '1.5rem' }}>
            <h1>Admin Dashboard</h1>
            <div style={{ margin: '1rem 0' }}>
                {hasToken ? (
                    <>
                        <Link href="/admin/new"><button>Create New Blog</button></Link>
                        <button onClick={handleLogout} style={{ marginLeft: 12 }}>Log out</button>
                    </>
                ) : (
                    <Link href="/admin/login"><button>Log in</button></Link>
                )}
            </div>

            <section>
                <h2>Published Blogs</h2>
                {loading && <div>Loading...</div>}
                {!loading && blogs.length === 0 && <div>No blogs yet.</div>}
                <ul>
                    {blogs.map(b => (
                        <li key={b.slug} style={{ marginBottom: '0.75rem' }}>
                            <Link href={`/admin/edit/${b.slug}`}>{b.title} — {b.published ? 'Published' : 'Draft'}</Link>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
