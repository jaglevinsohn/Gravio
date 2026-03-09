"use client";

import { useState } from 'react';
import { Link as LinkIcon, AlertCircle } from 'lucide-react';
import { fetchWithAuth } from '@/lib/api';

export default function ConnectSchoology() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleConnect = async () => {
        setStatus('loading');
        setErrorMessage('');
        try {
            const data = await fetchWithAuth('/schoology/login', {
                method: 'GET',
            });

            if (data.authorizeUrl) {
                // Redirect the user to Schoology's OAuth page
                window.location.href = data.authorizeUrl;
            } else {
                throw new Error('Failed to get authorization URL');
            }
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err.message || 'Failed to connect to Schoology');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-dark)] p-4">
            <div className="max-w-md w-full bg-[var(--color-card-dark)] rounded-2xl p-8 border border-[var(--color-card-border)] shadow-2xl relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

                <div className="flex flex-col items-center mb-8">
                    <div className="h-20 w-20 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-6 ring-1 ring-blue-500/30">
                        <LinkIcon className="h-10 w-10" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Connect Schoology</h1>
                    <p className="text-[var(--color-text-muted)] text-[15px] px-2 leading-relaxed">
                        Securely log into your Schoology account to sync your children's grades and upcoming assignments with ClearView.
                    </p>
                </div>

                {status === 'error' && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20 text-sm mb-6 mt-4">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <span className="text-left font-medium">{errorMessage}</span>
                    </div>
                )}

                <button
                    onClick={handleConnect}
                    disabled={status === 'loading'}
                    className="w-full py-4 px-6 bg-[#0052b4] hover:bg-[#003d8a] text-white font-bold text-lg rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 flex justify-center items-center group mt-4 relative overflow-hidden"
                >
                    <div className="absolute inset-0 w-full h-full bg-white/10 group-hover:bg-transparent transition-colors"></div>
                    {status === 'loading' ? (
                        <span className="flex items-center gap-3 relative z-10 text-[15px]">
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Connecting to Schoology...
                        </span>
                    ) : (
                        <span className="relative z-10 flex items-center gap-2">
                            Login with Schoology
                            <span className="text-xs absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">→</span>
                        </span>
                    )}
                </button>

                <p className="text-xs text-[var(--color-text-muted)] mt-6 opacity-70">
                    ClearView uses read-only access and never stores your Schoology password.
                </p>
            </div>
        </div>
    );
}
