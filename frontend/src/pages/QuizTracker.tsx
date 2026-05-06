import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Award, TrendingUp, Calendar, BookOpen, Target, Star, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function QuizTracker() {
  const [results, setResults] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [timeRange, setTimeRange] = useState('all'); // '7d', '30d', 'all'
  const [courseFilter, setCourseFilter] = useState('all');

  useEffect(() => {
    fetchStaticData();
  }, []);

  useEffect(() => {
    fetchFilteredResults();
  }, [timeRange, courseFilter]);

  const fetchStaticData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [coursesRes, insightsRes] = await Promise.all([
        axios.get('/api/courses', { headers }),
        axios.get('/api/quiz/insights', { headers })
      ]);
      setCourses(coursesRes.data);
      setInsights(insightsRes.data);
    } catch (err) {
      console.error('Failed to fetch static tracker data', err);
    }
  };

  const fetchFilteredResults = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const res = await axios.get(`/api/quiz/results?time_range=${timeRange}&course_id=${courseFilter}`, { headers });
      setResults(res.data);
    } catch (err) {
      console.error('Failed to fetch filtered quiz results', err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data (chronological order)
  const chartData = [...results].reverse().map((r, index, array) => {
    // Calculate 3-point moving average
    let sum = r.score_percentage;
    let count = 1;
    if (index > 0) { sum += array[index - 1].score_percentage; count++; }
    if (index > 1) { sum += array[index - 2].score_percentage; count++; }
    
    return {
      date: format(new Date(r.taken_at), 'MMM dd'),
      score: r.score_percentage,
      moving_avg: sum / count,
      fullDate: new Date(r.taken_at).toLocaleString()
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const scorePayload = payload.find((p: any) => p.dataKey === 'score');
      const trendPayload = payload.find((p: any) => p.dataKey === 'moving_avg');
      
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
          <p className="font-bold text-gray-900 mb-1">{label}</p>
          {scorePayload && <p className="text-indigo-600 font-bold text-sm">Score: {scorePayload.value?.toFixed(0)}%</p>}
          {trendPayload && <p className="text-gray-500 font-medium text-xs">Trend: {trendPayload.value?.toFixed(0)}%</p>}
          <p className="text-[10px] text-gray-400 mt-2">{payload[0]?.payload.fullDate}</p>
        </div>
      );
    }
    return null;
  };

  if (!insights) return <div className="h-screen flex items-center justify-center text-gray-500">Loading Tracker...</div>;

  const weeklyGoal = 5;
  const goalProgress = Math.min((insights.weeklyQuizzesCount / weeklyGoal) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.history.back()}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                Quiz Mastery Tracker
              </h1>
              <p className="text-sm text-gray-500">Track your practice performance and identify focus areas over time.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
               value={courseFilter}
               onChange={(e) => setCourseFilter(e.target.value)}
               className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
               <option value="all">All Courses</option>
               {courses.map((c: any) => (
                 <option key={c.id} value={c.course_id || c.id}>{c.course?.code || c.code}</option>
               ))}
            </select>
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden p-1 text-sm font-medium">
               <button onClick={() => setTimeRange('7d')} className={`px-4 py-1.5 rounded-lg transition-colors ${timeRange === '7d' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'}`}>7 Days</button>
               <button onClick={() => setTimeRange('30d')} className={`px-4 py-1.5 rounded-lg transition-colors ${timeRange === '30d' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'}`}>30 Days</button>
               <button onClick={() => setTimeRange('all')} className={`px-4 py-1.5 rounded-lg transition-colors ${timeRange === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'}`}>All Time</button>
            </div>
          </div>
        </div>

        {/* Top Analytics Row: Goals & Difficulty Segmentation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Goal Tracking */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-indigo-500" /> Weekly Goal
                    </h3>
                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{insights.weeklyQuizzesCount}/{weeklyGoal}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${goalProgress}%` }}></div>
                </div>
                <p className="text-xs text-gray-500">
                    {insights.weeklyQuizzesCount >= weeklyGoal ? 'Goal crushed! Fantastic momentum!' : 'Keep practicing to hit your weekly target.'}
                </p>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" /> Milestones
                </h3>
                <div className="flex flex-wrap gap-2">
                    {insights.achievements.perfectScore ? (
                        <div className="flex flex-col items-center bg-amber-50 rounded-xl p-2 px-3 border border-amber-100 shrink-0">
                            <Star className="w-5 h-5 text-amber-500 mb-1" />
                            <span className="text-[10px] font-bold text-amber-700">Perfect Score</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center bg-gray-50 rounded-xl p-2 px-3 border border-gray-100 shrink-0 opacity-50 grayscale">
                            <Star className="w-5 h-5 text-gray-400 mb-1" />
                            <span className="text-[10px] font-bold text-gray-500">Perfect Score</span>
                        </div>
                    )}
                    {insights.achievements.consistentLearner ? (
                        <div className="flex flex-col items-center bg-emerald-50 rounded-xl p-2 px-3 border border-emerald-100 shrink-0">
                            <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1" />
                            <span className="text-[10px] font-bold text-emerald-700">Consistent</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center bg-gray-50 rounded-xl p-2 px-3 border border-gray-100 shrink-0 opacity-50 grayscale">
                            <ShieldCheck className="w-5 h-5 text-gray-400 mb-1" />
                            <span className="text-[10px] font-bold text-gray-500">10+ Quizzes</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Difficulty Segmentation (Spans 2 columns) */}
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-sm border border-indigo-400 p-6 flex flex-col justify-center">
                <h3 className="text-[13px] font-bold text-indigo-100 uppercase tracking-wider mb-4">Average Mastery by Difficulty</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 text-center">
                        <span className="block text-xs font-medium text-indigo-200 mb-1">Easy</span>
                        <span className="text-xl font-bold text-white">{insights.averages.easy.toFixed(0)}%</span>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 text-center">
                        <span className="block text-xs font-medium text-emerald-200 mb-1">Medium</span>
                        <span className="text-xl font-bold text-white">{insights.averages.medium.toFixed(0)}%</span>
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/20 text-center">
                        <span className="block text-xs font-medium text-rose-200 mb-1">Hard</span>
                        <span className="text-xl font-bold text-white">{insights.averages.hard.toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Performance Trend (w/ Moving Average)
            </h3>
            {loading ? (
                <div className="h-[300px] flex items-center justify-center text-gray-400 animate-pulse">Loading chart data...</div>
            ) : results.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    No quiz data available for this filter.
                </div>
            ) : (
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                                dy={10}
                            />
                            <YAxis 
                                domain={[0, 100]} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            
                            {/* Moving Average Line */}
                            <Line 
                                type="monotone" 
                                dataKey="moving_avg" 
                                stroke="#A78BFA" 
                                strokeWidth={2} 
                                strokeDasharray="5 5"
                                dot={false}
                                activeDot={false}
                            />
                            {/* Actual Score Line */}
                            <Line 
                                type="monotone" 
                                dataKey="score" 
                                stroke="#4F46E5" 
                                strokeWidth={3} 
                                dot={{ fill: '#4F46E5', strokeWidth: 2, r: 4, stroke: '#fff' }} 
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Recent Attempts
            </h3>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-white text-xs uppercase font-semibold text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Topic / Course</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4 text-center">Level Segment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                      No attempts recorded yet.
                    </td>
                  </tr>
                ) : (
                  [...results].map((result) => {
                    const score = result.score_percentage;
                    let badgeClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
                    let badgeText = "Fair";
                    
                    if (score >= 70) {
                        badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
                        badgeText = "Strong";
                    } else if (score < 40) {
                        badgeClass = "bg-rose-100 text-rose-700 border-rose-200";
                        badgeText = "Needs Work";
                    }

                    const diffLevel = result.difficulty || 3;
                    const diffText = diffLevel <= 2 ? "Easy" : diffLevel === 3 ? "Medium" : "Hard";
                    const courseName = result.course?.title || result.course?.code || "Unknown Course";
                    
                    return (
                      <tr key={result.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                <BookOpen className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                               <div className="font-bold text-gray-900 text-sm">{result.topic_name || courseName}</div>
                               <div className="flex items-center mt-1">
                                  {result.topic_name && <span className="text-[10px] uppercase font-bold text-gray-400 truncate max-w-[150px] mr-2">{courseName}</span>}
                               </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {format(new Date(result.taken_at), 'MMM dd, yyyy • hh:mm a')}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex justify-center items-center">
                                <span className="font-black text-gray-900">{score.toFixed(0)}%</span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex flex-col items-center gap-1.5">
                                <span className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                                    {badgeText}
                                </span>
                                <span className="text-[10px] font-medium text-gray-400">Diff: {diffText}</span>
                            </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
