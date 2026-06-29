import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '../supabaseClient';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';

export default function ForgotPassword() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) {
                setErrorMsg(error.message);
                return;
            }

            setSuccessMsg('Check your email for the password reset recovery link.');
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to send recovery email.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight animate-fade-in">
                    Reset your password
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                    Enter your email address and we'll send you a recovery link to access your account.
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
                        <h3 className="text-md font-bold text-slate-800">Recovery Email Sent</h3>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                            {successMsg}
                        </p>
                        <div className="pt-4">
                            <Link 
                                to="/login" 
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                                    <Mail className="h-4.5 w-4.5" />
                                </span>
                                <input
                                    type="email"
                                    placeholder="name@university.edu"
                                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-sm transition-all"
                                    {...register('email', { 
                                        required: 'Email address is required',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: 'Invalid email address'
                                        }
                                    })}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-red-500 text-xs font-semibold mt-1.5 pl-1">{errors.email.message as string}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 px-4 rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Sending link...
                                </>
                            ) : (
                                'Send Password Reset Link'
                            )}
                        </button>

                        <div className="text-center pt-2">
                            <Link 
                                to="/login" 
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </AuthLayout>
    );
}
