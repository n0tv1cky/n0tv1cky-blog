"use client";
import Link from 'next/link';

export default function BlogCard({ blog }) {
    return (
        <article className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <Link href={`/blogs/${blog.slug}`}>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors">
                    {blog.title}
                </h3>
            </Link>
            {blog.description && (
                <p className="text-gray-600 mb-4 leading-relaxed">{blog.description}</p>
            )}
            <div className="flex items-center gap-3 text-sm text-gray-500">
                {blog.reading_time && (
                    <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {blog.reading_time} min read
                    </span>
                )}
                {blog.published ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        Published
                    </span>
                ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        Draft
                    </span>
                )}
            </div>
        </article>
    );
}
