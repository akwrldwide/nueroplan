import { useState } from 'react';
import { 
    format, addMonths, subMonths, startOfMonth, endOfMonth, 
    startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';

interface CalendarViewProps {
    sessions: any[];
    courses: any[];
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

export default function CalendarView({ sessions = [], courses = [], selectedDate, onSelectDate }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "MMMM yyyy";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">{format(currentMonth, dateFormat)}</h3>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-sm cursor-pointer">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextMonth} className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors shadow-sm cursor-pointer">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="p-6">
                <div className="grid grid-cols-7 mb-2">
                    {weekDays.map(dayName => (
                        <div key={dayName} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-2">
                            {dayName}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {days.map((day, idx) => {
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const daySessions = sessions.filter(s => {
                            if (s.session_date) {
                                const sDate = s.session_date.includes('T') ? s.session_date.split('T')[0] : new Date(s.session_date).toISOString().split('T')[0];
                                return sDate === dateStr;
                            }
                            return s.day_of_week === format(day, 'EEE');
                        });
                        const hasSessions = daySessions.length > 0;
                        const isExamDay = courses.some(c => c.exam_date && isSameDay(new Date(c.exam_date), day));

                        let baseClasses = "relative flex flex-col items-center justify-center p-2 h-14 w-full rounded-xl transition-all duration-200 cursor-pointer ";
                        if (!isCurrentMonth) {
                            baseClasses += "text-gray-300 hover:bg-gray-50 ";
                        } else if (isSelected) {
                            baseClasses += "bg-indigo-600 text-white shadow-md font-bold ";
                        } else if (isToday) {
                            baseClasses += "bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 font-bold ";
                        } else {
                            baseClasses += "text-gray-700 hover:bg-gray-100 font-medium ";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => onSelectDate(day)}
                                className={baseClasses}
                            >
                                <span className={isSelected ? "text-white" : ""}>{format(day, 'd')}</span>
                                
                                <div className="absolute bottom-1.5 flex gap-1 items-center">
                                    {isExamDay && (
                                        <Flag className={`w-3 h-3 ${isSelected ? 'text-indigo-200' : 'text-red-500'} fill-current`} />
                                    )}
                                    {hasSessions && !isExamDay && (
                                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-400'}`} />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-50 text-xs font-medium text-gray-500">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-400" /> Study Session
                    </div>
                    <div className="flex items-center gap-2">
                        <Flag className="w-3 h-3 text-red-500 fill-current" /> Exam Date
                    </div>
                </div>
            </div>
        </div>
    );
}
