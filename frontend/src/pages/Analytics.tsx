import { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, TrendingUp, AlertCircle, CheckCircle, Flame } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Analytics() {
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [mistakesRes, topicsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/mistakes', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:5000/api/topics', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      setMistakes(mistakesRes.data);
      setTopics(topicsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const weakTopics = topics.filter(t => t.mastery === 'weak');
  const strongTopics = topics.filter(t => t.mastery === 'strong' || t.mastery === 'average');
  const errorRate = topics.length > 0 ? ((mistakes.length / (mistakes.length + 20)) * 100).toFixed(1) : 0; // Simulated relative error rate

  // Mock data for chart
  const progressData = [
    { name: 'Mon', score: 65 },
    { name: 'Tue', score: 72 },
    { name: 'Wed', score: 68 },
    { name: 'Thu', score: 85 },
    { name: 'Fri', score: 82 },
    { name: 'Sat', score: 90 },
    { name: 'Sun', score: 95 }
  ];

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-500">Loading Analytics...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
        </div>

        {/* Global Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Strong Subjects</p>
              <h3 className="text-2xl font-bold text-gray-900">{strongTopics.length} <span className="text-sm font-normal text-gray-400">mastered</span></h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Focus Areas</p>
              <h3 className="text-2xl font-bold text-gray-900">{weakTopics.length} <span className="text-sm font-normal text-gray-400">needs work</span></h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Global Error Rate</p>
              <h3 className="text-2xl font-bold text-gray-900">{errorRate}% <span className="text-sm font-normal text-gray-400">across quizzes</span></h3>
            </div>
          </div>
        </div>

        {/* Main Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* Chart */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Knowledge Retention Trend</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progressData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Error Log */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-600" /> Recent Mistakes Log
                </h3>
              </div>
              <div className="p-0">
                {mistakes.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No mistakes logged yet. Keep practicing!
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {mistakes.map(m => (
                      <div key={m.id} className="p-6 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-md">
                            {m.topic?.course?.course_code || 'COURSE'}
                          </span>
                          <span className="text-sm font-medium text-gray-600">{m.topic?.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">{new Date(m.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="font-semibold text-gray-900 mb-3">{m.question}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                            <span className="text-xs font-bold text-rose-600 uppercase mb-1 block">You answered</span>
                            <span className="text-sm text-gray-800">{m.given_answer}</span>
                          </div>
                          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <span className="text-xs font-bold text-emerald-600 uppercase mb-1 block">Correct answer</span>
                            <span className="text-sm text-gray-800">{m.correct_answer}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-indigo-900 rounded-2xl shadow-lg p-6 text-white text-center">
              <Flame className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Consistency Score</h3>
              <div className="text-5xl font-black mb-4 tracking-tighter">92<span className="text-2xl text-indigo-300">%</span></div>
              <p className="text-sm text-indigo-200">You are in the top 10% of students tracking this curriculum.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
