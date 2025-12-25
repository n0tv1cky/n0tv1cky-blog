import BlogViewer from '../../../components/BlogViewer';

export default function BlogReader({ params }) {
    return <BlogViewer slug={params.slug} />;
}
