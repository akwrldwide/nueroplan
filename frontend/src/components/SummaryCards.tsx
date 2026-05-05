import { Book, AlertTriangle, CalendarDays, Flame } from 'lucide-react';

interface SummaryCardsProps {
  stats: any;
}

export default function SummaryCards({ stats }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Courses */}
      <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 transition-transform hover:-translate-y-1 duration-300">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
          <Book className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>
        <div>
          <p className="text-xs lg:text-sm font-medium text-gray-500 whitespace-nowrap">Total Courses</p>
          <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats?.totalCourses || 0}</p>
        </div>
      </div>

      {/* High Risk */}
      <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 transition-transform hover:-translate-y-1 duration-300">
        <div className="p-3 bg-red-50 text-red-600 rounded-xl shrink-0">
          <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>
        <div>
          <p className="text-xs lg:text-sm font-medium text-gray-500 whitespace-nowrap">High Risk Courses</p>
          <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats?.highRiskCourses || 0}</p>
        </div>
      </div>

      {/* Next Exam */}
      <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 transition-transform hover:-translate-y-1 duration-300">
        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl shrink-0">
          <CalendarDays className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>
        <div>
          <p className="text-xs lg:text-sm font-medium text-gray-500 whitespace-nowrap">Next Exam In</p>
          <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats?.nextExam ? `${stats.nextExam.days} days` : 'N/A'}</p>
        </div>
      </div>

      {/* Study Streak */}
      <div className="bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 transition-transform hover:-translate-y-1 duration-300">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-xl shrink-0">
          <Flame className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>
        <div>
          <p className="text-xs lg:text-sm font-medium text-gray-500 whitespace-nowrap">Study Streak</p>
          <p className="text-xl lg:text-2xl font-bold text-gray-900">{stats?.streak_count || 0} {stats?.streak_count === 1 ? 'day' : 'days'}</p>
        </div>
      </div>
    </div>
  );
}
