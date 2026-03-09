"use client";

import { useEffect, useState, use } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface Assignment {
    id: number;
    name: string;
    due_date: string;
    score: number | null;
    max_score: number | null;
    is_late: boolean;
}

interface Category {
    id: number;
    name: string;
    weight: number;
    percentage: number | null;
}

export default function CourseDetail({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await fetchWithAuth(`/dashboard/course/${resolvedParams.id}`);
                setData(res);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [resolvedParams.id]);

    if (loading) return <div className="min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;
    if (!data) return <div className="min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center">No data found</div>;

    const { course, categories, assignments } = data;

    const getGradeColor = (letter: string) => {
        if (letter.startsWith('A')) return 'text-emerald-400';
        if (letter.startsWith('B')) return 'text-blue-400';
        if (letter.startsWith('C')) return 'text-amber-400';
        return 'text-red-400';
    };

    // Group assignments by dummy mapping for MVP (since we don't have category_id on assignments in our simple DB schema, we just show all or fake groups based on name)
    const homeworkAssignments = assignments.filter((a: any) => a.name.includes('HW') || a.name.includes('Practice') || a.name.includes('Set'));
    const testAssignments = assignments.filter((a: any) => a.name.includes('Test'));

    return (
        <div className="min-h-screen bg-[var(--color-bg-dark)] text-[#f8fafc]">
            {/* Header section */}
            <div className="max-w-4xl mx-auto p-6 md:p-8">
                <div className="flex justify-between items-start mb-10 border-b border-[#2a3045]/50 pb-10 pt-4">
                    <div>
                        <div className="text-xs font-bold text-indigo-400/80 tracking-widest mb-2 uppercase">
                            {course.name.split(' ')[0]} · SPRING 2026
                        </div>
                        <h1 className="text-4xl font-black mb-6 tracking-tight text-white">{course.name.substring(course.name.indexOf(' ') + 1)}</h1>
                        <div className="flex items-end gap-3 mt-4">
                            <span className={`text-7xl font-black tracking-tighter leading-none ${getGradeColor(course.letter_grade)}`}>
                                {course.overall_grade}%
                            </span>
                            <span className={`text-3xl font-bold bg-[#1e2230] px-4 py-1 rounded-xl mb-1 ${getGradeColor(course.letter_grade)}`}>
                                {course.letter_grade}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="p-2 rounded-full bg-[#1e2230] text-gray-400 hover:text-white hover:bg-[#2a2e3f] transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Category breakdown cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {categories.map((cat: Category) => (
                        <div key={cat.id} className="bg-[var(--color-card-dark)] rounded-xl p-4 border border-[var(--color-card-border)]">
                            <div className="text-xs font-semibold text-[var(--color-text-muted)] tracking-wider mb-2 uppercase">{cat.name}</div>
                            <div className={`text-xl font-bold ${cat.percentage ? 'text-blue-400' : 'text-gray-500'}`}>
                                {cat.percentage ? `${cat.percentage.toFixed(1)}%` : '—'}
                            </div>
                            <div className="text-xs text-[var(--color-text-muted)] mt-1">{cat.weight}% of grade</div>
                        </div>
                    ))}
                </div>

                {/* Assignments List */}
                <div className="space-y-10">

                    {/* Homework Group */}
                    {homeworkAssignments.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-sm font-bold tracking-wider uppercase">Homework</h2>
                                <span className="bg-[#1e2230] text-xs px-2 py-0.5 rounded-full text-[var(--color-text-muted)]">25%</span>
                            </div>

                            <div className="bg-[var(--color-card-dark)] rounded-xl border border-[var(--color-card-border)] overflow-hidden">
                                <div className="flex justify-between px-6 py-3 border-b border-[#2a2e3f] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                                    <div>Assignment</div>
                                    <div>Score</div>
                                </div>

                                <div className="divide-y divide-[#2a3045]/50">
                                    {homeworkAssignments.map((a: Assignment, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center px-6 py-5 hover:bg-[#202538] transition-colors group">
                                            <div>
                                                <div className="font-semibold text-[15px] flex items-center gap-3 text-gray-100 group-hover:text-white transition-colors">
                                                    {a.name}
                                                    {a.is_late ? <span className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2 py-0.5 rounded shadow-sm tracking-wide">LATE</span> : null}
                                                </div>
                                                <div className="text-[13px] text-[var(--color-text-muted)] mt-1.5 font-medium">Due {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                            </div>
                                            <div className="font-bold text-emerald-400 text-lg">
                                                {a.score}/{a.max_score}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tests Group */}
                    {testAssignments.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-sm font-bold tracking-wider uppercase">Tests</h2>
                                <span className="bg-[#1e2230] text-xs px-2 py-0.5 rounded-full text-[var(--color-text-muted)]">50%</span>
                            </div>

                            <div className="bg-[var(--color-card-dark)] rounded-xl border border-[var(--color-card-border)] overflow-hidden">
                                <div className="flex justify-between px-6 py-4 border-b border-[#2a2e3f] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                                    <div>Assignment</div>
                                    <div>Score</div>
                                </div>

                                <div className="divide-y divide-[#2a3045]/50">
                                    {testAssignments.map((a: Assignment, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center px-6 py-5 hover:bg-[#202538] transition-colors group">
                                            <div>
                                                <div className="font-semibold text-[15px] flex items-center gap-3 text-gray-100 group-hover:text-white transition-colors">
                                                    {a.name}
                                                </div>
                                                <div className="text-[13px] text-[var(--color-text-muted)] mt-1.5 font-medium">Due {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                            </div>
                                            <div className="font-bold text-blue-400 text-lg">
                                                {a.score}/{a.max_score}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
