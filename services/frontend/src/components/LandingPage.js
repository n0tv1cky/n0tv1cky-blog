"use client";
import Link from 'next/link';

export default function LandingPage() {
    return (
        <main style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>Welcome to n0tv1cky Blog</h1>
            <p>A modern, minimal blog platform for markdown publishing.</p>
            <div style={{ marginTop: '2rem' }}>
                <Link href="/blogs">
                    <button style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        backgroundColor: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}>
                        View All Blogs
                    </button>
                </Link>
            </div>
        </main>
    );
}
