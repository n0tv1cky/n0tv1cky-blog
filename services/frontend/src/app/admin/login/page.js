"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '../../../components/LoginForm';

export default function AdminLoginPage() {
    const router = useRouter();

    function handleSuccess() {
        // after login, go to admin index
        router.push('/admin');
    }

    return (
        <div style={{ padding: 24 }}>
            <h2>Admin Login</h2>
            <LoginForm onSuccess={handleSuccess} />
        </div>
    );
}
