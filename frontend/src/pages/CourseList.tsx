import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BrainCircuit, PlayCircle, BookOpen, Search, Filter, ArrowUpDown, Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';

export default function CourseList() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filtering & Sorting
    const [searchQuery, setSearchQuery] = useState('');
    const [riskFilter, setRiskFilter] = useState('ALL'); // ALL, HIGH, NORMAL
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' }>({ key: 'title', direction: 'asc' });

    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [formData, setFormData] = useState({ code: '', title: '', units: 3, difficulty: 3 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/courses');
            setCourses(res.data);
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
            const matchesSearch = c.course?.code?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  c.course?.title?.toLowerCase().includes(searchQuery.toLowerCase());
            const diff = c.course?.difficulty || 0;
            const matchesRisk = riskFilter === 'ALL' ? true : 
                                riskFilter === 'HIGH' ? diff >= 4 : 
                                diff < 4;
            return matchesSearch && matchesRisk;
        })
        .sort((a, b) => {
            const dir = sortConfig.direction === 'asc' ? 1 : -1;
            let valA, valB;
            switch (sortConfig.key) {
                case 'code':
                    valA = a.course?.code; valB = b.course?.code; break;
                case 'title':
                    valA = a.course?.title; valB = b.course?.title; break;
                case 'units':
                    valA = a.course?.units; valB = b.course?.units; break;
                case 'difficulty':
                    valA = a.course?.difficulty; valB = b.course?.difficulty; break;
                default: 
                    return 0;
            }
            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            return 0;
        });

    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post('/api/courses/custom', formData);
            fetchCourses();
            setIsAddModalOpen(false);
            setFormData({ code: '', title: '', units: 3, difficulty: 3 });
        } catch(err) {
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
            await axios.put(`/api/courses/custom/${selectedCourse.id}`, formData);
            fetchCourses();
            setIsEditModalOpen(false);
        } catch(err) {
            alert("Failed to edit course");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCourse = async () => {
        if(!selectedCourse) return;
        setIsSubmitting(true);
        try {
            await axios.delete(`/api/courses/user-course/${selectedCourse.id}`);
            fetchCourses();
            setIsDeleteModalOpen(false);
        } catch(err) {
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

    if (loading) return <div className="h-screen flex items-center justify-center text-gray-500">Loading courses...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link to="/dashboard" className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-1.5 rounded-lg">
                                <BrainCircuit className="text-white w-6 h-6" />
                            </div>
                            <span className="font-bold text-xl text-gray-900 tracking-tight">Nuero Plan</span>
                        </Link>
                        <div className="flex items-center gap-6">
                            <Link to="/dashboard" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition">Dashboard</Link>
                            <Link to="/courses" className="text-sm font-medium text-indigo-600 transition">Curriculum Manager</Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Curriculum Manager</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage your enrolled courses, view risk factors, and access module quizzes.</p>
                    </div>
                    <button 
                        onClick={() => { setFormData({ code: '', title: '', units: 3, difficulty: 3 }); setIsAddModalOpen(true); }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition font-semibold shadow-sm"
                    >
                        <Plus size={18} /> Add New Course
                    </button>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Search by code or title..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="text-gray-400 w-5 h-5" />
                        <select 
                            className="w-full md:w-auto border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-gray-700"
                            value={riskFilter}
                            onChange={(e) => setRiskFilter(e.target.value)}
                        >
                            <option value="ALL">All Risk Levels</option>
                            <option value="HIGH">High Risk (Diff ≥ 4)</option>
                            <option value="NORMAL">Normal Risk (Diff &lt; 4)</option>
                        </select>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('code')}>
                                        <div className="flex items-center gap-2">Course Code <ArrowUpDown size={14}/></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors w-1/3"
                                        onClick={() => handleSort('title')}>
                                        <div className="flex items-center gap-2">Title <ArrowUpDown size={14}/></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors text-center"
                                        onClick={() => handleSort('units')}>
                                        <div className="flex items-center justify-center gap-2 text-center">Units <ArrowUpDown size={14}/></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => handleSort('difficulty')}>
                                        <div className="flex items-center gap-2">Risk Factor <ArrowUpDown size={14}/></div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 relative">
                                {filteredAndSortedCourses.map((item) => {
                                    const diff = item.course?.difficulty || 0;
                                    const isHighRisk = diff >= 4;
                                    
                                    return (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 font-bold rounded-lg text-sm border border-indigo-100">
                                                {item.course?.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{item.course?.title}</p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-200 text-sm text-center">
                                                <BookOpen size={14} className="text-gray-400"/> {item.course?.units}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-900">Level {diff}</span>
                                                    {isHighRisk && (
                                                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-0.5 font-bold rounded text-xs border border-red-100">
                                                            <AlertTriangle size={12}/> High Risk
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1 inline-block">
                                                    <div className={`h-full rounded-full ${isHighRisk ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${(diff/5)*100}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-center gap-3">
                                                <Link 
                                                    to={`/quiz/${item.id}`}
                                                    className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors border border-indigo-100 hover:border-indigo-600 flex items-center justify-center gap-2 font-semibold"
                                                    title="Take Quiz"
                                                >
                                                    <PlayCircle size={16} /> <span className="hidden lg:inline text-xs">Quiz</span>
                                                </Link>
                                                <button onClick={() => openEdit(item)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Edit Course">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => openDelete(item)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Remove Course">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                                {filteredAndSortedCourses.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-gray-500 bg-gray-50/50">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <BookOpen size={32} className="text-gray-300 mb-2"/>
                                                <p className="font-medium text-gray-600">No courses found</p>
                                                <p className="text-sm">Try adjusting your search or add a new custom course.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Add Course Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-indigo-600" /> Add New Course
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddCourse} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Course Code</label>
                                <input required type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition" placeholder="e.g. CS101"
                                    value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Course Title</label>
                                <input required type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition" placeholder="e.g. Intro to Computer Science"
                                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Units</label>
                                    <input required type="number" min="1" max="10" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition"
                                        value={formData.units} onChange={e => setFormData({...formData, units: parseInt(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Difficulty (1-5)</label>
                                    <input required type="number" step="0.1" min="1" max="5" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition"
                                        value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: parseFloat(e.target.value)})} />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                    {isSubmitting ? 'Saving...' : 'Add Course'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Course Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-indigo-600" /> Edit Course
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditCourse} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Course Code</label>
                                <input required type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition"
                                    value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Course Title</label>
                                <input required type="text" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition"
                                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Units</label>
                                    <input required type="number" min="1" max="10" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition"
                                        value={formData.units} onChange={e => setFormData({...formData, units: parseInt(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Difficulty (1-5)</label>
                                    <input required type="number" step="0.1" min="1" max="5" className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition"
                                        value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: parseFloat(e.target.value)})} />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-center p-6 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Course?</h3>
                        <p className="text-sm text-gray-500 mb-6 font-medium">Are you sure you want to remove <strong className="text-gray-900">{selectedCourse?.course?.code}</strong> from your curriculum? This action cannot be undone and will delete related study plans.</p>
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
                                className="w-full px-4 py-3 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
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
