import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

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

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is an Admin in public.User table
    const { data: callerUserObj, error: callerError } = await supabaseAdmin
      .from('User')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (callerError || callerUserObj?.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Access denied. Administrator role required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request JSON
    const body = await req.json().catch(() => ({}));
    const { path, method, data } = body;

    if (!path || !method) {
      return new Response(JSON.stringify({ error: 'Missing path or method parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract pathname and query string
    const urlParts = path.split('?');
    const pathname = urlParts[0];
    const queryString = urlParts[1] || '';

    // Extract path details (e.g. "/sessions/123" -> ["sessions", "123"])
    const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
    const resource = segments[0];
    const id = segments[1];

    let resultData: any = null;
    let status = 200;

    // ==========================================
    // ROUTING
    // ==========================================

    if (resource === 'stats' && method === 'GET') {
      const { count: studentCount } = await supabaseAdmin
        .from('User')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'STUDENT')
        .not('email', 'like', 'test_%');

      const { count: programmeCount } = await supabaseAdmin
        .from('Program')
        .select('*', { count: 'exact', head: true });

      const { count: courseCount } = await supabaseAdmin
        .from('Course')
        .select('*', { count: 'exact', head: true });

      const { data: planUsers } = await supabaseAdmin
        .from('StudyPlan')
        .select('id, User:user_id(email)');
      const studyPlanCount = planUsers?.filter(p => p.User && !p.User.email.startsWith('test_')).length || 0;

      const { data: activeSession } = await supabaseAdmin
        .from('GlobalAcademicSession')
        .select('name')
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();

      resultData = {
        totalStudents: studentCount || 0,
        totalProgrammes: programmeCount || 0,
        totalCourses: courseCount || 0,
        totalStudyPlans: studyPlanCount,
        activeSession: activeSession ? activeSession.name : 'None Active'
      };

    } else if (resource === 'structure' && method === 'GET') {
      const { data: sessions } = await supabaseAdmin
        .from('GlobalAcademicSession')
        .select('*')
        .order('start_date', { ascending: true });

      const { data: windows } = await supabaseAdmin
        .from('SemesterWindow')
        .select('*')
        .order('semester', { ascending: true });

      const { data: programmes } = await supabaseAdmin
        .from('Program')
        .select('*, Course(*, CourseTopic(*))')
        .order('name', { ascending: true });

      if (programmes) {
        programmes.forEach((p: any) => {
          if (p.Course) {
            p.courses = p.Course.map((c: any) => ({
              ...c,
              courseTopics: c.CourseTopic || []
            })).sort((a: any, b: any) => {
              if (a.level !== b.level) return a.level - b.level;
              if (a.semester !== b.semester) return a.semester - b.semester;
              return a.code.localeCompare(b.code);
            });
            delete p.Course;
          } else {
            p.courses = [];
          }
        });
      }

      resultData = { sessions, windows, programmes };

    } else if (resource === 'sessions') {
      if (method === 'POST') {
        const { name, start_date, end_date, registration_opens, registration_closes, status: activeStatus } = data;
        if (activeStatus === 'ACTIVE') {
          await supabaseAdmin.from('GlobalAcademicSession').update({ status: 'CLOSED' }).eq('status', 'ACTIVE');
        }
        const { data: newSession, error: createErr } = await supabaseAdmin.from('GlobalAcademicSession').insert({
          name,
          start_date: new Date(start_date).toISOString(),
          end_date: new Date(end_date).toISOString(),
          registration_opens: new Date(registration_opens).toISOString(),
          registration_closes: new Date(registration_closes).toISOString(),
          status: activeStatus || 'UPCOMING'
        }).select().single();
        if (createErr) throw createErr;
        resultData = newSession;
        status = 201;
      } else if (method === 'PUT' && id) {
        const { name, start_date, end_date, registration_opens, registration_closes, status: activeStatus } = data;
        if (activeStatus === 'ACTIVE') {
          await supabaseAdmin.from('GlobalAcademicSession').update({ status: 'CLOSED' }).eq('status', 'ACTIVE').not('id', 'eq', id);
        }
        const { data: updatedSession, error: updateErr } = await supabaseAdmin.from('GlobalAcademicSession').update({
          name,
          start_date: start_date ? new Date(start_date).toISOString() : undefined,
          end_date: end_date ? new Date(end_date).toISOString() : undefined,
          registration_opens: registration_opens ? new Date(registration_opens).toISOString() : undefined,
          registration_closes: registration_closes ? new Date(registration_closes).toISOString() : undefined,
          status: activeStatus
        }).eq('id', id).select().single();
        if (updateErr) throw updateErr;
        resultData = updatedSession;
      } else if (method === 'DELETE' && id) {
        const { error: deleteErr } = await supabaseAdmin.from('GlobalAcademicSession').delete().eq('id', id);
        if (deleteErr) throw deleteErr;
        resultData = { message: 'Session deleted successfully' };
      }

    } else if (resource === 'windows') {
      if (method === 'POST') {
        const { semester, start_month, start_day, end_month, end_day, allow_early_reg, reg_lead_time } = data;
        const { data: newWindow, error: createErr } = await supabaseAdmin.from('SemesterWindow').insert({
          semester,
          start_month: parseInt(start_month),
          start_day: parseInt(start_day),
          end_month: parseInt(end_month),
          end_day: parseInt(end_day),
          allow_early_reg: Boolean(allow_early_reg),
          reg_lead_time: parseInt(reg_lead_time)
        }).select().single();
        if (createErr) throw createErr;
        resultData = newWindow;
        status = 201;
      } else if (method === 'PUT' && id) {
        const { start_month, start_day, end_month, end_day, allow_early_reg, reg_lead_time } = data;
        const { data: updatedWindow, error: updateErr } = await supabaseAdmin.from('SemesterWindow').update({
          start_month: start_month !== undefined ? parseInt(start_month) : undefined,
          start_day: start_day !== undefined ? parseInt(start_day) : undefined,
          end_month: end_month !== undefined ? parseInt(end_month) : undefined,
          end_day: end_day !== undefined ? parseInt(end_day) : undefined,
          allow_early_reg: allow_early_reg !== undefined ? Boolean(allow_early_reg) : undefined,
          reg_lead_time: reg_lead_time !== undefined ? parseInt(reg_lead_time) : undefined
        }).eq('id', id).select().single();
        if (updateErr) throw updateErr;
        resultData = updatedWindow;
      } else if (method === 'DELETE' && id) {
        const { error: deleteErr } = await supabaseAdmin.from('SemesterWindow').delete().eq('id', id);
        if (deleteErr) throw deleteErr;
        resultData = { message: 'Window deleted successfully' };
      }

    } else if (resource === 'programmes') {
      if (method === 'POST') {
        const { name } = data;
        const { data: newProg, error: createErr } = await supabaseAdmin.from('Program').insert({ name }).select().single();
        if (createErr) throw createErr;
        resultData = newProg;
        status = 201;
      } else if (method === 'PUT' && id) {
        const { name } = data;
        const { data: updatedProg, error: updateErr } = await supabaseAdmin.from('Program').update({ name }).eq('id', id).select().single();
        if (updateErr) throw updateErr;
        resultData = updatedProg;
      } else if (method === 'DELETE' && id) {
        const { error: deleteErr } = await supabaseAdmin.from('Program').delete().eq('id', id);
        if (deleteErr) throw deleteErr;
        resultData = { message: 'Programme deleted successfully' };
      }

    } else if (resource === 'courses') {
      if (method === 'POST') {
        const { program_id, code, title, units, difficulty, level, semester } = data;
        const { data: newCourse, error: createErr } = await supabaseAdmin.from('Course').insert({
          program_id,
          code,
          title,
          units: parseInt(units),
          difficulty: parseFloat(difficulty),
          level: parseInt(level),
          semester: parseInt(semester)
        }).select().single();
        if (createErr) throw createErr;
        resultData = newCourse;
        status = 201;
      } else if (method === 'PUT' && id) {
        const { code, title, units, difficulty, level, semester } = data;
        const { data: updatedCourse, error: updateErr } = await supabaseAdmin.from('Course').update({
          code,
          title,
          units: units !== undefined ? parseInt(units) : undefined,
          difficulty: difficulty !== undefined ? parseFloat(difficulty) : undefined,
          level: level !== undefined ? parseInt(level) : undefined,
          semester: semester !== undefined ? parseInt(semester) : undefined
        }).eq('id', id).select().single();
        if (updateErr) throw updateErr;
        resultData = updatedCourse;
      } else if (method === 'DELETE' && id) {
        const { error: deleteErr } = await supabaseAdmin.from('Course').delete().eq('id', id);
        if (deleteErr) throw deleteErr;
        resultData = { message: 'Course deleted successfully' };
      }

    } else if (resource === 'topics') {
      if (method === 'POST') {
        const { course_id, topic_name, default_weight } = data;
        const { data: newTopic, error: createErr } = await supabaseAdmin.from('CourseTopic').insert({
          course_id,
          topic_name,
          default_weight: default_weight !== undefined ? parseFloat(default_weight) : 1.0
        }).select().single();
        if (createErr) throw createErr;
        resultData = newTopic;
        status = 201;
      } else if (method === 'PUT' && id) {
        const { topic_name, default_weight } = data;
        const { data: updatedTopic, error: updateErr } = await supabaseAdmin.from('CourseTopic').update({
          topic_name,
          default_weight: default_weight !== undefined ? parseFloat(default_weight) : undefined
        }).eq('id', id).select().single();
        if (updateErr) throw updateErr;
        resultData = updatedTopic;
      } else if (method === 'DELETE' && id) {
        const { error: deleteErr } = await supabaseAdmin.from('CourseTopic').delete().eq('id', id);
        if (deleteErr) throw deleteErr;
        resultData = { message: 'Topic deleted successfully' };
      }

    } else if (resource === 'students') {
      if (method === 'GET') {
        if (!id) {
          // List students
          const queryParams = new URLSearchParams(queryString);
          const search = queryParams.get('search') || '';
          const program = queryParams.get('program') || '';
          const level = queryParams.get('level') || '';

          let query = supabaseAdmin.from('User').select('*, AcademicProfile(*)').eq('role', 'STUDENT').not('email', 'like', 'test_%');

          if (program) {
            query = query.eq('AcademicProfile.program', program);
          }
          if (level) {
            query = query.eq('AcademicProfile.level', parseInt(level));
          }

          const { data: users, error: selectErr } = await query.order('name', { ascending: true });
          if (selectErr) throw selectErr;

          let filtered = users || [];
          if (search) {
            const lower = search.toLowerCase();
            filtered = filtered.filter(u => 
              u.name.toLowerCase().includes(lower) || 
              u.email.toLowerCase().includes(lower)
            );
          }

          resultData = filtered.map((u: any) => ({
            ...u,
            academicProfile: u.AcademicProfile?.[0] || u.AcademicProfile || null
          }));
        } else {
          // Get specific student profile
          const subaction = segments[2];

          if (subaction === 'active' && method === 'PUT') {
            const { is_active } = data;
            const { data: updatedStudent, error: updateErr } = await supabaseAdmin
              .from('User')
              .update({ is_active: Boolean(is_active) })
              .eq('id', id)
              .select()
              .single();
            if (updateErr) throw updateErr;
            resultData = {
              message: `Account successfully ${updatedStudent.is_active ? 'activated' : 'deactivated'}`,
              student: { id: updatedStudent.id, is_active: updatedStudent.is_active }
            };
          } else if (subaction === 'regenerate-plan' && method === 'POST') {
            // Trigger Edge Function generate-plan using internal fetch
            const response = await fetch(`${supabaseUrl}/functions/v1/generate-plan`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ userId: id, fullRecalculate: true })
            });

            if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              throw new Error(err.error || `Regeneration failed with status: ${response.status}`);
            }

            const regenResult = await response.json();
            resultData = { message: 'Study plan successfully regenerated', result: regenResult };
          } else {
            // Load student profile
            const { data: userObj, error: selectErr } = await supabaseAdmin
              .from('User')
              .select(`
                *,
                AcademicProfile(*),
                UserCourse(*, Course(*)),
                UserTopic(*),
                QuizResult(*),
                StudyPlan(*, StudySession(*, UserTopic(*)))
              `)
              .eq('id', id)
              .eq('role', 'STUDENT')
              .maybeSingle();

            if (selectErr) throw selectErr;
            if (!userObj) {
              return new Response(JSON.stringify({ message: 'Student profile not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            resultData = {
              ...userObj,
              academicProfile: userObj.AcademicProfile?.[0] || userObj.AcademicProfile || null,
              userCourses: (userObj.UserCourse || []).filter((uc: any) => !uc.is_archived).map((uc: any) => ({
                ...uc,
                course: uc.Course?.[0] || uc.Course || null
              })),
              userTopics: (userObj.UserTopic || []).filter((ut: any) => !ut.is_archived),
              quizResults: (userObj.QuizResult || []).sort((a: any, b: any) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()),
              studyPlans: (userObj.StudyPlan || []).filter((sp: any) => !sp.is_archived).map((sp: any) => ({
                ...sp,
                sessions: (sp.StudySession || []).filter((ss: any) => !ss.is_archived).map((ss: any) => ({
                  ...ss,
                  topic: ss.UserTopic?.[0] || ss.UserTopic || null
                }))
              })).sort((a: any, b: any) => new Date(b.generated_date).getTime() - new Date(a.generated_date).getTime())
            };
          }
        }
      }

    } else if (resource === 'analytics' && method === 'GET') {
      const { data: quizResults } = await supabaseAdmin.from('QuizResult').select('score_percentage');
      const averageQuizScore = quizResults && quizResults.length > 0
        ? quizResults.reduce((sum, r) => sum + r.score_percentage, 0) / quizResults.length
        : 0;

      const { data: userTopics } = await supabaseAdmin.from('UserTopic').select('mastery_level');
      const averageMastery = userTopics && userTopics.length > 0
        ? (userTopics.reduce((sum, t) => sum + t.mastery_level, 0) / userTopics.length) * 100
        : 0;

      const { data: completedSessions } = await supabaseAdmin
        .from('StudySession')
        .select('allocated_hours')
        .eq('completed', true);
      const totalStudyHours = completedSessions
        ? completedSessions.reduce((sum, s) => sum + s.allocated_hours, 0)
        : 0;

      const { count: studentCount } = await supabaseAdmin
        .from('User')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'STUDENT');
      const averageStudyHours = studentCount && studentCount > 0 ? (totalStudyHours / studentCount) : 0;

      const { data: students } = await supabaseAdmin
        .from('User')
        .select('*, QuizResult(score_percentage), ProgressLog(consistency_score)')
        .eq('role', 'STUDENT');

      let lowRisk = 0;
      let medRisk = 0;
      let highRisk = 0;

      (students || []).forEach((student: any) => {
        const quizScores = (student.QuizResult || []).map((r: any) => r.score_percentage);
        const quizAverage = quizScores.length > 0 ? (quizScores.reduce((a: any, b: any) => a + b, 0) / quizScores.length) / 100 : null;

        const consistencyScores = (student.ProgressLog || []).map((l: any) => l.consistency_score);
        const consistencyScore = consistencyScores.length > 0 ? (consistencyScores.reduce((a: any, b: any) => a + b, 0) / consistencyScores.length) : null;

        const qA = quizAverage !== null ? quizAverage : 0.5;
        const cS = consistencyScore !== null ? consistencyScore : 0.8;
        const risk = ((1 - qA) * 0.6) + ((1 - cS) * 0.4);

        if (risk < 0.35) {
          lowRisk++;
        } else if (risk > 0.65) {
          highRisk++;
        } else {
          medRisk++;
        }
      });

      const { data: studentsList } = await supabaseAdmin
        .from('User')
        .select('*, AcademicProfile(program), StudyPlan(StudySession(*))')
        .eq('role', 'STUDENT')
        .not('email', 'like', 'test_%');

      const programCompletionMap: Record<string, { totalSessions: number, completedSessions: number }> = {};

      (studentsList || []).forEach((student: any) => {
        const profile = student.AcademicProfile?.[0] || student.AcademicProfile || null;
        const progName = profile?.program || 'Unenrolled';
        if (!programCompletionMap[progName]) {
          programCompletionMap[progName] = { totalSessions: 0, completedSessions: 0 };
        }

        const plans = student.StudyPlan || [];
        plans.forEach((plan: any) => {
          const sessions = plan.StudySession || [];
          programCompletionMap[progName].totalSessions += sessions.length;
          programCompletionMap[progName].completedSessions += sessions.filter((s: any) => s.completed).length;
        });
      });

      const studyPlanCompletion = Object.keys(programCompletionMap).map(prog => {
        const dataMap = programCompletionMap[prog];
        const rate = dataMap.totalSessions > 0 ? (dataMap.completedSessions / dataMap.totalSessions) * 100 : 0;
        return {
          program: prog,
          completionRate: Math.round(rate * 10) / 10
        };
      });

      resultData = {
        averageQuizScore,
        averageMastery,
        averageStudyHours,
        riskDistribution: {
          lowRisk,
          mediumRisk: medRisk,
          highRisk
        },
        studyPlanCompletion
      };

    } else if (resource === 'settings') {
      if (method === 'GET') {
        let { data: config, error: selectErr } = await supabaseAdmin
          .from('SystemConfig')
          .select('*')
          .eq('id', 'system_config')
          .maybeSingle();
        if (selectErr) throw selectErr;

        if (!config) {
          const { data: newConfig, error: insertErr } = await supabaseAdmin
            .from('SystemConfig')
            .insert({
              id: 'system_config',
              learning_rate_eta: 0.20,
              decay_constant_lambda: 0.10,
              weight_difficulty: 0.20,
              weight_exam: 0.30,
              weight_mastery: 0.15,
              weight_risk: 0.20,
              weight_course_unit: 0.15,
              min_session_duration: 30,
              max_session_duration: 180,
              allow_morning_revision: false
            })
            .select()
            .single();
          if (insertErr) throw insertErr;
          config = newConfig;
        }
        resultData = config;
      } else if (method === 'PUT') {
        const {
          learning_rate_eta,
          decay_constant_lambda,
          weight_difficulty,
          weight_exam,
          weight_mastery,
          weight_risk,
          weight_course_unit,
          min_session_duration,
          max_session_duration,
          allow_morning_revision
        } = data;

        const { data: updatedConfig, error: updateErr } = await supabaseAdmin
          .from('SystemConfig')
          .update({
            learning_rate_eta: parseFloat(learning_rate_eta),
            decay_constant_lambda: parseFloat(decay_constant_lambda),
            weight_difficulty: parseFloat(weight_difficulty),
            weight_exam: parseFloat(weight_exam),
            weight_mastery: parseFloat(weight_mastery),
            weight_risk: parseFloat(weight_risk),
            weight_course_unit: parseFloat(weight_course_unit),
            min_session_duration: parseInt(min_session_duration),
            max_session_duration: parseInt(max_session_duration),
            allow_morning_revision: Boolean(allow_morning_revision)
          })
          .eq('id', 'system_config')
          .select()
          .single();
        if (updateErr) throw updateErr;

        resultData = { message: 'Settings successfully updated', config: updatedConfig };
      }

    } else if (resource === 'admins') {
      if (method === 'GET') {
        const { data: admins, error: selectErr } = await supabaseAdmin
          .from('User')
          .select('id, name, email, created_at')
          .eq('role', 'ADMIN');
        if (selectErr) throw selectErr;
        resultData = admins || [];
      } else if (method === 'POST') {
        const { name, email, password } = data;
        const { data: authUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name }
        });
        if (signUpError) {
          return new Response(JSON.stringify({ message: signUpError.message }), { status: 400, headers: corsHeaders });
        }
        
        const { data: adminUser, error: updateError } = await supabaseAdmin
          .from('User')
          .update({ role: 'ADMIN', onboarding_stage: 'COMPLETE' })
          .eq('id', authUser.user.id)
          .select()
          .single();
        if (updateError) throw updateError;

        resultData = {
          message: 'Admin successfully created',
          admin: { id: adminUser.id, name: adminUser.name, email: adminUser.email }
        };
        status = 201;
      } else if (method === 'DELETE' && id) {
        if (id === user.id) {
          return new Response(JSON.stringify({ message: 'You cannot remove your own admin account.' }), { status: 400, headers: corsHeaders });
        }
        const { count: adminCount } = await supabaseAdmin
          .from('User')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'ADMIN');
        if (adminCount && adminCount <= 1) {
          return new Response(JSON.stringify({ message: 'System must contain at least one admin account.' }), { status: 400, headers: corsHeaders });
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (deleteError) {
          return new Response(JSON.stringify({ message: deleteError.message }), { status: 400, headers: corsHeaders });
        }
        await supabaseAdmin.from('User').delete().eq('id', id);

        resultData = { message: 'Admin user successfully removed' };
      } else if (method === 'PUT' && id && segments[2] === 'password') {
        const { newPassword } = data;
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, { password: newPassword });
        if (updateError) {
          return new Response(JSON.stringify({ message: updateError.message }), { status: 400, headers: corsHeaders });
        }
        resultData = { message: 'Admin password successfully updated' };
      }
    }

    if (resultData === null) {
      return new Response(JSON.stringify({ error: 'Endpoint not found or method not supported' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(resultData), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
