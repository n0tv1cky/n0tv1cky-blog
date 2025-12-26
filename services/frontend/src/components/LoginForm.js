"use client";
import React, { useState } from 'react';
import { login } from '../lib/api';

export default function LoginForm({ onSuccess }) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(password);
            setLoading(false);
            if (onSuccess) onSuccess();
        } catch (err) {
            setLoading(false);
            setError(err.message || 'Login failed');
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
            <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Admin Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 8 }} />
            </div>
            {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>
                {loading ? 'Logging in…' : 'Log In'}
            </button>
        </form>
    );
}
