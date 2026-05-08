import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Calendar as CalendarIcon, Clock, BookOpen, CheckCircle, Target } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface AcademicSessionTimeline {
    session_name: string;
    start_date: string;
    end_date: string;
    total_hours: number;
    courses_studied: number;
    completed_sessions_count: number;
    total_sessions_count: number;
}

export default function GlobalHistory() {
    const navigate = useNavigate();
    const [timeline, setTimeline] = useState<AcademicSessionTimeline[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get('/api/progress/history/global');
                setTimeline(res.data.timeline || []);
            } catch (err) {
                console.error("Error fetching global history:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50/50 text-indigo-600 font-medium">Loading history...</div>;
    }

    const getAdherenceFeedback = (percentage: number) => {
        if (percentage >= 80) return "Exceptional focus! You're showing elite consistency. Keep pushing to master those high-risk modules.";
        if (percentage >= 50) return "Steady progress. Aim for 80% to significantly reduce your academic risk factor.";
        return "Consistency is key to reducing stress. Try re-adjusting your availability to find a more manageable pace.";
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto w-full">
                
                {/* Header (Hidden when printing) */}
                <div className="print:hidden flex items-center justify-between mb-8">
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center text-gray-500 hover:text-indigo-600 font-semibold transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 shadow-sm transition-colors hover:border-gray-300"
                    >
                        <Printer className="w-4 h-4 mr-2" /> Export to PDF
                    </button>
                </div>

                <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden print:shadow-none print:border-none print:bg-transparent">
                    
                    {/* Header Splash */}
                    <div className="relative bg-indigo-900 p-10 sm:p-14 text-white overflow-hidden print:bg-white print:text-black print:p-0">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-x-1/3 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-40 -translate-x-1/4 translate-y-1/4"></div>
                        
                        <div className="relative z-10 flex items-start gap-6">
                            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 hidden sm:block">
                                <Target className="w-10 h-10 text-indigo-200" />
                            </div>
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 tracking-tight">Learning History</h1>
                                <p className="text-indigo-200 print:text-gray-600 max-w-2xl text-lg opacity-90 leading-relaxed font-medium">A complete timeline of all your documented academic sessions, semesters, and study analytics.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 sm:p-14 print:p-0">
                        {timeline.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                <Clock className="w-16 h-16 mx-auto mb-5 opacity-30 text-indigo-300" />
                                <h3 className="text-xl font-bold text-gray-600 mb-2">No History Yet</h3>
                                <p className="text-md">Your historical study sessions will appear here over time.</p>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-indigo-100/50 ml-4 sm:ml-8 space-y-16 py-4">
                                {timeline.map((session, idx) => {
                                    const adherePct = session.total_sessions_count > 0 
                                        ? Math.round((session.completed_sessions_count / session.total_sessions_count) * 100) 
                                        : 0;

                                    return (
                                    <div key={idx} className="relative pl-8 sm:pl-12 group">
                                        {/* Timeline Node */}
                                        <div className="absolute -left-[11px] top-2 w-5 h-5 bg-indigo-600 rounded-full border-4 border-white shadow-[0_0_0_4px_rgba(79,70,229,0.1)] group-hover:scale-125 transition-transform duration-300"></div>
                                        
                                        <div className="flex items-center flex-wrap gap-3 mb-6">
                                            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{session.session_name}</h2>
                                            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-100">
                                                {new Date(session.start_date).toLocaleDateString()} — {new Date(session.end_date).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {/* Mini Stats Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                            <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl flex items-center gap-4 hover:border-indigo-200 transition-colors">
                                                <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Clock className="w-5 h-5"/></div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Total Hours</p>
                                                    <p className="text-xl font-bold text-gray-900">{session.total_hours.toFixed(1)}<span className="text-sm font-medium text-gray-500 ml-1">hrs</span></p>
                                                </div>
                                            </div>
                                            <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl flex items-center gap-4 hover:border-indigo-200 transition-colors">
                                                <div className="bg-purple-50 p-3 rounded-xl text-purple-600"><BookOpen className="w-5 h-5"/></div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Courses</p>
                                                    <p className="text-xl font-bold text-gray-900">{session.courses_studied}</p>
                                                </div>
                                            </div>
                                            <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl flex items-center gap-4 hover:border-indigo-200 transition-colors">
                                                <div className="bg-green-50 p-3 rounded-xl text-green-600"><CheckCircle className="w-5 h-5"/></div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Completed</p>
                                                    <p className="text-xl font-bold text-gray-900">{session.completed_sessions_count}</p>
                                                </div>
                                            </div>
                                            <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl flex items-center gap-4 hover:border-indigo-200 transition-colors">
                                                <div className="bg-orange-50 p-3 rounded-xl text-orange-600"><CalendarIcon className="w-5 h-5"/></div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Sessions</p>
                                                    <p className="text-xl font-bold text-gray-900">{session.total_sessions_count}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Detailed Adherence Section */}
                                        <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100/50 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm print:border-gray-800">
                                            <div className="w-full md:w-1/3 flex flex-col items-center">
                                                <div className="relative h-48 w-48">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={[
                                                                    { name: 'Completed', value: session.completed_sessions_count },
                                                                    { name: 'Missed/Pending', value: Math.max(0, session.total_sessions_count - session.completed_sessions_count) }
                                                                ]}
                                                                cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none"
                                                            >
                                                                <Cell key="cell-0" fill="#4f46e5" />
                                                                <Cell key="cell-1" fill="#e0e7ff" />
                                                            </Pie>
                                                            <Tooltip wrapperClassName="rounded-xl shadow-xl border-none font-semibold text-sm" />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                    {/* Center text in donut */}
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                        <span className="text-3xl font-black text-indigo-700">{adherePct}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 text-center md:text-left bg-white/60 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-white shadow-sm">
                                                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center justify-center md:justify-start gap-2">
                                                    Session Adherence
                                                </h3>
                                                <p className="text-gray-600 font-medium text-base leading-relaxed">
                                                    {getAdherenceFeedback(adherePct)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

