import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { adminFetch } from '../../utils/adminApi';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  Sliders, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

interface SystemConfig {
  learning_rate_eta: number;
  decay_constant_lambda: number;
  weight_difficulty: number;
  weight_exam: number;
  weight_mastery: number;
  weight_risk: number;
  weight_course_unit: number;
  min_session_duration: number;
  max_session_duration: number;
  allow_morning_revision: boolean;
}

export default function AdminSettings() {
  const { token } = useContext(AuthContext);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await adminFetch('/settings', token);
      setConfig(res);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load algorithm settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadSettings();
  }, [token]);

  const handleChange = (field: keyof SystemConfig, val: any) => {
    if (!config) return;
    setConfig(prev => prev ? { ...prev, [field]: val } : null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await adminFetch('/settings', token, {
        method: 'PUT',
        body: JSON.stringify(config)
      });
      setConfig(res.config);
      setMessage('✓ Algorithm settings successfully updated and applied in real-time!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  // Calculate sum of priority weights
  const weightSum = config
    ? config.weight_difficulty +
      config.weight_exam +
      config.weight_mastery +
      config.weight_risk +
      config.weight_course_unit
    : 0;

  const isWeightBalanced = Math.abs(weightSum - 1.0) < 0.001;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading algorithm settings...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Algorithm Configuration</h1>
          <p className="text-slate-500 mt-1">Tune parameters and priority weightings utilized by the allocation and adaptive learning engines.</p>
        </div>

        {message && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl">
            <p className="text-sm text-emerald-800 font-semibold">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {config && (
          <form onSubmit={handleSave} className="space-y-8">
            
            {/* 1. ADAPTIVE LEARNING & CURVE PARAMETERS */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-md flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" /> Adaptive Learning Parameters
                </h3>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Controls the rate of syllabus mastery accumulation and the exponential decay rate for exam proximity priority.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Learning Rate Eta */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                    <span>Learning Rate (η)</span>
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black text-xs">
                      {config.learning_rate_eta.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={config.learning_rate_eta}
                    onChange={e => handleChange('learning_rate_eta', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Higher values cause quiz performance to affect topic mastery levels more aggressively: M_i(t+1) = M_i(t) + η(Q_i - M_i(t)).
                  </p>
                </div>

                {/* Decay Constant Lambda */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                    <span>Exam Decay Constant (λ)</span>
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black text-xs">
                      {config.decay_constant_lambda.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    value={config.decay_constant_lambda}
                    onChange={e => handleChange('decay_constant_lambda', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Controls how rapidly exam proximity score escalates as the exam date approaches: S_exam = e^(-λ * t_days).
                  </p>
                </div>
              </div>
            </div>

            {/* 2. PRIORITY ENGINE WEIGHTS */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-md flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-indigo-600" /> Topic Priority Engine Weighting
                  </h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                    Set relative weights for scheduling priority. Total weights should sum to <strong>1.00</strong>.
                  </p>
                </div>

                {/* Sum validation indicator */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 self-start sm:self-auto border ${
                  isWeightBalanced 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {isWeightBalanced ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <span>Sum: {weightSum.toFixed(2)} / 1.00</span>
                </div>
              </div>

              {!isWeightBalanced && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-xl flex gap-2.5 items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                    The priority weights do not sum to 1.00. The allocation priority engine will still calculate priorities correctly, but values will scale proportionally to the custom total.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Weight Difficulty */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Course Difficulty Weight ($w_1$)</span>
                    <span className="font-extrabold text-xs">{config.weight_difficulty.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0" max="1.0" step="0.05"
                    value={config.weight_difficulty}
                    onChange={e => handleChange('weight_difficulty', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* Weight Exam Proximity */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Exam Proximity Weight ($w_2$)</span>
                    <span className="font-extrabold text-xs">{config.weight_exam.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0" max="1.0" step="0.05"
                    value={config.weight_exam}
                    onChange={e => handleChange('weight_exam', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* Weight Lack of Mastery */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Lack of Mastery Weight ($w_3$)</span>
                    <span className="font-extrabold text-xs">{config.weight_mastery.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0" max="1.0" step="0.05"
                    value={config.weight_mastery}
                    onChange={e => handleChange('weight_mastery', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* Weight Risk */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Academic failure Risk Weight ($w_4$)</span>
                    <span className="font-extrabold text-xs">{config.weight_risk.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0" max="1.0" step="0.05"
                    value={config.weight_risk}
                    onChange={e => handleChange('weight_risk', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* Weight Course Unit */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Course Unit Weight ($w_5$)</span>
                    <span className="font-extrabold text-xs">{config.weight_course_unit.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0" max="1.0" step="0.05"
                    value={config.weight_course_unit}
                    onChange={e => handleChange('weight_course_unit', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* 3. SCHEDULING CONSTRAINTS */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-800 text-md flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" /> Scheduling & Session Duration Limits
                </h3>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Controls structural constraints when partitioning available time into study slots and toggles global revision features.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Min Session Duration */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Minimum Session Duration (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    max="120"
                    step="5"
                    value={config.min_session_duration}
                    onChange={e => handleChange('min_session_duration', parseInt(e.target.value))}
                    className="w-full mt-1.5 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-semibold"
                  />
                </div>

                {/* Max Session Duration */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Maximum Session Duration (Minutes)</label>
                  <input
                    type="number"
                    min="30"
                    max="360"
                    step="10"
                    value={config.max_session_duration}
                    onChange={e => handleChange('max_session_duration', parseInt(e.target.value))}
                    className="w-full mt-1.5 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-semibold"
                  />
                </div>

                {/* Allow Morning Revision Switch */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl md:col-span-2">
                  <div>
                    <span className="block text-sm font-bold text-slate-800">Global Morning Pre-Exam Revision Override</span>
                    <span className="text-[11px] text-slate-500">
                      Force revision sessions during morning slots for all active study plans if slot starts before 12 PM.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input 
                      type="checkbox" 
                      checked={config.allow_morning_revision} 
                      onChange={(e) => handleChange('allow_morning_revision', e.target.checked)} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 shrink-0">
              <button
                type="button"
                onClick={loadSettings}
                className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold transition-all text-sm cursor-pointer"
              >
                Reset Defaults
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold transition-all text-sm shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" /> Save Configuration
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
