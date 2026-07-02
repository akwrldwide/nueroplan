import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

import { User, BookOpen, Clock, CheckCircle, Loader2, Plus, Edit2, X, Trash2, List } from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

export default function Onboarding() {
    const { user, reloadUser } = useContext(AuthContext);
    const [step, setStep] = useState(1);

    const navigate = useNavigate();
    const location = useLocation();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [profileData, setProfileData] = useState({
        program: 'Computer Science',
        level: '100',
        semester: '1',
        curriculum_type: 'BMAS',
        current_cgpa: '',
        academic_goal: 'Pass All',
    });

    const [semesterOptions, setSemesterOptions] = useState<any[]>([
        { value: '1', name: '1st Semester', isActiveByDate: true, dateString: 'Jan 1 - Jun 30' },
        { value: '2', name: '2nd Semester', isActiveByDate: false, dateString: 'Jul 1 - Dec 31' }
    ]);

    const [selectedSystemSemester, setSelectedSystemSemester] = useState<string>('1');

    const requiresCGPA = Number(profileData.level) > 100 || (Number(profileData.level) === 100 && profileData.semester === '2');

    useEffect(() => {
        if (!requiresCGPA && profileData.current_cgpa) {
            setProfileData(prev => ({ ...prev, current_cgpa: '' }));
        }
    }, [requiresCGPA, profileData.current_cgpa]);

    // Sync system registration window with academic semester on changes
    useEffect(() => {
        if (profileData.semester) {
            setSelectedSystemSemester(profileData.semester);
        }
    }, [profileData.semester]);

    const [courses, setCourses] = useState<any[]>([]);

    const [userCourses, setUserCourses] = useState<any[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<Record<string, any[]>>({});
    const [customTopicInput, setCustomTopicInput] = useState<Record<string, string>>({});

    const [programs, setPrograms] = useState<string[]>([
        'Computer Science',
        'Software Engineering',
        'Mechanical Engineering'
    ]);

    useEffect(() => {
        const fetchPrograms = async () => {
            try {
                const { data, error } = await supabase
                    .from('Program')
                    .select('name')
                    .order('name', { ascending: true });
                if (error) throw error;
                if (data) {
                    setPrograms(data.map((p: any) => p.name));
                }
            } catch (err) {
                console.error('Error fetching programs:', err);
            }
        };
        fetchPrograms();
    }, []);

    useEffect(() => {
        const fetchSemesterWindows = async () => {
            try {
                const today = new Date();
                const { data, error } = await supabase
                    .from('ActiveSemesterWindow')
                    .select('*')
                    .eq('is_active', true)
                    .order('start_date', { ascending: true });

                if (error) throw error;
                if (data && data.length > 0) {
                    const formatted = data.map((win: any) => {
                        const start = new Date(win.start_date);
                        const end = new Date(win.end_date);
                        
                        let mode: 'active' | 'upcoming' | 'past' = 'active';
                        if (today > end) {
                            mode = 'past';
                        } else if (today < start) {
                            mode = 'upcoming';
                        }
                        
                        return {
                            ...win,
                            value: win.name.toLowerCase().includes('1st') || win.name.includes('1') ? '1' : '2',
                            mode,
                            dateString: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                        };
                    });

                    const hasUpcoming = formatted.some(win => win.mode === 'upcoming');
                    const filtered = hasUpcoming 
                        ? formatted.filter(win => win.mode !== 'past')
                        : formatted;

                    setSemesterOptions(filtered);

                    // Set default semester to the active one by date (or if none, the first available non-past one)
                    const activeWin = filtered.find(win => win.mode === 'active') || filtered.find(win => win.mode === 'upcoming');
                    if (activeWin) {
                        setProfileData(prev => ({ ...prev, semester: activeWin.value }));
                        setSelectedSystemSemester(activeWin.value);
                    }
                }
            } catch (err) {
                console.error('Error fetching semester windows:', err);
            }
        };
        fetchSemesterWindows();
    }, []);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const [availabilityType, setAvailabilityType] = useState('Option A'); 
    
    const [isGlobalConfigured, setIsGlobalConfigured] = useState(false);
    const [isGlobalEditing, setIsGlobalEditing] = useState(false);
    const [globalTime, setGlobalTime] = useState({ start_time: '', end_time: '' });

    const [customTimes, setCustomTimes] = useState<any>(
        days.reduce((acc, d) => ({ 
            ...acc, 
            [d]: { start_time: '', end_time: '', configured: false, isEditing: false } 
        }), {})
    );

    const calculateWeeklyTotal = () => {
        let totalMinutes = 0;
        if (availabilityType === 'Option A') {
            if (isGlobalConfigured && globalTime.start_time && globalTime.end_time) {
                const start = new Date(`1970-01-01T${globalTime.start_time}:00`);
                const end = new Date(`1970-01-01T${globalTime.end_time}:00`);
                if (end > start) {
                    const diffMins = (end.getTime() - start.getTime()) / 60000;
                    totalMinutes = diffMins * 7;
                }
            }
        } else {
            days.forEach(d => {
                const dayConfig = customTimes[d];
                if (dayConfig.configured && dayConfig.start_time && dayConfig.end_time) {
                    const start = new Date(`1970-01-01T${dayConfig.start_time}:00`);
                    const end = new Date(`1970-01-01T${dayConfig.end_time}:00`);
                    if (end > start) {
                        const diffMins = (end.getTime() - start.getTime()) / 60000;
                        totalMinutes += diffMins;
                    }
                }
            });
        }
        return Math.floor(totalMinutes / 60) + (totalMinutes % 60) / 60;
    };

    const weeklyTotal = calculateWeeklyTotal();
    const isValidToSubmit = () => {
        if (availabilityType === 'Option A') return isGlobalConfigured;
        return days.some(d => customTimes[d].configured);
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${m} ${ampm}`;
    };
    
    const validateTimeRange = (start: string, end: string) => {
        if (!start || !end) return false;
        const s = new Date(`1970-01-01T${start}:00`);
        const e = new Date(`1970-01-01T${end}:00`);
        return (e.getTime() - s.getTime()) >= 30 * 60000; 
    };

    const loadUserCoursesForTopics = async () => {
        try {
            const { data, error } = await supabase
                .from('UserCourse')
                .select('*, course:Course(*, courseTopics:CourseTopic(*))')
                .eq('user_id', user?.id)
                .eq('is_archived', false);
            
            if (error) throw error;

            setUserCourses(data || []);
            const initialSelected: Record<string, any[]> = {};
            data?.forEach((uc: any) => {
                // Pre-select all default topics initially to speed up setup for the user
                initialSelected[uc.course_id] = (uc.course?.courseTopics || []).map((ct: any) => ({
                    course_id: uc.course_id,
                    topic_name: ct.topic_name,
                    course_topic_id: ct.id
                }));
            });
            setSelectedTopics(initialSelected);
        } catch (error) {
            console.error("Failed to load generic courses for topic selection", error);
        }
    };

    useEffect(() => {
        if (!user) return;

        if (location.state?.step) {
            setStep(location.state.step);
            if (location.state.step === 3) {
                loadUserCoursesForTopics();
            }
            navigate(location.pathname, { replace: true, state: {} });
            return;
        }

        switch (user.onboarding_stage) {
            case 'PROFILE':
                setStep(1);
                break;
            case 'COURSES':
                setStep(2);
                if (courses.length === 0) {
                    supabase.from('AcademicProfile').select('*').eq('user_id', user.id).maybeSingle().then(async ({ data: profile, error }) => {
                        if (error) {
                            console.error(error);
                            return;
                        }
                        if (profile && profile.curriculum_type === 'BMAS') {
                            const { data: curriculum, error: currErr } = await supabase
                                .from('Course')
                                .select('*, program:Program!inner(name), courseTopics:CourseTopic(*)')
                                .eq('program.name', profile.program)
                                .eq('level', parseInt(profile.level))
                                .eq('semester', parseInt(profile.semester))
                                .order('level', { ascending: true })
                                .order('semester', { ascending: true })
                                .order('code', { ascending: true });

                            if (currErr) {
                                console.error(currErr);
                                return;
                            }
                            setCourses(curriculum || []);
                        }
                    });
                }
                break;
            case 'TOPICS':
                setStep(3);
                loadUserCoursesForTopics();
                break;
            case 'AVAILABILITY':
                setStep(4);
                break;
            case 'COMPLETE':
                navigate('/dashboard');
                break;
            default:
                setStep(1);
        }
    }, [user, navigate]);

    useEffect(() => {
        if (!user) return;
        supabase
            .from('AcademicProfile')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data, error }) => {
                if (data && !error) {
                    setProfileData({
                        program: data.program,
                        level: String(data.level),
                        semester: String(data.semester),
                        curriculum_type: data.curriculum_type,
                        current_cgpa: data.current_cgpa ? String(data.current_cgpa) : '',
                        academic_goal: data.academic_goal
                    });
                }
            });
    }, [user]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (requiresCGPA) {
            const cgpaVal = parseFloat(profileData.current_cgpa);
            if (!profileData.current_cgpa || isNaN(cgpaVal) || cgpaVal <= 0 || cgpaVal > 5.0) {
                alert("Please enter a valid CGPA between 0.0 and 5.0");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const today = new Date();
            const currentYear = today.getFullYear();

            const systemSemInt = parseInt(selectedSystemSemester);
            const userSelectedSemStr = systemSemInt === 1 ? '1st Semester' : '2nd Semester';

            // Attempt to query the target window from DB by name
            const { data: targetWindowFromDb } = await supabase
                .from('ActiveSemesterWindow')
                .select('*')
                .eq('name', userSelectedSemStr)
                .eq('is_active', true)
                .order('start_date', { ascending: true })
                .limit(1)
                .maybeSingle();

            let targetSemName = userSelectedSemStr;
            let targetSemStart = '';

            if (targetWindowFromDb) {
                targetSemName = targetWindowFromDb.name;
                targetSemStart = targetWindowFromDb.start_date;
            } else {
                // Fallback calculation
                if (userSelectedSemStr === "1st Semester") {
                    const year = today.getMonth() >= 6 ? currentYear + 1 : currentYear;
                    targetSemStart = new Date(year, 0, 1).toISOString();
                } else {
                    targetSemStart = new Date(currentYear, 6, 1).toISOString();
                }
            }

            // Check if profile exists first
            const { data: existingProfile } = await supabase
                .from('AcademicProfile')
                .select('id')
                .eq('user_id', user?.id)
                .maybeSingle();

            if (existingProfile) {
                // Update profile
                const { error: profileErr } = await supabase
                    .from('AcademicProfile')
                    .update({
                        program: profileData.program,
                        level: parseInt(profileData.level),
                        semester: parseInt(profileData.semester),
                        curriculum_type: profileData.curriculum_type,
                        current_cgpa: profileData.current_cgpa ? parseFloat(profileData.current_cgpa) : null,
                        academic_goal: profileData.academic_goal
                    })
                    .eq('user_id', user?.id);
                if (profileErr) throw profileErr;

                // Create/update UserSelectedSemester
                await supabase
                    .from('UserSelectedSemester')
                    .upsert({
                        id: crypto.randomUUID(),
                        user_id: user?.id,
                        semester: targetSemName
                    }, { onConflict: 'user_id' });

                // Also update current AcademicSession if one exists and is not closed yet
                const { data: activeSessionData } = await supabase
                    .from('AcademicSession')
                    .select('*')
                    .eq('user_id', user?.id)
                    .order('created_at', { ascending: false })
                    .limit(1);
                
                const activeSession = activeSessionData?.[0] || null;
                if (activeSession && !activeSession.end_date) {
                    await supabase
                        .from('AcademicSession')
                        .update({
                            semester: targetSemName,
                            level: parseInt(profileData.level),
                            start_date: targetSemStart
                        })
                        .eq('id', activeSession.id);
                }

                if (profileData.curriculum_type === 'BMAS') {
                    const { data: curriculum, error: currErr } = await supabase
                        .from('Course')
                        .select('*, program:Program!inner(name), courseTopics:CourseTopic(*)')
                        .eq('program.name', profileData.program)
                        .eq('level', parseInt(profileData.level))
                        .eq('semester', parseInt(profileData.semester))
                        .order('level', { ascending: true })
                        .order('semester', { ascending: true })
                        .order('code', { ascending: true });
                    if (currErr) throw currErr;
                    setCourses(curriculum || []);
                }
                setStep(2);
                return;
            }

            // Create profile
            const { error: profileErr } = await supabase
                .from('AcademicProfile')
                .insert({
                    id: crypto.randomUUID(),
                    user_id: user?.id,
                    program: profileData.program,
                    level: parseInt(profileData.level),
                    semester: parseInt(profileData.semester),
                    curriculum_type: profileData.curriculum_type,
                    current_cgpa: profileData.current_cgpa ? parseFloat(profileData.current_cgpa) : null,
                    academic_goal: profileData.academic_goal
                });
            if (profileErr) throw profileErr;

            // Create/update UserSelectedSemester
            await supabase
                .from('UserSelectedSemester')
                .upsert({
                    id: crypto.randomUUID(),
                    user_id: user?.id,
                    semester: targetSemName
                }, { onConflict: 'user_id' });

            // Create AcademicSession using the target window name and start date
            const { error: sessionErr } = await supabase
                .from('AcademicSession')
                .insert({
                    id: crypto.randomUUID(),
                    user_id: user?.id,
                    semester: targetSemName,
                    level: parseInt(profileData.level),
                    start_date: targetSemStart
                });
            if (sessionErr) throw sessionErr;

            // Update user onboarding stage
            const { error: userErr } = await supabase
                .from('User')
                .update({ onboarding_stage: 'COURSES' })
                .eq('id', user?.id);
            if (userErr) throw userErr;

            if (profileData.curriculum_type === 'BMAS') {
                const { data: curriculum, error: currErr } = await supabase
                    .from('Course')
                    .select('*, program:Program!inner(name), courseTopics:CourseTopic(*)')
                    .eq('program.name', profileData.program)
                    .eq('level', parseInt(profileData.level))
                    .eq('semester', parseInt(profileData.semester))
                    .order('level', { ascending: true })
                    .order('semester', { ascending: true })
                    .order('code', { ascending: true });
                if (currErr) throw currErr;
                setCourses(curriculum || []);
            }
            await reloadUser();
        } catch (error: any) {
            console.error(error);
            alert(`Error saving profile: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCurriculumSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (courses.length > 0) {
                // Delete existing active UserCourses
                const { error: deleteErr } = await supabase
                    .from('UserCourse')
                    .delete()
                    .eq('user_id', user?.id)
                    .eq('is_archived', false);
                if (deleteErr) throw deleteErr;

                // Insert new UserCourses
                const coursesToInsert = courses.map((c: any) => ({
                    id: crypto.randomUUID(),
                    user_id: user?.id,
                    course_id: c.id,
                    is_selected: true,
                    is_completed: false,
                    is_archived: false,
                    exam_duration: 180
                }));
                const { error: insertErr } = await supabase
                    .from('UserCourse')
                    .insert(coursesToInsert);
                if (insertErr) throw insertErr;

                // Update Onboarding Stage to TOPICS
                const nextStage = user?.onboarding_stage === 'COMPLETE' ? 'COMPLETE' : 'TOPICS';
                const { error: userErr } = await supabase
                    .from('User')
                    .update({ onboarding_stage: nextStage })
                    .eq('id', user?.id);
                if (userErr) throw userErr;
            } else {
                alert("Please add courses");
                setIsSubmitting(false);
                return;
            }
            await reloadUser();
            // Explicitly transition to next step in UI
            setStep(3);
            loadUserCoursesForTopics();
        } catch (error) {
            console.error(error);
            alert('Error saving courses');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTopicToggle = (courseId: string, topicName: string, courseTopicId?: string) => {
        setSelectedTopics(prev => {
            const currentSelected = prev[courseId] || [];
            const isSelected = currentSelected.find(t => t.topic_name === topicName);
            
            if (isSelected) {
                return {
                    ...prev,
                    [courseId]: currentSelected.filter(t => t.topic_name !== topicName)
                };
            } else {
                return {
                    ...prev,
                    [courseId]: [...currentSelected, { course_id: courseId, topic_name: topicName, course_topic_id: courseTopicId }]
                };
            }
        });
    };

    const handleAddCustomTopic = (courseId: string) => {
        const inputStr = customTopicInput[courseId]?.trim();
        if (!inputStr) return;
        
        setSelectedTopics(prev => {
            const currentSelected = prev[courseId] || [];
            if (currentSelected.find(t => t.topic_name === inputStr)) return prev; 
            return {
                ...prev,
                [courseId]: [...currentSelected, { course_id: courseId, topic_name: inputStr, course_topic_id: null }]
            };
        });

        setCustomTopicInput(prev => ({ ...prev, [courseId]: '' }));
    };

    const hasAnyTopicSelected = Object.values(selectedTopics).some(topics => topics.length > 0);

    const isValidTopics = () => {
        return true;
    };

    const handleTopicsSubmit = async () => {
        setIsSubmitting(true);
        try {
            if (!isValidTopics()) {
                alert("Please select at least 1 topic per course.");
                setIsSubmitting(false);
                return;
            }

            let allTopicsToSave: any[] = [];
            Object.values(selectedTopics).forEach(courseArray => {
                allTopicsToSave = [...allTopicsToSave, ...courseArray];
            });

            // Delete existing active UserTopics
            const { error: deleteErr } = await supabase
                .from('UserTopic')
                .delete()
                .eq('user_id', user?.id)
                .eq('is_archived', false);
            if (deleteErr) throw deleteErr;

            // Fetch active courses
            const { data: activeCourses, error: coursesErr } = await supabase
                .from('UserCourse')
                .select('*')
                .eq('user_id', user?.id)
                .eq('is_archived', false);
            if (coursesErr) throw coursesErr;

            const providedCourseIds = new Set(allTopicsToSave.map(t => t.course_id));
            const topicsToSave = [...allTopicsToSave];

            activeCourses?.forEach((c: any) => {
                if (!providedCourseIds.has(c.course_id)) {
                    topicsToSave.push({
                        course_id: c.course_id,
                        topic_name: 'General Study',
                        course_topic_id: null
                    });
                }
            });

            // Insert new UserTopics
            const topicsToInsert = topicsToSave.map((t: any) => ({
                id: crypto.randomUUID(),
                user_id: user?.id,
                course_id: t.course_id,
                course_topic_id: t.course_topic_id || null,
                topic_name: t.topic_name,
                mastery_level: 0,
                is_selected: true,
                is_archived: false
            }));

            const { error: insertErr } = await supabase
                .from('UserTopic')
                .insert(topicsToInsert);
            if (insertErr) throw insertErr;

            // Update user onboarding stage
            const nextStage = user?.onboarding_stage === 'COMPLETE' ? 'COMPLETE' : 'AVAILABILITY';
            const { error: userErr } = await supabase
                .from('User')
                .update({ onboarding_stage: nextStage })
                .eq('id', user?.id);
            if (userErr) throw userErr;

            await reloadUser();
            
            if (user?.onboarding_stage === 'COMPLETE') {
                navigate('/dashboard');
            } else {
                // Explicitly transition to next step in UI
                setStep(4);
            }
        } catch (error) {
            console.error(error);
            alert('Error saving topics');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAvailabilitySubmit = async () => {
        setIsSubmitting(true);
        try {
            let finalAvailabilities: any[] = [];
            if (availabilityType === 'Option A') {
                if (isGlobalConfigured) {
                    finalAvailabilities = days.map(d => ({
                        day_of_week: d,
                        start_time: globalTime.start_time,
                        end_time: globalTime.end_time
                    }));
                }
            } else {
                // Auto-save any days that are currently being edited and have valid times
                const updatedCustomTimes = { ...customTimes };
                days.forEach(d => {
                    if (updatedCustomTimes[d].isEditing && validateTimeRange(updatedCustomTimes[d].start_time, updatedCustomTimes[d].end_time)) {
                        updatedCustomTimes[d].configured = true;
                        updatedCustomTimes[d].isEditing = false;
                    }
                });
                
                finalAvailabilities = days
                    .filter(d => updatedCustomTimes[d].configured)
                    .map(d => ({
                        day_of_week: d,
                        start_time: updatedCustomTimes[d].start_time,
                        end_time: updatedCustomTimes[d].end_time
                    }));
            }

            if (finalAvailabilities.length === 0) {
                alert("Please configure study time before saving.");
                setIsSubmitting(false);
                return;
            }

            // Delete existing StudyAvailability
            const { error: deleteErr } = await supabase
                .from('StudyAvailability')
                .delete()
                .eq('user_id', user?.id);
            if (deleteErr) throw deleteErr;

            // Insert new StudyAvailability
            const availToInsert = finalAvailabilities.map((a: any) => ({
                id: crypto.randomUUID(),
                user_id: user?.id,
                day_of_week: a.day_of_week,
                start_time: a.start_time,
                end_time: a.end_time
            }));
            const { error: insertErr } = await supabase
                .from('StudyAvailability')
                .insert(availToInsert);
            if (insertErr) throw insertErr;

            // Generate study plan via Edge Function
            const { error: genErr } = await supabase.functions.invoke('generate-plan', {
                body: { fullRecalculate: true }
            });
            if (genErr) throw genErr;

            // Set Onboarding Stage to COMPLETE
            const { error: userErr } = await supabase
                .from('User')
                .update({ onboarding_stage: 'COMPLETE' })
                .eq('id', user?.id);
            if (userErr) throw userErr;

            await reloadUser();
        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message || 'Server error saving availability'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto w-full">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className={`flex flex-col items-center ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
                                <User size={20} />
                            </div>
                            <span className="text-sm font-medium mt-2 hidden sm:block">Profile</span>
                        </div>
                        <div className={`flex-1 h-1 mx-2 sm:mx-4 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                        <div className={`flex flex-col items-center ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
                                <BookOpen size={20} />
                            </div>
                            <span className="text-sm font-medium mt-2 hidden sm:block">Curriculum</span>
                        </div>
                        <div className={`flex-1 h-1 mx-2 sm:mx-4 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                        <div className={`flex flex-col items-center ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
                                <List size={20} />
                            </div>
                            <span className="text-sm font-medium mt-2 hidden sm:block">Topics</span>
                        </div>
                        <div className={`flex-1 h-1 mx-2 sm:mx-4 ${step >= 4 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                        <div className={`flex flex-col items-center ${step >= 4 ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${step >= 4 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'}`}>
                                <Clock size={20} />
                            </div>
                            <span className="text-sm font-medium mt-2 hidden sm:block">Availability</span>
                        </div>
                    </div>
                </div>

                {step > 1 && (user?.onboarding_stage !== 'COMPLETE' || !hasAnyTopicSelected) && (
                    <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <Clock className="h-5 w-5 text-amber-400" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-amber-700 font-medium">
                                    Welcome back! Please complete your setup to access the NeuroPlan dashboard.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5 sm:p-10">

                    {step === 1 && (
                        <form onSubmit={handleProfileSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Let's build your Academic Profile</h2>
                                <p className="text-gray-500 mt-2">Tell the engine a bit about your current standing.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                                    <select
                                        value={profileData.program}
                                        onChange={(e) => setProfileData({ ...profileData, program: e.target.value })}
                                        className="block w-full rounded-xl border-gray-300 border py-3 px-4 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        {programs.map((prog) => (
                                            <option key={prog} value={prog}>
                                                {prog}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                                    <select
                                        value={profileData.level}
                                        onChange={(e) => setProfileData({ ...profileData, level: e.target.value })}
                                        className="block w-full rounded-xl border-gray-300 border py-3 px-4 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        <option value="100">100</option>
                                        <option value="200">200</option>
                                        <option value="300">300</option>
                                        <option value="400">400</option>
                                        <option value="500">500</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Semester</label>
                                    <select
                                        value={profileData.semester}
                                        onChange={(e) => setProfileData({ ...profileData, semester: e.target.value })}
                                        className="block w-full rounded-xl border-gray-300 border py-3 px-4 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    >
                                        <option value="1">1st Semester</option>
                                        <option value="2">2nd Semester</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Current CGPA {requiresCGPA && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="number" step="0.01" min="0" max="5" required={requiresCGPA}
                                        value={profileData.current_cgpa}
                                        onChange={(e) => setProfileData({ ...profileData, current_cgpa: e.target.value })}
                                        disabled={!requiresCGPA}
                                        className={`block w-full rounded-xl border py-3 px-4 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                                            !requiresCGPA ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 bg-white text-gray-900'
                                        }`}
                                    />
                                    {!requiresCGPA && (
                                        <p className="mt-2 text-xs text-gray-500">
                                            You can update your CGPA after your first semester results are released.
                                        </p>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Registration Window</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {semesterOptions.map((opt) => {
                                            const isSelected = selectedSystemSemester === opt.value && opt.mode !== 'past';
                                            const cardClass = opt.mode === 'past'
                                                ? 'border-gray-200 bg-gray-50/50 opacity-60 cursor-not-allowed'
                                                : isSelected
                                                    ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/10 font-semibold cursor-pointer'
                                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50/30 cursor-pointer';

                                            return (
                                                <div
                                                    key={opt.value}
                                                    onClick={() => opt.mode !== 'past' && setSelectedSystemSemester(opt.value)}
                                                    className={`border rounded-xl p-3 px-4 flex justify-between items-center transition-all ${cardClass}`}
                                                >
                                                    <div>
                                                        <span className="font-semibold text-gray-900 text-sm">{opt.name}</span>
                                                        <span className="block text-[11px] text-gray-500 mt-0.5">{opt.dateString}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {opt.mode === 'active' && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Active Semester
                                                            </span>
                                                        )}
                                                        {opt.mode === 'upcoming' && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                Upcoming Semester
                                                            </span>
                                                        )}
                                                        {opt.mode === 'past' && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                                Past Semester
                                                            </span>
                                                        )}
                                                        {opt.mode !== 'past' && (
                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                                                isSelected
                                                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                                                    : 'border-gray-300 bg-white'
                                                            }`}>
                                                                {isSelected && (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        Specify which academic registration window you want your profile and study plan to be generated in.
                                    </p>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Goal</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                        {['Pass All', 'Improve GPA', 'First Class'].map((goal) => (
                                            <div
                                                key={goal}
                                                onClick={() => setProfileData({ ...profileData, academic_goal: goal })}
                                                className={`cursor-pointer border rounded-xl p-4 text-center transition-all ${profileData.academic_goal === goal
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {goal}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Continue to Curriculum'}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Verify Your Curriculum</h2>
                                <p className="text-gray-500 mt-2">Select the courses you're taking this semester.</p>
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
                                <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty (1-5)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {courses.map((c, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                    {/* Temporarily assume all are selected for this rework, or let User click a standard check. In UI it says they are all pre-loaded and auto-selected for simplicity */}
                                                    <CheckCircle className="w-5 h-5 text-indigo-600 mx-auto" />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {c.code} - {c.title}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {c.units}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {c.difficulty}
                                                </td>
                                            </tr>
                                        ))}
                                        {courses.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                                    No courses loaded. (In a full app, show a manual entry form here).
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Mobile Cards View */}
                                <div className="sm:hidden flex flex-col gap-3 p-3">
                                    {courses.map((c, idx) => (
                                        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
                                            <div className="mt-0.5">
                                                <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{c.code}</div>
                                                <div className="text-sm text-gray-600 mb-3">{c.title}</div>
                                                <div className="flex gap-2 text-xs font-medium text-gray-600">
                                                    <span className="bg-gray-100 px-2 py-1 rounded-md">Units: {c.units}</span>
                                                    <span className="bg-gray-100 px-2 py-1 rounded-md">Difficulty: {c.difficulty}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {courses.length === 0 && (
                                        <div className="p-4 text-center text-sm text-gray-500">
                                            No courses loaded.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="inline-flex justify-center py-3 px-8 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCurriculumSubmit}
                                    disabled={isSubmitting}
                                    className="inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Confirm Courses'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Select Your Topics</h2>
                                <p className="text-gray-500 mt-2">Break down your courses into specific topics for granular study tracking. Selecting topics is optional but recommended.</p>
                            </div>

                            <div className="space-y-4">
                                {userCourses.map(uc => {
                                    const availableTopics = uc.course?.courseTopics || [];
                                    const selectedForCourse = selectedTopics[uc.course_id] || [];
                                    
                                    return (
                                        <div key={uc.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                                <h3 className="text-lg font-semibold text-gray-900">{uc.course.code}: {uc.course.title}</h3>
                                                <p className="text-sm text-gray-500 mt-1">{selectedForCourse.length} topic(s) selected</p>
                                            </div>
                                            <div className="p-6 bg-white space-y-4">
                                                {availableTopics.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {availableTopics.map((ct: any) => {
                                                            const isChecked = !!selectedForCourse.find(t => t.topic_name === ct.topic_name);
                                                            return (
                                                                <label key={ct.id} className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors ${isChecked ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200 bg-white'}`}>
                                                                    <div className="flex items-center h-5">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={isChecked}
                                                                            onChange={() => handleTopicToggle(uc.course_id, ct.topic_name, ct.id)}
                                                                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                                                        />
                                                                    </div>
                                                                    <div className="ml-3 text-sm">
                                                                        <span className={`font-medium ${isChecked ? 'text-indigo-900' : 'text-gray-700'}`}>{ct.topic_name}</span>
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 italic">No predefined topics available.</p>
                                                )}
                                                
                                                <div className="pt-4 mt-4 border-t border-gray-100">
                                                    <div className="flex space-x-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Add a custom topic..."
                                                            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                            value={customTopicInput[uc.course_id] || ''}
                                                            onChange={(e) => setCustomTopicInput(prev => ({ ...prev, [uc.course_id]: e.target.value }))}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomTopic(uc.course_id) }}
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleAddCustomTopic(uc.course_id)}
                                                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                                                        >
                                                            Add
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Render newly added custom topics not part of defaults */}
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {selectedForCourse.filter(t => !t.course_topic_id).map((ct: any, idx) => (
                                                            <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                                                                {ct.topic_name}
                                                                <button type="button" onClick={() => handleTopicToggle(uc.course_id, ct.topic_name)} className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-emerald-600 hover:bg-emerald-200 hover:text-emerald-900 focus:outline-none focus:bg-emerald-500 focus:text-white">
                                                                    <span className="sr-only">Remove custom topic</span>
                                                                    <X className="h-3 w-3" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {!hasAnyTopicSelected && userCourses.length > 0 && (
                                <p className="text-sm text-amber-600 text-center font-medium">You haven't selected any topics. This is optional, but highly recommended for an accurate study plan.</p>
                            )}

                            <div className="mt-8 flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (user?.onboarding_stage === 'COMPLETE') {
                                            navigate('/dashboard');
                                        } else {
                                            setStep(2);
                                        }
                                    }}
                                    className="inline-flex justify-center py-3 px-8 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    {user?.onboarding_stage === 'COMPLETE' ? 'Cancel' : 'Back'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleTopicsSubmit}
                                    disabled={isSubmitting || !isValidTopics()}
                                    className="inline-flex justify-center py-3 px-8 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Confirm Topics'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Study Availability</h2>
                                <p className="text-gray-500 mt-2">Only enter time ranges when you can consistently focus.</p>
                            </div>

                            <div className="flex space-x-4 justify-center mb-6">
                                <button
                                    onClick={() => setAvailabilityType('Option A')}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${availabilityType === 'Option A' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    Same Schedule Every Day
                                </button>
                                <button
                                    onClick={() => setAvailabilityType('Option B')}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${availabilityType === 'Option B' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    Customize Each Day
                                </button>
                            </div>

                            {availabilityType === 'Option A' ? (
                                <div className="max-w-md mx-auto">
                                    {!isGlobalConfigured && !isGlobalEditing ? (
                                        <div className="flex justify-center py-6">
                                            <button
                                                type="button"
                                                onClick={() => setIsGlobalEditing(true)}
                                                className="px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 font-medium transition-all flex items-center space-x-2"
                                            >
                                                <Plus className="w-5 h-5" />
                                                <span>Set Study Time</span>
                                            </button>
                                        </div>
                                    ) : isGlobalEditing ? (
                                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                                                    <input type="time" value={globalTime.start_time} onChange={e => setGlobalTime({ ...globalTime, start_time: e.target.value })} className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                                                    <input type="time" value={globalTime.end_time} onChange={e => setGlobalTime({ ...globalTime, end_time: e.target.value })} className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                                </div>
                                            </div>
                                            <div className="mt-6 flex justify-end space-x-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!isGlobalConfigured) setGlobalTime({ start_time: '', end_time: '' });
                                                        setIsGlobalEditing(false);
                                                    }}
                                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!validateTimeRange(globalTime.start_time, globalTime.end_time)}
                                                    onClick={() => {
                                                        setIsGlobalConfigured(true);
                                                        setIsGlobalEditing(false);
                                                    }}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm text-center animate-in fade-in zoom-in-95 duration-200">
                                            <p className="font-semibold text-gray-900 mb-2">Mon – Sun</p>
                                            <div className="flex items-center justify-center space-x-2 text-lg text-indigo-700 font-medium mb-6">
                                                <Clock className="w-5 h-5" />
                                                <span>{formatTime(globalTime.start_time)} – {formatTime(globalTime.end_time)}</span>
                                            </div>
                                            <div className="flex justify-center space-x-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsGlobalEditing(true)}
                                                    className="flex items-center space-x-1 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    <span>Edit</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsGlobalConfigured(false);
                                                        setGlobalTime({ start_time: '', end_time: '' });
                                                    }}
                                                    className="flex items-center space-x-1 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                    <span>Clear</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    {days.map(d => (
                                        <div key={d} className={`p-4 rounded-xl border transition-all ${customTimes[d].configured ? 'bg-white border-indigo-200 shadow-sm' : customTimes[d].isEditing ? 'bg-white border-indigo-300 shadow-md' : 'bg-gray-50 border-gray-100'}`}>
                                            {!customTimes[d].configured && !customTimes[d].isEditing ? (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-4">
                                                        <input type="checkbox" disabled className="rounded text-gray-300 border-gray-200" />
                                                        <span className="font-medium text-gray-400">{d}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCustomTimes({ ...customTimes, [d]: { ...customTimes[d], isEditing: true } })}
                                                        className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center space-x-1"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        <span>Add Time</span>
                                                    </button>
                                                </div>
                                            ) : customTimes[d].isEditing ? (
                                                <div className="animate-in fade-in duration-200">
                                                    <div className="flex items-center mb-4 space-x-4">
                                                        <input type="checkbox" checked readOnly className="rounded text-indigo-600" />
                                                        <span className="font-semibold text-gray-900">{d}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-4">
                                                        <div className="flex-1">
                                                            <input type="time" value={customTimes[d].start_time} onChange={e => setCustomTimes({ ...customTimes, [d]: { ...customTimes[d], start_time: e.target.value } })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                                        </div>
                                                        <span className="text-gray-400">to</span>
                                                        <div className="flex-1">
                                                            <input type="time" value={customTimes[d].end_time} onChange={e => setCustomTimes({ ...customTimes, [d]: { ...customTimes[d], end_time: e.target.value } })} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 flex justify-end space-x-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (!customTimes[d].configured) {
                                                                    setCustomTimes({ ...customTimes, [d]: { ...customTimes[d], isEditing: false, start_time: '', end_time: '' } });
                                                                } else {
                                                                    setCustomTimes({ ...customTimes, [d]: { ...customTimes[d], isEditing: false } });
                                                                }
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={!validateTimeRange(customTimes[d].start_time, customTimes[d].end_time)}
                                                            onClick={() => setCustomTimes({ ...customTimes, [d]: { ...customTimes[d], configured: true, isEditing: false } })}
                                                            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between animate-in fade-in duration-200">
                                                    <div className="flex items-center space-x-4">
                                                        <CheckCircle className="w-5 h-5 text-indigo-600" />
                                                        <span className="font-semibold text-gray-900">{d}</span>
                                                        <span className="flex items-center space-x-1 text-sm text-gray-700 font-medium ml-4">
                                                            <Clock className="w-4 h-4 text-gray-400" />
                                                            <span>{formatTime(customTimes[d].start_time)} – {formatTime(customTimes[d].end_time)}</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomTimes({ ...customTimes, [d]: { ...customTimes[d], isEditing: true } })}
                                                            className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomTimes({ ...customTimes, [d]: { ...customTimes[d], configured: false, start_time: '', end_time: '' } })}
                                                            className="text-gray-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Weekly Total Display */}
                            <div className="mt-8 border-t border-gray-100 pt-6">
                                <div className="flex justify-between items-center bg-gray-50 rounded-xl p-4">
                                    <span className="font-semibold text-gray-700">Weekly Available Study Time:</span>
                                    <span className="font-bold text-lg text-indigo-600">{weeklyTotal.toFixed(1)} hrs</span>
                                </div>
                                {!isValidToSubmit() && (
                                    <p className="text-sm text-amber-600 mt-2 text-center">Add at least one study time to continue.</p>
                                )}
                            </div>

                            <div className="mt-8 flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="inline-flex justify-center py-3 px-8 border border-gray-300 shadow-sm text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAvailabilitySubmit}
                                    disabled={isSubmitting || !isValidToSubmit()}
                                    className="inline-flex justify-center items-center py-3 px-8 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                                    Finish & Generate Plan
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
