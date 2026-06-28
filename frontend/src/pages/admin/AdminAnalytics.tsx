import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { adminFetch } from '../../utils/adminApi';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Award, 
  Target, 
  Clock, 
  ShieldAlert, 
  Loader2,
  TrendingUp
} from 'lucide-react';

interface AnalyticsData {
  averageQuizScore: number;
  averageMastery: number;
  averageStudyHours: number;
  riskDistribution: {
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
  };
  studyPlanCompletion: Array<{
    program: string;
    completionRate: number;
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

  // Formatting data for Recharts Pie Chart
  const riskChartData = data ? [
    { name: 'Low Risk', value: data.riskDistribution.lowRisk, color: '#10b981' },
    { name: 'Medium Risk', value: data.riskDistribution.mediumRisk, color: '#f59e0b' },
    { name: 'High Risk', value: data.riskDistribution.highRisk, color: '#ef4444' }
  ].filter(item => item.value > 0) : [];

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. Risk Distribution Pie Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-855 text-md flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-indigo-600" /> Academic Failure Risk Distribution
              </h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Aggregated assessment of students failure risk calculated using performance averages and consistency scores.
              </p>
            </div>

            <div className="h-72 w-full mt-6">
              {riskChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {riskChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      iconSize={10}
                      formatter={(value) => <span className="text-xs font-bold text-slate-600">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">
                  No risk metrics logged in the database.
                </div>
              )}
            </div>
          </div>

          {/* 2. Average Study Plan Completion Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-md flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" /> Average Study Plan Completion
              </h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Aggregated study session completion rates grouped by student academic programme.
              </p>
            </div>

            <div className="h-72 w-full mt-6">
              {data && data.studyPlanCompletion.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.studyPlanCompletion} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis dataKey="program" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={100} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                      formatter={(value) => [`${value}% Completion`, 'Completion Rate']}
                    />
                    <Bar dataKey="completionRate" radius={[0, 8, 8, 0]} maxBarSize={16}>
                      {data.studyPlanCompletion.map((entry, index) => {
                        let barColor = '#6366f1';
                        if (entry.completionRate < 50) barColor = '#f43f5e';
                        else if (entry.completionRate < 75) barColor = '#fbbf24';
                        else barColor = '#10b981';
                        return <Cell key={`cell-${index}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">
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
