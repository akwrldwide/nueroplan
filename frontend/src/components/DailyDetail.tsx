import { format } from 'date-fns';
import { CheckCircle2, Clock, CalendarDays } from 'lucide-react';

interface DailyDetailProps {
    date: Date;
    sessions: any[];
    onCompleteSession: (sessionId: string) => void;
    activeTab?: 'FUTURE' | 'HISTORY';
    isSemesterBreak?: boolean;
}

export default function DailyDetail({ date, sessions, onCompleteSession, activeTab, isSemesterBreak }: DailyDetailProps) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySessions = sessions?.filter(s => {
        if (s.session_date) {
            // Support multiple possible date formats returned from backend
            const sDate = s.session_date.includes('T') ? s.session_date.split('T')[0] : new Date(s.session_date).toISOString().split('T')[0];
            return sDate === dateStr;
        }
        return s.day_of_week === format(date, 'EEE');
    }) || [];
    
    const formattedDate = format(date, 'EEEE, MMMM do');
    const totalHours = daySessions.reduce((acc: number, s: any) => acc + (s.duration_minutes || (s.allocated_hours * 60)) / 60, 0);
    
    // Sort sessions to determine if it's the last one
    const sortedSessions = [...daySessions].sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    const breakMins = sortedSessions.reduce((acc: number, s: any, index: number) => {
        // Only count breaks if it's not the last session of the block
        // Wait, to be safe, just calculate the actual gap to the next session if there is one
        if (index < sortedSessions.length - 1) {
            const currentEnd = s.end_time.split(':').map(Number);
            const nextStart = sortedSessions[index + 1].start_time.split(':').map(Number);
            const gap = (nextStart[0] * 60 + nextStart[1]) - (currentEnd[0] * 60 + currentEnd[1]);
            // If gap is between 1 and 20 mins, it's a cognitive break
            if (gap > 0 && gap <= 20) {
                return acc + gap;
            }
        }
        return acc;
    }, 0);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-indigo-500" />
                        {formattedDate}
                    </h3>
                    {daySessions.length > 0 ? (
                        <p className="text-sm text-gray-500 mt-1">
                            Total Study: {totalHours.toFixed(1)} hrs • Break Time: {breakMins} mins
                        </p>
                    ) : (
                        <p className="text-sm text-gray-500 mt-1">
                            {activeTab === 'HISTORY' ? "No study sessions recorded for this day." : "Free Day - Enjoy your time off!"}
                        </p>
                    )}
                </div>
            </div>

            <div className="p-0">
                {daySessions.length === 0 ? (
                    isSemesterBreak ? (
                        <div className="text-center py-12 px-6">
                            <h3 className="text-2xl font-medium text-gray-900 flex items-center justify-center gap-2 mb-2">
                                🎉 Semester break!
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">You've reached the end of the semester! Take this time to rest, recharge, and celebrate your hard work.</p>
                        </div>
                    ) : (
                        <div className="text-center py-12 px-6">
                            <CalendarDays className="mx-auto h-12 w-12 text-gray-200 mb-4" />
                            <h3 className="text-base font-medium text-gray-900">No sessions scheduled</h3>
                            <p className="mt-1 text-sm text-gray-500">You don't have any classes or study periods planned for {formattedDate}.</p>
                        </div>
                    )
                ) : (
                    <div className="divide-y divide-gray-50">
                        {sortedSessions.map((session: any, index: number) => {
                            const displayLength = session.duration_minutes
                                ? `${session.duration_minutes} mins`
                                : `${session.allocated_hours.toFixed(1)} hrs`;

                            // Calculate actual break duration for UI
                            let actualBreakMins = 0;
                            if (index < sortedSessions.length - 1) {
                                const currentEnd = session.end_time.split(':').map(Number);
                                const nextStart = sortedSessions[index + 1].start_time.split(':').map(Number);
                                const gap = (nextStart[0] * 60 + nextStart[1]) - (currentEnd[0] * 60 + currentEnd[1]);
                                if (gap > 0 && gap <= 20) {
                                    actualBreakMins = gap;
                                }
                            }

                            return (
                                <div key={session.id} className="group">
                                    <div className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50/50 transition-colors border-l-4 ${session.session_type === 'REVISION' ? 'border-orange-400 bg-orange-50/30 hover:bg-orange-50/50' : 'border-transparent hover:border-indigo-100'}`}>
                                        <div className="flex flex-col mb-3 sm:mb-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 text-sm">
                                                    {session.start_time} - {session.end_time}
                                                </span>
                                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                                    {displayLength}
                                                </span>
                                                {session.session_type === 'REVISION' && (
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded border border-orange-200 bg-orange-50 text-orange-700 whitespace-nowrap">
                                                        Exam Revision
                                                    </span>
                                                )}
                                                {session.topic?.course?.exam_date && (() => {
                                                    const daysLeft = Math.ceil((new Date(session.topic.course.exam_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                                    let badgeClass = "border-green-200 bg-green-50 text-green-700";
                                                    if (daysLeft < 14) badgeClass = "border-red-200 bg-red-50 text-red-700";
                                                    else if (daysLeft <= 30) badgeClass = "border-yellow-200 bg-yellow-50 text-yellow-700";
                                                    return (
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap hidden sm:inline-block ${badgeClass}`}>
                                                            Exam: {daysLeft} days left
                                                        </span>
                                                    )
                                                })()}
                                            </div>
                                            <span className="font-semibold text-gray-900 mt-1 mb-2">
                                                {session.topic?.course?.code} - {session.topic?.course?.title}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => onCompleteSession(session.id)}
                                            className={`flex items-center shrink-0 w-full sm:w-auto justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${session.completed
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm'
                                                }`}
                                        >
                                            <CheckCircle2 className={`w-4 h-4 mr-2 ${session.completed ? 'text-emerald-500' : 'text-gray-400'}`} />
                                            {session.completed ? 'Completed' : 'Mark Done'}
                                        </button>
                                    </div>

                                    {/* Micro-Break Separator */}
                                    {actualBreakMins > 0 && (
                                        <div className="flex items-center py-2 px-10 bg-blue-50/50 border-t border-b border-blue-50/50 text-blue-600/80 text-xs font-medium italic">
                                            <Clock className="w-3.5 h-3.5 mr-2" />
                                            {actualBreakMins} min cognitive break
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
