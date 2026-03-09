"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function Register() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await fetchWithAuth('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            localStorage.setItem('token', data.token);
            router.push('/connect');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-dark)] px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-[var(--color-card-dark)] p-10 rounded-2xl shadow-2xl border border-[var(--color-card-border)] relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>

                <div className="relative">
                    <div className="flex justify-center">
                        <div className="h-16 w-16 bg-teal-500/20 text-teal-400 rounded-2xl flex items-center justify-center ring-1 ring-teal-500/50 shadow-inner">
                            <UserPlus className="h-8 w-8" />
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
                        Create an Account
                    </h2>
                    <p className="mt-2 text-center text-sm text-[var(--color-text-muted)]">
                        Join ClearView to track academic performance
                    </p>
                </div>

                <form className="mt-8 space-y-6 relative" onSubmit={handleRegister}>
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
                                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-[var(--color-card-border)] bg-[#10141f] placeholder-[var(--color-text-muted)] text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
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
                                autoComplete="new-password"
                                required
                                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-[var(--color-card-border)] bg-[#10141f] placeholder-[var(--color-text-muted)] text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
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
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 focus:ring-offset-[var(--color-bg-dark)] transition-all duration-200 disabled:opacity-50"
                        >
                            {loading ? 'Creating account...' : 'Create account'}
                        </button>
                    </div>

                    <div className="text-center text-sm text-[var(--color-text-muted)] mt-4">
                        Already have an account? <Link href="/login" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">Sign in</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
