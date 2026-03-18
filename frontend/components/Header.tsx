import { BookOpen, Calendar as CalendarIcon, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Student {
    id: number;
    name: string;
    school: string;
}

export default function Header({ students, selectedStudentId, setSelectedStudentId }: { students: Student[], selectedStudentId: number | null, setSelectedStudentId: (id: number) => void }) {
    const router = useRouter();
    return (
        <header className="border-b border-[var(--color-card-border)] bg-[#0d1117]/80 backdrop-blur-md sticky top-0 z-10 transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div
                    id="tour-home-logo"
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 text-indigo-400 font-bold text-xl cursor-pointer hover:opacity-80 transition"
                >
                    <CheckCircle2 className="h-6 w-6" />
                    Gravio
                </div>

                <div className="flex items-center gap-4">
                    <div id="tour-student-switcher" className="bg-[#1e2436] rounded-full p-1 flex items-center border border-[#2a3045]/50 shadow-inner">
                        {students.map((s: any) => (
                            <div
                                key={s.id}
                                onClick={() => setSelectedStudentId(s.id)}
                                className={`cursor-pointer px-3 py-1 rounded-full text-xs transition-all font-medium flex items-center justify-center flex-1 min-w-[70px] whitespace-nowrap ${selectedStudentId === s.id ? 'bg-indigo-500 text-white shadow-md transform scale-105' : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[#2a3045]/50'}`}
                            >
                                <span className="mr-1 opacity-70">{s.name.charAt(0)}</span> {s.name}
                            </div>
                        ))}
                    </div>
                    {students.find(s => s.id === selectedStudentId)?.school && (
                        <div className="hidden md:flex bg-indigo-500/10 text-indigo-300 text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full border border-indigo-500/20 transition-all">
                            {students.find(s => s.id === selectedStudentId)?.school}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-400 text-xs font-medium shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                        Academic Health: Strong
                    </div>
                    <div className="text-right ml-2 border-l border-[#2a3045] pl-4">
                        <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Parent Account</div>
                        <div className="text-sm font-semibold">Sarah Johnson</div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-white shadow-md cursor-pointer hover:shadow-lg hover:scale-105 transition-all">
                        SJ
                    </div>
                </div>
            </div>
        </header>
    );
}
