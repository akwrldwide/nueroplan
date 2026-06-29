import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '../supabaseClient';
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';

export default function ResetPassword() {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const newPassword = watch('password');

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const { error } = await supabase.auth.updateUser({
                password: data.password
            });

            if (error) {
                setErrorMsg(error.message);
                return;
            }

            setSuccessMsg('Your password has been successfully reset.');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to update password.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight animate-fade-in">
                    Create new password
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                    Type your new password below. Make sure it contains at least 6 characters.
                </p>
            </div>

            <div className="space-y-6">
                {errorMsg && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl">
                        <p className="text-sm text-red-700 font-semibold">{errorMsg}</p>
                    </div>
                )}

                {successMsg ? (
                    <div className="text-center py-6 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <h3 className="text-md font-bold text-slate-800">Password Reset Completed</h3>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                            {successMsg} Redirecting you to login page...
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                    <Lock className="h-4.5 w-4.5" />
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="block w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm transition-all"
                                    {...register('password', { 
                                        required: 'Password is required',
                                        minLength: {
                                            value: 6,
                                            message: 'Password must be at least 6 characters long'
                                        }
                                    })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-red-500 text-xs font-semibold mt-1.5 pl-1">{errors.password.message as string}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm Password</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                    <Lock className="h-4.5 w-4.5" />
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="block w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm transition-all"
                                    {...register('confirmPassword', { 
                                        required: 'Please confirm your password',
                                        validate: value => value === newPassword || 'Passwords do not match'
                                    })}
                                />
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-red-500 text-xs font-semibold mt-1.5 pl-1">{errors.confirmPassword.message as string}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 px-4 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>
                )}
            </div>
        </AuthLayout>
    );
}
