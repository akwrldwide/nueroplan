import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { adminFetch } from '../../utils/adminApi';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  Users, 
  BookOpen, 
  Layers, 
  TrendingUp, 
  Sliders, 
  ArrowRight,
  Loader2,
  FileText
} from 'lucide-react';

interface Stats {
  totalStudents: number;
  totalProgrammes: number;
  totalCourses: number;
  totalStudyPlans: number;
  activeSession: string;
}

export default function AdminDashboard() {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await adminFetch('/stats', token);
        setStats(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load system statistics.');
      } finally {
        setLoading(false);
      }
    }
    if (token) loadStats();
  }, [token]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Compiling system health metrics...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Dashboard</h1>
          <p className="text-slate-500 mt-1">Real-time health indicators and academic operations statistics.</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-5 group">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400">Total Students</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{stats?.totalStudents}</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-5 group">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Layers className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400">Programmes</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{stats?.totalProgrammes}</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-5 group">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400">Total Courses</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{stats?.totalCourses}</h2>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-5 group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400">Plans Generated</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">{stats?.totalStudyPlans}</h2>
            </div>
          </div>
        </div>

        {/* Active Session Info */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              Active Session
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight">{stats?.activeSession}</h2>
            <p className="text-slate-400 text-sm max-w-xl">
              System scheduler and window bounds are anchored to this academic session.
            </p>
          </div>
          <Link
            to="/admin/structure"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-950 font-bold hover:bg-slate-100 hover:gap-3 transition-all shrink-0 cursor-pointer self-start md:self-auto"
          >
            Configure Sessions <ArrowRight className="h-4 w-4 text-indigo-950" />
          </Link>
        </div>

        {/* Quick Operations Section */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" /> Academic Tree Management
                </h4>
                <p className="text-slate-500 text-sm mt-2">
                  Add, update, or remove academic sessions, semesters windows, programmes, courses, and topic syllabus mappings inside a unified tree explorer.
                </p>
              </div>
              <Link
                to="/admin/structure"
                className="mt-6 flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Go to Academic Structure <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-sky-600" /> Student Progress Audits
                </h4>
                <p className="text-slate-500 text-sm mt-2">
                  Inspect student profiles, review academic metrics, activate or deactivate accounts, and trigger manual plan regenerations.
                </p>
              </div>
              <Link
                to="/admin/students"
                className="mt-6 flex items-center gap-1.5 text-sm font-bold text-sky-600 hover:text-sky-700 transition-colors"
              >
                Go to Student Directory <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" /> Performance Analytics
                </h4>
                <p className="text-slate-500 text-sm mt-2">
                  Visualize key dissertation metrics, including quiz score averages, mastery distributions, risk indicators, and hardest topics.
                </p>
              </div>
              <Link
                to="/admin/analytics"
                className="mt-6 flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                View Analytics Charts <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-amber-600" /> Adaptive Weights Tuning
                </h4>
                <p className="text-slate-500 text-sm mt-2">
                  Adjust allocation engine constraints, learning rate ($\eta$), decay constant ($\lambda$), and individual weighting variables.
                </p>
              </div>
              <Link
                to="/admin/settings"
                className="mt-6 flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors"
              >
                Tune Parameters <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
