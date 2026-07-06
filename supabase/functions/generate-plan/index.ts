import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { calculateTopicPriority } from "./priorityEngine.ts";
import { calculateRiskFactor } from "./riskEngine.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AvailabilitySlot {
  start: number;
  end: number;
  isPreExamBlock?: boolean;
  isPostExamBlock?: boolean;
  preExamCourseId?: string;
  [key: string]: any;
}

function subtractIntervals(availabilitySlots: { start: number; end: number }[], examSlots: { start: number; end: number; courseId: string }[]) {
  const result: AvailabilitySlot[] = [];
  for (const slot of availabilitySlots) {
    let currentSegments: AvailabilitySlot[] = [slot];
    
    for (const exam of examSlots) {
      const nextSegments: AvailabilitySlot[] = [];
      for (const seg of currentSegments) {
        if (exam.start < seg.end && exam.end > seg.start) {
          if (seg.start < exam.start) {
            nextSegments.push({ start: seg.start, end: exam.start, isPreExamBlock: true, preExamCourseId: exam.courseId });
          }
          if (seg.end > exam.end) {
            nextSegments.push({ start: exam.end, end: seg.end, isPostExamBlock: true });
          }
        } else {
          if (seg.end <= exam.start) {
            nextSegments.push({ ...seg, isPreExamBlock: true, preExamCourseId: exam.courseId });
          } else if (seg.start >= exam.end) {
            nextSegments.push({ ...seg, isPostExamBlock: true });
          } else {
            nextSegments.push(seg);
          }
        }
      }
      currentSegments = nextSegments;
    }
    result.push(...currentSegments);
  }
  return result;
}

function scoreSlot(slot: { start: number }, preference: string) {
  const hour = Math.floor(slot.start / 60);
  if (preference === "early" && hour < 12) return 2;
  if (preference === "late" && hour >= 17) return 2;
  if (preference === "mid" && hour >= 12 && hour < 17) return 2;
  return 1;
}

function getDayMinutes(availabilityArr: any[]) {
  return availabilityArr.reduce((total, slot) => {
    const [startH, startM] = slot.start_time.split(':').map(Number);
    const [endH, endM] = slot.end_time.split(':').map(Number);
    return total + ((endH * 60 + endM) - (startH * 60 + startM));
  }, 0);
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Validate authentication token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const { fullRecalculate = false, forceFullSemester = false, userId: targetUserId } = body;

    let user_id = '';
    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}` || (supabaseServiceKey && authHeader.includes(supabaseServiceKey));

    if (isServiceRole) {
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: 'Missing target userId for service role invocation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      user_id = targetUserId;
    } else {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized user token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check if caller is an admin
      const supabaseAdminTemp = createClient(supabaseUrl, supabaseServiceKey);
      const { data: callerUserObj } = await supabaseAdminTemp
        .from('User')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (callerUserObj?.role === 'ADMIN' && targetUserId) {
        user_id = targetUserId;
      } else {
        user_id = user.id;
      }
    }

    // Use admin client for DB operations (bypass RLS where needed)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Academic Profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('AcademicProfile')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: 'Academic Profile missing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch User
    const { data: userObj, error: userErr } = await supabaseAdmin
      .from('User')
      .select('*')
      .eq('id', user_id)
      .maybeSingle();

    if (userErr || !userObj) {
      return new Response(JSON.stringify({ error: 'User profile missing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const studyAfterExamMode = userObj.post_exam_preference || "OFF";
    const allowPreExamRevision = userObj.allow_morning_revision || false;
    const preferredFocusWindow = userObj.preferred_focus_window || "ANY";

    // Fetch user courses
    const { data: userCourses, error: coursesErr } = await supabaseAdmin
      .from('UserCourse')
      .select('*, course:Course(*)')
      .eq('user_id', user_id)
      .eq('is_archived', false);

    if (coursesErr) throw coursesErr;

    // Fetch selected topics
    let { data: selectedTopics, error: topicsErr } = await supabaseAdmin
      .from('UserTopic')
      .select('*, course:Course(*)')
      .eq('user_id', user_id)
      .eq('is_selected', true)
      .eq('is_archived', false);

    if (topicsErr) throw topicsErr;

    // Auto-seed missing topics for legacy users or skipped topic selections
    if (!selectedTopics || selectedTopics.length === 0) {
      if (!userCourses || userCourses.length === 0) {
        return new Response(JSON.stringify({ error: 'No active courses found. Please add courses first.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const topicsToSeed = userCourses.map(c => ({
        id: crypto.randomUUID(),
        user_id: user_id,
        course_id: c.course_id,
        topic_name: 'General Study',
        mastery_level: 0,
        is_selected: true,
        is_archived: false
      }));

      const { error: seedErr } = await supabaseAdmin
        .from('UserTopic')
        .insert(topicsToSeed);

      if (seedErr) throw seedErr;

      // Refetch topics
      const { data: refetchedTopics, error: refetchErr } = await supabaseAdmin
        .from('UserTopic')
        .select('*, course:Course(*)')
        .eq('user_id', user_id)
        .eq('is_selected', true)
        .eq('is_archived', false);

      if (refetchErr) throw refetchErr;
      selectedTopics = refetchedTopics || [];
    }

    if (!selectedTopics || selectedTopics.length === 0) {
      return new Response(JSON.stringify({ error: 'Failed to initialize study topics' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch study availabilities
    const { data: availabilities, error: availErr } = await supabaseAdmin
      .from('StudyAvailability')
      .select('*')
      .eq('user_id', user_id);

    if (availErr) throw availErr;

    const daysOrder: Record<string, number> = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
    availabilities.sort((a: any, b: any) => daysOrder[a.day_of_week] - daysOrder[b.day_of_week]);

    if (availabilities.length === 0) {
      return new Response(JSON.stringify({ error: 'No study availability set' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const totalMinutes = getDayMinutes(availabilities);
    const totalAvailableWeeklyHours = totalMinutes / 60;
    if (totalAvailableWeeklyHours <= 0) {
      return new Response(JSON.stringify({ error: 'Available hours must be greater than 0' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const dictUserCourses: Record<string, any> = {};
    let upcomingExams = 0;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Fetch active session
    const { data: activeSession, error: activeSessionErr } = await supabaseAdmin
      .from('AcademicSession')
      .select('*')
      .eq('user_id', user_id)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSessionErr) throw activeSessionErr;

    if (activeSession && activeSession.end_date && today > new Date(activeSession.end_date)) {
      return new Response(JSON.stringify({
        id: 'ended',
        sessions: [],
        totalWeeksGenerated: 0,
        sessionsCreated: 0,
        notification: "Semester has ended. No study sessions scheduled. View Global History?"
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let latestExamDate: Date | null = null;

    // === AUTO-COMPLETION OF PAST EXAMS ===
    for (const uc of userCourses) {
      if (uc.exam_date && !uc.is_completed) {
        const examDateOnly = new Date(uc.exam_date);
        examDateOnly.setHours(0, 0, 0, 0);
        if (examDateOnly < todayMidnight) {
          await supabaseAdmin
            .from('UserCourse')
            .update({ is_completed: true })
            .eq('id', uc.id);
          uc.is_completed = true;
        }
      }
      
      dictUserCourses[uc.course_id] = uc;

      if (uc.exam_date && !uc.is_completed) {
        const diffDays = (new Date(uc.exam_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays <= 7) upcomingExams++;

        if (!latestExamDate || new Date(uc.exam_date) > latestExamDate) {
          latestExamDate = new Date(uc.exam_date);
        }
      }
    }

    // Detect consecutive exams
    const activeExams = userCourses
      .filter((uc: any) => uc.exam_date && !uc.is_completed)
      .map((uc: any) => {
        const d = new Date(uc.exam_date);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      })
      .sort((a: number, b: number) => a - b);

    let hasConsecutiveExams = false;
    for (let i = 0; i < activeExams.length - 1; i++) {
      if (activeExams[i + 1] - activeExams[i] === 86400000) { // exactly 1 day apart
        hasConsecutiveExams = true;
      }
    }

    let totalWeeks = 16;
    const planStartDate = activeSession ? new Date(activeSession.start_date) : today;
    
    // Query ActiveSemesterWindow matching the activeSession's semester
    let activeWindow = null;
    if (activeSession) {
      const { data: windowData } = await supabaseAdmin
        .from('ActiveSemesterWindow')
        .select('*')
        .eq('name', activeSession.semester)
        .eq('is_active', true)
        .maybeSingle();
      activeWindow = windowData;
    }

    // Determine planning horizon
    let effectiveEndDate: Date | null = null;
    if (latestExamDate) {
      effectiveEndDate = new Date(latestExamDate);
    } else if (activeSession && activeSession.end_date) {
      effectiveEndDate = new Date(activeSession.end_date);
    } else if (activeWindow && activeWindow.end_date) {
      effectiveEndDate = new Date(activeWindow.end_date);
    } else if (activeSession && !activeSession.end_date) {
      let currentYear = new Date(activeSession.start_date).getFullYear();
      if (new Date(activeSession.start_date).getMonth() === 11) {
        currentYear += 1;
      }
      if (activeSession.semester === '1st Semester') {
        effectiveEndDate = new Date(currentYear, 5, 30); // June 30
      } else {
        effectiveEndDate = new Date(currentYear, 11, 31); // Dec 31
      }
    } else {
      effectiveEndDate = new Date(planStartDate);
      effectiveEndDate.setDate(effectiveEndDate.getDate() + (16 * 7)); // Fallback
    }

    effectiveEndDate.setHours(23, 59, 59, 999);
    
    const diffDaysPlan = Math.ceil((effectiveEndDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));
    totalWeeks = Math.max(1, Math.ceil(diffDaysPlan / 7));
    if (totalWeeks > 24) totalWeeks = 24; // Sanity cap

    const isExamCluster = upcomingExams >= 3;

    // Fetch progress logs
    const { data: progressLogs, error: progLogsErr } = await supabaseAdmin
      .from('ProgressLog')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_archived', false);
    if (progLogsErr) throw progLogsErr;

    const dictProgressLogs: Record<string, any> = {};
    for (const p of progressLogs) {
      dictProgressLogs[p.user_course_id] = p;
    }

    // Fetch quiz results
    const { data: quizResults, error: quizErr } = await supabaseAdmin
      .from('QuizResult')
      .select('*')
      .eq('user_id', user_id);
    if (quizErr) throw quizErr;

    const dictQuizSum: Record<string, number> = {};
    const dictQuizCount: Record<string, number> = {};
    for (const q of quizResults) {
      const key = q.topic_name || q.course_id;
      if (!key) continue;
      if (!dictQuizSum[key]) dictQuizSum[key] = 0;
      if (!dictQuizCount[key]) dictQuizCount[key] = 0;
      dictQuizSum[key] += q.score_percentage / 100;
      dictQuizCount[key] += 1;
    }

    // Identify courses in Revision Mode dynamically
    const dictCourseRevisionMode: Record<string, boolean> = {};
    for (const uc of userCourses) {
      if (uc.is_completed) continue;
      
      // 1. Get all active topics selected for this course
      const courseTopics = selectedTopics.filter((t: any) => t.course_id === uc.course_id);
      if (courseTopics.length === 0) continue;
      
      // 2. Check if all selected topics have mastery_level >= 0.8
      const allTopicsMastered = courseTopics.every((t: any) => (t.mastery_level || 0) >= 0.8);
      
      // 3. Calculate cumulative quiz score (including topic-level and course-level quizzes)
      let totalQuizScoreSum = 0;
      let totalQuizCount = 0;
      
      if (dictQuizCount[uc.course_id]) {
        totalQuizScoreSum += dictQuizSum[uc.course_id];
        totalQuizCount += dictQuizCount[uc.course_id];
      }
      
      for (const t of courseTopics) {
        if (dictQuizCount[t.topic_name]) {
          totalQuizScoreSum += dictQuizSum[t.topic_name];
          totalQuizCount += dictQuizCount[t.topic_name];
        }
      }
      
      const avgQuizScore = totalQuizCount > 0 ? (totalQuizScoreSum / totalQuizCount) : 0;
      
      // Course qualifies for Revision Mode if:
      // - All topics have mastery_level >= 0.8
      // - At least one quiz has been attempted
      // - Average quiz score is >= 80% (0.8)
      const isRevision = allTopicsMastered && totalQuizCount >= 1 && avgQuizScore >= 0.8;
      dictCourseRevisionMode[uc.course_id] = isRevision;
    }

    const revisionCourses = Object.keys(dictCourseRevisionMode).filter(cid => dictCourseRevisionMode[cid]);
    const numRevisionCourses = revisionCourses.length;
    const revisionHoursPerCourse = 0.5; // 30 minutes total weekly per revision course
    
    const totalRevisionAllocatedHours = numRevisionCourses * revisionHoursPerCourse;
    const remainingStudyHours = Math.max(0.5, totalAvailableWeeklyHours - totalRevisionAllocatedHours);

    // Build prioritized topics (skip completed courses)
    const studyModeTopics: any[] = [];
    const revisionModeTopics: any[] = [];
    let totalStudyPriority = 0;

    for (const t of selectedTopics) {
      const uc = dictUserCourses[t.course_id];
      if (uc?.is_completed) continue;

      const isRevision = dictCourseRevisionMode[t.course_id] || false;

      let topicQuizAvg = dictQuizCount[t.topic_name] ? dictQuizSum[t.topic_name] / dictQuizCount[t.topic_name] : null;
      if (topicQuizAvg === null && dictQuizCount[t.course_id]) {
        topicQuizAvg = dictQuizSum[t.course_id] / dictQuizCount[t.course_id];
      }

      const consistency = dictProgressLogs[uc.id] ? dictProgressLogs[uc.id].consistency_score : null;
      const riskFactor = calculateRiskFactor(topicQuizAvg, consistency);
      
      const units = t.course?.units || 3;
      const unitWeight = Math.min(units / 6, 1.0);

      const priority = calculateTopicPriority(t, uc, profile, riskFactor, unitWeight, isExamCluster);
      const topicObj = { ...t, priority, isRevision };

      if (isRevision) {
        revisionModeTopics.push(topicObj);
      } else {
        studyModeTopics.push(topicObj);
        totalStudyPriority += priority;
      }
    }

    // Allocate hours for Study Mode topics
    for (const t of studyModeTopics) {
      t.allocatedHours = totalStudyPriority > 0
        ? (t.priority / totalStudyPriority) * remainingStudyHours
        : remainingStudyHours / studyModeTopics.length;
      if (t.allocatedHours < 0.25) t.allocatedHours = 0.25;
    }

    // Allocate hours for Revision Mode topics
    // Set to 0 because we will dynamically inject the 30-minute revision slot week-by-week in the week loop
    for (const t of revisionModeTopics) {
      t.allocatedHours = 0;
    }

    const topicsWithPriority = [...studyModeTopics, ...revisionModeTopics];

    const userTopicIds = topicsWithPriority.map(t => t.id);

    // Delete uncompleted sessions starting from planStartDate for recalculation
    if (fullRecalculate) {
      const boundaryDate = new Date(planStartDate);
      boundaryDate.setHours(0, 0, 0, 0);
      
      const { error: delErr } = await supabaseAdmin
        .from('StudySession')
        .delete()
        .in('user_topic_id', userTopicIds)
        .eq('completed', false)
        .gte('session_date', boundaryDate.toISOString());
      if (delErr) throw delErr;
    }

    // Create Study Plan
    const { data: studyPlan, error: planInsertErr } = await supabaseAdmin
      .from('StudyPlan')
      .insert({ id: crypto.randomUUID(), user_id, week_start_date: planStartDate.toISOString() })
      .select()
      .single();

    if (planInsertErr) throw planInsertErr;

    const sessionData: any[] = [];
    const dictTopicTotalMinsScheduled: Record<string, number> = {};
    for (const t of topicsWithPriority) {
      dictTopicTotalMinsScheduled[t.id] = 0;
    }

    const addMinutes = (timeStr: string, mins: number) => {
      let [h, m] = timeStr.split(':').map(Number);
      m += mins;
      h += Math.floor(m / 60);
      m = m % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const getDiffMins = (startStr: string, endStr: string) => {
      const [sH, sM] = startStr.split(':').map(Number);
      const [eH, eM] = endStr.split(':').map(Number);
      return (eH * 60 + eM) - (sH * 60 + sM);
    };

    const getExactDateForDayName = (start: Date, dayName: string) => {
      const daysMap: Record<string, number> = { 'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6 };
      const result = new Date(start);
      result.setDate(result.getDate() + (daysMap[dayName] || 0));
      result.setHours(12, 0, 0, 0); // Noon to avoid timezone shift
      return result;
    };

    const dayOfWeek = planStartDate.getDay(); 
    const diff = planStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStartAnchor = new Date(planStartDate);
    weekStartAnchor.setDate(diff);
    weekStartAnchor.setHours(0,0,0,0);

    for (let w = 0; w < totalWeeks; w++) {
      const currentWeekStart = new Date(weekStartAnchor);
      currentWeekStart.setDate(currentWeekStart.getDate() + (w * 7));

      let availableSlots = availabilities.map(a => {
        const exactDate = getExactDateForDayName(currentWeekStart, a.day_of_week);
        return {
          ...a,
          current_time: a.start_time,
          totalMins: getDiffMins(a.start_time, a.end_time),
          exactDate: exactDate
        };
      });

      // Punch holes for exams + handle post-exam preference
      const processedSlots: any[] = [];
      for (const slot of availableSlots) {
        const slotStrDate = slot.exactDate.toISOString().split('T')[0];
        const examsOnThisDay = userCourses.filter((uc: any) => uc.exam_date && !uc.is_completed && new Date(uc.exam_date).toISOString().split('T')[0] === slotStrDate);
        
        const slotStartMinutes = slot.current_time.split(':').map(Number)[0] * 60 + slot.current_time.split(':').map(Number)[1];
        const slotEndMinutes = slot.end_time.split(':').map(Number)[0] * 60 + slot.end_time.split(':').map(Number)[1];
        
        if (examsOnThisDay.length > 0) {
          let currentMode = studyAfterExamMode;
          if (currentMode === "REST") currentMode = "OFF";
          if (currentMode === "LIGHT_REVISION") currentMode = "LIGHT";
          if (currentMode === "FULL_STUDY") currentMode = "FULL";
          
          let localNextDayHasExam = false;
          for (const uc of userCourses) {
             if (uc.exam_date && !uc.is_completed) {
                 const diff = (new Date(uc.exam_date).getTime() - slot.exactDate.getTime()) / (1000 * 60 * 60 * 24);
                 if (diff > 0 && diff <= 1) localNextDayHasExam = true;
             }
          }
          if (localNextDayHasExam) currentMode = "LIGHT";
          
          if (currentMode === "OFF") continue;
          
          const examSlots: any[] = [];
          for (const exam of examsOnThisDay) {
            if (!exam.exam_time) continue;
            const examStartMins = exam.exam_time.split(':').map(Number)[0] * 60 + exam.exam_time.split(':').map(Number)[1];
            const duration = exam.exam_duration || 180;
            examSlots.push({ start: examStartMins, end: examStartMins + duration, courseId: exam.course_id });
          }
          
          const validSegments = subtractIntervals([{ start: slotStartMinutes, end: slotEndMinutes }], examSlots);
          
          for (const seg of validSegments) {
            if (seg.end - seg.start < 30) continue;
            
            if (currentMode === "LIGHT") {
              if (seg.isPreExamBlock && !allowPreExamRevision) continue;
            } else if (currentMode === "FULL") {
              if (seg.isPreExamBlock && !allowPreExamRevision) continue;
            }
            
            const startStr = `${String(Math.floor(seg.start/60)).padStart(2,'0')}:${String(seg.start%60).padStart(2,'0')}`;
            const endStr = `${String(Math.floor(seg.end/60)).padStart(2,'0')}:${String(seg.end%60).padStart(2,'0')}`;
            processedSlots.push({
                 ...slot,
                 current_time: startStr,
                 start_time: startStr,
                 end_time: endStr,
                 isPreExamBlock: seg.isPreExamBlock,
                 isPostExamBlock: seg.isPostExamBlock,
                 preExamCourseId: seg.preExamCourseId,
                 startMins: seg.start,
                 endMins: seg.end
            });
          }
        } else {
          processedSlots.push({
               ...slot,
               startMins: slotStartMinutes,
               endMins: slotEndMinutes
          });
        }
      }
      
      availableSlots = processedSlots;

      let latestExamDateLocal: Date | null = null;
      for (const uc of userCourses) {
        if (uc.exam_date && !uc.is_completed) {
          if (!latestExamDateLocal || new Date(uc.exam_date) > latestExamDateLocal) {
            latestExamDateLocal = new Date(uc.exam_date);
          }
        }
      }

      let rotatedTopics = [...topicsWithPriority];
      if (rotatedTopics.length > 0) {
        const rotationIndex = (w * 17) % rotatedTopics.length;
        rotatedTopics = [...rotatedTopics.slice(rotationIndex), ...rotatedTopics.slice(0, rotationIndex)];
      }

      const weeklyTopics = rotatedTopics.map(t => {
        const courseForT = userCourses.find(uc => uc.course_id === t.course_id);
        return {
          ...t,
          courseForT: courseForT,
          minsNeeded: Math.round(t.allocatedHours * 60),
          minsScheduled: dictTopicTotalMinsScheduled[t.id] || 0
        };
      });

      // Dynamic weekly revision allocation: allocate 30 mins to the least-scheduled revision topic
      const revisionCoursesInWeek = [...new Set(weeklyTopics.filter(t => t.isRevision).map(t => t.course_id))];
      for (const cid of revisionCoursesInWeek) {
        const courseTopics = weeklyTopics.filter(t => t.course_id === cid);
        courseTopics.sort((a: any, b: any) => a.minsScheduled - b.minsScheduled);
        
        courseTopics[0].minsNeeded = 30; // Allocate exactly 30 minutes (0.5 hours) to this topic this week
        for (let i = 1; i < courseTopics.length; i++) {
          courseTopics[i].minsNeeded = 0;
        }
      }

      const dailyMinsUsedMap: Record<string, number> = {};
      
      for (const slot of availableSlots) {
        const slotDateStr = slot.exactDate.toISOString().split('T')[0];

        if ((effectiveEndDate && slot.exactDate > effectiveEndDate) || 
            (activeSession && slot.exactDate < new Date(activeSession.start_date))) {
          continue;
        }

        const examsOnThisDayCheck = userCourses.filter((uc: any) => uc.exam_date && !uc.is_completed && new Date(uc.exam_date).toISOString().split('T')[0] === slotDateStr);
        const isExamDay = examsOnThisDayCheck.length > 0;
        const isFinalExamDay = latestExamDateLocal && slotDateStr === latestExamDateLocal.toISOString().split('T')[0];

        let nextExams: any[] = []; 
        let minDiff = Infinity; 
        for (const uc of userCourses) { 
          if (uc.exam_date && !uc.is_completed) { 
            const diff = (new Date(uc.exam_date).getTime() - slot.exactDate.getTime()) / (1000 * 60 * 60 * 24); 
            if (diff > 0 && diff <= minDiff) { 
              if (diff < minDiff) {
                minDiff = diff; 
                nextExams = [uc];
              } else {
                nextExams.push(uc);
              }
            } 
          } 
        } 
        const nextDayHasExam = nextExams.length > 0 && minDiff <= 1;

        let currentMode = studyAfterExamMode;
        if (currentMode === "REST") currentMode = "OFF";
        if (currentMode === "LIGHT_REVISION") currentMode = "LIGHT";
        if (currentMode === "FULL_STUDY") currentMode = "FULL";
        if (nextDayHasExam) currentMode = "LIGHT";

        let maxMinutesToday = 180; 
        if (isExamDay) {
          if (currentMode === "LIGHT") maxMinutesToday = 90;
          else if (currentMode === "FULL") maxMinutesToday = 180;
        }

        let dailyMinsUsed = dailyMinsUsedMap[slotDateStr] || 0; 
        let slotRemainingMins = slot.endMins - slot.startMins; 
        let currentSlotStart = slot.startMins;

        while (slotRemainingMins >= 30 && dailyMinsUsed < maxMinutesToday) { 
          const validTopics = weeklyTopics.filter(t => {
            if (t.minsNeeded <= 0) return false;
            const courseForT = t.courseForT;
            
            if (courseForT && courseForT.exam_date) {
              const slotDateStrVal = slot.exactDate.toISOString().split('T')[0];
              const examDateStrVal = new Date(courseForT.exam_date).toISOString().split('T')[0];
              if (slotDateStrVal > examDateStrVal) {
                t.minsNeeded = 0; 
                return false;
              }
            }

            const isExaminedTopicToday = isExamDay && examsOnThisDayCheck.some(uc => uc.course_id === t.course_id);
            const isNextExamTopic = nextExams.some(nx => nx.course_id === t.course_id);

            if (slot.isPreExamBlock && slot.preExamCourseId !== t.course_id) return false;
            
            if (isExamDay) {
              if (slot.isPreExamBlock) {
                if (!isExaminedTopicToday) return false;
              } else {
                if (isFinalExamDay) return false;
                if (!isNextExamTopic) return false;
              }
            }
            
            return true;
          });

          if (validTopics.length === 0) break;

          const sortedByScore = validTopics.map(t => ({
            topic: t,
            score: scoreSlot({ start: currentSlotStart }, preferredFocusWindow)
          })).sort((a, b) => b.score - a.score);
          
          let lastCourseId: string | null = null;
          if (sessionData.length >= 1) {
            const lastS1 = sessionData[sessionData.length - 1];
            const lastS1Date = new Date(lastS1.session_date);
            if (lastS1Date.getTime() === slot.exactDate.getTime()) {
              const t1 = weeklyTopics.find(t => t.id === lastS1.user_topic_id);
              if (t1) {
                lastCourseId = t1.course_id;
              }
            }
          }

          const candidateTopics = sortedByScore.filter(t => t.topic.course_id !== lastCourseId);
          let selectedTopic: any = null;
          
          if (candidateTopics.length > 0) {
            candidateTopics.sort((a: any, b: any) => {
              if (b.score !== a.score) return b.score - a.score;
              if (a.topic.minsScheduled !== b.topic.minsScheduled) {
                return a.topic.minsScheduled - b.topic.minsScheduled;
              }
              return b.topic.minsNeeded - a.topic.minsNeeded;
            });
            selectedTopic = candidateTopics[0].topic;
          } else {
            sortedByScore.sort((a: any, b: any) => {
              if (b.score !== a.score) return b.score - a.score;
              if (a.topic.minsScheduled !== b.topic.minsScheduled) {
                return a.topic.minsScheduled - b.topic.minsScheduled;
              }
              return b.topic.minsNeeded - a.topic.minsNeeded;
            });
            selectedTopic = sortedByScore[0].topic;
          }

          const t = selectedTopic;
          const courseForT = t.courseForT;
          const maxAllowedSession = 50;

          const sessionLength = Math.min(maxAllowedSession, slotRemainingMins, maxMinutesToday - dailyMinsUsed, Math.max(30, t.minsNeeded)); 
          if (sessionLength < 30) break; 
      
          let sessionType = (isFinalExamDay || isExamDay || slot.isPreExamBlock || nextDayHasExam) ? "REVISION" : "LEARN"; 
          if (t.isRevision) {
            sessionType = "REVISION";
          } else if (sessionType === "LEARN") {
            if (courseForT && courseForT.exam_date && !courseForT.is_completed) {
              const diffEx = (new Date(courseForT.exam_date).getTime() - slot.exactDate.getTime()) / (1000 * 60 * 60 * 24);
              if (diffEx >= 0 && diffEx <= 7) sessionType = "REVISION";
            }
          }
      
          const startStr = `${String(Math.floor(currentSlotStart/60)).padStart(2,'0')}:${String(currentSlotStart%60).padStart(2,'0')}`;
          const sessionEndMins = currentSlotStart + sessionLength;
          const endStr = `${String(Math.floor(sessionEndMins/60)).padStart(2,'0')}:${String(sessionEndMins%60).padStart(2,'0')}`;

          sessionData.push({ 
            id: crypto.randomUUID(),
            study_plan_id: studyPlan.id, 
            user_topic_id: t.id, 
            session_date: slot.exactDate.toISOString(), 
            day_of_week: slot.day_of_week,
            start_time: startStr, 
            end_time: endStr, 
            duration_minutes: sessionLength, 
            allocated_hours: parseFloat((sessionLength / 60).toFixed(2)),
            break_after: true, 
            session_type: sessionType,
            is_morning: currentSlotStart < 12 * 60,
            is_archived: false
          }); 
          
          dailyMinsUsed += sessionLength; 
          t.minsNeeded -= sessionLength; 
          t.minsScheduled += sessionLength;
          dictTopicTotalMinsScheduled[t.id] = t.minsScheduled;
          currentSlotStart = sessionEndMins + 5; // 5 min cognitive break
          slotRemainingMins = slot.endMins - currentSlotStart; 
        } 
        
        dailyMinsUsedMap[slotDateStr] = dailyMinsUsed;
      }
    }

    if (sessionData.length > 0) {
      const { error: sessInsertErr } = await supabaseAdmin
        .from('StudySession')
        .insert(sessionData);
      if (sessInsertErr) throw sessInsertErr;
    }

    let notification: string | null = null;
    if (hasConsecutiveExams && (studyAfterExamMode === "OFF" || studyAfterExamMode === "REST")) {
      notification = "Consecutive exams detected. Light morning revision (max 45 mins) scheduled before the next exam. Rest of each exam day is kept free for recovery.";
    }

    return new Response(JSON.stringify({ 
      ...studyPlan,
      totalWeeksGenerated: totalWeeks,
      sessionsCreated: sessionData.length,
      notification
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Plan generation error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
