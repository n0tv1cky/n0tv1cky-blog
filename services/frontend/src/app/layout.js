import '../styles/globals.css';
import Toast from '../components/Toast';
import ThemeToggle from '../components/ThemeToggle';

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
                {children}
                <ThemeToggle />
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
