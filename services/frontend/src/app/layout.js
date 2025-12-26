import '../styles/globals.css';
import Toast from '../components/Toast';

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="min-h-screen">
                {children}
                <Toast />
            </body>
        </html>
    );
}

// expose NEXT_PUBLIC_* env variables to window for simple scripts
if (typeof window !== 'undefined') {
    window.NEXT_PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    window.NEXT_PUBLIC_MAX_UPLOAD_SIZE = process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE || '';
    window.NEXT_PUBLIC_ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';
}
