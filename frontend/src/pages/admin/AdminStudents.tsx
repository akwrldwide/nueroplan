import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { adminFetch } from '../../utils/adminApi';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  Search, 
  User, 
  Sliders, 
  RotateCw,
  X,
  Calendar,
  Loader2,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Layers,
  GraduationCap,
  Key
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  onboarding_stage: string;
  created_at: string;
  academicProfile?: {
    program: string;
    level: number;
    semester: number;
    academic_goal: string;
    current_cgpa: number | null;
  } | null;
}

export default function AdminStudents() {
  const { token } = useContext(AuthContext);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Profile Inspect Modal States
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [recalculatingPlan, setRecalculatingPlan] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Accordion Expand States for nested tree display
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({});
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({}); // key: program-level
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({}); // key: program-level-semester

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const url = searchTerm ? `/students?search=${encodeURIComponent(searchTerm)}` : '/students';
      const data = await adminFetch(url, token);
      setStudents(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to retrieve students directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchStudents();
  }, [token, searchTerm]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };

  // Profile Inspect Actions
  const handleInspectProfile = async (id: string) => {
    setSelectedStudentId(id);
    setLoadingProfile(true);
    try {
      const data = await adminFetch(`/students/${id}`, token);
      setProfileData(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load student profile details.');
      setSelectedStudentId(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleToggleActive = async (student: Student) => {
    const actionText = student.is_active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${actionText} this student's account?`)) return;
    try {
      await adminFetch(`/students/${student.id}/active`, token, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !student.is_active })
      });
      
      // Update local state
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_active: !s.is_active } : s));
      
      if (profileData && profileData.id === student.id) {
        setProfileData((prev: any) => ({ ...prev, is_active: !prev.is_active }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update account active status.');
    }
  };

  const handleRegeneratePlan = async (studentId: string) => {
    setRecalculatingPlan(true);
    try {
      await adminFetch(`/students/${studentId}/regenerate-plan`, token, {
        method: 'POST'
      });
      alert('✓ Study plan successfully regenerated and balanced by the NeuroPlan engine!');
      // Reload inspect profile
      handleInspectProfile(studentId);
    } catch (err: any) {
      alert(err.message || 'Error occurred during plan regeneration.');
    } finally {
      setRecalculatingPlan(false);
    }
  };

  const handleResetPassword = async (studentId: string) => {
    if (!confirm("Are you sure you want to reset this student's password? A temporary password will be generated and emailed to them.")) return;
    setResettingPassword(true);
    try {
      const res = await adminFetch(`/students/${studentId}/reset-password`, token, {
        method: 'POST'
      });
      alert(`✓ Password successfully reset!\nTemporary password: ${res.temporaryPassword}\nEmail notification sent.`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to reset password.');
    } finally {
      setResettingPassword(false);
    }
  };

  // Calculations for profile inspect modal
  const calculateInspectStats = () => {
    if (!profileData) return null;
    
    // 1. Average Quiz Score
    const scores = profileData.quizResults?.map((r: any) => r.score_percentage) || [];
    const avgQuizScore = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : 'No Data';

    // 2. Average Mastery
    const masteryLevels = profileData.userTopics?.map((t: any) => t.mastery_level) || [];
    const avgMastery = masteryLevels.length > 0 ? ((masteryLevels.reduce((a: number, b: number) => a + b, 0) / masteryLevels.length) * 100).toFixed(1) : '0.0';

    // 3. Logged Study Hours
    let totalHours = 0;
    if (profileData.studyPlans) {
      profileData.studyPlans.forEach((plan: any) => {
        if (plan.sessions) {
          plan.sessions.forEach((s: any) => {
            if (s.completed) totalHours += s.allocated_hours;
          });
        }
      });
    }

    // 4. Current Risk Factor
    let riskLevel = 'Low';
    let riskColor = 'text-emerald-600 bg-emerald-50';
    
    const quizAverage = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length) / 100 : 0.5;
    const consistencyScore = 0.8; // default fallback consistency
    const risk = ((1 - quizAverage) * 0.6) + ((1 - consistencyScore) * 0.4);

    if (risk > 0.65) {
      riskLevel = 'High';
      riskColor = 'text-red-700 bg-red-50 border border-red-100';
    } else if (risk >= 0.35) {
      riskLevel = 'Medium';
      riskColor = 'text-amber-700 bg-amber-50 border border-amber-100';
    } else {
      riskLevel = 'Low';
      riskColor = 'text-emerald-700 bg-emerald-50 border border-emerald-100';
    }

    return {
      avgQuizScore,
      avgMastery,
      totalHours: totalHours.toFixed(1),
      riskLevel,
      riskColor
    };
  };

  const inspectStats = calculateInspectStats();

  if (loading && students.length === 0) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading Student Directory...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Student Directory</h1>
          <p className="text-slate-500 mt-1">Audit students performance metrics, toggle accounts, and trigger plan updates.</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        {/* Search controls */}
        <form onSubmit={handleSearchSubmit} className="flex gap-4 max-w-md bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex-1 flex items-center gap-2 pl-3">
            <Search className="h-5 w-5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-sm text-slate-700 focus:outline-none bg-transparent"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Search
          </button>
        </form>

        {/* Nested Drill-Down Grouping / Flat Search View */}
        {!searchTerm ? (() => {
          // Group students dynamically by Program -> Level -> Semester
          const groupedStudents: Record<string, Record<number, Record<number, Student[]>>> = {};

          students.forEach(student => {
            const prog = student.academicProfile?.program || 'Unenrolled';
            const lvl = student.academicProfile?.level || 100;
            const sem = student.academicProfile?.semester || 1;

            if (!groupedStudents[prog]) {
              groupedStudents[prog] = {};
            }
            if (!groupedStudents[prog][lvl]) {
              groupedStudents[prog][lvl] = {};
            }
            if (!groupedStudents[prog][lvl][sem]) {
              groupedStudents[prog][lvl][sem] = [];
            }
            groupedStudents[prog][lvl][sem].push(student);
          });

          return (
            <div className="space-y-4">
              {Object.keys(groupedStudents).map(program => {
                const programExpanded = !!expandedPrograms[program];
                const levelsObj = groupedStudents[program];
                // count total students in this program
                let programStudentCount = 0;
                Object.keys(levelsObj).forEach(l => {
                  const lvlNum = parseInt(l);
                  Object.keys(levelsObj[lvlNum]).forEach(s => {
                    const semNum = parseInt(s);
                    programStudentCount += levelsObj[lvlNum][semNum].length;
                  });
                });

                return (
                  <div key={program} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all">
                    {/* Programme Header */}
                    <button
                      onClick={() => setExpandedPrograms(prev => ({ ...prev, [program]: !prev[program] }))}
                      className="w-full flex items-center justify-between px-6 py-4 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <GraduationCap className="h-5 w-5 text-indigo-650" />
                        <span className="font-extrabold text-slate-800 text-sm">{program}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-100">
                          {programStudentCount} {programStudentCount === 1 ? 'Student' : 'Students'}
                        </span>
                        {programExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                      </div>
                    </button>

                    {/* Programme Levels */}
                    {programExpanded && (
                      <div className="divide-y divide-slate-100 bg-white">
                        {Object.keys(levelsObj).map(levelKey => {
                          const level = parseInt(levelKey);
                          const levelExpandedKey = `${program}-${level}`;
                          const levelExpanded = !!expandedLevels[levelExpandedKey];
                          const semestersObj = levelsObj[level];

                          let levelStudentCount = 0;
                          Object.keys(semestersObj).forEach(s => {
                            const semNum = parseInt(s);
                            levelStudentCount += semestersObj[semNum].length;
                          });

                          return (
                            <div key={level} className="pl-6">
                              {/* Level Header */}
                              <button
                                onClick={() => setExpandedLevels(prev => ({ ...prev, [levelExpandedKey]: !prev[levelExpandedKey] }))}
                                className="w-full flex items-center justify-between py-3.5 pr-6 hover:bg-slate-50/30 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4.5 w-4.5 text-slate-400" />
                                  <span className="font-extrabold text-slate-700 text-xs">{level} Level</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {levelStudentCount} {levelStudentCount === 1 ? 'Student' : 'Students'}
                                  </span>
                                  {levelExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                                </div>
                              </button>

                              {/* Level Semesters */}
                              {levelExpanded && (
                                <div className="divide-y divide-slate-100 pl-4 pb-2">
                                  {Object.keys(semestersObj).map(semKey => {
                                    const semester = parseInt(semKey);
                                    const semesterExpandedKey = `${program}-${level}-${semester}`;
                                    const semesterExpanded = !!expandedSemesters[semesterExpandedKey];
                                    const studentList = semestersObj[semester];

                                    return (
                                      <div key={semester} className="pr-6 py-2.5">
                                        {/* Semester Header */}
                                        <button
                                          onClick={() => setExpandedSemesters(prev => ({ ...prev, [semesterExpandedKey]: !prev[semesterExpandedKey] }))}
                                          className="w-full flex items-center justify-between py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                          <span>Semester {semester} ({studentList.length})</span>
                                          {semesterExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                        </button>

                                        {/* Semester Students List */}
                                        {semesterExpanded && (
                                          <div className="mt-3 bg-slate-50/30 border border-slate-100 rounded-2xl overflow-hidden">
                                            <table className="w-full border-collapse">
                                              <thead>
                                                <tr className="bg-slate-50/80 text-slate-500 text-left text-[10px] uppercase tracking-wider font-bold border-b border-slate-100">
                                                  <th className="px-4 py-2.5">Student</th>
                                                  <th className="px-4 py-2.5">Registered</th>
                                                  <th className="px-4 py-2.5 text-center">Status</th>
                                                  <th className="px-4 py-2.5 text-right">Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-100 bg-white">
                                                {studentList.map(s => (
                                                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-4 py-3 flex items-center gap-3">
                                                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-650 flex items-center justify-center font-bold text-xs">
                                                        {s.name.substring(0,2).toUpperCase()}
                                                      </div>
                                                      <div>
                                                        <div className="font-extrabold text-slate-800 text-xs">{s.name}</div>
                                                        <div className="text-[10px] text-slate-400">{s.email}</div>
                                                      </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-500">
                                                      {new Date(s.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        s.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                                                      }`}>
                                                        {s.is_active ? 'Active' : 'Deactivated'}
                                                      </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                      <div className="flex justify-end gap-2">
                                                        <button
                                                          onClick={() => handleInspectProfile(s.id)}
                                                          className="text-[10px] font-bold text-indigo-650 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer border border-transparent"
                                                        >
                                                          Inspect
                                                        </button>
                                                        <button
                                                          onClick={() => handleToggleActive(s)}
                                                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                                            s.is_active 
                                                              ? 'text-slate-400 hover:text-red-500 hover:bg-slate-100' 
                                                              : 'text-emerald-600 hover:text-emerald-850 hover:bg-emerald-50'
                                                          }`}
                                                          title={s.is_active ? 'Deactivate Account' : 'Activate Account'}
                                                        >
                                                          {s.is_active ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                                        </button>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
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
              {Object.keys(groupedStudents).length === 0 && (
                <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm text-center text-slate-400 font-medium">
                  No students enrolled in any academic programme yet.
                </div>
              )}
            </div>
          );
        })() : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wider font-bold border-b border-slate-100">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Academic Details</th>
                  <th className="px-6 py-4">Registered</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-650 flex items-center justify-center font-bold">
                        {s.name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800 text-sm">{s.name}</div>
                        <div className="text-xs text-slate-400">{s.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {s.academicProfile ? (
                        <div>
                          <div className="font-semibold text-slate-700 truncate max-w-xs">{s.academicProfile.program}</div>
                          <div className="text-xs text-slate-500">
                            {s.academicProfile.level}L • Sem {s.academicProfile.semester}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No academic profile</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        s.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {s.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2.5">
                        <button
                          onClick={() => handleInspectProfile(s.id)}
                          className="text-xs font-bold text-indigo-650 hover:text-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer border border-transparent hover:border-indigo-200"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => handleToggleActive(s)}
                          className={`p-2 rounded-lg transition-colors cursor-pointer ${
                            s.is_active 
                              ? 'text-slate-400 hover:text-red-500 hover:bg-slate-100' 
                              : 'text-emerald-600 hover:text-emerald-850 hover:bg-emerald-50'
                          }`}
                          title={s.is_active ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {s.is_active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                      No students found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PROFILE INSPECT MODAL */}
        {selectedStudentId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-8">
              {/* Modal Header */}
              <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <User className="h-6 w-6 text-indigo-400" />
                  <div>
                    <h3 className="font-extrabold text-lg tracking-tight">
                      {loadingProfile ? 'Loading Student Data...' : profileData?.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Student Progress Audit</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudentId(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              {loadingProfile ? (
                <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                  <p className="text-sm font-medium">Retrieving student performance records...</p>
                </div>
              ) : profileData && (
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Summary Profile Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Quiz Average</span>
                      <p className="text-xl font-black text-slate-800 mt-1">{inspectStats?.avgQuizScore}%</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Avg Mastery</span>
                      <p className="text-xl font-black text-slate-800 mt-1">{inspectStats?.avgMastery}%</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Study Hours</span>
                      <p className="text-xl font-black text-slate-800 mt-1">{inspectStats?.totalHours} hrs</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Academic Risk</span>
                      <p className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1.5 ${inspectStats?.riskColor}`}>
                        {inspectStats?.riskLevel} Risk
                      </p>
                    </div>
                  </div>

                  {/* Profile info & Goal */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3.5">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Programme & Path</h4>
                      <div className="text-sm text-slate-600 space-y-1.5">
                        <p><strong>Programme:</strong> {profileData.academicProfile?.program || 'Unenrolled'}</p>
                        <p><strong>Level & Semester:</strong> {profileData.academicProfile?.level}L • Semester {profileData.academicProfile?.semester}</p>
                        <p><strong>Goal Target:</strong> {profileData.academicProfile?.academic_goal || 'None Set'}</p>
                        <p>
                          <strong>CGPA:</strong> {profileData.academicProfile?.current_cgpa !== null ? profileData.academicProfile?.current_cgpa : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 bg-indigo-50/20 p-5 rounded-2xl border border-indigo-50/40 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-indigo-950 text-sm flex items-center gap-1.5">
                          <Sliders className="h-4.5 w-4.5 text-indigo-600" /> Administrative Tuning
                        </h4>
                        <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                          Force the algorithm scheduler to instantly rebuild and prioritize the student's study plan based on their active weights.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 mt-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRegeneratePlan(profileData.id)}
                            disabled={recalculatingPlan}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {recalculatingPlan ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Regenerating...
                              </>
                            ) : (
                              <>
                                <RotateCw className="h-4 w-4" /> Regenerate Study Plan
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleActive(profileData)}
                            className={`flex-1 flex items-center justify-center gap-1.5 border font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer ${
                              profileData.is_active 
                                ? 'border-red-200 text-red-600 hover:bg-red-50' 
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {profileData.is_active ? (
                              <>
                                <Lock className="h-4 w-4" /> Deactivate Account
                              </>
                            ) : (
                              <>
                                <Unlock className="h-4 w-4" /> Activate Account
                              </>
                            )}
                          </button>
                        </div>
                        <button
                          onClick={() => handleResetPassword(profileData.id)}
                          disabled={resettingPassword}
                          className="w-full flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        >
                          {resettingPassword ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" /> Resetting...
                            </>
                          ) : (
                            <>
                              <Key className="h-4 w-4 text-indigo-500" /> Reset Password
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Syllabus / Courses Details */}
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">Enrolled Courses</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profileData.userCourses?.map((uc: any) => (
                        <div key={uc.id} className="border border-slate-100 p-4 rounded-xl bg-white shadow-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-extrabold text-slate-800 text-xs">{uc.course?.code}</div>
                              <div className="text-slate-500 text-xs font-semibold mt-0.5 line-clamp-1">{uc.course?.title}</div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${uc.is_completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              {uc.is_completed ? 'Completed' : 'Active'}
                            </span>
                          </div>
                          {uc.exam_date && (
                            <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Exam: {new Date(uc.exam_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                      {profileData.userCourses?.length === 0 && (
                        <p className="text-slate-400 text-xs italic py-2">No active course enrollments.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
