"use client";

import { useEffect, useState, use, useMemo } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface Assignment {
    id: number;
    name: string;
    due_date: string;
    score: number | null;
    grade_text: string | null;
    score_type: string | null;
    max_score: number | null;
    submission_status: string;
    grading_status: string;
    timeliness_status: string;
}

interface Category {
    id: number;
    name: string;
    weight: number;
    percentage: number | null;
}

const getGradeColor = (letter: string) => {
    if (!letter) return 'text-gray-400';
    if (letter.startsWith('A')) return 'text-emerald-400';
    if (letter.startsWith('B')) return 'text-blue-400';
    if (letter.startsWith('C')) return 'text-amber-400';
    return 'text-red-400';
};

const formatCourseName = (fullName: string) => {
    let name = fullName.split(':')[0].split('-')[0].trim();
    const words = name.split(' ');
    if (words.length <= 1) return { context: 'COURSE', subject: name };

    const prefixes = ['AP', 'HONORS', 'IB', 'ADVANCED', 'INTRO', 'PE', 'PHYSICAL'];
    if (prefixes.includes(words[0].toUpperCase())) {
        return {
            context: words[0].toUpperCase(),
            subject: words.slice(1).join(' ')
        };
    }
    
    return { context: 'CLASS', subject: name };
};

const cleanAssignmentName = (name: string) => {
    let cleanName = name.trim();
    const suffixes = ["assignment", "assessment", "discussion", "external-tool-link", "link"];
    for (const suffix of suffixes) {
        if (cleanName.toLowerCase().endsWith(suffix)) {
            cleanName = cleanName.substring(0, cleanName.length - suffix.length).trim();
        }
    }
    return cleanName;
};

const parseSchoologyDate = (dateStr: string) => {
    if (!dateStr) return null;
    try {
        let parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date(`${dateStr} ${new Date().getFullYear()}`);
        }
        if (isNaN(parsedDate.getTime())) return null;
        return parsedDate;
    } catch {
        return null;
    }
};

const getScoreColor = (scoreType: string | null, score: number | null, maxScore: number | null, text: string | null) => {
    if (scoreType === 'letter' && text) {
        if (text.startsWith('A')) return 'text-emerald-400';
        if (text.startsWith('B')) return 'text-blue-400';
        if (text.startsWith('C')) return 'text-amber-400';
        return 'text-red-400';
    }
    if (score !== null && maxScore && maxScore > 0) {
        const pct = score / maxScore;
        if (pct >= 0.9) return 'text-emerald-400';
        if (pct >= 0.8) return 'text-[#38bdf8]'; // Custom blue
        if (pct >= 0.7) return 'text-amber-400';
        return 'text-red-400';
    }
    return 'text-gray-400';
};

export default function CourseDetail({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!userId) return;
        const loadData = async () => {
            try {
                const res = await fetchWithAuth(`/dashboard/course/${resolvedParams.id}?user_id=${userId}`);
                setData(res);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [resolvedParams.id, userId]);

    const categories = data?.categories || [];
    const assignments = data?.assignments || [];

    // Dynamically group assignments based on keyword matching with categories
    const { groupedAssignments, uncategorizedAssignments } = useMemo(() => {
        if (!categories.length || !assignments.length) return { groupedAssignments: [], uncategorizedAssignments: [] };
        
        const grouped = categories.map((cat: Category) => {
            return {
                category: cat,
                assignments: assignments.filter((a: Assignment) => {
                    const n = a.name.toLowerCase();
                    const c = cat.name.toLowerCase();
                    if (c.includes('homework') || c.includes('hw')) return n.includes('hw') || n.includes('practice') || n.includes('reading') || n.includes('log') || n.includes('homework') || n.includes('assignment');
                    if (c.includes('test') || c.includes('quiz')) return n.includes('test') || n.includes('quiz') || n.includes('exam') || n.includes('report');
                    if (c.includes('project') || c.includes('lab') || c.includes('essay')) return n.includes('project') || n.includes('lab') || n.includes('essay') || n.includes('presentation') || n.includes('research');
                    if (c.includes('participation')) return n.includes('participation') || n.includes('discussion');
                    return false;
                })
            };
        }).filter((g: { category: Category, assignments: Assignment[] }) => g.assignments.length > 0);

        const categorizedIds = new Set(grouped.flatMap((g: { category: Category, assignments: Assignment[] }) => g.assignments.map((a: Assignment) => a.id)));
        const uncategorized = assignments.filter((a: Assignment) => !categorizedIds.has(a.id));
        
        return { groupedAssignments: grouped, uncategorizedAssignments: uncategorized };
    }, [categories, assignments]);

    const formattedDates = useMemo(() => {
        const dict: Record<number, string | null> = {};
        if (!assignments.length) return dict;
        assignments.forEach((a: Assignment) => {
            const parsed = parseSchoologyDate(a.due_date);
            dict[a.id] = parsed ? parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
        });
        return dict;
    }, [assignments]);

    if (loading) return <div className="min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;
    if (!data || !data.course) return <div className="min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center">No data found</div>;

    const { course } = data;

    const has_category_averages = categories.some((c: Category) => c.percentage !== null);
    const show_category_cards = categories.length > 0;
    const is_linear_list = categories.length === 0;

    const { context, subject } = formatCourseName(course.name);

    return (
        <div className="min-h-screen bg-[var(--color-bg-dark)] text-[#f8fafc]">
            {/* Header section */}
            <div className="max-w-4xl mx-auto p-6 md:p-8">
                <div className="flex justify-between items-start mb-10 border-b border-[#2a3045]/50 pb-10 pt-4">
                    <div>
                        <div className="text-xs font-bold text-indigo-400/80 tracking-widest mb-2 uppercase">
                            {context} · SPRING 2026
                        </div>
                        <h1 className="text-4xl font-black mb-6 tracking-tight text-white">{subject}</h1>
                        <div className="flex items-end gap-3 mt-4">
                            <span className={`text-7xl font-black tracking-tighter leading-none ${getGradeColor(course.letter_grade)}`}>
                                {course.overall_grade != null ? `${Number(course.overall_grade).toFixed(1)}%` : '--'}
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
                {show_category_cards && (
                    <div className="flex gap-4 mb-12 overflow-x-auto pb-4 hide-scrollbar">
                        {categories.map((cat: Category) => (
                            <div key={cat.id} className="bg-[#1e2230] rounded-xl p-5 border border-[#2a3045]/50 min-w-[200px] flex-shrink-0 shadow-sm">
                                <div className="text-[11px] font-bold text-gray-400 tracking-widest mb-3 uppercase">{cat.name}</div>
                                <div className={`text-[26px] font-bold tracking-tight ${cat.percentage ? 'text-[#38bdf8]' : 'text-gray-500'}`}>
                                    {cat.percentage ? `${cat.percentage.toFixed(1)}%` : '—'}
                                </div>
                                {cat.weight ? <div className="text-[12px] text-gray-500 font-medium mt-1">{Math.round(cat.weight)}% of grade</div> : null}
                            </div>
                        ))}
                    </div>
                )}

                {/* Assignments List */}
                {is_linear_list ? (
                    <div className="space-y-6">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-5 mb-6 shadow-sm">
                            <p className="text-indigo-300 text-[14px] font-medium leading-relaxed">This course uses letter-based grading, so category percentages are not shown.</p>
                        </div>
                        <div className="bg-[#1e2230] rounded-xl border border-[#2a3045]/50 overflow-hidden shadow-sm">
                            <div className="flex justify-between px-6 py-4 border-b border-[#2a3045]/50 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                <div>Assignment</div>
                                <div>Score</div>
                            </div>
                            <div className="divide-y divide-[#2a3045]/50">
                                {assignments.map((a: Assignment, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center px-6 py-5 hover:bg-[#252a3a] transition-colors">
                                        <div>
                                            <div className="font-semibold text-[15px] flex items-center gap-3 text-gray-100">
                                                {cleanAssignmentName(a.name)}
                                                {a.timeliness_status === "overdue" && a.submission_status === "not_submitted" ? <span className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2 py-0.5 rounded shadow-sm tracking-wide">MISSING</span> : null}
                                                {a.timeliness_status === "late_submitted" && a.submission_status === "submitted" ? <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded shadow-sm tracking-wide">LATE</span> : null}
                                                {a.grading_status === "ungraded" && a.submission_status === "submitted" ? <span className="text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded shadow-sm tracking-wide">SUBMITTED</span> : null}
                                            </div>
                                            <div className="text-[13px] text-gray-500 mt-1 font-medium">Due {formattedDates[a.id] || 'ASAP'}</div>
                                        </div>
                                        <div className={`font-bold text-[18px] ${getScoreColor(a.score_type, a.score, a.max_score, a.grade_text)}`}>
                                            {a.score_type === 'letter' || a.score_type === 'status' 
                                                ? a.grade_text 
                                                : (a.score !== null ? (a.max_score === 100 ? `${a.score}%` : `${a.score}/${a.max_score}`) : '--')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {groupedAssignments.map((group: { category: Category, assignments: Assignment[] }, groupIdx: number) => (
                            <div key={groupIdx}>
                                <div className="flex items-center gap-3 mb-5">
                                    <h2 className="text-[13px] font-bold tracking-widest text-white uppercase">{group.category.name}</h2>
                                    <span className="bg-[#1e2230] text-[11px] font-medium px-2.5 py-1 rounded-full text-gray-400 tracking-wide">
                                        {group.category.percentage ? `${group.category.percentage.toFixed(1)}%` : '--'}
                                    </span>
                                </div>

                                <div className="bg-[#1e2230] rounded-xl border border-[#2a3045]/50 overflow-hidden shadow-sm">
                                    <div className="flex justify-between px-6 py-4 border-b border-[#2a3045]/50 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                        <div>Assignment</div>
                                        <div>Score</div>
                                    </div>

                                    <div className="divide-y divide-[#2a3045]/50">
                                        {group.assignments.map((a: Assignment, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center px-6 py-5 hover:bg-[#252a3a] transition-colors">
                                                <div>
                                                    <div className="font-semibold text-[15px] flex items-center gap-3 text-gray-100">
                                                        {cleanAssignmentName(a.name)}
                                                        {a.timeliness_status === "overdue" && a.submission_status === "not_submitted" ? <span className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2 py-0.5 rounded shadow-sm tracking-wide">MISSING</span> : null}
                                                        {a.timeliness_status === "late_submitted" && a.submission_status === "submitted" ? <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded shadow-sm tracking-wide">LATE</span> : null}
                                                        {a.grading_status === "ungraded" && a.submission_status === "submitted" ? <span className="text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded shadow-sm tracking-wide">SUBMITTED</span> : null}
                                                    </div>
                                                    <div className="text-[13px] text-gray-500 mt-1 font-medium">Due {formattedDates[a.id] || 'ASAP'}</div>
                                                </div>
                                                <div className={`font-bold text-[18px] ${getScoreColor(a.score_type, a.score, a.max_score, a.grade_text)}`}>
                                                    {a.score_type === 'letter' || a.score_type === 'status'
                                                        ? a.grade_text 
                                                        : (a.score !== null ? (a.max_score === 100 ? `${a.score}%` : `${a.score}/${a.max_score}`) : '--')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Uncategorized Group */}
                        {uncategorizedAssignments.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-5">
                                    <h2 className="text-[13px] font-bold tracking-widest text-white uppercase">Other Assignments</h2>
                                </div>

                                <div className="bg-[#1e2230] rounded-xl border border-[#2a3045]/50 overflow-hidden shadow-sm">
                                    <div className="flex justify-between px-6 py-4 border-b border-[#2a3045]/50 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                                        <div>Assignment</div>
                                        <div>Score</div>
                                    </div>

                                    <div className="divide-y divide-[#2a3045]/50">
                                        {uncategorizedAssignments.map((a: Assignment, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center px-6 py-5 hover:bg-[#252a3a] transition-colors">
                                                <div>
                                                    <div className="font-semibold text-[15px] flex items-center gap-3 text-gray-100">
                                                        {cleanAssignmentName(a.name)}
                                                        {a.timeliness_status === "overdue" && a.submission_status === "not_submitted" ? <span className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-300 px-2 py-0.5 rounded shadow-sm tracking-wide">MISSING</span> : null}
                                                        {a.timeliness_status === "late_submitted" && a.submission_status === "submitted" ? <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-300 px-2 py-0.5 rounded shadow-sm tracking-wide">LATE</span> : null}
                                                        {a.grading_status === "ungraded" && a.submission_status === "submitted" ? <span className="text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded shadow-sm tracking-wide">SUBMITTED</span> : null}
                                                    </div>
                                                    <div className="text-[13px] text-gray-500 mt-1 font-medium">Due {formattedDates[a.id] || 'ASAP'}</div>
                                                </div>
                                                <div className={`font-bold text-[18px] ${getScoreColor(a.score_type, a.score, a.max_score, a.grade_text)}`}>
                                                    {a.score_type === 'letter' || a.score_type === 'status'
                                                        ? a.grade_text 
                                                        : (a.score !== null ? (a.max_score === 100 ? `${a.score}%` : `${a.score}/${a.max_score}`) : '--')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
