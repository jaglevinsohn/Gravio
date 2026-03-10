"use client";

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { BookOpen, Calendar, TrendingUp, CheckCircle2 } from 'lucide-react';
import Header from '@/components/Header';

interface Grade {
    percentage: number;
    letter: string;
}

interface Category {
    name: string;
    weight: number;
    percentage: number | null;
}

interface Assignment {
    id: number;
    name: string;
    course_name: string;
    due_date: string;
    score: number | null;
    max_score: number | null;
    is_late: boolean;
}

interface Course {
    id: number;
    name: string;
    teacher: string;
    current_grade: number;
    letter_grade: string;
    categories: Category[];
}

interface Student {
    id: number;
    name: string;
    school: string;
}

export default function Dashboard() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [dailySummary, setDailySummary] = useState<{
        recent_activity: string,
        focus_tasks: string[]
    } | null>(null);

    useEffect(() => {
        const loadStudents = async () => {
            try {
                const res = await fetchWithAuth('/dashboard/students');
                if (res.students && res.students.length > 0) {
                    setStudents(res.students);
                    setSelectedStudentId(res.students[0].id);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                router.push('/login');
            }
        };
        loadStudents();
    }, [router]);

    useEffect(() => {
        if (!selectedStudentId) return;

        const loadDashboardData = async () => {
            setLoading(true);
            setDailySummary(null); // Clear previous summary while loading
            try {
                const [dashboardRes, summaryRes] = await Promise.all([
                    fetchWithAuth(`/dashboard/student/${selectedStudentId}/dashboard`),
                    fetchWithAuth(`/dashboard/student/${selectedStudentId}/daily-summary`)
                ]);
                setData(dashboardRes);
                if (summaryRes && summaryRes.daily_summary) {
                    setDailySummary(summaryRes.daily_summary);
                } else {
                    setDailySummary(null);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadDashboardData();
    }, [selectedStudentId]);

    if (loading && !data && students.length > 0) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;

    if (!loading && students.length === 0) {
        return (
            <div className="min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center px-4">
                <div className="max-w-md w-full text-center space-y-6 bg-[var(--color-card-dark)] p-10 rounded-2xl shadow-2xl border border-[var(--color-card-border)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>

                    <div className="relative">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center ring-1 ring-indigo-500/50 shadow-inner">
                                <BookOpen className="h-8 w-8" />
                            </div>
                        </div>
                        <h2 className="mt-6 text-2xl font-bold text-white tracking-tight">Welcome to ClearView!</h2>
                        <p className="mt-3 text-[var(--color-text-muted)] text-sm leading-relaxed">
                            You're successfully signed in. To start viewing grades and assignments, please connect your Schoology account when you're ready.
                        </p>
                    </div>
                    <div className="relative pt-4">
                        <button
                            onClick={() => router.push('/connect')}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-[var(--color-bg-dark)] transition-all"
                        >
                            Connect Schoology
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return <div className="min-h-screen flex items-center justify-center">No data found</div>;

    const { student, courses, upcomingAssignments } = data;

    const getGradeColor = (letter: string) => {
        if (!letter) return 'var(--color-grade-d)';
        if (letter.startsWith('A')) return 'var(--color-grade-a)';
        if (letter.startsWith('B')) return 'var(--color-grade-b)';
        if (letter.startsWith('C')) return 'var(--color-grade-c)';
        return 'var(--color-grade-d)';
    };

    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg-dark)]">
            {/* Header */}
            <Header students={students} selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-[var(--color-card-dark)] rounded-2xl p-5 border border-[var(--color-card-border)] shadow-md flex relative overflow-hidden transition-all hover:border-indigo-500/50 hover:shadow-lg hover:-translate-y-1 group">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400/70 mr-4 transition-colors group-hover:bg-indigo-500/20 group-hover:text-indigo-400">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-[var(--color-text-muted)] tracking-wider">CURRENT GPA</div>
                            <div className="text-3xl font-bold mt-1 tracking-tight">3.67</div>
                        </div>
                    </div>

                    <div className="bg-[var(--color-card-dark)] rounded-2xl p-5 border border-[var(--color-card-border)] shadow-md flex transition-all hover:border-teal-500/50 hover:shadow-lg hover:-translate-y-1 group">
                        <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400/70 mr-4 transition-colors group-hover:bg-teal-500/20 group-hover:text-teal-400">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-[var(--color-text-muted)] tracking-wider">ACTIVE COURSES</div>
                            <div className="text-3xl font-bold mt-1 tracking-tight">{courses.length}</div>
                        </div>
                    </div>

                    <div className="bg-[var(--color-card-dark)] rounded-2xl p-5 border border-[var(--color-card-border)] shadow-md flex transition-all hover:border-amber-500/50 hover:shadow-lg hover:-translate-y-1 group">
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400/70 mr-4 transition-colors group-hover:bg-amber-500/20 group-hover:text-amber-400">
                            <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-[var(--color-text-muted)] tracking-wider">DUE THIS WEEK</div>
                            <div className="text-3xl font-bold mt-1 tracking-tight">{upcomingAssignments ? upcomingAssignments.length : 0}</div>
                        </div>
                    </div>

                    <div className="bg-[var(--color-card-dark)] rounded-2xl p-5 border border-[var(--color-card-border)] shadow-md flex transition-all hover:border-emerald-500/50 hover:shadow-lg hover:-translate-y-1 group">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400/70 mr-4 transition-colors group-hover:bg-emerald-500/20 group-hover:text-emerald-400">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-xs font-semibold text-[var(--color-text-muted)] tracking-wider">GRADE TREND</div>
                            <div className="text-2xl font-bold mt-2 text-emerald-400 tracking-tight flex items-center">
                                <span className="transform -rotate-45 mr-1 text-lg">→</span> Strong
                            </div>
                        </div>
                    </div>
                </div>

                {/* Daily Academic Outlook */}
                {dailySummary && (
                    <div className="bg-[var(--color-card-dark)] rounded-2xl p-6 md:p-8 border border-indigo-500/30 shadow-lg relative overflow-hidden group hover:border-indigo-400/50 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-opacity duration-500 group-hover:bg-indigo-500/10"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none transition-opacity duration-500 group-hover:bg-teal-500/10"></div>

                        <div className="relative flex flex-col md:flex-row gap-6items-start md:items-center">
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-gray-100 flex items-center mb-6">
                                    <span className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg mr-3 shadow-inner">
                                        <BookOpen className="h-5 w-5" />
                                    </span>
                                    Daily Academic Outlook
                                </h2>
                                <div className="text-gray-300 leading-relaxed text-[15px] max-w-4xl tracking-wide font-medium space-y-4">
                                    <p>{dailySummary.recent_activity}</p>

                                    {dailySummary.focus_tasks && dailySummary.focus_tasks.length > 0 && (
                                        <div className="bg-[#1e2230]/50 rounded-xl p-5 border border-indigo-500/10">
                                            <p className="font-bold text-indigo-300/80 mb-3 text-sm uppercase tracking-wider">Today's Focus Priorities:</p>
                                            <ul className="space-y-3">
                                                {dailySummary.focus_tasks.map((task, idx) => (
                                                    <li key={idx} className="flex items-start">
                                                        <span className="text-indigo-400 mr-3 mt-1 text-sm">✦</span>
                                                        <span className="text-gray-100">{task}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Main Courses Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-bold text-gray-100/90 tracking-tight">Courses</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {courses.map((course: Course) => (
                                <div onClick={() => router.push(`/course/${course.id}`)} key={course.id} className="bg-[var(--color-card-dark)] rounded-2xl p-8 border border-[var(--color-card-border)] shadow-lg hover:border-indigo-500/40 hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="text-xs text-[var(--color-text-muted)] mb-1 font-medium">{course.name.split(' ')[0]}</div>
                                            <h3 className="font-bold text-xl leading-tight w-48 truncate text-gray-100 tracking-tight">{course.name.substring(course.name.indexOf(' ') + 1)}</h3>
                                        </div>
                                        <div
                                            className="h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl ring-2 ring-offset-2 ring-offset-[#1e2230] group-hover:scale-110 transition-transform duration-300"
                                            style={{ color: getGradeColor(course.letter_grade), '--tw-ring-color': getGradeColor(course.letter_grade) } as React.CSSProperties}
                                        >
                                            {course.letter_grade || '--'}
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        {course.categories?.slice(0, 4).map((cat, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--color-text-muted)] w-28 truncate">{cat.name}</span>
                                                <div className="flex-1 mx-4 h-2.5 bg-[#2a2e3f] rounded-full overflow-hidden shadow-inner">
                                                    {cat.percentage !== null && (
                                                        <div
                                                            className="h-full rounded-full transition-all duration-1000 ease-out"
                                                            style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: getGradeColor(cat.percentage >= 90 ? 'A' : cat.percentage >= 80 ? 'B' : 'C') }}
                                                        />
                                                    )}
                                                </div>
                                                <span className="font-medium text-right w-10 text-gray-300">{cat.percentage ? `${Math.round(cat.percentage)}%` : '--'}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between items-center pt-5 border-t border-[#2a3045]/50">
                                        <span className="text-xs text-[var(--color-text-muted)] tracking-wide">{course.teacher}</span>
                                        <div className="h-8 w-8 rounded-full bg-[#2a2e3f] flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition group-hover:translate-x-1 duration-300 shadow-sm">
                                            <svg className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar Area */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Upcoming Deadlines</h2>
                            <Calendar className="h-5 w-5 text-indigo-400" />
                        </div>

                        <div className="bg-[var(--color-card-dark)] border border-[var(--color-card-border)] rounded-2xl overflow-hidden shadow-lg">
                            {(!upcomingAssignments || upcomingAssignments.length === 0) ? (
                                <div className="p-8 text-center text-[var(--color-text-muted)] flex flex-col items-center justify-center">
                                    <CheckCircle2 className="h-8 w-8 mb-3 text-emerald-500/50" />
                                    <p className="text-sm">No upcoming assignments right now!</p>
                                    <p className="text-xs mt-1 opacity-70">Awesome job staying on top of work.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-[var(--color-card-border)]/50">
                                    {upcomingAssignments.map((assignment: Assignment) => (
                                        <li key={assignment.id} className="p-5 hover:bg-[#1e2230]/80 transition-all cursor-pointer group">
                                            <div className="flex gap-4 items-start group-hover:translate-x-1 transition-transform">
                                                <div className="flex-shrink-0 w-14 h-16 bg-[#252b3d] rounded-xl border border-indigo-500/20 shadow-inner flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider mb-1">
                                                        {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short' })}
                                                    </span>
                                                    <span className="text-xl font-black text-white leading-none">
                                                        {new Date(assignment.due_date).getDate()}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0 pt-1">
                                                    <h4 className="text-[15px] font-bold truncate mb-1 text-gray-100">{assignment.name}</h4>
                                                    <div className="text-xs text-[var(--color-text-muted)] font-medium truncate mb-2.5">
                                                        {assignment.course_name.split(' ').slice(1).join(' ')}
                                                    </div>
                                                    <div className="flex items-center">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
                                                            Pending
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                    <li className="p-4 text-center bg-[#151924]/80 hover:bg-[#1a1f2e] transition-colors">
                                        <button onClick={() => router.push('/calendar')} className="text-xs font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition w-full h-full">View full calendar →</button>
                                    </li>
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
