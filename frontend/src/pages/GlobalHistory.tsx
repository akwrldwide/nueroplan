import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Calendar as CalendarIcon, Clock } from 'lucide-react';
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
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-indigo-600">Loading history...</div>;
    }

    const getAdherenceFeedback = (percentage: number) => {
        if (percentage >= 80) return "Good Job! You're showing elite consistency. Keep pushing to master those high-risk modules.";
        if (percentage >= 50) return "Steady progress. Aim for 80% to significantly reduce your academic risk factor.";
        return "Consistency is key to reducing stress. Try re-adjusting your availability to find a more manageable pace.";
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto w-full">
                
                {/* Header (Hidden when printing) */}
                <div className="print:hidden flex items-center justify-between mb-8">
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center text-gray-600 hover:text-indigo-600 font-medium transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors"
                    >
                        <Printer className="w-4 h-4 mr-2" /> Export to PDF
                    </button>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden transform transition-all duration-300 print:shadow-none print:border-none print:bg-transparent">
                    
                    {/* Header Splash */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 sm:p-12 text-white print:bg-white print:text-black">
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Learning & Performance History</h1>
                        <p className="text-indigo-100 print:text-gray-600 max-w-2xl text-lg opacity-90">A complete timeline of all your documented academic sessions, semesters, and study analytics.</p>
                    </div>

                    <div className="p-8 sm:p-12 print:p-0">
                        {timeline.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="text-lg">No historical study sessions found.</p>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {timeline.map((session, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg print:border print:border-gray-300">
                                                <CalendarIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900">{session.session_name}</h2>
                                                <p className="text-gray-500 text-sm font-medium">
                                                    {new Date(session.start_date).toLocaleDateString()} — {new Date(session.end_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-6 print:border-gray-800 flex flex-col md:flex-row items-center justify-between shadow-sm">
                                            <div className="flex-1 w-full flex flex-col justify-center mb-6 md:mb-0 md:pr-8">
                                                <div className="flex items-center text-gray-800 text-xl font-bold mb-4">
                                                    Session Adherence
                                                </div>
                                                <div className="h-64 w-full max-w-sm mx-auto md:mx-0">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={[
                                                                    { name: 'Completed', value: session.completed_sessions_count },
                                                                    { name: 'Missed/Pending', value: Math.max(0, session.total_sessions_count - session.completed_sessions_count) }
                                                                ]}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={60}
                                                                outerRadius={80}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                            >
                                                                <Cell key="cell-0" fill="#4f46e5" />
                                                                <Cell key="cell-1" fill="#e0e7ff" />
                                                            </Pie>
                                                            <Tooltip wrapperClassName="rounded-xl shadow-lg border-none" />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                            <div className="flex-1 text-center md:text-left bg-white p-6 rounded-xl shadow-sm border border-indigo-50">
                                                <div className="text-4xl font-extrabold text-indigo-700 mb-2">
                                                    {Math.round((session.completed_sessions_count / (session.total_sessions_count || 1)) * 100)}%
                                                </div>
                                                <p className="text-gray-600 font-medium text-lg leading-relaxed">
                                                    {getAdherenceFeedback((session.completed_sessions_count / (session.total_sessions_count || 1)) * 100)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Connecting Line if not the last item */}
                                        {idx !== timeline.length - 1 && (
                                            <div className="absolute left-[1.15rem] top-[4.5rem] bottom-[-3rem] w-0.5 bg-gray-200 print:hidden"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Added for BookOpen since I forgot to import it but it is used above. Let's just import it at top implicitly via hack or update import. I will just import via lucide React properly. Wait, it's not imported. I will just add it. */}
        </div>
    );
}
