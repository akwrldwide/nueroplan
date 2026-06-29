import type { ReactNode } from 'react';
import { BrainCircuit, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
    children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 font-sans">
            {/* Left Panel */}
            <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-12 flex-col justify-between relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
                    <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500 blur-3xl mix-blend-screen"></div>
                    <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-500 blur-3xl mix-blend-screen"></div>
                </div>

                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-2 mb-16 inline-flex">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
                            <BrainCircuit className="text-white w-8 h-8" />
                        </div>
                        <span className="font-bold text-2xl tracking-tight">NeuroPlan</span>
                    </Link>

                    <div className="max-w-md mt-12 animate-fade-in">
                        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                            Build a smarter study system.
                        </h1>
                        <p className="text-indigo-100 text-lg mb-8">
                            Join thousands of students who are optimizing their academic performance with AI-driven planning.
                        </p>

                        <div className="space-y-4">
                            {[
                                'Adaptive scheduling based on your energy',
                                'Exam-aware planning to prevent cramming',
                                'Real-time performance tracking & analytics'
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 text-indigo-50">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-300 shrink-0" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="relative z-10 mt-16 pb-8">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-xl">
                                AI
                            </div>
                            <div>
                                <p className="font-medium">Curriculum Engine</p>
                                <p className="text-indigo-200 text-sm">Active & Learning</p>
                            </div>
                        </div>
                        <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-400 to-indigo-400 h-full w-3/4 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel (Form Container) */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-20 py-8 sm:py-12 bg-white relative animate-fade-in">
                {/* Mobile Header (visible only on small screens) */}
                <div className="md:hidden flex items-center justify-center gap-2 mb-8">
                    <div className="bg-indigo-600 p-2 rounded-xl">
                        <BrainCircuit className="text-white w-6 h-6" />
                    </div>
                    <span className="font-bold text-xl text-gray-900 tracking-tight">NeuroPlan</span>
                </div>

                <div className="w-full max-w-md mx-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
