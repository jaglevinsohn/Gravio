"use client";

import { useState, useEffect } from 'react';
import { ShieldCheck, Download, Link as LinkIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function ConnectSchoology() {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'validating_session' | 'syncing_schoology' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [syncStats, setSyncStats] = useState({ courses: 0, assignments: 0, grades: 0 });
    const [detailedStatus, setDetailedStatus] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null); 
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        // Listen for messages from the Chrome extension content script
        const handleMessage = (event: MessageEvent) => {
            // Ensure we only accept messages from our own extension/window
            if (event.source !== window || !event.data || event.data.type !== 'REQUEST_USER_ID') return;
            
            window.postMessage({ type: 'PROVIDE_USER_ID', userId: userId || null }, '*');
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [userId]);

    const checkConnection = async () => {
        setStatus('validating_session');
        setErrorMessage('');
        
        try {
            if (!userId) {
                setErrorMessage('No user ID found. Please log in again.');
                setStatus('idle');
                return;
            }
            const response = await fetch(`http://localhost:8000/api/check-connection?user_id=${userId}`);
            const data = await response.json();

            if (data.stats) {
                setSyncStats({
                    courses: data.stats.courses_imported,
                    assignments: data.stats.assignments_imported,
                    grades: data.stats.grades_imported
                });
            }

            if (data.connected && data.sync_status === 'success') {
                setStatus('success');
                setDetailedStatus('Sync Complete!');
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            } else if (data.connected && data.sync_status === 'validating') {
                setStatus('validating_session');
                setDetailedStatus('Validating session...');
                setTimeout(checkConnection, 2000);
            } else if (data.connected && data.sync_status === 'syncing_courses') {
                setStatus('syncing_schoology');
                setDetailedStatus('Importing Courses...');
                setTimeout(checkConnection, 2000);
            } else if (data.connected && data.sync_status === 'syncing_assignments') {
                setStatus('syncing_schoology');
                setDetailedStatus('Importing Assignments & Grades...');
                setTimeout(checkConnection, 2000);
            } else if (data.connected && data.sync_status === 'syncing') {
                setStatus('syncing_schoology');
                setDetailedStatus('Importing data...');
                setTimeout(checkConnection, 2000);
            } else if (data.connected && data.sync_status === 'failed') {
                setStatus('error');
                setErrorMessage(data.stats?.error || 'Sync failed. Please try logging out and back into Schoology, then click the extension again.');
            } else {
                setStatus('idle');
                setErrorMessage('No active connection found yet. Did you click the extension?');
            }
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMessage('Unable to reach the server to check connection.');
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-dark)] px-4 sm:px-6 py-12">
            <div className="max-w-2xl w-full space-y-8 bg-[var(--color-card-dark)] p-8 sm:p-12 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[var(--color-card-border)] relative overflow-hidden">
                {/* Decorative glow */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-teal-400 to-indigo-500"></div>
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>

                <div className="text-center relative z-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 mb-6 shadow-inner">
                        <LinkIcon className="h-10 w-10 text-blue-400" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                        Secure Connection
                    </h1>
                    <p className="text-[var(--color-text-muted)] text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
                        To protect your privacy and bypass school restrictions, Gravio uses a secure browser extension to sync your academic data.
                    </p>
                </div>

                <div className="mt-10 bg-[#0d1117] rounded-2xl border border-[var(--color-card-border)] p-6 sm:p-8 space-y-6 relative z-10 shadow-inner">
                    <h3 className="text-white font-semibold flex items-center gap-2 text-lg">
                        <ShieldCheck className="w-5 h-5 text-teal-400" /> Connection Steps
                    </h3>
                    
                    <ol className="space-y-6">
                        <li className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/30">1</div>
                            <div>
                                <h4 className="text-white font-medium mb-1">Install the Extension</h4>
                                <p className="text-sm text-[var(--color-text-muted)]">Install the Gravio Chrome extension on your computer. (Currently in developer mode via the `gravio-extension` folder).</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/30">2</div>
                            <div>
                                <h4 className="text-white font-medium mb-1">Log In to Schoology</h4>
                                <p className="text-sm text-[var(--color-text-muted)]">Open a new tab and organically log into your school's Schoology portal as you normally would.</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm border border-teal-500/30">3</div>
                            <div>
                                <h4 className="text-white font-medium mb-1">Click the Extension to Sync</h4>
                                <p className="text-sm text-[var(--color-text-muted)]">Click the Gravio extension icon in your browser toolbar and press the <strong className="text-white">Connect</strong> button.</p>
                            </div>
                        </li>
                    </ol>
                </div>

                {errorMessage && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3 relative z-10">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>{errorMessage}</p>
                    </div>
                )}

                <div className="pt-4 relative z-10">
                    <button
                        onClick={checkConnection}
                        disabled={status === 'validating_session' || status === 'syncing_schoology' || status === 'success'}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg rounded-xl transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none font-medium flex items-center justify-center gap-3 relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        {status === 'validating_session' ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {detailedStatus || 'Validating Schoology Session...'}
                            </>
                        ) : status === 'syncing_schoology' ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {detailedStatus || 'Importing Grades & Assignments...'}
                            </>
                        ) : status === 'success' ? (
                            <>
                                <ShieldCheck className="w-6 h-6" />
                                Success! Opening Dashboard...
                            </>
                        ) : (
                            <>
                                I've Clicked the Extension! Check Status
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                    
                    <p className="mt-4 text-center text-xs text-[var(--color-text-muted)] mb-4">
                        Gravio only reads your grades. We never store your passwords or modify your Schoology data.
                    </p>
                    
                    {/* Developer Debug Panel */}
                    {status !== 'idle' && (
                        <div className="mt-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-xs font-mono text-gray-400">
                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-800/80">
                                <span className="text-gray-300 font-bold uppercase tracking-wider">Dev Debug Panel</span>
                                <span className={status === 'success' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-blue-400 animate-pulse'}>
                                    {detailedStatus || status}
                                </span>
                            </div>
                            <div className="space-y-1.5 ml-1">
                                <div className="flex justify-between"><span>Courses Imported:</span> <span className="text-white font-medium">{syncStats.courses}</span></div>
                                <div className="flex justify-between"><span>Assignments Imported:</span> <span className="text-white font-medium">{syncStats.assignments}</span></div>
                                <div className="flex justify-between"><span>Grades Imported:</span> <span className="text-white font-medium">{syncStats.grades}</span></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
