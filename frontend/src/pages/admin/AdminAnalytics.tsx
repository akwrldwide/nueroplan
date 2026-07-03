import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { adminFetch } from '../../utils/adminApi';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  Award, 
  Target, 
  Clock, 
  Loader2,
  BarChart3,
  BookOpen
} from 'lucide-react';

interface AnalyticsData {
  averageQuizScore: number;
  averageMastery: number;
  averageStudyHours: number;
  examReadinessByProgram: Array<{
    program: string;
    readinessRate: number;
  }>;
  studyPlanCompletion: Array<{
    program: string;
    completionRate: number;
  }>;
  quizScoreByProgram: Array<{
    program: string;
    averageScore: number;
  }>;
}

export default function AdminAnalytics() {
  const { token } = useContext(AuthContext);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const res = await adminFetch('/analytics', token);
        setData(res);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load evaluation analytics.');
      } finally {
        setLoading(false);
      }
    }
    if (token) loadAnalytics();
  }, [token]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Aggregating dissertation metrics...</p>
        </div>
      </AdminLayout>
    );
  }

  // No pie chart data formatting needed

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Evaluation Analytics</h1>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* Top Indicators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Quiz Score</p>
              <h2 className="text-2xl font-black text-slate-800 mt-1">
                {data ? `${data.averageQuizScore.toFixed(1)}%` : '0%'}
              </h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Syllabus Mastery</p>
              <h2 className="text-2xl font-black text-slate-800 mt-1">
                {data ? `${data.averageMastery.toFixed(1)}%` : '0%'}
              </h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Study Hours / Student</p>
              <h2 className="text-2xl font-black text-slate-800 mt-1">
                {data ? `${data.averageStudyHours.toFixed(1)} hrs` : '0 hrs'}
              </h2>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Column 1: Risk & Quiz Scores */}
          <div className="flex flex-col gap-8">
            {/* 1. Average Exam Readiness by Program */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-md flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" /> Average Exam Readiness by Program
                </h3>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Aggregated exam readiness score calculated based on topic coverage and quiz performance, grouped by academic programme.
                </p>
              </div>

              <div className="mt-6 flex-1 flex flex-col justify-between">
                {data && data.examReadinessByProgram && data.examReadinessByProgram.length > 0 ? (
                  <div>
                    <div className="space-y-4">
                      {data.examReadinessByProgram.map((entry, index) => {
                        const readiness = Math.round(entry.readinessRate);
                        let barColor = 'bg-rose-500';
                        if (readiness >= 70) {
                          barColor = 'bg-emerald-500';
                        } else if (readiness >= 40) {
                          barColor = 'bg-amber-500';
                        }
                        
                        return (
                          <div key={index} className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-mono tracking-wider font-bold text-slate-600 uppercase">
                              <span>{entry.program.toUpperCase()}</span>
                              <span>{readiness}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${barColor} transition-all duration-1000`} 
                                style={{ width: `${Math.min(100, Math.max(0, readiness))}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* X-Axis Labels */}
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-6 pt-2 border-t border-slate-100">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">
                    No readiness metrics recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* 2. Average Quiz Score by Program */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-md flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-600" /> Average Quiz Score by Program
                </h3>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Average student scores achieved in syllabus assessment quizzes, grouped by academic programme.
                </p>
              </div>

              <div className="mt-6 flex-1 flex flex-col justify-between">
                {data && data.quizScoreByProgram && data.quizScoreByProgram.length > 0 ? (
                  <div>
                    <div className="space-y-4">
                      {data.quizScoreByProgram.map((entry, index) => {
                        const score = Math.round(entry.averageScore);
                        return (
                          <div key={index} className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-mono tracking-wider font-bold text-slate-600 uppercase">
                              <span>{entry.program.toUpperCase()}</span>
                              <span>{score}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-indigo-500 transition-all duration-1000" 
                                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* X-Axis Labels */}
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-6 pt-2 border-t border-slate-100">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">
                    No quiz scores recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Study Plan Completion Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-md flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" /> Study Plan Completion
              </h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Aggregated study session completion rates grouped by student academic programme.
              </p>
            </div>

            <div className="mt-6 flex-1 flex flex-col justify-between">
              {data && data.studyPlanCompletion.length > 0 ? (
                <div>
                  <div className="space-y-4">
                    {data.studyPlanCompletion.map((entry, index) => {
                      const rate = Math.round(entry.completionRate);
                      let barColor = 'bg-rose-500';
                      if (rate >= 50 && rate <= 55) {
                        barColor = 'bg-amber-400';
                      } else if (rate > 55 && rate <= 70) {
                        barColor = 'bg-orange-500';
                      } else if (rate > 70) {
                        barColor = 'bg-blue-500';
                      }
                      
                      return (
                        <div key={index} className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono tracking-wider font-bold text-slate-600 uppercase">
                            <span>{entry.program.toUpperCase()}</span>
                            <span>{rate}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${barColor} transition-all duration-1000`} 
                              style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* X-Axis Labels */}
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-6 pt-2 border-t border-slate-100">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">
                  No study plan sessions recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
