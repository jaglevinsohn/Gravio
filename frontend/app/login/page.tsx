"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import Link from 'next/link';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            router.push('/dashboard');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const userCredential = await signInWithPopup(auth, googleProvider);

            router.push('/dashboard');
        } catch (err: any) {
            console.error('Google login error:', err);
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-dark)] px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-[var(--color-card-dark)] p-10 rounded-2xl shadow-2xl border border-[var(--color-card-border)] relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>

                <div className="relative">
                    <div className="flex justify-center">
                        <div className="h-16 w-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center ring-1 ring-indigo-500/50 shadow-inner">
                            <LogIn className="h-8 w-8" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
                        Welcome to Gravio
                    </h2>
                    <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">
                        Log in to view your child's academic progress
                    </p>
                </div>

                <form className="mt-8 space-y-6 relative" onSubmit={handleLogin}>
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-sm rounded-lg text-center">{error}</div>}
                    <div className="space-y-4">
                        <div>
                            <label className="sr-only" htmlFor="email-address">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-[var(--color-card-border)] bg-[#10141f] placeholder-[var(--color-text-muted)] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="sr-only" htmlFor="password">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-[var(--color-card-border)] bg-[#10141f] placeholder-[var(--color-text-muted)] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-[var(--color-bg-dark)] transition-all duration-200 disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>

                    <div className="relative mt-6 mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[var(--color-card-border)]"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-[var(--color-card-dark)] text-[var(--color-text-muted)]">Or continue with</span>
                        </div>
                    </div>

                    <div>
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="group relative w-full flex justify-center items-center py-3 px-4 border border-[var(--color-card-border)] text-sm font-medium rounded-xl text-white bg-[#10141f] hover:bg-[#1a2035] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-[var(--color-bg-dark)] disabled:opacity-50"
                        >
                            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </button>
                    </div>

                    <div className="text-center text-sm text-[var(--color-text-muted)] mt-4">
                        Don't have an account? <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Sign up</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
