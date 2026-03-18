"use client";

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Header from '@/components/Header';

interface Assignment {
    id: number;
    name: string;
    course_name: string;
    due_date: string;
    score: number | null;
    max_score: number | null;
    is_late: boolean;
}

interface Student {
    id: number;
    name: string;
    school: string;
}

export default function CalendarPage() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    const [currentDate, setCurrentDate] = useState(new Date());

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
        const loadStudents = async () => {
            try {
                const res = await fetchWithAuth(`/dashboard/students?user_id=${userId}`);
                if (res.students && res.students.length > 0) {
                    setStudents(res.students);
                    setSelectedStudentId(res.students[0].id);
                } else {
                    setLoading(false);
                    router.push('/connect');
                }
            } catch (err) {
                console.error(err);
                setLoading(false);
                router.push('/login');
            }
        };
        loadStudents();
    }, [router, userId]);

    useEffect(() => {
        if (!selectedStudentId || !userId) return;

        const loadAssignments = async () => {
            setLoading(true);
            try {
                const res = await fetchWithAuth(`/dashboard/student/${selectedStudentId}/assignments?user_id=${userId}`);
                setAssignments(res.assignments || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadAssignments();
    }, [selectedStudentId, userId]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
        for (let i = 0; i < remainingDays; i++) {
            days.push(null);
        }
    }

    const getAssignmentsForDay = (day: number | null) => {
        if (!day) return [];
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return assignments.filter(a => a.due_date && a.due_date.startsWith(dateString));
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <div className="min-h-screen bg-[var(--color-bg-dark)] flex flex-col">
            <Header students={students} selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <CalendarIcon className="h-8 w-8 text-indigo-400" />
                            Academic Calendar
                        </h1>
                        <p className="text-[var(--color-text-muted)] mt-1">Manage assignments and upcoming tests</p>
                    </div>

                    <div className="flex items-center gap-4 bg-[var(--color-card-dark)] p-2 rounded-xl border border-[var(--color-card-border)]">
                        <button onClick={prevMonth} className="p-2 hover:bg-[#2a2e3f] rounded-lg transition text-[var(--color-text-muted)] hover:text-white">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="font-semibold text-lg w-40 text-center">
                            {monthNames[month]} {year}
                        </span>
                        <button onClick={nextMonth} className="p-2 hover:bg-[#2a2e3f] rounded-lg transition text-[var(--color-text-muted)] hover:text-white">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 bg-[var(--color-card-dark)] rounded-2xl border border-[var(--color-card-border)] shadow-xl overflow-hidden flex flex-col">
                    {/* Header Row */}
                    <div className="grid grid-cols-7 border-b border-[var(--color-card-border)] bg-[#1e2436]">
                        {dayNames.map(day => (
                            <div key={day} className="py-3 text-center text-xs font-semibold text-[var(--color-text-muted)] tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 auto-rows-fr flex-1 min-h-0">
                        {days.map((day, idx) => {
                            const dayAssignments = getAssignmentsForDay(day);
                            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                            // Determine if this cell is in the last row to avoid double bottom borders
                            const isLastRow = idx >= days.length - 7;
                            const borderClasses = `border-r border-b border-[var(--color-card-border)] ${isLastRow ? 'border-b-0' : ''} ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}`;

                            return (
                                <div key={idx} className={`${borderClasses} p-2 relative transition-colors hover:bg-[#1e2436]/30 ${!day ? 'bg-[#0d1117]/30' : ''} flex flex-col overflow-hidden`}>
                                    {day && (
                                        <>
                                            <div className="flex justify-between items-start mb-2 shrink-0">
                                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${isToday ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-300'}`}>
                                                    {day}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 flex-1 overflow-y-auto min-h-0 pr-1 pb-1 scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent">
                                                {dayAssignments.map(a => (
                                                    <div key={a.id} className="text-[11px] leading-tight px-2 py-1.5 rounded-md bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 cursor-pointer hover:bg-indigo-500/30 hover:border-indigo-400/50 transition-all shadow-sm group relative">
                                                        <span className="font-bold text-indigo-100">{a.course_name.split(':')[0].split('-')[0].trim()}</span> <span className="opacity-90">{a.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
