"use client";
import Link from 'next/link';

export default function BlogCard({ blog }) {
    return (
        <Link href={`/blogs/${blog.slug}`}>
            <article className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-all duration-200 group cursor-pointer">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {blog.title}
                        </h3>
                        {blog.published_at && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                                {new Date(blog.published_at).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </p>
                        )}
                        {blog.description && (
                            <p className="text-gray-600 dark:text-gray-400 mb-1 leading-relaxed">{blog.description}</p>
                        )}
                        {blog.reading_time && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {blog.reading_time} min read
                            </div>
                        )}
                    </div>
                    <div className="flex items-center">
                        <svg className="w-6 h-6 text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </article>
        </Link>
    );
}
