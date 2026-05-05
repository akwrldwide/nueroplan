import { Link, useNavigate } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { BrainCircuit, Target, Clock, BarChart3, ArrowRight } from 'lucide-react';

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
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-1.5 rounded-lg">
                                <BrainCircuit className="text-white w-6 h-6" />
                            </div>
                            <span className="font-bold text-xl text-gray-900 tracking-tight">Nuero Plan</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition">Log in</Link>
                            <Link to="/register" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">Get Started</Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1">
                {/* Hero Section */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 text-center">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
                        Study Smarter, Not Harder with <span className="text-indigo-600">Nuero Plan</span>
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
                        A Curriculum-Aware Adaptive Academic Planning System that uses intelligent decision logic to dynamically allocate your study time for maximum results.
                    </p>
                    <div className="flex justify-center gap-4 flex-col sm:flex-row">
                        <Link to="/register" className="inline-flex justify-center items-center px-8 py-3.5 border border-transparent text-lg font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                            Start Planning Now <ArrowRight className="ml-2 w-5 h-5" />
                        </Link>
                    </div>
                </div>

                {/* Feature Highlights */}
                <div className="bg-white py-20 border-t border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 text-center hover:shadow-md transition-shadow">
                                <div className="bg-blue-100 text-blue-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Target className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Goal-Oriented Allocation</h3>
                                <p className="text-gray-500">Whether you are aiming for a First Class or just want to pass, our engine adjusts your priority weightings automatically.</p>
                            </div>
                            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 text-center hover:shadow-md transition-shadow">
                                <div className="bg-emerald-100 text-emerald-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Clock className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Adaptive Scheduling</h3>
                                <p className="text-gray-500">Input your available hours and let Nuero Plan dynamically distribute study sessions based on course difficulty and exam proximity.</p>
                            </div>
                            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100 text-center hover:shadow-md transition-shadow">
                                <div className="bg-orange-100 text-orange-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <BarChart3 className="w-7 h-7" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Continuous Assessment</h3>
                                <p className="text-gray-500">Take quick module quizzes to feed data back into our Risk Engine, dynamically altering your study plan week by week.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-gray-50 py-8 border-t border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-400 text-sm">© 2026 Nuero Plan. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
