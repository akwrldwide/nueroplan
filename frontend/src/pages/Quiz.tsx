import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { BrainCircuit, CheckCircle, XCircle } from 'lucide-react';

export default function Quiz() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const { data, error } = await supabase
                    .from('QuizQuestion')
                    .select('*')
                    .eq('course_id', courseId)
                    .limit(20);
                if (error) throw error;

                if (!data || data.length === 0) {
                    setQuestions([
                        { id: '1', question_text: 'What is the primary function of the CPU?', option_a: 'Storage', option_b: 'Processing', option_c: 'Cooling', option_d: 'Display', correct_answer: 'Option B' },
                        { id: '2', question_text: 'Which data structure follows FIFO?', option_a: 'Stack', option_b: 'Tree', option_c: 'Queue', option_d: 'Graph', correct_answer: 'Option C' },
                        { id: '3', question_text: 'What does HTML stand for?', option_a: 'HyperText Markup Language', option_b: 'HighText Machine Language', option_c: 'HyperLoop Machine Language', option_d: 'None', correct_answer: 'Option A' }
                    ]);
                } else {
                    setQuestions(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (courseId) {
            fetchQuestions();
        }
    }, [courseId]);

    const handleSelect = (qId: string, option: string) => {
        if (result) return; // Prevent changing answer after submit
        setAnswers(prev => ({ ...prev, [qId]: option }));
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < questions.length) {
            alert("Please answer all questions before submitting.");
            return;
        }
        if (!user) {
            alert("User not logged in");
            return;
        }
        setSubmitting(true);
        try {
            let correctCount = 0;
            questions.forEach(q => {
                if (answers[q.id] === q.correct_answer) {
                    correctCount++;
                }
            });
            const score = Math.round((correctCount / questions.length) * 100);

            // 1. Save result to database
            const { error: resultErr } = await supabase
                .from('QuizResult')
                .insert({
                    user_id: user.id,
                    course_id: courseId,
                    score_percentage: score
                });
            if (resultErr) throw resultErr;

            // 2. Fetch course userTopics
            const { data: topics, error: topicsErr } = await supabase
                .from('UserTopic')
                .select('*')
                .eq('user_id', user.id)
                .eq('course_id', courseId)
                .eq('is_archived', false);
            if (topicsErr) throw topicsErr;

            // 3. Update mastery level for topics
            if (topics && topics.length > 0) {
                const eta = 0.2;
                const Q_i = score / 100;
                const updatePromises = topics.map((t: any) => {
                    const M_t = t.mastery_level || 0;
                    const M_next = Math.max(0, Math.min(1, M_t + eta * (Q_i - M_t)));
                    return supabase
                        .from('UserTopic')
                        .update({ mastery_level: M_next })
                        .eq('id', t.id);
                });
                await Promise.all(updatePromises);
            }

            setResult({ score, correct: correctCount, total: questions.length });
        } catch (error) {
            console.error(error);
            alert("Error submitting quiz");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-gray-500">Loading Quiz Module...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link to="/dashboard" className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-1.5 rounded-lg">
                                <BrainCircuit className="text-white w-6 h-6" />
                            </div>
                            <span className="font-bold text-xl text-gray-900 tracking-tight">Nuero Plan</span>
                        </Link>
                        <Link to="/courses" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition">Back to Courses</Link>
                    </div>
                </div>
            </nav>

            <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
                {!result ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">
                        <div className="mb-8 border-b border-gray-100 pb-6">
                            <h1 className="text-2xl font-bold text-gray-900">Module Quiz</h1>
                            <p className="text-gray-500 mt-2">Answer the following questions to help the engine adapt your risk factor.</p>
                        </div>

                        <div className="space-y-8">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900"><span className="text-indigo-600 mr-2">{idx + 1}.</span>{q.question_text}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {['Option A', 'Option B', 'Option C', 'Option D'].map((opt, i) => {
                                            const optionText = i === 0 ? q.option_a : i === 1 ? q.option_b : i === 2 ? q.option_c : q.option_d;
                                            const isSelected = answers[q.id] === opt;
                                            return (
                                                <div
                                                    key={opt}
                                                    onClick={() => handleSelect(q.id, opt)}
                                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${isSelected
                                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                                                        : 'border-gray-100 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                >
                                                    {optionText}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-sm disabled:opacity-70"
                            >
                                {submitting ? 'Submitting...' : 'Submit Answers'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center animate-in zoom-in-95 duration-500">
                        {result.score >= 50 ? (
                            <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
                        ) : (
                            <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                        )}
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Completed!</h2>
                        <p className="text-gray-500 text-lg mb-8">You scored {result.correct} out of {result.total} ({result.score}%).</p>

                        <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
                            <h4 className="font-semibold text-gray-900 mb-2">Engine Insight:</h4>
                            <p className="text-gray-600 text-sm">
                                {result.score >= 75
                                    ? "Great job! Your proficiency is high. We'll slightly reduce the priority weight for this course."
                                    : result.score >= 50
                                        ? "Good effort. Your risk factor remains stable."
                                        : "Your score indicates a need for improvement. We'll increase the risk factor and allocate more hours to this course next week."}
                            </p>
                        </div>

                        <button
                            onClick={() => navigate('/courses')}
                            className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-sm"
                        >
                            Return to Courses
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
