import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm as useHookForm } from 'react-hook-form';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';

export default function Login() {
    const { register, handleSubmit, formState: { errors } } = useHookForm();
    const [errorMsg, setErrorMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        setErrorMsg('');
        try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) {
                setErrorMsg(error.message);
                return;
            }

            if (authData.user) {
                const { data: profile, error: profileError } = await supabase
                    .from('User')
                    .select('*')
                    .eq('id', authData.user.id)
                    .maybeSingle();

                if (profileError || !profile) {
                    setErrorMsg(profileError?.message || 'Failed to fetch user profile.');
                    return;
                }

                login(authData.session?.access_token || '', profile);

                if (profile.onboarding_stage !== 'COMPLETE') {
                    navigate('/onboarding');
                } else {
                    navigate('/dashboard');
                }
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Login failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Welcome Back 👋
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                    Sign in to continue your study plan
                </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                {errorMsg && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-fade-in">
                        <p className="text-sm text-red-700">{errorMsg}</p>
                    </div>
                )}
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                {...register("email", { required: "Email is required" })}
                                type="email"
                                className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                                placeholder="you@email.com"
                            />
                        </div>
                        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message as string}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                {...register("password", { required: "Password is required" })}
                                type={showPassword ? "text" : "password"}
                                className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center z-20"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                ) : (
                                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                )}
                            </button>
                        </div>
                        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message as string}</p>}
                        
                        <div className="mt-2 flex items-center justify-end">
                            <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                                Forgot password?
                            </Link>
                        </div>
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin h-5 w-5 text-white" />
                        ) : (
                            'Continue Planning →'
                        )}
                    </button>
                </div>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-center text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                        Create one
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}
