import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { adminFetch } from '../../utils/adminApi';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  Book, 
  FileCode, 
  Loader2,
  Mail
} from 'lucide-react';

interface Session {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  registration_opens: string;
  registration_closes: string;
  status: string;
}

interface WindowConfig {
  id: string;
  semester: string;
  start_month: number;
  start_day: number;
  end_month: number;
  end_day: number;
  allow_early_reg: boolean;
  reg_lead_time: number;
}

interface Topic {
  id: string;
  topic_name: string;
  default_weight: number;
}

interface Course {
  id: string;
  code: string;
  title: string;
  units: number;
  difficulty: number;
  level: number;
  semester: number;
  courseTopics: Topic[];
}

interface Program {
  id: string;
  name: string;
  courses: Course[];
}

export default function AcademicStructure() {
  const { token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'sessions' | 'windows' | 'curriculum'>('curriculum');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data States
  const [sessions, setSessions] = useState<Session[]>([]);
  const [windows, setWindows] = useState<WindowConfig[]>([]);
  const [programmes, setProgrammes] = useState<Program[]>([]);

  // Selection States for Tree View
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>({});
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({}); // key is 'level-semester'
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({}); // key is courseId

  // Modal States
  const [modalType, setModalType] = useState<'' | 'session' | 'window' | 'program' | 'course' | 'topic'>('');
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState('');
  const [modalData, setModalData] = useState<any>({});
  const [notifying, setNotifying] = useState<string | null>(null);

  const fetchStructure = async () => {
    try {
      setLoading(true);
      const data = await adminFetch('/structure', token);
      setSessions(data.sessions || []);
      setWindows(data.windows || []);
      setProgrammes(data.programmes || []);
      if (data.programmes?.length > 0 && !selectedProgramId) {
        setSelectedProgramId(data.programmes[0].id);
      }
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to retrieve academic structures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchStructure();
  }, [token]);

  // Expand helper functions
  const toggleLevel = (lvl: number) => {
    setExpandedLevels(prev => ({ ...prev, [lvl]: !prev[lvl] }));
  };

  const toggleSemester = (lvl: number, sem: number) => {
    const key = `${lvl}-${sem}`;
    setExpandedSemesters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => ({ ...prev, [courseId]: !prev[courseId] }));
  };

  // CRUD Actions
  const handleOpenModal = (type: typeof modalType, mode: 'create' | 'edit', initialData: any = {}, id: string = '') => {
    setModalType(type);
    setModalMode(mode);
    setEditId(id);
    setModalData(initialData);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let path = '';
      let method = modalMode === 'create' ? 'POST' : 'PUT';

      if (modalType === 'session') {
        path = modalMode === 'create' ? '/sessions' : `/sessions/${editId}`;
      } else if (modalType === 'window') {
        path = modalMode === 'create' ? '/windows' : `/windows/${editId}`;
      } else if (modalType === 'program') {
        path = modalMode === 'create' ? '/programmes' : `/programmes/${editId}`;
      } else if (modalType === 'course') {
        path = modalMode === 'create' ? '/courses' : `/courses/${editId}`;
      } else if (modalType === 'topic') {
        path = modalMode === 'create' ? '/topics' : `/topics/${editId}`;
      }

      const dataToSave = { ...modalData };
      if (modalType === 'session') {
        dataToSave.registration_opens = modalData.start_date;
        dataToSave.registration_closes = modalData.end_date;
      }

      await adminFetch(path, token, {
        method,
        body: JSON.stringify(dataToSave)
      });

      setModalType('');
      fetchStructure();
    } catch (err: any) {
      alert(err.message || 'Error occurred while saving structure item.');
    }
  };

  const handleDelete = async (type: typeof modalType, id: string) => {
    if (!confirm('Are you sure you want to delete this item? This action is irreversible.')) return;
    try {
      let path = '';
      if (type === 'session') path = `/sessions/${id}`;
      else if (type === 'window') path = `/windows/${id}`;
      else if (type === 'program') path = `/programmes/${id}`;
      else if (type === 'course') path = `/courses/${id}`;
      else if (type === 'topic') path = `/topics/${id}`;

      await adminFetch(path, token, { method: 'DELETE' });
      fetchStructure();
    } catch (err: any) {
      alert(err.message || 'Failed to delete item.');
    }
  };

  const handleActivateSession = async (id: string) => {
    try {
      await adminFetch(`/sessions/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      fetchStructure();
    } catch (err: any) {
      alert(err.message || 'Failed to activate session.');
    }
  };

  const handleNotifyStudents = async (sessionId: string) => {
    try {
      setNotifying(sessionId);
      const res = await adminFetch(`/sessions/${sessionId}/notify`, token, {
        method: 'POST'
      });
      alert(res.message || 'Notification emails sent successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to send notification emails.');
    } finally {
      setNotifying(null);
    }
  };

  // Preview Timeline calculations
  const renderPreviewTimeline = () => {
    const today = new Date();
    const activeWindow = windows.find(w => {
      const nowMonth = today.getMonth() + 1;
      const nowDay = today.getDate();
      
      const startVal = w.start_month * 100 + w.start_day;
      const endVal = w.end_month * 100 + w.end_day;
      const todayVal = nowMonth * 100 + nowDay;
      
      if (startVal <= endVal) {
        return todayVal >= startVal && todayVal <= endVal;
      } else {
        // spans across year boundary
        return todayVal >= startVal || todayVal <= endVal;
      }
    });

    const activeSession = sessions.find(s => s.status === 'ACTIVE');

    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mt-6">
        <h3 className="font-bold text-slate-800 text-lg mb-4">Window Preview Timeline</h3>
        <div className="relative border-l-2 border-indigo-200 ml-4 pl-6 space-y-6">
          <div className="relative">
            <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-900 border-4 border-white" />
            <h4 className="font-bold text-slate-900 text-sm">Current Date</h4>
            <p className="text-xs text-slate-500 mt-0.5">{today.toDateString()}</p>
          </div>

          <div className="relative">
            <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white ${activeSession ? 'bg-indigo-600' : 'bg-slate-300'}`} />
            <h4 className="font-bold text-slate-900 text-sm">Active Academic Session</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {activeSession ? `${activeSession.name} (${activeSession.status})` : 'No Active Session'}
            </p>
          </div>

          <div className="relative">
            <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white ${activeWindow ? 'bg-indigo-600' : 'bg-slate-300'}`} />
            <h4 className="font-bold text-slate-900 text-sm">Current Active Semester Window</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              {activeWindow 
                ? `${activeWindow.semester} (Bounds: ${activeWindow.start_month}/${activeWindow.start_day} to ${activeWindow.end_month}/${activeWindow.end_day})` 
                : 'No Active Window Configured for Today'}
            </p>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-600 border-4 border-white" />
            <h4 className="font-bold text-slate-900 text-sm">Registration & Planning Lead Time</h4>
            {activeWindow?.allow_early_reg ? (
              <p className="text-xs text-slate-600 mt-0.5">
                Students can register up to <strong className="text-indigo-600">{activeWindow.reg_lead_time} days early</strong>.
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">Early registration is disabled.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading Academic Structure...</p>
        </div>
      </AdminLayout>
    );
  }

  // Selected Program hierarchy helper
  const selectedProgram = programmes.find(p => p.id === selectedProgramId);
  const levels = selectedProgram ? Array.from(new Set(selectedProgram.courses.map(c => c.level))).sort((a,b)=>a-b) : [];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Academic Structure</h1>
            <p className="text-slate-500 mt-1">Configure academic sessions, semesters, programs, and nested course curriculum topics.</p>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-200/60 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'curriculum' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Curricula Tree
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'sessions' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Sessions
            </button>
            <button
              onClick={() => setActiveTab('windows')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'windows' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Windows
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* 1. SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-sm font-bold text-slate-500 pl-2">{sessions.length} sessions configured</span>
              <button
                onClick={() => handleOpenModal('session', 'create', { status: 'UPCOMING', start_date: '', end_date: '' })}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4" /> Create Session
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                    <th className="px-6 py-4">Session Name</th>
                    <th className="px-6 py-4">Dates</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(s.start_date).toLocaleDateString()} – {new Date(s.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          s.status === 'UPCOMING' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2.5">
                          {s.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleNotifyStudents(s.id)}
                              disabled={notifying !== null}
                              className="text-xs font-bold text-indigo-650 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer border border-transparent hover:border-indigo-200 flex items-center gap-1 disabled:opacity-50"
                            >
                              {notifying === s.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Mail className="h-3.5 w-3.5" />
                              )}
                              Notify Students
                            </button>
                          )}
                          {s.status !== 'ACTIVE' && (
                            <button
                              onClick={() => handleActivateSession(s.id)}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenModal('session', 'edit', {
                              name: s.name,
                              start_date: s.start_date.split('T')[0],
                              end_date: s.end_date.split('T')[0],
                              registration_opens: s.registration_opens.split('T')[0],
                              registration_closes: s.registration_closes.split('T')[0],
                              status: s.status
                            }, s.id)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('session', s.id)}
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                        No academic sessions configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. WINDOWS TAB */}
        {activeTab === 'windows' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <span className="text-sm font-bold text-slate-500 pl-2">{windows.length} semester windows configured</span>
              {windows.length < 2 && (
                <button
                  onClick={() => handleOpenModal('window', 'create', { semester: 'First Semester', start_month: 1, start_day: 1, end_month: 6, end_day: 30, allow_early_reg: false, reg_lead_time: 30 })}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Configure Window
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                      <th className="px-6 py-4">Semester</th>
                      <th className="px-6 py-4">Window Bounds</th>
                      <th className="px-6 py-4">Early Reg Settings</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {windows.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{w.semester}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {w.start_month}/{w.start_day} to {w.end_month}/{w.end_day}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {w.allow_early_reg ? (
                            <span className="text-emerald-700 font-bold">Enabled ({w.reg_lead_time}d early)</span>
                          ) : (
                            <span className="text-slate-400">Disabled</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal('window', 'edit', w, w.id)}
                              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete('window', w.id)}
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {windows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-medium">
                          No semester windows configured.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="lg:col-span-1">
                {renderPreviewTimeline()}
              </div>
            </div>
          </div>
        )}

        {/* 3. CURRICULUM TREE TAB */}
        {activeTab === 'curriculum' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Programme List Selector */}
            <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between self-start">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Programmes</h3>
                  <button
                    onClick={() => handleOpenModal('program', 'create', { name: '' })}
                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    title="Add Programme"
                  >
                    <Plus className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {programmes.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProgramId(p.id)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-xl cursor-pointer text-sm font-semibold transition-all group ${
                        p.id === selectedProgramId 
                          ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-600/5' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate pr-2">{p.name}</span>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal('program', 'edit', { name: p.name }, p.id);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete('program', p.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {programmes.length === 0 && (
                    <p className="text-slate-400 text-xs py-4 text-center font-medium">No programmes created yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Hierarchical Tree Accordion */}
            <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">
                    {selectedProgram ? selectedProgram.name : 'No Program Selected'}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">Syllabus tree mapping for Levels, Semesters, Courses, and Topics.</p>
                </div>
                {selectedProgramId && (
                  <button
                    onClick={() => handleOpenModal('course', 'create', { program_id: selectedProgramId, code: '', title: '', units: 3, difficulty: 3.0, level: 100, semester: 1 })}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Course
                  </button>
                )}
              </div>

              {!selectedProgramId ? (
                <div className="text-center py-20 text-slate-400 font-medium">Please select or create a program first.</div>
              ) : selectedProgram?.courses.length === 0 ? (
                <div className="text-center py-20 text-slate-400 font-medium">No courses have been added to this programme.</div>
              ) : (
                <div className="space-y-4">
                  {levels.map(level => {
                    const isLvlExpanded = expandedLevels[level];
                    const levelCourses = selectedProgram?.courses.filter(c => c.level === level) || [];
                    
                    return (
                      <div key={level} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-slate-50/20">
                        {/* Level Bar */}
                        <div 
                          onClick={() => toggleLevel(level)}
                          className="flex items-center gap-2.5 px-5 py-4 bg-slate-50 hover:bg-slate-100/70 cursor-pointer select-none transition-colors border-b border-slate-100"
                        >
                          {isLvlExpanded ? <ChevronDown className="h-4.5 w-4.5 text-slate-500" /> : <ChevronRight className="h-4.5 w-4.5 text-slate-500" />}
                          <Folder className="h-4.5 w-4.5 text-indigo-500" />
                          <span className="font-extrabold text-slate-800 text-sm tracking-wide">{level} Level</span>
                          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                            {levelCourses.length} {levelCourses.length === 1 ? 'Course' : 'Courses'}
                          </span>
                        </div>

                        {isLvlExpanded && (
                          <div className="p-4 space-y-4 bg-white divide-y divide-slate-100/50">
                            {[1, 2].map(sem => {
                              const semKey = `${level}-${sem}`;
                              const isSemExpanded = expandedSemesters[semKey];
                              const semCourses = levelCourses.filter(c => c.semester === sem);
                              
                              if (semCourses.length === 0) return null;

                              return (
                                <div key={sem} className="pt-3 first:pt-0">
                                  <div 
                                    onClick={() => toggleSemester(level, sem)}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer select-none transition-colors"
                                  >
                                    {isSemExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                    <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Semester {sem}</span>
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full font-bold">
                                      {semCourses.length}
                                    </span>
                                  </div>

                                  {isSemExpanded && (
                                    <div className="pl-6 pr-2 py-3 space-y-3">
                                      {semCourses.map(course => {
                                        const isCourseExpanded = expandedCourses[course.id];
                                        return (
                                          <div key={course.id} className="border border-slate-200/60 rounded-xl overflow-hidden shadow-sm bg-white">
                                            {/* Course Row */}
                                            <div 
                                              onClick={() => toggleCourse(course.id)}
                                              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/40 hover:bg-slate-50 cursor-pointer select-none transition-colors border-b border-slate-200/40 gap-3"
                                            >
                                              <div className="flex items-center gap-3.5">
                                                {isCourseExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                                <Book className="h-4.5 w-4.5 text-sky-500" />
                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-slate-800 text-sm">{course.code}</span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{course.units} Units</span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">Diff: {course.difficulty}</span>
                                                  </div>
                                                  <span className="text-slate-500 text-xs font-semibold line-clamp-1">{course.title}</span>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2 justify-end self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                  onClick={() => handleOpenModal('topic', 'create', { course_id: course.id, topic_name: '', default_weight: 1.0 })}
                                                  className="flex items-center gap-0.5 bg-slate-100 hover:bg-slate-200 text-indigo-700 font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition-all"
                                                >
                                                  <Plus className="h-3 w-3" /> Add Topic
                                                </button>
                                                <button
                                                  onClick={() => handleOpenModal('course', 'edit', course, course.id)}
                                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                                >
                                                  <Edit className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => handleDelete('course', course.id)}
                                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            </div>

                                            {/* Topics List */}
                                            {isCourseExpanded && (
                                              <div className="p-4 bg-white/60 space-y-2">
                                                {course.courseTopics.map(topic => (
                                                  <div key={topic.id} className="flex items-center justify-between py-2 px-3 border border-slate-100 hover:border-slate-200 rounded-xl bg-white shadow-xs group">
                                                    <div className="flex items-center gap-2.5">
                                                      <FileCode className="h-4 w-4 text-emerald-500" />
                                                      <span className="text-xs font-bold text-slate-700">{topic.topic_name}</span>
                                                      <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-1 rounded-sm border border-slate-100/60">
                                                        Weight: {topic.default_weight ?? 1.0}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <button
                                                        onClick={() => handleOpenModal('topic', 'edit', { topic_name: topic.topic_name, default_weight: topic.default_weight }, topic.id)}
                                                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                      >
                                                        <Edit className="h-3 w-3" />
                                                      </button>
                                                      <button
                                                        onClick={() => handleDelete('topic', topic.id)}
                                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                                      >
                                                        <Trash2 className="h-3 w-3" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                ))}
                                                {course.courseTopics.length === 0 && (
                                                  <p className="text-slate-400 text-xs py-2 pl-2 font-medium">No topics added to this syllabus yet.</p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODALS */}
        {modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 overflow-hidden">
              <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wide">
                {modalMode === 'create' ? 'Create' : 'Edit'} {modalType}
              </h3>
              
              <form onSubmit={handleSave} className="space-y-4 mt-4">
                {/* 1. Session Fields */}
                {modalType === 'session' && (
                  <>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 uppercase">Session Name</label>
                      <input 
                        type="text" 
                        required
                        value={modalData.name || ''} 
                        onChange={e => setModalData({...modalData, name: e.target.value})}
                        className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="e.g. 2025/2026 Academic Year"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">Start Date</label>
                        <input 
                          type="date" 
                          required
                          value={modalData.start_date || ''} 
                          onChange={e => setModalData({...modalData, start_date: e.target.value})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">End Date</label>
                        <input 
                          type="date" 
                          required
                          value={modalData.end_date || ''} 
                          onChange={e => setModalData({...modalData, end_date: e.target.value})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 uppercase">Status</label>
                      <select 
                        value={modalData.status || 'UPCOMING'} 
                        onChange={e => setModalData({...modalData, status: e.target.value})}
                        className="w-full mt-1.5 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="UPCOMING">Upcoming</option>
                        <option value="ACTIVE">Active</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 2. Window Fields */}
                {modalType === 'window' && (
                  <>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 uppercase">Semester</label>
                      <select 
                        disabled={modalMode === 'edit'}
                        value={modalData.semester || 'First Semester'} 
                        onChange={e => setModalData({...modalData, semester: e.target.value})}
                        className="w-full mt-1.5 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="First Semester">First Semester</option>
                        <option value="Second Semester">Second Semester</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">Start Month (1-12)</label>
                        <input 
                          type="number" 
                          min={1} max={12} required
                          value={modalData.start_month || ''} 
                          onChange={e => setModalData({...modalData, start_month: e.target.value})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">Start Day (1-31)</label>
                        <input 
                          type="number" 
                          min={1} max={31} required
                          value={modalData.start_day || ''} 
                          onChange={e => setModalData({...modalData, start_day: e.target.value})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">End Month (1-12)</label>
                        <input 
                          type="number" 
                          min={1} max={12} required
                          value={modalData.end_month || ''} 
                          onChange={e => setModalData({...modalData, end_month: e.target.value})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">End Day (1-31)</label>
                        <input 
                          type="number" 
                          min={1} max={31} required
                          value={modalData.end_day || ''} 
                          onChange={e => setModalData({...modalData, end_day: e.target.value})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl">
                      <div>
                        <span className="block text-xs font-extrabold text-slate-600">Allow Early Registration</span>
                        <span className="text-[10px] text-slate-500">Students may register early</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={modalData.allow_early_reg || false} 
                        onChange={e => setModalData({...modalData, allow_early_reg: e.target.checked})}
                        className="h-4 w-4 text-indigo-600 border-slate-300 rounded"
                      />
                    </div>
                    {modalData.allow_early_reg && (
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">Registration Lead Time (Days)</label>
                        <input 
                          type="number" 
                          min={1} required
                          value={modalData.reg_lead_time || ''} 
                          onChange={e => setModalData({...modalData, reg_lead_time: e.target.value})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* 3. Program Fields */}
                {modalType === 'program' && (
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase">Programme Name</label>
                    <input 
                      type="text" 
                      required
                      value={modalData.name || ''} 
                      onChange={e => setModalData({...modalData, name: e.target.value})}
                      className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                )}

                {/* 4. Course Fields */}
                {modalType === 'course' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">Course Code</label>
                        <input 
                          type="text" 
                          required
                          value={modalData.code || ''} 
                          onChange={e => setModalData({...modalData, code: e.target.value.toUpperCase()})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="e.g. CSC101"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">Course Units</label>
                        <input 
                          type="number" 
                          min={1} required
                          value={modalData.units || 3} 
                          onChange={e => setModalData({...modalData, units: e.target.value})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 uppercase">Course Title</label>
                      <input 
                        type="text" 
                        required
                        value={modalData.title || ''} 
                        onChange={e => setModalData({...modalData, title: e.target.value})}
                        className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="e.g. Introduction to Programming"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">Difficulty (1-5)</label>
                        <input 
                          type="number" 
                          min={1} max={5} step="0.1" required
                          value={modalData.difficulty || 3.0} 
                          onChange={e => setModalData({...modalData, difficulty: e.target.value})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">Level</label>
                        <input 
                          type="number" 
                          step="100" min={100} required
                          value={modalData.level || 100} 
                          onChange={e => setModalData({...modalData, level: e.target.value})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase">Semester</label>
                        <select 
                          value={modalData.semester || 1} 
                          onChange={e => setModalData({...modalData, semester: e.target.value})}
                          className="w-full mt-1.5 border border-slate-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* 5. Topic Fields */}
                {modalType === 'topic' && (
                  <>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 uppercase">Topic Name</label>
                      <input 
                        type="text" 
                        required
                        value={modalData.topic_name || ''} 
                        onChange={e => setModalData({...modalData, topic_name: e.target.value})}
                        className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="e.g. Memory Management"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 uppercase">Default Priority Weight</label>
                      <input 
                        type="number" 
                        min={0.1} max={10.0} step="0.1" required
                        value={modalData.default_weight || 1.0} 
                        onChange={e => setModalData({...modalData, default_weight: e.target.value})}
                        className="w-full mt-1.5 border border-slate-200 rounded-xl py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 mt-6 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalType('')}
                    className="flex-1 px-4 py-2.5 bg-slate-100 font-bold text-slate-700 text-sm rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white text-sm rounded-xl transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
