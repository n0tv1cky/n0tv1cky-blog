import MarkdownEditor from '../../../../components/MarkdownEditor';

export default function EditBlogPage({ params }) {
    return <MarkdownEditor mode="edit" slug={params.slug} />;
}
