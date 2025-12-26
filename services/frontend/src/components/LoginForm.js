"use client";
import React, { useState } from 'react';
import { login } from '../lib/api';
import toast from 'react-hot-toast';

export default function LoginForm({ onSuccess }) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            await login(password);
            toast.success('Logged in successfully!');
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-6">
            <div className="max-w-md w-full">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-serif">Admin Login</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Enter your password to access the admin dashboard</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Admin Password
                            </label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                                placeholder="Enter password"
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                                loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-primary-600 hover:bg-primary-700 shadow-sm hover:shadow-md'
                            } text-white`}
                        >
                            {loading ? 'Logging in…' : 'Log In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
