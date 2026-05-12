import { Link, useNavigate } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BrainCircuit, Target, Clock, BarChart3, ArrowRight, ShieldCheck, CheckCircle2, CalendarDays, Activity, Flame } from 'lucide-react';

export default function Landing() {
    const { user, loading } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            if (user.onboarding_stage !== 'COMPLETE') {
                navigate('/onboarding');
            } else {
                navigate('/dashboard');
            }
        }
    }, [user, loading, navigate]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-md shadow-indigo-200">
                                <BrainCircuit className="text-white w-6 h-6" />
                            </div>
                            <span className="font-bold text-xl text-gray-900 tracking-tight">Nuero Plan</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition">Log in</Link>
                            <Link to="/register" className="text-sm font-medium bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-2 rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md shadow-indigo-200 hover:-translate-y-0.5">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 relative">
                {/* Background Blobs */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                    <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-200/50 blur-[100px] mix-blend-multiply"></div>
                    <div className="absolute top-[30%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-200/50 blur-[100px] mix-blend-multiply"></div>
                </div>

                {/* Split Hero Section */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* Left Side: Content */}
                        <div className="animate-fade-in text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-semibold mb-6">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Built for students aiming for top academic performance</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-[1.1]">
                                Plan Your Semester Like a <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">Top Student</span>
                            </h1>
                            <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto lg:mx-0">
                                AI-powered study planning that adapts to your courses, exams, and availability. Stop cramming, start optimizing.
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Link to="/register" className="inline-flex justify-center items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1">
                                    Start Your Smart Study Plan <ArrowRight className="ml-2 w-5 h-5" />
                                </Link>
                                <button className="inline-flex justify-center items-center px-8 py-4 border-2 border-gray-200 text-lg font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all">
                                    See How It Works
                                </button>
                            </div>

                            <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-500 font-medium">
                                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Free to start</div>
                                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> No credit card needed</div>
                            </div>
                        </div>

                        {/* Right Side: Visual Mockup */}
                        <div className="relative animate-float hidden md:block">
                            <div className="relative rounded-2xl bg-white border border-gray-200 shadow-2xl p-6 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                                {/* Header Mockup */}
                                <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <span className="font-bold text-indigo-700">JD</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Dashboard</h3>
                                            <p className="text-xs text-gray-500">Week 5 • Computer Science</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                        <Flame className="w-4 h-4 text-orange-500" />
                                        <span className="font-semibold text-gray-700">12 Day Streak</span>
                                    </div>
                                </div>

                                {/* Body Mockup */}
                                <div className="grid grid-cols-3 gap-6">
                                    {/* Smart Study Plan (Primary) */}
                                    <div className="col-span-2 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-gray-800">Today's Smart Plan</h4>
                                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Optimized</span>
                                        </div>
                                        
                                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-4 rounded-xl shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="text-xs font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-md mb-1 inline-block">High Priority</span>
                                                    <h5 className="font-bold text-gray-900 text-lg">Algorithms Revision</h5>
                                                    <p className="text-sm text-gray-600">Graph Theory & Dynamic Programming</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-indigo-700">2.5 hrs</p>
                                                    <p className="text-xs text-gray-500">14:00 - 16:30</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 w-full bg-indigo-200/50 h-2 rounded-full overflow-hidden">
                                                <div className="bg-indigo-600 h-full w-2/3 rounded-full"></div>
                                            </div>
                                        </div>

                                        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md mb-1 inline-block">Medium Priority</span>
                                                    <h5 className="font-bold text-gray-800">Database Systems</h5>
                                                    <p className="text-sm text-gray-500">SQL Practice Quiz</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-700">1.0 hr</p>
                                                    <p className="text-xs text-gray-400">17:00 - 18:00</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sidebar (Performance & Calendar) */}
                                    <div className="col-span-1 space-y-4">
                                        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Activity className="w-5 h-5 text-emerald-500" />
                                                <h4 className="font-bold text-gray-800 text-sm">Exam Risk</h4>
                                            </div>
                                            <div className="relative w-24 h-24 mx-auto mb-2">
                                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                                    <path className="text-gray-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                    <path className="text-emerald-500" strokeWidth="4" strokeDasharray="80, 100" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                                    <span className="font-bold text-xl text-gray-800">Low</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl shadow-sm flex items-center gap-3">
                                            <div className="bg-indigo-100 p-2 rounded-lg">
                                                <CalendarDays className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-semibold">Next Exam</p>
                                                <p className="font-bold text-gray-900 text-sm">14 Days</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feature Highlights */}
                <div className="bg-white py-24 border-t border-gray-100 relative z-10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">A complete system for academic success</h2>
                            <p className="text-gray-500 text-lg">Nuero Plan doesn't just build a schedule; it builds a strategy tailored entirely to your specific goals and curriculum.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="group bg-white p-8 rounded-2xl border border-gray-100 text-center shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                                <div className="bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <Target className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Goal-Oriented AI</h3>
                                <p className="text-gray-500 leading-relaxed">Our engine adjusts priority weightings automatically based on whether you're aiming for a First Class or just need to pass safely.</p>
                            </div>
                            
                            <div className="group bg-white p-8 rounded-2xl border border-gray-100 text-center shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                                <div className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <Clock className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Adaptive Scheduling</h3>
                                <p className="text-gray-500 leading-relaxed">Input your free hours and let Nuero Plan dynamically distribute study sessions based on course difficulty and exam proximity.</p>
                            </div>
                            
                            <div className="group bg-white p-8 rounded-2xl border border-gray-100 text-center shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                                <div className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <BarChart3 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Continuous Assessment</h3>
                                <p className="text-gray-500 leading-relaxed">Take quick module quizzes to feed data back into our Risk Engine, altering your study plan week by week automatically.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-white py-12 border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="text-indigo-600 w-6 h-6" />
                        <span className="font-bold text-xl text-gray-900 tracking-tight">Nuero Plan</span>
                    </div>
                    <p className="text-gray-400 text-sm">© 2026 Nuero Plan. All rights reserved.</p>
                    <div className="flex gap-4">
                        <span className="text-sm text-gray-500 hover:text-gray-900 cursor-pointer">Privacy</span>
                        <span className="text-sm text-gray-500 hover:text-gray-900 cursor-pointer">Terms</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
