import { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CalendarDays, BrainCircuit, RefreshCw, X, User as UserIcon, Activity, ChevronDown, Settings, LogOut, AlertTriangle, BookOpen, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import SummaryCards from '../components/SummaryCards';
import RightSidebar from '../components/RightSidebar';
import CalendarView from '../components/CalendarView';
import DailyDetail from '../components/DailyDetail';

export default function Dashboard() {
    const { user, logout, reloadUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [plan, setPlan] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [academicStatus, setAcademicStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'FUTURE' | 'HISTORY'>('FUTURE');
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const [isBulkExamModalOpen, setIsBulkExamModalOpen] = useState(false);
    const [showRegenerateModal, setShowRegenerateModal] = useState(false);
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [planNotification, setPlanNotification] = useState<string | null>(null);
    const [examDrafts, setExamDrafts] = useState<Record<string, any>>({});
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isStudyTimeModalOpen, setIsStudyTimeModalOpen] = useState(false);
    const [globalTime, setGlobalTime] = useState({ start_time: '08:00', end_time: '12:00' });
    const [studyPref, setStudyPref] = useState(user?.post_exam_preference || 'OFF');
    const [allowMorningRevision, setAllowMorningRevision] = useState(user?.allow_morning_revision || false);
    const [preferredFocusWindow, setPreferredFocusWindow] = useState(user?.preferred_focus_window || 'ANY');
    const [cgpa, setCgpa] = useState<number | ''>('');

    useEffect(() => {
        if (user) {
            setStudyPref(user.post_exam_preference || 'OFF');
            setAllowMorningRevision(user.allow_morning_revision || false);
            setPreferredFocusWindow(user.preferred_focus_window || 'ANY');
        }
    }, [user]);

    useEffect(() => {
        if (stats?.profile) {
            setCgpa(stats.profile.current_cgpa ?? '');
        }
    }, [stats]);

    const openBulkModal = () => {
        const drafts: Record<string, any> = {};
        courses.forEach(c => {
            drafts[c.id] = {
                date: c.exam_date ? c.exam_date.split('T')[0] : null,
                time: c.exam_time || null,
                venue: c.exam_venue || '',
                duration: c.exam_duration || 180,
                instructions: c.exam_instructions || ''
            };
        });
        setExamDrafts(drafts);
        setIsBulkExamModalOpen(true);
    };

    const handleDraftChange = (courseId: string, field: string, val: string | number | null) => {
        setExamDrafts(prev => ({ ...prev, [courseId]: { ...prev[courseId], [field]: val } }));
    };

    const handleBulkSaveExams = async () => {
        if (!user) return;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const updatePromises = Object.keys(examDrafts).map(async (id) => {
                const draft = examDrafts[id];
                let parsedDate = null;
                if (draft.date) {
                    parsedDate = new Date(draft.date);
                    if (parsedDate < today) {
                        throw new Error('Exam dates cannot be in the past');
                    }
                }
                return supabase
                    .from('UserCourse')
                    .update({
                        exam_date: parsedDate ? parsedDate.toISOString() : null,
                        exam_time: draft.time || null,
                        exam_venue: draft.venue || null,
                        exam_duration: draft.duration ? parseInt(draft.duration) : 180,
                        exam_instructions: draft.instructions || null
                    })
                    .eq('id', id);
            });
            
            const results = await Promise.all(updatePromises);
            for (const res of results) {
                if (res.error) throw res.error;
            }

            setIsBulkExamModalOpen(false);
            setShowRegenerateModal(true);
            fetchDashboardData();
        } catch (e: any) {
            alert(e.message || "Failed to save exam dates");
        }
    };

    const handleRegenerateAction = async (regenNow: boolean) => {
        setShowRegenerateModal(false);
        if (regenNow) {
            await handleRecalculate();
        } else {
            fetchDashboardData();
        }
    };

    const fetchDashboardData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch User details for current stored streak
            const { data: userData, error: userErr } = await supabase
                .from('User')
                .select('*')
                .eq('id', user.id)
                .single();
            if (userErr) throw userErr;
            let currentStreak = userData.streak_count || 0;

            // 2. Fetch UserCourses
            const { data: userCoursesData, error: coursesErr } = await supabase
                .from('UserCourse')
                .select('*, course:Course(*, courseTopics:CourseTopic(*))')
                .eq('user_id', user.id)
                .eq('is_archived', false);
            if (coursesErr) throw coursesErr;

            const enrolledCourses = userCoursesData || [];

            // 3. Fetch current plan
            const { data: recentPlans, error: planErr } = await supabase
                .from('StudyPlan')
                .select('*')
                .eq('user_id', user.id)
                .order('generated_date', { ascending: false })
                .limit(1);
            if (planErr) throw planErr;
            const currentPlan = recentPlans?.[0] || null;

            // 4. Fetch study sessions for streak calculation & plan sessions
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            let allPastAndCurrentSessions: any[] = [];
            if (currentPlan) {
                const { data: sessionsData, error: sessErr } = await supabase
                    .from('StudySession')
                    .select('*, topic:UserTopic(*, course:Course(*)), studyPlan:StudyPlan(*)')
                    .eq('topic.user_id', user.id);
                if (sessErr) throw sessErr;
                
                allPastAndCurrentSessions = (sessionsData || []).filter((s: any) => {
                    return s.study_plan_id === currentPlan.id || (s.session_date && new Date(s.session_date) < todayStart);
                });
            }

            // Deduplicate legacy sessions & build days map
            const dateStrMaxPlanDate = new Map();
            for (const s of allPastAndCurrentSessions) {
                if (!s.session_date) continue;
                const dStr = new Date(s.session_date).toISOString().split('T')[0];
                const cMax = dateStrMaxPlanDate.get(dStr) || new Date(0);
                const sPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);
                if (sPlanDate > cMax) {
                    dateStrMaxPlanDate.set(dStr, sPlanDate);
                }
            }

            const activeSessions = allPastAndCurrentSessions.filter(s => {
                if (!s.session_date) return false;
                if (currentPlan && s.study_plan_id === currentPlan.id) return true;
                if (s.completed) return true;
                const dStr = new Date(s.session_date).toISOString().split('T')[0];
                const maxPlanDate = dateStrMaxPlanDate.get(dStr);
                const sPlanDate = s.studyPlan ? new Date(s.studyPlan.generated_date) : new Date(0);
                if (sPlanDate.getTime() === maxPlanDate?.getTime()) return true;
                return false;
            });

            // Group by day for streak
            const sessionsByDay = new Map();
            for (const s of activeSessions) {
                const dStr = new Date(s.session_date).toISOString().split('T')[0];
                if (!sessionsByDay.has(dStr)) sessionsByDay.set(dStr, []);
                sessionsByDay.get(dStr).push(s);
            }

            // Calculate streak walk back
            let calculatedStreak = 0;
            let currentDateWalker = new Date(todayStart);

            const yToday = currentDateWalker.getFullYear();
            const mToday = String(currentDateWalker.getMonth() + 1).padStart(2, '0');
            const dToday = String(currentDateWalker.getDate()).padStart(2, '0');
            const todayStr = `${yToday}-${mToday}-${dToday}`;
            
            const todayS = sessionsByDay.get(todayStr);
            if (todayS && todayS.length > 0) {
                const allCompleted = todayS.every((s: any) => s.completed);
                if (allCompleted) calculatedStreak++;
            }

            currentDateWalker.setDate(currentDateWalker.getDate() - 1);
            while (true) {
                const yW = currentDateWalker.getFullYear();
                const mW = String(currentDateWalker.getMonth() + 1).padStart(2, '0');
                const dW = String(currentDateWalker.getDate()).padStart(2, '0');
                const dStr = `${yW}-${mW}-${dW}`;

                const daySessions = sessionsByDay.get(dStr);
                if (!daySessions || daySessions.length === 0) {
                    // Rest day
                } else {
                    const allCompleted = daySessions.every((s: any) => s.completed);
                    if (allCompleted) {
                        calculatedStreak++;
                    } else {
                        break;
                    }
                }

                currentDateWalker.setDate(currentDateWalker.getDate() - 1);
                const diffDays = Math.floor((todayStart.getTime() - currentDateWalker.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays > 365) break; 
            }

            // Sync streak to database if mismatch
            if (calculatedStreak !== currentStreak) {
                await supabase
                    .from('User')
                    .update({ streak_count: calculatedStreak })
                    .eq('id', user.id);
                currentStreak = calculatedStreak;
            }

            // 5. Fetch progress logs
            const { data: progressLogs, error: logErr } = await supabase
                .from('ProgressLog')
                .select('*, userCourse:UserCourse(*, course:Course(*))')
                .eq('user_id', user.id)
                .eq('is_archived', false);
            if (logErr) throw logErr;

            // 6. Stats calculation
            const totalCourses = enrolledCourses.length;
            const highRiskCourses = enrolledCourses.filter(c => c.course?.difficulty >= 4).length;

            let nextExam = null;
            let daysToNextExam = null;
            const futureExams = enrolledCourses.filter(c => c.exam_date && new Date(c.exam_date) > new Date());
            if (futureExams.length > 0) {
                const sortedExams = [...futureExams].sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
                nextExam = sortedExams[0];
                const diffTime = Math.abs(new Date(nextExam.exam_date).getTime() - new Date().getTime());
                daysToNextExam = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            // AI Insight Logic
            const { data: profile } = await supabase
                .from('AcademicProfile')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            let aiInsight = "The engine is actively balancing your study week based on dynamic weightings. Keep up the consistency.";
            const todayNum = new Date().getTime();
            let upcomingExamsCount = 0;
            for (const c of enrolledCourses) {
                if (c.exam_date) {
                    const diffDays = (new Date(c.exam_date).getTime() - todayNum) / (1000 * 60 * 60 * 24);
                    if (diffDays >= 0 && diffDays <= 7) upcomingExamsCount++;
                }
            }
            const isExamCluster = upcomingExamsCount >= 3;

            if (profile) {
                if (isExamCluster) {
                    aiInsight = "Exam Cluster Detected — Intensified Preparation Mode Activated. Temporary weight multipliers have been applied.";
                } else if (highRiskCourses >= 2) {
                    aiInsight = `${highRiskCourses} courses are flagged high-risk due to difficulty scaling and proximity. Over-allocation is active.`;
                } else if (futureExams.length > 0 && daysToNextExam && daysToNextExam < 14 && nextExam?.course) {
                    aiInsight = `Exam in ${nextExam.course.code} is approaching in ${daysToNextExam} days. Priority weight has been increased accordingly.`;
                } else if (profile.current_cgpa && profile.current_cgpa < 3.5 && profile.academic_goal === 'First Class') {
                    aiInsight = "To reach First Class range, additional emphasis has been placed on your core courses.";
                } else if (profile.current_cgpa && profile.current_cgpa < 3.0 && profile.academic_goal === 'Second Class Upper') {
                    aiInsight = "To reach Second Class Upper range, additional emphasis has been placed on your core courses.";
                }
            }

            setStats({
                streak_count: currentStreak,
                totalCourses,
                highRiskCourses,
                nextExam: nextExam ? { title: nextExam.course?.title || nextExam.course_id, days: daysToNextExam } : null,
                progressLogs: progressLogs || [],
                aiInsight,
                profile
            });

            // 7. Sort activeSessions chronologically
            activeSessions.sort((a, b) => {
                const dateA = new Date(a.session_date).getTime();
                const dateB = new Date(b.session_date).getTime();
                if (dateA !== dateB) return dateA - dateB;

                const timeA = a.start_time.split(':').map(Number);
                const timeB = b.start_time.split(':').map(Number);
                if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
                return timeA[1] - timeB[1];
            });

            // 8. Academic Session & Semester Break checking
            const { data: activeSessionData } = await supabase
                .from('AcademicSession')
                .select('*')
                .eq('user_id', user.id)
                .order('start_date', { ascending: false })
                .limit(1);
            
            const activeSession = activeSessionData?.[0] || null;
            const today = new Date();
            const isSemesterBreak = Boolean(activeSession && activeSession.end_date && today > new Date(activeSession.end_date));

            if (currentPlan) {
                setPlan({
                    ...currentPlan,
                    sessions: activeSessions,
                    isSemesterBreak
                });
            } else {
                setPlan(null);
            }

            setCourses(enrolledCourses);
            setAcademicStatus({
                isComplete: isSemesterBreak,
                currentSession: activeSession
            });

            // 9. Study Availability
            const { data: availRes } = await supabase
                .from('StudyAvailability')
                .select('*')
                .eq('user_id', user.id);

            if (availRes && availRes.length > 0) {
                setGlobalTime({
                    start_time: availRes[0].start_time,
                    end_time: availRes[0].end_time
                });
            }

            // 10. Check if onboarding stage incomplete or needs userTopic migration
            const { data: topicsData } = await supabase
                .from('UserTopic')
                .select('*')
                .eq('user_id', user.id)
                .limit(1);

            if (user?.onboarding_stage === 'COMPLETE' && enrolledCourses.length > 0 && (!topicsData || topicsData.length === 0)) {
                setShowMigrationModal(true);
            }

        } catch (error) {
            console.error("Failed fetching dashboard", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const handleRecalculate = async (forceFullSemester: any = false) => {
        const isForce = typeof forceFullSemester === 'boolean' ? forceFullSemester : false;
        setIsRecalculating(true);
        try {
            const { data, error } = await supabase.functions.invoke('generate-plan', {
                body: { fullRecalculate: true, forceFullSemester: isForce }
            });
            if (error) throw error;
            if (data && data.notification) {
                setPlanNotification(data.notification);
            }
            await fetchDashboardData();
        } catch (error: any) {
            console.error(error);
            alert(`Error generating plan: ${error.message || "Failed to recalculate plan"}`);
        } finally {
            setIsRecalculating(false);
        }
    };

    const handleProgressSemester = async () => {
        if (!user) return;
        try {
            const { error } = await supabase.rpc('progress_semester', { user_id_param: user.id });
            if (error) throw error;
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            if (reloadUser) await reloadUser();
            navigate('/onboarding');
        } catch (e) {
            console.error(e);
            alert("Failed to progress to next semester");
        }
    };

    const handleCompleteSession = async (sessionId: string) => {
        if (!user) return;

        // Fetch session details first
        const { data: sessionData, error: findErr } = await supabase
            .from('StudySession')
            .select('*, topic:UserTopic(*)')
            .eq('id', sessionId)
            .single();

        if (findErr || !sessionData) {
            alert('Session not found.');
            return;
        }

        const newStatus = !sessionData.completed;

        // Optimistically update frontend state
        setPlan((prev: any) => {
            if (!prev || !prev.sessions) return prev;
            const updatedSessions = prev.sessions.map((s: any) => {
                 if (s.id === sessionId) {
                     return { ...s, completed: newStatus };
                 }
                 return s;
            });
            return { ...prev, sessions: updatedSessions };
        });

        try {
            // 1. Update StudySession
            const { error: updateSessErr } = await supabase
                .from('StudySession')
                .update({ completed: newStatus })
                .eq('id', sessionId);
            if (updateSessErr) throw updateSessErr;

            // 2. Resolve userCourse
            const { data: userCourse, error: ucErr } = await supabase
                .from('UserCourse')
                .select('*')
                .eq('user_id', user.id)
                .eq('course_id', sessionData.topic.course_id)
                .eq('is_archived', false)
                .maybeSingle();

            if (ucErr) throw ucErr;

            if (userCourse) {
                // Find or create ProgressLog
                const { data: log, error: logErr } = await supabase
                    .from('ProgressLog')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('user_course_id', userCourse.id)
                    .eq('is_archived', false)
                    .maybeSingle();

                if (logErr) throw logErr;

                if (log) {
                    const hourChange = newStatus ? sessionData.allocated_hours : -sessionData.allocated_hours;
                    const { error: logUpdateErr } = await supabase
                        .from('ProgressLog')
                        .update({ study_hours_logged: Math.max(0, (log.study_hours_logged || 0) + hourChange) })
                        .eq('id', log.id);
                    if (logUpdateErr) throw logUpdateErr;
                } else if (newStatus) {
                    const { error: logCreateErr } = await supabase
                        .from('ProgressLog')
                        .insert({
                            user_id: user.id,
                            user_course_id: userCourse.id,
                            study_hours_logged: sessionData.allocated_hours,
                            consistency_score: 1.0
                        });
                    if (logCreateErr) throw logCreateErr;
                }
            }

            // 3. Streak Increment Logic
            let streak_incremented = false;
            const currentSessionDateStr = sessionData.session_date ? new Date(sessionData.session_date).toISOString().split('T')[0] : '';

            // Fetch today's study sessions for this plan & date
            const { data: todaysSessions, error: todayErr } = await supabase
                .from('StudySession')
                .select('*')
                .eq('study_plan_id', sessionData.study_plan_id)
                .eq('session_date', currentSessionDateStr);

            if (todayErr) throw todayErr;

            if (todaysSessions && todaysSessions.length > 0) {
                const totalCount = todaysSessions.length;
                const completedCount = todaysSessions.filter(s => s.completed).length;

                // Fetch current User state
                const { data: userObj, error: userFetchErr } = await supabase
                    .from('User')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                if (userFetchErr) throw userFetchErr;

                const lastUpdateStr = userObj.streak_last_updated ? new Date(userObj.streak_last_updated).toISOString().split('T')[0] : '';

                if (newStatus && totalCount === completedCount) {
                    if (lastUpdateStr !== currentSessionDateStr && currentSessionDateStr !== '') {
                        const { error: userUpdateErr } = await supabase
                            .from('User')
                            .update({
                                streak_count: (userObj.streak_count || 0) + 1,
                                streak_last_updated: sessionData.session_date
                            })
                            .eq('id', user.id);
                        if (userUpdateErr) throw userUpdateErr;
                        streak_incremented = true;
                    }
                } else if (!newStatus && (completedCount === totalCount - 1)) {
                    if (lastUpdateStr === currentSessionDateStr && currentSessionDateStr !== '') {
                        const fallbackDate = new Date(sessionData.session_date);
                        fallbackDate.setDate(fallbackDate.getDate() - 1);

                        const { error: userUpdateErr } = await supabase
                            .from('User')
                            .update({
                                streak_count: Math.max(0, (userObj.streak_count || 0) - 1),
                                streak_last_updated: fallbackDate.toISOString()
                            })
                            .eq('id', user.id);
                        if (userUpdateErr) throw userUpdateErr;
                    }
                }
            }

            if (streak_incremented) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
            fetchDashboardData();
        } catch (e) {
            console.error(e);
            fetchDashboardData(); // Revert
            alert("Failed to mark session complete");
        }
    };

    const handleSelectDate = (date: Date) => {
        setSelectedDate(date);
        const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const dateStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        setActiveTab(dateStr < todayStr ? 'HISTORY' : 'FUTURE');
    };

    const handleSaveSettings = async () => {
        if (!user) return;
        try {
            const { error: userErr } = await supabase
                .from('User')
                .update({ 
                    post_exam_preference: studyPref,
                    allow_morning_revision: allowMorningRevision,
                    preferred_focus_window: preferredFocusWindow
                })
                .eq('id', user.id);
            if (userErr) throw userErr;

            const { data: profile } = await supabase
                .from('AcademicProfile')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (profile) {
                const { error: profErr } = await supabase
                    .from('AcademicProfile')
                    .update({ current_cgpa: cgpa === '' ? null : parseFloat(cgpa as any) })
                    .eq('user_id', user.id);
                if (profErr) throw profErr;
            }

            if (reloadUser) await reloadUser();
            setIsSettingsModalOpen(false);
            await handleRecalculate();
        } catch(e) {
            console.error(e);
            alert("Failed to save settings");
        }
    };

    const handleSaveStudyTime = async () => {
        if (!user) return;
        try {
            // Delete existing study availability
            const { error: deleteErr } = await supabase
                .from('StudyAvailability')
                .delete()
                .eq('user_id', user.id);
            if (deleteErr) throw deleteErr;

            const availabilities = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
                user_id: user.id,
                day_of_week: day,
                start_time: globalTime.start_time,
                end_time: globalTime.end_time
            }));

            const { error: insertErr } = await supabase
                .from('StudyAvailability')
                .insert(availabilities);
            if (insertErr) throw insertErr;

            setIsStudyTimeModalOpen(false);
            await handleRecalculate();
        } catch (e) {
            console.error(e);
            alert("Failed to save study time");
        }
    };

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    let effectiveEndDate: Date | null = null;
    if (courses && courses.length > 0) {
        for (const c of courses) {
            if (c.exam_date) {
                const ed = new Date(c.exam_date);
                ed.setHours(0,0,0,0);
                if (!effectiveEndDate || ed > effectiveEndDate) effectiveEndDate = ed;
            }
        }
    }
    const isAfterFinalExam = courses && courses.length > 0 && effectiveEndDate && todayMidnight > effectiveEndDate;

    if (loading) return <div className="h-screen flex items-center justify-center text-gray-500">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 p-1.5 rounded-lg">
                                <BrainCircuit className="text-white w-6 h-6" />
                            </div>
                            <span className="font-bold text-xl text-gray-900 tracking-tight">Nuero Plan</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative flex items-center">
                                <button 
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    onBlur={() => setTimeout(() => setIsProfileMenuOpen(false), 200)}
                                    className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors pr-2 pl-1 py-1 rounded-full border border-gray-200 cursor-pointer"
                                >
                                    <div className="bg-indigo-100 p-1.5 rounded-full">
                                        <UserIcon className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 hidden sm:block">Hello, {user?.name}</span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isProfileMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-56 sm:w-60 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="py-1 whitespace-nowrap">
                                            <button 
                                                onClick={() => navigate('/courses')}
                                                className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors hover:text-indigo-600 cursor-pointer"
                                            >
                                                <BookOpen className="w-4 h-4 mr-2" />
                                                Curriculum Manager
                                            </button>
                                            <button 
                                                onClick={() => window.location.href = '/dashboard/tracker'}
                                                className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors hover:text-indigo-600 cursor-pointer"
                                            >
                                                <Activity className="w-4 h-4 mr-2" />
                                                Mastery Insights
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setIsProfileMenuOpen(false);
                                                    setIsSettingsModalOpen(true);
                                                }}
                                                className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors hover:text-indigo-600 cursor-pointer"
                                            >
                                                <Settings className="w-4 h-4 mr-2" />
                                                Profile Settings
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setIsProfileMenuOpen(false);
                                                    openBulkModal();
                                                }}
                                                className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors hover:text-indigo-600 cursor-pointer"
                                            >
                                                <CalendarDays className="w-4 h-4 mr-2" />
                                                Manage Exam Dates
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setIsProfileMenuOpen(false);
                                                    setIsStudyTimeModalOpen(true);
                                                }}
                                                className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors hover:text-indigo-600 cursor-pointer"
                                            >
                                                <Clock className="w-4 h-4 mr-2" />
                                                Manage Study Time
                                            </button>
                                            <button 
                                                onClick={() => navigate('/history')}
                                                className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors hover:text-indigo-600 cursor-pointer"
                                            >
                                                <Activity className="w-4 h-4 mr-2" />
                                                Performance Analytics
                                            </button>
                                            <div className="h-px bg-gray-100 my-1"></div>
                                            <button onClick={logout} className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer">
                                                <LogOut className="w-4 h-4 mr-2" />
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {planNotification && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start justify-between shadow-sm relative animate-in fade-in zoom-in duration-300">
                                <div className="flex items-start gap-4 pr-8">
                                    <div className="bg-blue-100 p-2 rounded-xl flex-shrink-0 mt-0.5">
                                        <BrainCircuit className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-blue-900 mb-1">Adaptive Scheduler Update</h4>
                                        <p className="text-sm text-blue-800 leading-relaxed font-medium">{planNotification}</p>
                                        {planNotification.includes('Global History') && (
                                            <button 
                                                onClick={() => navigate('/history')}
                                                className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition shadow-sm"
                                            >
                                                Go to Performance Analytics
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setPlanNotification(null)}
                                    className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 bg-white/50 hover:bg-white rounded-full p-1 transition-colors"
                                    aria-label="Dismiss"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                        <SummaryCards stats={stats} />

                        {academicStatus?.isComplete && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between mt-6 shadow-sm">
                                <div className="flex items-start md:items-center gap-4">
                                    <div className="bg-emerald-100 p-3 rounded-xl flex-shrink-0 mt-1 md:mt-0">
                                        <BrainCircuit className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-emerald-900">Semester completed!</h3>
                                        <p className="text-emerald-700 font-medium">You have finished all exams for this semester. Ready for the next one?</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                                    <button 
                                       onClick={handleProgressSemester}
                                       className="w-full text-center bg-emerald-600 text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-emerald-700 transition cursor-pointer"
                                    >
                                        Start Next Semester
                                    </button>
                                </div>
                            </div>
                        )}

                        {import.meta.env.MODE !== 'production' && (
                            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex justify-between items-center mt-6">
                                <span className="text-purple-800 font-bold">Dev Tool:</span>
                                <button 
                                    onClick={handleProgressSemester}
                                    className="bg-purple-600 text-white font-bold px-4 py-1.5 rounded shadow hover:bg-purple-700 transition text-sm cursor-pointer"
                                >
                                    Force Start Next Semester (Dev Only)
                                </button>
                            </div>
                        )}
                        
                        
                        {/* Neuro Insight deactivated per requirement 
                        <AIInsight insight={stats?.aiInsight} isLoading={aiInsightLoading} /> 
                        */}

                        {courses.filter(c => {
                            if (!c.exam_date) return false;
                            
                            // Adjust selectedDate to purely YYYY-MM-DD
                            const selDate = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000));
                            const selDateStr = selDate.toISOString().split('T')[0];
                            const examDateStr = c.exam_date.split('T')[0];
                            
                            // Show the banner if the selected date is exactly the exam date, regardless of completion status
                            return selDateStr === examDateStr;
                        }).map(c => (
                            <div key={`exam-${c.id}`} className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between mt-6 shadow-sm">
                                <div className="flex items-start md:items-center gap-4">
                                    <div className="bg-red-100 p-3 rounded-xl flex-shrink-0 mt-1 md:mt-0">
                                        <AlertTriangle className="w-8 h-8 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-red-900">Exam Scheduled: {c.course?.code}</h3>
                                        <p className="text-red-700 font-medium">{c.course?.title}</p>
                                        <div className="mt-2 text-sm text-red-800 space-y-1">
                                            <p><span className="font-semibold">Time:</span> {c.exam_time || "TBD"} ({c.exam_duration || 180} mins)</p>
                                            {c.exam_venue && <p><span className="font-semibold">Venue:</span> {c.exam_venue}</p>}
                                            {c.exam_instructions && <p><span className="font-semibold">Instructions:</span> {c.exam_instructions}</p>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
                                    <button 
                                        onClick={() => navigate('/dashboard/tracker')}
                                        className="w-full text-center bg-white text-red-700 font-bold px-6 py-2 border border-red-200 rounded-lg shadow-sm hover:bg-red-50 transition cursor-pointer"
                                    >
                                        Quick Revision
                                    </button>
                                    <button 
                                       onClick={async () => {
                                           try {
                                               const { error } = await supabase
                                                   .from('UserCourse')
                                                   .update({ is_completed: true })
                                                   .eq('id', c.id);
                                               if (error) throw error;
                                               confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 }, colors: ['#10B981', '#047857'] });
                                               await handleRecalculate();
                                           } catch(e) {
                                               console.error(e);
                                               alert("Failed marking exam completed");
                                           }
                                       }}
                                       className="w-full text-center bg-red-600 text-white font-bold px-6 py-2 rounded-lg shadow hover:bg-red-700 transition cursor-pointer"
                                    >
                                        Mark Completed
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Study Plan Header Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-6">
                            <div className="px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 gap-4 border-b border-gray-100 rounded-t-2xl">
                                <div className="flex w-full md:w-auto items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900 leading-none shrink-0 md:border-r md:border-gray-300 md:pr-4">Study Plan</h3>
                                    {/* Mobile Refresh Button */}
                                    <div className="md:hidden">
                                        <button
                                            onClick={handleRecalculate}
                                            disabled={isRecalculating}
                                            className={`flex items-center text-sm font-medium text-indigo-600 bg-indigo-50 p-2 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm ${isRecalculating ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex w-full md:w-auto justify-center md:justify-start bg-gray-200/60 p-1 rounded-lg shrink-0">
                                    <button 
                                        onClick={() => {
                                            setActiveTab('FUTURE');
                                            setSelectedDate(new Date());
                                        }}
                                        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all cursor-pointer w-1/2 md:w-auto text-center ${activeTab === 'FUTURE' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Main View
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setActiveTab('HISTORY');
                                            const yest = new Date();
                                            yest.setDate(yest.getDate() - 1);
                                            setSelectedDate(yest);
                                        }}
                                        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all cursor-pointer w-1/2 md:w-auto text-center ${activeTab === 'HISTORY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        History
                                    </button>
                                </div>
                                
                                {/* Desktop Refresh Button */}
                                <div className="hidden md:flex gap-2 shrink-0">
                                    <button
                                        onClick={handleRecalculate}
                                        disabled={isRecalculating}
                                        className={`flex items-center text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm ${isRecalculating ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <RefreshCw className={`w-4 h-4 mr-1.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                                        <span>{isRecalculating ? 'Recalculating...' : 'Recalculate Plan'}</span>
                                    </button>
                                </div>
                            </div>
                            
                            {activeTab === 'HISTORY' && (
                                <div className="px-6 py-3 bg-blue-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span className="text-sm font-medium text-blue-800">Current Semester History. You can retroactively mark missed sessions complete.</span>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/history')}
                                        className="text-sm font-semibold text-indigo-700 bg-white px-4 py-1.5 rounded-lg shadow-sm border border-indigo-100 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                                    >
                                        View All Semesters
                                    </button>
                                </div>
                            )}
                        </div>

                        {isAfterFinalExam ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-6 flex flex-col items-center justify-center text-center py-16 px-6"> 
                                <div className="text-6xl mb-4">🎉</div> 
                                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Congratulations!</h2> 
                                <p className="text-lg text-gray-600"> 
                                    You’ve completed all exams for this semester.<br /> 
                                    Enjoy your well-deserved break 🌴 
                                </p> 
                                <p className="mt-4 text-sm text-gray-500"> 
                                    Remember to read one book per day — it keeps the mind sharp! 
                                </p> 
                            </div> 
                        ) : !plan || (!plan.isSemesterBreak && (!plan.sessions || plan.sessions.length === 0)) ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-6 p-6 text-center py-12">
                                <CalendarDays className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No active plan found</h3>
                                <p className="mt-1 text-sm text-gray-500">Click recalculate to generate a new optimized schedule.</p>
                                <button
                                    onClick={() => handleRecalculate(!plan)}
                                    disabled={isRecalculating}
                                    className={`mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl shadow transition ${isRecalculating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-700 cursor-pointer'}`}
                                >
                                    {isRecalculating ? 'Generating...' : 'Generate Plan Now'}
                                </button>
                            </div>
                        ) : (
                            <DailyDetail
                                date={selectedDate}
                                sessions={plan?.sessions || []}
                                onCompleteSession={handleCompleteSession}
                                activeTab={activeTab}
                                isSemesterBreak={plan?.isSemesterBreak}
                            />
                        )}
                    </div>

                    {/* Sidebar Column */}
                    <div className="lg:col-span-1 border-gray-200 lg:pl-4 space-y-6">
                        {plan?.sessions?.length > 0 && (
                            <CalendarView
                                sessions={plan.sessions}
                                courses={courses}
                                selectedDate={selectedDate}
                                onSelectDate={handleSelectDate}
                            />
                        )}
                        <RightSidebar />
                    </div>
                </div>
            </main>

            {/* Bulk Exam Management Modal */}
            {isBulkExamModalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5 text-indigo-600" />
                                    Manage Exam Dates
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Set exam dates to activate proximity focus blocks.</p>
                            </div>
                            <button onClick={() => setIsBulkExamModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto w-full">
                            <table className="w-full text-left border-collapse hidden sm:table">
                                <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 border-b border-gray-100">Course</th>
                                        <th className="px-4 py-3 border-b border-gray-100 w-24 text-center">Units</th>
                                        <th className="px-4 py-3 border-b border-gray-100 w-24 text-center">Difficulty</th>
                                        <th className="px-6 py-3 border-b border-gray-100 w-32">Date & Time</th>
                                        <th className="px-4 py-3 border-b border-gray-100 w-24">Details</th>
                                        <th className="px-4 py-3 border-b border-gray-100 w-24">Days Left</th>
                                        <th className="px-4 py-3 border-b border-gray-100 w-24 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {courses.map(c => {
                                        const dateVal = examDrafts[c.id]?.date || '';
                                        const timeVal = examDrafts[c.id]?.time || '';
                                        let daysLeftText = "—";
                                        let daysLeftColor = "text-gray-400";
                                        if (dateVal) {
                                            const dLeft = Math.ceil((new Date(dateVal).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                            if (dLeft >= 0) {
                                                daysLeftText = `${dLeft} days`;
                                                if (dLeft < 14) daysLeftColor = "text-red-600 font-bold";
                                                else if (dLeft <= 30) daysLeftColor = "text-yellow-600 font-semibold";
                                                else daysLeftColor = "text-emerald-600";
                                            } else {
                                                daysLeftText = "Passed";
                                                daysLeftColor = "text-gray-400 line-through";
                                            }
                                        }

                                        return (
                                            <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900">{c.course?.code}</div>
                                                    <div className="text-xs text-gray-500 line-clamp-1">{c.course?.title}</div>
                                                </td>
                                                <td className="px-4 py-4 text-center font-medium text-gray-700">{c.course?.units}</td>
                                                <td className="px-4 py-4 text-center font-medium text-gray-700">{c.course?.difficulty}</td>
                                                <td className="px-6 py-4 flex gap-2">
                                                    <div className="flex w-full gap-2">
                                                        <input
                                                            type="date"
                                                            value={dateVal}
                                                            onChange={(e) => handleDraftChange(c.id, 'date', e.target.value || null)}
                                                            className="w-full rounded-lg border-gray-300 py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                        />
                                                        <input
                                                            type="time"
                                                            value={timeVal}
                                                            onChange={(e) => handleDraftChange(c.id, 'time', e.target.value || null)}
                                                            className="w-full rounded-lg border-gray-300 py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                        />
                                                    </div>
                                                </td>
                                                        <td className="px-4 py-4 space-y-2">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Venue" 
                                                                value={examDrafts[c.id]?.venue || ''}
                                                                onChange={(e) => handleDraftChange(c.id, 'venue', e.target.value)}
                                                                className="w-full rounded-lg border-gray-300 py-1.5 px-3 text-sm"
                                                            />
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    type="number" 
                                                                    placeholder="Mins" 
                                                                    value={examDrafts[c.id]?.duration || 180}
                                                                    onChange={(e) => handleDraftChange(c.id, 'duration', parseInt(e.target.value))}
                                                                    className="w-1/2 rounded-lg border-gray-300 py-1.5 px-3 text-sm"
                                                                />
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Notes" 
                                                                    value={examDrafts[c.id]?.instructions || ''}
                                                                    onChange={(e) => handleDraftChange(c.id, 'instructions', e.target.value)}
                                                                    className="w-1/2 rounded-lg border-gray-300 py-1.5 px-3 text-sm"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className={`px-4 py-4 text-sm ${daysLeftColor}`}>
                                                            {daysLeftText}
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            {(dateVal || timeVal) && (
                                                                <button
                                                                    onClick={() => {
                                                                        handleDraftChange(c.id, 'date', null);
                                                                        handleDraftChange(c.id, 'time', null);
                                                                    }}
                                                                    className="text-xs font-semibold text-gray-500 hover:text-red-600 px-2 py-1 rounded bg-gray-100 hover:bg-red-50 transition-colors"
                                                                >
                                                                    Clear
                                                                </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>

                            {/* Mobile Cards View */}
                            <div className="sm:hidden flex flex-col gap-4 p-4 bg-gray-50/30">
                                {courses.map(c => {
                                    const dateVal = examDrafts[c.id]?.date || '';
                                    const timeVal = examDrafts[c.id]?.time || '';
                                    let daysLeftText = "—";
                                    let daysLeftColor = "text-gray-400";
                                    if (dateVal) {
                                        const dLeft = Math.ceil((new Date(dateVal).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                        if (dLeft >= 0) {
                                            daysLeftText = `${dLeft} days`;
                                            if (dLeft < 14) daysLeftColor = "text-red-600 font-bold";
                                            else if (dLeft <= 30) daysLeftColor = "text-yellow-600 font-semibold";
                                            else daysLeftColor = "text-emerald-600";
                                        } else {
                                            daysLeftText = "Passed";
                                            daysLeftColor = "text-gray-400 line-through";
                                        }
                                    }

                                    return (
                                        <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="font-bold text-gray-900">{c.course?.code}</div>
                                                    <div className="text-xs text-gray-500 line-clamp-1">{c.course?.title}</div>
                                                </div>
                                                <div className={`text-sm ${daysLeftColor}`}>
                                                    {daysLeftText}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 text-xs text-gray-600 mb-3">
                                                <span className="bg-gray-100 px-2 py-1 rounded">Units: {c.course?.units}</span>
                                                <span className="bg-gray-100 px-2 py-1 rounded">Difficulty: {c.course?.difficulty}</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="date"
                                                        value={dateVal}
                                                        onChange={(e) => handleDraftChange(c.id, 'date', e.target.value || null)}
                                                        className="w-full rounded-lg border-gray-300 py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                    <input
                                                        type="time"
                                                        value={timeVal}
                                                        onChange={(e) => handleDraftChange(c.id, 'time', e.target.value || null)}
                                                        className="w-full rounded-lg border-gray-300 py-1.5 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    placeholder="Venue" 
                                                    value={examDrafts[c.id]?.venue || ''}
                                                    onChange={(e) => handleDraftChange(c.id, 'venue', e.target.value)}
                                                    className="w-full rounded-lg border-gray-300 py-1.5 px-3 text-sm"
                                                />
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="number" 
                                                        placeholder="Mins" 
                                                        value={examDrafts[c.id]?.duration || 180}
                                                        onChange={(e) => handleDraftChange(c.id, 'duration', parseInt(e.target.value))}
                                                        className="w-1/2 rounded-lg border-gray-300 py-1.5 px-3 text-sm"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Notes" 
                                                        value={examDrafts[c.id]?.instructions || ''}
                                                        onChange={(e) => handleDraftChange(c.id, 'instructions', e.target.value)}
                                                        className="w-1/2 rounded-lg border-gray-300 py-1.5 px-3 text-sm"
                                                    />
                                                </div>
                                            </div>
                                            {(dateVal || timeVal) && (
                                                <div className="mt-3 text-right">
                                                    <button
                                                        onClick={() => {
                                                            handleDraftChange(c.id, 'date', null);
                                                            handleDraftChange(c.id, 'time', null);
                                                        }}
                                                        className="text-xs font-semibold text-gray-500 hover:text-red-600 px-3 py-1.5 rounded bg-gray-100 hover:bg-red-50 transition-colors"
                                                    >
                                                        Clear Date & Time
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between shrink-0">
                            <button
                                onClick={() => {
                                    const blanks: Record<string, { date: string | null, time: string | null }> = {};
                                    courses.forEach(c => blanks[c.id] = { date: null, time: null });
                                    setExamDrafts(blanks);
                                }}
                                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                Clear All
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsBulkExamModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkSaveExams}
                                    className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    Bulk Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Regenerate Confirmation Modal */}
            {showRegenerateModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-center p-6 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <RefreshCw className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Exam Dates Updated</h3>
                        <p className="text-sm text-gray-500 mb-6">Would you like to regenerate your adaptive study plan now to reflect these changes?</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleRegenerateAction(true)}
                                className="w-full px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Regenerate Now
                            </button>
                            <button
                                onClick={() => handleRegenerateAction(false)}
                                className="w-full px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showMigrationModal && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-center p-6 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BrainCircuit className="w-6 h-6 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Complete Your Study Setup</h3>
                        <p className="text-sm text-gray-500 mb-6">To generate a more accurate and adaptive study plan, please select the specific topics you are currently covering for each course.</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => navigate('/onboarding', { state: { step: 3 } })}
                                className="w-full px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Let's go
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-indigo-600" />
                                Profile Settings
                            </h3>
                            <button onClick={() => setIsSettingsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Study After Exam Mode</label>
                                <p className="text-xs text-gray-500 mb-3">Choose how the adaptive planner should schedule sessions after an exam to prevent burnout.</p>
                                <select 
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border"
                                    value={studyPref}
                                    onChange={(e) => setStudyPref(e.target.value)}
                                >
                                    <option value="OFF">Take the day off (Recommended)</option>
                                    <option value="LIGHT">Light revision (Max 1.5 hrs of practice)</option>
                                    <option value="FULL">Full study as normal</option>
                                </select>
                            </div>
                            
                            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 mt-4">
                                <div>
                                    <p className="font-medium text-sm text-gray-900">Allow pre-exam revision</p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Schedule short sessions before exams when time is available.<br />
                                        <span className="text-amber-600 font-medium">Only recommended if you wake up early.</span>
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                    <input 
                                        type="checkbox" 
                                        checked={allowMorningRevision} 
                                        onChange={(e) => setAllowMorningRevision(e.target.checked)} 
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Focus Window (Optional)</label>
                                <p className="text-xs text-gray-500 mb-3">Prioritize scheduling study sessions during specific times of the day.</p>
                                <select 
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-2 px-3 border"
                                    value={preferredFocusWindow}
                                    onChange={(e) => setPreferredFocusWindow(e.target.value)}
                                >
                                    <option value="ANY">No Preference</option>
                                    <option value="early">Early (Before 12 PM)</option>
                                    <option value="mid">Mid (12 PM - 5 PM)</option>
                                    <option value="late">Late (After 5 PM)</option>
                                </select>
                            </div>

                            {(() => {
                                const isCgpaApplicable = stats?.profile && (
                                    Number(stats.profile.level) > 100 || 
                                    (Number(stats.profile.level) === 100 && Number(stats.profile.semester) > 1)
                                );
                                
                                return (
                                    <div className={`mt-4 ${!isCgpaApplicable ? 'opacity-60' : ''}`}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Current CGPA</label>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {!isCgpaApplicable 
                                                ? "CGPA is not applicable for 1st-semester students at the 100 level."
                                                : "Update your CGPA to receive better performance insights."}
                                        </p>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="5.0"
                                            disabled={!isCgpaApplicable}
                                            className={`w-full border-gray-300 rounded-lg shadow-sm sm:text-sm py-2 px-3 border ${
                                                !isCgpaApplicable 
                                                    ? 'bg-gray-100 cursor-not-allowed text-gray-400' 
                                                    : 'focus:ring-indigo-500 focus:border-indigo-500'
                                            }`}
                                            value={cgpa}
                                            onChange={(e) => setCgpa(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            placeholder="e.g. 4.5"
                                        />
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setIsSettingsModalOpen(false)}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Study Time Modal */}
            {isStudyTimeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-600" />
                                Manage Study Time
                            </h3>
                            <button onClick={() => setIsStudyTimeModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Set your daily study availability. Your entire study plan will be automatically recalculated to fit within these updated hours.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                    <input 
                                        type="time" 
                                        value={globalTime.start_time} 
                                        onChange={e => setGlobalTime({ ...globalTime, start_time: e.target.value })} 
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                    <input 
                                        type="time" 
                                        value={globalTime.end_time} 
                                        onChange={e => setGlobalTime({ ...globalTime, end_time: e.target.value })} 
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 border" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 pt-0 flex gap-3">
                            <button
                                onClick={() => setIsStudyTimeModalOpen(false)}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveStudyTime}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Save & Recalculate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
