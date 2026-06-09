import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { 
    BrainCircuit, 
    Play, 
    FileText, 
    Search, 
    Filter, 
    ArrowUpDown, 
    Plus, 
    Edit2, 
    Trash2, 
    X, 
    ChevronLeft, 
    ChevronRight, 
    User, 
    LayoutGrid,
    ChevronDown,
    LogOut,
    Activity,
    BookOpen
} from 'lucide-react';

export default function CourseList() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filtering & Sorting & Pagination
    const [searchQuery, setSearchQuery] = useState('');
    const [riskFilter, setRiskFilter] = useState('ALL'); // ALL, HIGH, MED, LOW
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' }>({ key: 'code', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Modals & Menu state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [formData, setFormData] = useState({ code: '', title: '', units: 3, difficulty: 3 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            fetchCourses();
        }
    }, [user]);

    const fetchCourses = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('UserCourse')
                .select('*, course:Course(*, courseTopics:CourseTopic(*))')
                .eq('user_id', user.id)
                .eq('is_archived', false);
            if (error) throw error;
            setCourses(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedCourses = courses
        .filter(c => {
            const matchesSearch = 
                c.course?.code?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                c.course?.title?.toLowerCase().includes(searchQuery.toLowerCase());
            
            const diff = c.course?.difficulty || 0;
            const matchesRisk = 
                riskFilter === 'ALL' ? true : 
                riskFilter === 'HIGH' ? diff >= 4 : 
                riskFilter === 'MED' ? diff === 3 :
                diff <= 2;
            
            return matchesSearch && matchesRisk;
        })
        .sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1;
            let valA, valB;
            switch (sortConfig.key) {
                case 'code':
                    valA = a.course?.code || ''; valB = b.course?.code || ''; break;
                case 'title':
                    valA = a.course?.title || ''; valB = b.course?.title || ''; break;
                case 'units':
                    valA = a.course?.units || 0; valB = b.course?.units || 0; break;
                case 'difficulty':
                    valA = a.course?.difficulty || 0; valB = b.course?.difficulty || 0; break;
                default: 
                    return 0;
            }
            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            return 0;
        });

    // Pagination calculations
    const totalItems = filteredAndSortedCourses.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [filteredAndSortedCourses, totalPages, currentPage]);

    const paginatedCourses = filteredAndSortedCourses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);
        try {
            // Get profile details
            const { data: profile, error: profErr } = await supabase
                .from('AcademicProfile')
                .select('*')
                .eq('user_id', user.id)
                .single();
            if (profErr) throw profErr;

            // Get program
            const { data: program, error: progErr } = await supabase
                .from('Program')
                .select('id')
                .eq('name', profile.program)
                .single();
            if (progErr) throw progErr;

            // Insert course
            const { data: newCourse, error: courseErr } = await supabase
                .from('Course')
                .insert({
                    program_id: program.id,
                    code: formData.code,
                    title: formData.title,
                    units: parseInt(formData.units as any) || 3,
                    difficulty: parseFloat(formData.difficulty as any) || 3.0,
                    level: profile.level,
                    semester: profile.semester
                })
                .select()
                .single();
            if (courseErr) throw courseErr;

            // Insert userCourse
            const { error: userCourseErr } = await supabase
                .from('UserCourse')
                .insert({
                    user_id: user.id,
                    course_id: newCourse.id,
                    is_selected: true
                });
            if (userCourseErr) throw userCourseErr;

            // Insert default userTopic
            const { error: topicErr } = await supabase
                .from('UserTopic')
                .insert({
                    user_id: user.id,
                    course_id: newCourse.id,
                    topic_name: 'General Study',
                    mastery_level: 0.0,
                    is_selected: true
                });
            if (topicErr) throw topicErr;

            fetchCourses();
            setIsAddModalOpen(false);
            setFormData({ code: '', title: '', units: 3, difficulty: 3 });
        } catch(err) {
            console.error(err);
            alert("Failed to add course");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedCourse) return;
        setIsSubmitting(true);
        try {
            const { error: editErr } = await supabase
                .from('Course')
                .update({
                    code: formData.code,
                    title: formData.title,
                    units: parseInt(formData.units as any),
                    difficulty: parseFloat(formData.difficulty as any)
                })
                .eq('id', selectedCourse.course_id);
            if (editErr) throw editErr;

            fetchCourses();
            setIsEditModalOpen(false);
        } catch(err) {
            console.error(err);
            alert("Failed to edit course");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCourse = async () => {
        if(!selectedCourse) return;
        setIsSubmitting(true);
        try {
            const { error: deleteErr } = await supabase
                .from('UserCourse')
                .delete()
                .eq('id', selectedCourse.id);
            if (deleteErr) throw deleteErr;

            fetchCourses();
            setIsDeleteModalOpen(false);
        } catch(err) {
            console.error(err);
            alert("Failed to delete course");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEdit = (courseItem: any) => {
        setSelectedCourse(courseItem);
        setFormData({
            code: courseItem.course.code,
            title: courseItem.course.title,
            units: courseItem.course.units,
            difficulty: courseItem.course.difficulty
        });
        setIsEditModalOpen(true);
    };

    const openDelete = (courseItem: any) => {
        setSelectedCourse(courseItem);
        setIsDeleteModalOpen(true);
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-slate-500 font-medium">Loading courses...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-tr from-indigo-50/10 via-white to-blue-50/10">
            {/* Header Section with Softened Divider */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center relative">
                        {/* Logo Link */}
                        <div className="flex items-center gap-2">
                            <Link to="/dashboard" className="flex items-center gap-2">
                                <div className="bg-indigo-600 p-1.5 rounded-lg">
                                    <BrainCircuit className="text-white w-6 h-6" />
                                </div>
                                <span className="font-bold text-xl text-gray-900 tracking-tight">Nuero Plan</span>
                            </Link>
                        </div>
                        
                        {/* Centered Dashboard Button */}
                        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
                            <Link 
                                to="/dashboard" 
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-5 py-1.5 rounded-lg text-sm border border-indigo-100 hover:border-indigo-200 transition-all duration-200 hover:-translate-y-0.5 shadow-sm active:translate-y-0"
                            >
                                Dashboard
                            </Link>
                        </div>
                        
                        {/* Right Profile Dropdown (Same as Dashboard page) */}
                        <div className="relative flex items-center">
                            <button 
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                onBlur={() => setTimeout(() => setIsProfileMenuOpen(false), 200)}
                                className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors pr-2 pl-1 py-1 rounded-full border border-gray-200 cursor-pointer"
                            >
                                <div className="bg-indigo-100 p-1.5 rounded-full">
                                    <User className="w-4 h-4 text-indigo-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 hidden sm:block">Hello, {user?.name}</span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isProfileMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-56 sm:w-60 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="py-1 whitespace-nowrap">
                                        <button 
                                            onClick={() => navigate('/dashboard')}
                                            className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors hover:text-indigo-600 cursor-pointer text-left"
                                        >
                                            <BrainCircuit className="w-4 h-4 mr-2" />
                                            Dashboard
                                        </button>
                                        <button 
                                            onClick={() => navigate('/courses')}
                                            className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors hover:text-indigo-600 cursor-pointer text-left"
                                        >
                                            <BookOpen className="w-4 h-4 mr-2" />
                                            Curriculum Manager
                                        </button>
                                        <button 
                                            onClick={() => window.location.href = '/dashboard/tracker'}
                                            className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors hover:text-indigo-600 cursor-pointer text-left"
                                        >
                                            <Activity className="w-4 h-4 mr-2" />
                                            Mastery Insights
                                        </button>
                                        <button 
                                            onClick={() => navigate('/history')}
                                            className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors hover:text-indigo-600 cursor-pointer text-left"
                                        >
                                            <Activity className="w-4 h-4 mr-2" />
                                            Performance Analytics
                                        </button>
                                        <div className="h-px bg-gray-100 my-1"></div>
                                        <button 
                                            onClick={() => {
                                                setIsProfileMenuOpen(false);
                                                logout();
                                            }}
                                            className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                                        >
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8 space-y-6">
                {/* Title & Add Course */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Curriculum Manager</h1>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Managing academic performance and risk assessment.</p>
                    </div>
                    <button 
                        onClick={() => { setFormData({ code: '', title: '', units: 3, difficulty: 3 }); setIsAddModalOpen(true); }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition duration-200 font-bold shadow-md shadow-indigo-100 hover:-translate-y-0.5 active:translate-y-0 text-sm"
                    >
                        <Plus size={18} /> Add New Course
                    </button>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Search by code or title..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all focus:outline-none"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <div className="relative w-full sm:w-56">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <select 
                                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-700 appearance-none transition-all focus:outline-none"
                                value={riskFilter}
                                onChange={(e) => { setRiskFilter(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="ALL">All Risk Levels</option>
                                <option value="HIGH">High Risk (Level 4-5)</option>
                                <option value="MED">Medium Risk (Level 3)</option>
                                <option value="LOW">Low Risk (Level 1-2)</option>
                            </select>
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                                <ChevronRight size={14} className="rotate-90" />
                            </div>
                        </div>
                        <button className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl border border-slate-200 transition-all flex items-center justify-center shrink-0">
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                </div>

                {/* Table Component */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse hidden sm:table">
                            <thead className="bg-slate-50/75 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors w-[15%]"
                                        onClick={() => handleSort('code')}>
                                        <div className="flex items-center gap-1.5">Course Code <ArrowUpDown size={12} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors w-[40%]"
                                        onClick={() => handleSort('title')}>
                                        <div className="flex items-center gap-1.5">Title <ArrowUpDown size={12} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors w-[15%]"
                                        onClick={() => handleSort('units')}>
                                        <div className="flex items-center gap-1.5">Units <ArrowUpDown size={12} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors w-[15%]"
                                        onClick={() => handleSort('difficulty')}>
                                        <div className="flex items-center gap-1.5">Risk Factor <ArrowUpDown size={12} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-[15%]">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 relative">
                                {paginatedCourses.map((item) => {
                                    const diff = item.course?.difficulty || 0;
                                    const isHighRisk = diff >= 4;
                                    const isMedRisk = diff === 3;
                                    
                                    // Custom colors for different risk ranges to match design
                                    let riskTextClass = "text-indigo-600 font-semibold";
                                    let progressColorClass = "bg-indigo-500";
                                    let progressTrackClass = "bg-indigo-50";
                                    let showTriangle = false;

                                    if (isHighRisk) {
                                        riskTextClass = "text-red-500 font-bold flex items-center gap-1";
                                        progressColorClass = "bg-red-500";
                                        progressTrackClass = "bg-red-50";
                                        showTriangle = true;
                                    } else if (isMedRisk) {
                                        riskTextClass = "text-slate-500 font-semibold";
                                        progressColorClass = "bg-slate-400";
                                        progressTrackClass = "bg-slate-50";
                                    }

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/25 transition-colors group">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className="text-indigo-600 font-bold text-sm tracking-wide">
                                                    {item.course?.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{item.course?.title}</p>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5 text-slate-500 font-semibold text-sm">
                                                    <FileText size={15} className="text-slate-400"/> {item.course?.units} Units
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex flex-col gap-1 w-32">
                                                    <span className={`text-sm ${riskTextClass}`}>
                                                        {showTriangle && "▲ "}Level {diff}
                                                    </span>
                                                    <div className={`w-full h-1 rounded-full ${progressTrackClass} overflow-hidden mt-0.5`}>
                                                        <div className={`h-full rounded-full ${progressColorClass}`} style={{ width: `${(diff/5)*100}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                                                <div className="flex items-center justify-end gap-3.5">
                                                    <Link 
                                                        to={`/quiz/${item.id}`}
                                                        className="inline-flex items-center gap-1 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all duration-200"
                                                        title="Take Quiz"
                                                    >
                                                        <Play size={10} fill="currentColor" /> Quiz
                                                    </Link>
                                                    
                                                    <button onClick={() => openEdit(item)} className="text-slate-400 hover:text-indigo-600 p-1 rounded transition-colors" title="Edit Course">
                                                        <Edit2 size={15} />
                                                    </button>
                                                    
                                                    <button onClick={() => openDelete(item)} className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors" title="Remove Course">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {paginatedCourses.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center text-slate-400 bg-slate-50/20">
                                            <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                                                <FileText size={40} className="text-slate-300 mb-2"/>
                                                <p className="font-bold text-slate-800 text-sm">No courses matching filters</p>
                                                <p className="text-xs">Adjust your search keyword or risk filters to find courses.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Mobile Cards View */}
                        <div className="sm:hidden flex flex-col gap-4 p-4 bg-slate-50/50">
                            {paginatedCourses.map((item) => {
                                const diff = item.course?.difficulty || 0;
                                const isHighRisk = diff >= 4;
                                const isMedRisk = diff === 3;

                                let riskTextClass = "text-indigo-600 font-semibold";
                                let progressColorClass = "bg-indigo-500";
                                let progressTrackClass = "bg-indigo-50";
                                let showTriangle = false;

                                if (isHighRisk) {
                                    riskTextClass = "text-red-500 font-bold flex items-center gap-1";
                                    progressColorClass = "bg-red-500";
                                    progressTrackClass = "bg-red-50";
                                    showTriangle = true;
                                } else if (isMedRisk) {
                                    riskTextClass = "text-slate-500 font-semibold";
                                    progressColorClass = "bg-slate-400";
                                    progressTrackClass = "bg-slate-50";
                                }

                                return (
                                    <div key={item.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-indigo-600 font-extrabold text-xs block mb-1 tracking-wide">
                                                    {item.course?.code}
                                                </span>
                                                <h3 className="text-sm font-bold text-slate-900 leading-snug">{item.course?.title}</h3>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-1.5">
                                                <FileText size={14} className="text-slate-400"/>
                                                {item.course?.units} Units
                                            </div>
                                            <div className="flex flex-col gap-1 w-24">
                                                <span className={riskTextClass}>{showTriangle && "▲ "}Level {diff}</span>
                                                <div className={`w-full h-1 rounded-full ${progressTrackClass} overflow-hidden`}>
                                                    <div className={`h-full rounded-full ${progressColorClass}`} style={{ width: `${(diff/5)*100}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center pt-3 border-t border-slate-50 mt-2">
                                            <Link 
                                                to={`/quiz/${item.id}`}
                                                className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 font-bold text-xs flex-1 mr-4 shadow-sm"
                                            >
                                                <Play size={10} fill="currentColor" /> Take Quiz
                                            </Link>
                                            <div className="flex gap-2">
                                                <button onClick={() => openEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-xl transition-colors" title="Edit">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => openDelete(item)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 border border-slate-100 rounded-xl transition-colors" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {paginatedCourses.length === 0 && (
                                <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
                                    <div className="flex flex-col items-center justify-center gap-2 max-w-xs mx-auto">
                                        <FileText size={36} className="text-slate-200 mb-1"/>
                                        <p className="font-bold text-slate-800 text-sm">No courses found</p>
                                        <p className="text-xs">Adjust your search parameters.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Pagination Section (Modelled from Mockup) */}
                        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white border-t border-slate-100 gap-4">
                            <div className="text-xs font-bold text-slate-400">
                                Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} courses
                            </div>
                            
                            {/* Legend - Centered */}
                            <div className="flex items-center gap-5 text-xs font-bold text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                                    <span>High</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                                    <span>Med</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                    <span>Low</span>
                                </div>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex items-center gap-1.5">
                                <button 
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronLeft size={15} />
                                </button>
                                
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            currentPage === page 
                                                ? 'bg-[#7C3AED] text-white shadow-sm shadow-indigo-100' 
                                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button 
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Course Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-indigo-600" /> Add New Course
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddCourse} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Course Code</label>
                                <input required type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all text-sm outline-none" placeholder="e.g. MTH102"
                                    value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Course Title</label>
                                <input required type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all text-sm outline-none" placeholder="e.g. Calculus II"
                                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Units</label>
                                    <input required type="number" min="1" max="10" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all text-sm outline-none font-medium text-slate-700"
                                        value={formData.units} onChange={e => setFormData({...formData, units: parseInt(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Difficulty (1-5)</label>
                                    <input required type="number" step="0.1" min="1" max="5" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all text-sm outline-none font-medium text-slate-700"
                                        value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: parseFloat(e.target.value)})} />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
                                    {isSubmitting ? 'Saving...' : 'Add Course'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Course Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-indigo-600" /> Edit Course
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditCourse} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Course Code</label>
                                <input required type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all text-sm outline-none"
                                    value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Course Title</label>
                                <input required type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all text-sm outline-none"
                                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Units</label>
                                    <input required type="number" min="1" max="10" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all text-sm outline-none font-medium text-slate-700"
                                        value={formData.units} onChange={e => setFormData({...formData, units: parseInt(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Difficulty (1-5)</label>
                                    <input required type="number" step="0.1" min="1" max="5" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all text-sm outline-none font-medium text-slate-700"
                                        value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: parseFloat(e.target.value)})} />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-center p-6 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-7 h-7 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Remove Course?</h3>
                        <p className="text-sm text-slate-500 mb-6 font-medium">Are you sure you want to remove <strong className="text-slate-950">{selectedCourse?.course?.code}</strong> from your curriculum? This action cannot be undone and will delete related study plans.</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDeleteCourse}
                                disabled={isSubmitting}
                                className="w-full px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {isSubmitting ? 'Removing...' : 'Yes, Remove Course'}
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="w-full px-4 py-3 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
