"use client";

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { BookOpen, Calendar, TrendingUp, CheckCircle2, ChevronDown, ChevronUp, Clock, CircleDot, ChevronRight, Activity, AlertCircle } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Header from '@/components/Header';
import TutorialOverlay from '@/components/TutorialOverlay';
import PaywallModal from '@/components/PaywallModal';

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
    submission_status: string;
    grading_status: string;
    timeliness_status: string;
}

interface Course {
    id: number;
    name: string;
    teacher: string;
    current_grade: number;
    letter_grade: string;
    course_code?: string;
    semester?: string;
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
    const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [dailySummary, setDailySummary] = useState<{
        recent_activity: string,
        focus_tasks: string[],
        last_updated: string,
        status_badge: string,
        recent_activity_feed: any[],
        weekly_snapshot: any
    } | null>(null);

    const [userId, setUserId] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'not_connected'>('loading');
    const [isCoursesOpen, setIsCoursesOpen] = useState(false);
    const [isDeadlinesExpanded, setIsDeadlinesExpanded] = useState(false);

    // 1. Listen for Auth
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

    // 2. Check Connection State
    useEffect(() => {
        if (!userId) return;
        const checkConn = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/check-connection?user_id=${userId}`);
                const data = await res.json();
                
                console.log("[Route Guard] Connection Check:", data);

                if (data.connected && data.sync_status === 'success') {
                    // Bypass paywall if environment variable is set
                    if (process.env.NEXT_PUBLIC_BYPASS_PAYWALL === 'true') {
                        setIsSubscribed(true);
                    } else {
                        setIsSubscribed(data.is_subscribed);
                    }
                    setConnectionStatus('connected');
                } else if (!data.connected || data.sync_status === 'failed' || data.sync_status === 'idle') {
                    console.log("[Route Guard] Not connected definitively. Redirecting to /connect.");
                    setConnectionStatus('not_connected');
                    router.push('/connect');
                } else {
                    // Sync is ongoing
                    console.log("[Route Guard] Sync is in progress. Redirecting back to /connect to show progress.");
                    router.push('/connect');
                }
            } catch (err) {
                console.error("[Route Guard] Error checking connection:", err);
                setConnectionStatus('not_connected');
                router.push('/connect');
            }
        };
        checkConn();
    }, [userId, router]);

    // 3. Load Student Data explicitly AFTER connected
    useEffect(() => {
        if (connectionStatus !== 'connected' || !userId) return;

        const loadStudents = async () => {
            try {
                const res = await fetchWithAuth(`/dashboard/students?user_id=${userId}`);
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
    }, [connectionStatus, userId, router]);

    useEffect(() => {
        if (!selectedStudentId) return;

        const loadDashboardData = async () => {
            setLoading(true);
            setDailySummary(null); // Clear previous summary while loading
            try {
                const [dashboardRes, summaryRes] = await Promise.all([
                    fetchWithAuth(`/dashboard/student/${selectedStudentId}/dashboard?user_id=${userId}`),
                    fetchWithAuth(`/dashboard/student/${selectedStudentId}/daily-summary?user_id=${userId}`)
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

    // Display loading screen while the 3-state connection guard is running
    if (connectionStatus === 'loading') {
        return (
            <div className="min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (loading && !data && students.length > 0) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;

    if (!loading && students.length === 0) {
        return (
            <>
            {isSubscribed === false && <PaywallModal userId={userId} />}
            <div className={`min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center px-4 ${isSubscribed === false ? 'blur-md pointer-events-none' : ''}`}>
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
                        <h2 className="mt-6 text-2xl font-bold text-white tracking-tight">Connected, but no data</h2>
                        <p className="mt-3 text-[var(--color-text-muted)] text-sm leading-relaxed">
                            Your Schoology account is connected, but we couldn't find any active courses.
                        </p>
                    </div>
                    <div className="relative pt-4">
                        <button
                            onClick={() => router.push('/connect')}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-[var(--color-bg-dark)] transition-all"
                        >
                            Reconnect Schoology
                        </button>
                    </div>
                </div>
            </div>
            </>
        );
    }

    if (!data) return <div className="min-h-screen flex items-center justify-center">Loading dashboard data...</div>;

    const { student, courses, upcomingAssignments } = data;

    const getGradeColor = (letter: string) => {
        if (!letter) return '#6b7280';
        if (letter.startsWith('A')) return 'var(--color-grade-a)';
        if (letter.startsWith('B')) return 'var(--color-grade-b)';
        if (letter.startsWith('C')) return 'var(--color-grade-c)';
        return 'var(--color-grade-d)';
    };

    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    const formatCourseName = (fullName: string) => {
        // Strip off the section part if it exists (e.g., ": SEC 4" or "- 01")
        let name = fullName.split(':')[0].split('-')[0].trim();
        return name;
    };

    const cleanAssignmentName = (name: string) => {
        let cleanName = name.trim();
        const suffixes = ["assignment", "assessment", "discussion", "external-tool-link"];
        for (const suffix of suffixes) {
            if (cleanName.toLowerCase().endsWith(suffix)) {
                cleanName = cleanName.substring(0, cleanName.length - suffix.length).trim();
            }
        }
        return cleanName;
    };

    const parseSchoologyDate = (dateStr: string) => {
        if (!dateStr) return null;
        // Schoology format often looks like: "Friday, March 13, 2026" or "11:59 pm" or "March 13"
        // If it's just a time, we assume today. If it's missing a year, we assume current year.
        try {
            let parsedDate = new Date(dateStr);
            if (isNaN(parsedDate.getTime())) {
                // Try appending current year if missing
                parsedDate = new Date(`${dateStr} ${new Date().getFullYear()}`);
            }
            if (isNaN(parsedDate.getTime())) return null;
            return parsedDate;
        } catch {
            return null;
        }
    };

    return (
        <>
            {isSubscribed === false && <PaywallModal userId={userId} />}
            <div className={`min-h-screen bg-[var(--color-bg-dark)] text-white font-sans ${isSubscribed === false ? 'blur-sm pointer-events-none h-screen overflow-hidden' : ''}`}>
                <TutorialOverlay />
                {/* Header */}
                <Header students={students} selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[var(--color-card-dark)] rounded-2xl p-5 border border-[var(--color-card-border)] shadow-md flex relative overflow-hidden transition-all hover:border-indigo-500/50 hover:shadow-lg hover:-translate-y-1 group">
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400/70 mr-4 transition-colors group-hover:bg-indigo-500/20 group-hover:text-indigo-400">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                            <div className="text-xs font-semibold text-[var(--color-text-muted)] tracking-wider">CURRENT GPA</div>
                            <div className="text-3xl font-bold mt-1 tracking-tight">{data.gpa ? data.gpa.toFixed(2) : '--'}</div>
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
                </div>

                {/* Daily Academic Outlook */}
                {dailySummary && (
                    <div id="tour-outlook" className="bg-[var(--color-card-dark)] rounded-2xl p-6 md:p-8 border border-indigo-500/30 shadow-lg relative overflow-hidden group hover:border-indigo-400/50 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-opacity duration-500 group-hover:bg-indigo-500/10"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none transition-opacity duration-500 group-hover:bg-teal-500/10"></div>

                        <div className="relative flex flex-col md:flex-row gap-8 items-start">
                            {/* Left Content */}
                            <div className="flex-1 w-full">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold text-gray-100 flex items-center mb-2 md:mb-0">
                                        <span className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg mr-3 shadow-inner">
                                            <Activity className="h-5 w-5" />
                                        </span>
                                        Daily Academic Outlook
                                    </h2>
                                    <div className="flex items-center space-x-3 text-xs font-medium">
                                        <span className="text-gray-500 hidden md:inline-block">
                                            Updated {dailySummary.last_updated ? new Date(dailySummary.last_updated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                                        </span>
                                        <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
                                            {dailySummary.status_badge || 'Up to date'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="text-gray-300 leading-relaxed text-[15px] max-w-4xl tracking-wide font-medium mb-6">
                                    <p>{dailySummary.recent_activity}</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-gray-400 border-b border-[var(--color-card-border)] pb-5 mb-5">
                                    <div className="flex items-center space-x-2">
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                        <span>{dailySummary.weekly_snapshot?.overdue || 0} overdue</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        <span>{dailySummary.weekly_snapshot?.upcoming || 0} upcoming</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        <span>{dailySummary.weekly_snapshot?.active_courses || 0} courses active</span>
                                    </div>
                                </div>

                                {/* Activity Feed */}
                                <div className="space-y-3">
                                    <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-3">Recent Activity</h3>
                                    {dailySummary.recent_activity_feed && dailySummary.recent_activity_feed.map((item, idx) => (
                                        <div key={idx} className="flex items-center space-x-3 bg-[#1e2230]/50 p-3 rounded-xl border border-white/5">
                                            <div className={`p-1.5 rounded-full ${
                                                item.type === 'submitted' || item.type === 'graded' ? 'bg-emerald-500/10 text-emerald-400' :
                                                item.type === 'overdue' ? 'bg-rose-500/10 text-rose-400' :
                                                item.type === 'empty' ? 'bg-gray-500/10 text-gray-400' :
                                                'bg-amber-500/10 text-amber-400'
                                            }`}>
                                                {item.type === 'submitted' || item.type === 'graded' ? <CheckCircle2 className="h-4 w-4" /> :
                                                 item.type === 'overdue' ? <AlertCircle className="h-4 w-4" /> :
                                                 item.type === 'empty' ? <CircleDot className="h-4 w-4" /> :
                                                 <Clock className="h-4 w-4" />}
                                            </div>
                                            <span className={`text-sm font-medium ${item.type === 'empty' ? 'text-gray-500 italic' : 'text-gray-200'}`}>{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Summary / Load Indicator */}
                            <div className="w-full md:w-64 flex flex-col items-center justify-center p-6 bg-[#1a1e2b] rounded-2xl border border-[var(--color-card-border)] shadow-inner shrink-0">
                                <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-6">Weekly Load</h3>
                                <div className="relative h-32 w-32 mb-6 group-hover:scale-105 transition-transform duration-500">
                                    <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                                        <path className="stroke-[#252b3d]" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        {dailySummary.weekly_snapshot && (
                                        <path 
                                            className="stroke-indigo-500 transition-all duration-1000 ease-out" 
                                            strokeWidth="3" 
                                            strokeDasharray={`${Math.min((((dailySummary.weekly_snapshot.upcoming) / Math.max(1, dailySummary.weekly_snapshot.upcoming + dailySummary.weekly_snapshot.overdue + 5)) * 100) || 0, 100)}, 100`} 
                                            strokeLinecap="round" 
                                            fill="none" 
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                        />
                                        )}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white leading-none tracking-tighter">
                                            {dailySummary.weekly_snapshot ? (dailySummary.weekly_snapshot.upcoming + dailySummary.weekly_snapshot.overdue) : 0}
                                        </span>
                                        <span className="text-[10px] text-gray-500 uppercase font-bold mt-1">Tasks</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Courses Area */}
                    {/* Academic Overview Header (Summarized Collapsed State) */}
                    <div className="lg:col-span-2 space-y-6">
                        <button 
                            onClick={() => setIsCoursesOpen(!isCoursesOpen)}
                            className="w-full flex items-center justify-between bg-[var(--color-card-dark)] p-4 rounded-xl border border-[var(--color-card-border)] shadow-md hover:border-indigo-500/30 transition-all group"
                        >
                            <div className="flex items-center space-x-3 w-full">
                                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <div className="flex-1 text-left flex flex-col md:flex-row md:items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-100/90 tracking-tight">Academic Overview</h2>
                                    {!isCoursesOpen && (
                                        <div className="mt-1 md:mt-0 text-sm font-medium text-gray-400 flex items-center">
                                            {courses.length} active courses
                                            <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="ml-4 bg-[#202538] p-1.5 rounded-lg text-gray-400 group-hover:text-indigo-400 transition-colors shrink-0">
                                {isCoursesOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </div>
                        </button>

                        {isCoursesOpen && (
                        <div id="tour-courses" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
                            {courses.map((course: Course) => {
                                const courseName = formatCourseName(course.name);
                                return (
                                <div onClick={() => router.push(`/course/${course.id}`)} key={course.id} className="bg-[var(--color-card-dark)] rounded-2xl p-6 border border-[var(--color-card-border)] shadow-lg hover:border-indigo-500/40 hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="flex-1 pr-4">
                                            <div className="text-[11px] font-semibold text-gray-500 tracking-wider mb-1 uppercase bg-transparent">{course.course_code || 'COURSE'}</div>
                                            <h3 className="font-semibold text-[17px] leading-tight w-full text-white tracking-tight mt-0.5">{courseName}</h3>
                                        </div>
                                        
                                        {/* Circular Progress Ring */}
                                        <div className="relative h-14 w-14 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                                                {/* Background Circle */}
                                                <path
                                                    className="stroke-[#202538]"
                                                    strokeWidth="2.5"
                                                    fill="none"
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                />
                                                {/* Progress Circle */}
                                                {(course.current_grade != null) && (
                                                    <path
                                                        className="transition-all duration-1000 ease-out"
                                                        style={{ stroke: getGradeColor(course.letter_grade) } as React.CSSProperties}
                                                        strokeWidth="2.5"
                                                        strokeDasharray={`${Math.min(course.current_grade, 100)}, 100`}
                                                        strokeLinecap="round"
                                                        fill="none"
                                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    />
                                                )}
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-[15px] font-bold leading-none" style={{ color: getGradeColor(course.letter_grade) } as React.CSSProperties}>
                                                    {course.letter_grade || '--'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {course.categories && course.categories.length > 0 && (
                                        <div className="space-y-4 flex-grow mb-6">
                                            {course.categories?.slice(0, 4).map((cat, i) => (
                                                <div key={i} className="flex items-center justify-between text-[13px]">
                                                    <span className="text-gray-400/90 w-[120px] truncate font-medium pr-3 tracking-wide">{cat.name}</span>
                                                    <div className="flex-1 mx-2 h-[5px] bg-[#222736] rounded-full overflow-hidden">
                                                        {cat.percentage !== null && (
                                                            <div
                                                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                                                style={{ 
                                                                    width: `${Math.min(cat.percentage, 100)}%`, 
                                                                    backgroundColor: getGradeColor(course.letter_grade),
                                                                    boxShadow: `0 0 10px ${getGradeColor(course.letter_grade)}40`
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                    <span className="font-semibold text-right w-12 text-gray-400 pl-3">{cat.percentage ? `${Math.round(cat.percentage)}%` : '--'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mt-6">
                                        <span className="text-[11px] font-medium text-gray-500 tracking-wide">
                                            {course.semester || 'Spring 2026'}
                                        </span>
                                        <div className="h-6 w-6 rounded-full bg-[#202538] flex items-center justify-center group-hover:bg-[#2a3045] group-hover:text-white transition group-hover:translate-x-0.5 duration-300">
                                            <svg className="h-3 w-3 text-gray-500 group-hover:text-gray-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                        )}
                    </div>

                    {/* Sidebar Area */}
                    <div id="tour-deadlines" className={`lg:h-auto lg:relative ${isDeadlinesExpanded ? 'h-[500px]' : ''}`}>
                        <div className={`flex flex-col space-y-4 ${isDeadlinesExpanded ? 'h-full lg:absolute lg:inset-0' : ''}`}>
                            <button 
                                onClick={() => setIsDeadlinesExpanded(!isDeadlinesExpanded)}
                                className="w-full flex items-center justify-between bg-[var(--color-card-dark)] p-4 rounded-xl border border-[var(--color-card-border)] shadow-md hover:border-indigo-500/30 transition-all group shrink-0"
                            >
                                <div className="flex items-center space-x-3 w-full">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 text-left flex flex-col md:flex-row md:items-center justify-between">
                                        <h2 className="text-xl font-bold text-gray-100/90 tracking-tight">Upcoming Deadlines</h2>
                                        {!isDeadlinesExpanded && (
                                            <div className="mt-1 md:mt-0 text-sm font-medium text-gray-400 flex items-center">
                                                {upcomingAssignments?.length || 0} upcoming
                                                <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="ml-4 bg-[#202538] p-1.5 rounded-lg text-gray-400 group-hover:text-indigo-400 transition-colors shrink-0">
                                    {isDeadlinesExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                </div>
                            </button>

                            {isDeadlinesExpanded && (
                            <div className="bg-[var(--color-card-dark)] border border-[var(--color-card-border)] rounded-2xl shadow-lg flex-1 overflow-hidden flex flex-col min-h-[400px]">
                            {(!upcomingAssignments || upcomingAssignments.length === 0) ? (
                                <div className="p-8 text-center text-[var(--color-text-muted)] flex flex-col items-center justify-center flex-1">
                                    <CheckCircle2 className="h-8 w-8 mb-3 text-emerald-500/50" />
                                    <p className="text-sm">No upcoming assignments right now!</p>
                                    <p className="text-xs mt-1 opacity-70">Awesome job staying on top of work.</p>
                                </div>
                            ) : (
                                <div className="overflow-y-auto flex-1">
                                    <ul className="divide-y divide-[var(--color-card-border)]/50">
                                        {[...upcomingAssignments].sort((a, b) => {
                                            const timeA = a.due_date ? new Date(a.due_date).getTime() : 0;
                                            const timeB = b.due_date ? new Date(b.due_date).getTime() : 0;
                                            return timeA - timeB;
                                        }).map((assignment: Assignment) => (
                                            <li key={assignment.id} className="p-5 hover:bg-[#1e2230]/80 transition-all cursor-pointer group">
                                                <div className="flex gap-4 items-start group-hover:translate-x-1 transition-transform">
                                                    <div className="flex-shrink-0 w-14 h-16 bg-[#252b3d] rounded-xl border border-indigo-500/20 shadow-inner flex flex-col items-center justify-center shrink-0">
                                                        <span className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider mb-1">
                                                            {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short' }) : 'ASAP'}
                                                        </span>
                                                        <span className="text-xl font-black text-white leading-none">
                                                            {assignment.due_date ? new Date(assignment.due_date).getDate() : '!'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-1">
                                                        <h4 className="text-[15px] font-bold truncate mb-1 text-gray-100">{cleanAssignmentName(assignment.name)}</h4>
                                                        <div className="text-xs text-[var(--color-text-muted)] font-medium truncate mb-2.5">
                                                            {assignment.course_name.split(' ').slice(1).join(' ')}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {assignment.timeliness_status === 'overdue' && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-sm">
                                                                    Overdue
                                                                </span>
                                                            )}
                                                            {assignment.timeliness_status === 'upcoming' && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
                                                                    Upcoming
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                                {/* Pinned Bottom Button */}
                                <div className="p-4 text-center bg-[#151924]/80 hover:bg-[#1a1f2e] transition-colors border-t border-[var(--color-card-border)]/50 mt-auto shrink-0">
                                    <button id="tour-calendar" onClick={() => router.push('/calendar')} className="text-xs font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition w-full">View full calendar →</button>
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
                </main>
            </div>
        </>
    );
}
