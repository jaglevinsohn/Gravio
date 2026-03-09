"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api';
import { Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ConnectSchoology() {
    const router = useRouter();
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            await fetchWithAuth('/schoology/connect', {
                method: 'POST',
                body: JSON.stringify({ apiKey, apiSecret }),
            });
            setStatus('success');
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || 'Failed to connect');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-dark)] p-4">
            <div className="max-w-md w-full bg-[var(--color-card-dark)] rounded-2xl p-8 border border-[var(--color-card-border)] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

                <div className="flex flex-col items-center text-center mb-8">
                    <div className="h-16 w-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4 ring-1 ring-blue-500/30">
                        <LinkIcon className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Connect Schoology</h1>
                    <p className="text-[var(--color-text-muted)] text-sm px-4">
                        Enter your actual Schoology API Key and API Secret. (You can generate these at <span className="text-blue-400">yourschool.schoology.com/api</span>)
                    </p>
                </div>

                <form onSubmit={handleConnect} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-muted)] p-1">API Key</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 bg-[#10141f] border border-[var(--color-card-border)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            placeholder="e.g. 8a7b6c5d..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            disabled={status === 'loading' || status === 'success'}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-muted)] p-1">API Secret</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 bg-[#10141f] border border-[var(--color-card-border)] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            placeholder="••••••••••••"
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            disabled={status === 'loading' || status === 'success'}
                        />
                    </div>

                    {status === 'error' && (
                        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20 text-sm justify-center">
                            <CheckCircle2 className="h-5 w-5" />
                            <span>Connected! Redirecting...</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'loading' || status === 'success'}
                        className="w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg-dark)] focus:ring-blue-500 disabled:opacity-50 flex justify-center items-center"
                    >
                        {status === 'loading' ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Syncing data...
                            </span>
                        ) : 'Connect Account'}
                    </button>
                </form>
            </div>
        </div>
    );
}
