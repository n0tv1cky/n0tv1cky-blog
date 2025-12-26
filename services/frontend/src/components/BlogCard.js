"use client";
import Link from 'next/link';

export default function BlogCard({ blog }) {
    return (
        <article style={{ border: '1px solid #e0e0e0', padding: '1rem', borderRadius: 6 }}>
            <h3><Link href={`/blogs/${blog.slug}`}><a>{blog.title}</a></Link></h3>
            <p style={{ margin: '0.25rem 0' }}>{blog.description}</p>
            <div style={{ fontSize: 12, color: '#666' }}>{blog.reading_time ? `${blog.reading_time} min read` : ''} • {blog.published ? 'Published' : 'Draft'}</div>
        </article>
    );
}
