-- Trigger function to automatically sync new Supabase Auth users to public."User" table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."User" (
    id, 
    name, 
    email, 
    password_hash, 
    onboarding_stage, 
    created_at, 
    streak_count, 
    post_exam_preference, 
    allow_morning_revision, 
    preferred_focus_window
  )
  VALUES (
    new.id::text,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    new.email,
    '', -- placeholder password_hash since password authentication is managed by Supabase Auth
    'PROFILE',
    COALESCE(new.created_at, now()),
    0,
    'REST',
    false,
    'ANY'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- PostgreSQL stored procedure to atomically handle semester progression (archiving previous session/courses/plans)
CREATE OR REPLACE FUNCTION public.progress_semester(user_id_param TEXT)
RETURNS void AS $$
DECLARE
  profile_rec RECORD;
  current_session_rec RECORD;
  next_sem INT;
  next_lvl INT;
  new_session_id TEXT;
  
  -- Add variables for active semester window
  active_window_rec RECORD;
  active_window_name TEXT;
  active_window_start TIMESTAMP;
  active_window_end TIMESTAMP;
  curr_yr INT;
  user_selected_sem_str TEXT;
BEGIN
  -- Get current profile
  SELECT * INTO profile_rec FROM public."AcademicProfile" WHERE user_id = user_id_param;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Academic profile not found';
  END IF;

  IF profile_rec.semester = 1 THEN
    next_sem := 2;
    next_lvl := profile_rec.level;
  ELSE
    next_sem := 1;
    next_lvl := profile_rec.level + 100;
  END IF;

  -- 1. Determine target semester string
  IF next_sem = 1 THEN
    user_selected_sem_str := '1st Semester';
  ELSE
    user_selected_sem_str := '2nd Semester';
  END IF;

  -- 2. Find or create ActiveSemesterWindow matching target semester string
  SELECT * INTO active_window_rec FROM public."ActiveSemesterWindow" 
  WHERE name = user_selected_sem_str AND is_active = true 
  ORDER BY start_date ASC 
  LIMIT 1;

  IF active_window_rec.id IS NULL THEN
    curr_yr := EXTRACT(YEAR FROM CURRENT_DATE);
    IF user_selected_sem_str = '1st Semester' THEN
      -- If today is in second half of the year, first semester starts Jan 1 of next year
      IF EXTRACT(MONTH FROM CURRENT_DATE) >= 7 THEN
        curr_yr := curr_yr + 1;
      END IF;
      active_window_start := MAKE_DATE(curr_yr, 1, 1);
      active_window_end := MAKE_TIMESTAMP(curr_yr, 6, 30, 23, 59, 59);
    ELSE
      -- Second semester starts Jul 1 of current year
      active_window_start := MAKE_DATE(curr_yr, 7, 1);
      active_window_end := MAKE_TIMESTAMP(curr_yr, 12, 31, 23, 59, 59);
    END IF;

    -- Dynamically insert ActiveSemesterWindow
    INSERT INTO public."ActiveSemesterWindow" (id, name, start_date, end_date, is_active, created_at)
    VALUES (
      gen_random_uuid()::text,
      user_selected_sem_str,
      active_window_start,
      active_window_end,
      true,
      CURRENT_TIMESTAMP
    ) RETURNING name, start_date INTO active_window_name, active_window_start;
  ELSE
    active_window_name := active_window_rec.name;
    active_window_start := active_window_rec.start_date;
  END IF;

  -- Find current open academic session
  SELECT * INTO current_session_rec FROM public."AcademicSession" WHERE user_id = user_id_param AND end_date IS NULL ORDER BY created_at DESC LIMIT 1;

  -- 3. Archive current session
  IF current_session_rec.id IS NOT NULL THEN
    UPDATE public."AcademicSession" SET end_date = CURRENT_TIMESTAMP WHERE id = current_session_rec.id;
  END IF;

  -- 4. Create new session anchored to the target semester window
  new_session_id := gen_random_uuid()::text;
  INSERT INTO public."AcademicSession" (id, user_id, semester, level, start_date, created_at)
  VALUES (
    new_session_id,
    user_id_param,
    active_window_name,
    next_lvl,
    active_window_start,
    CURRENT_TIMESTAMP
  );

  -- 5. Save UserSelectedSemester
  INSERT INTO public."UserSelectedSemester" (id, user_id, semester, created_at)
  VALUES (
    gen_random_uuid()::text,
    user_id_param,
    user_selected_sem_str,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (user_id) DO UPDATE SET semester = EXCLUDED.semester;

  -- 5. Update academic profile
  UPDATE public."AcademicProfile" SET semester = next_sem, level = next_lvl WHERE user_id = user_id_param;

  -- 5.5 Reset Onboarding Stage
  UPDATE public."User" SET onboarding_stage = 'COURSES' WHERE id = user_id_param;

  -- 6. Archive models
  UPDATE public."UserCourse" SET is_archived = true WHERE user_id = user_id_param AND is_archived = false;
  UPDATE public."UserTopic" SET is_archived = true WHERE user_id = user_id_param AND is_archived = false;
  UPDATE public."StudyPlan" SET is_archived = true WHERE user_id = user_id_param AND is_archived = false;
  
  -- Archive StudySessions related to user's study plans
  UPDATE public."StudySession" 
  SET is_archived = true 
  WHERE study_plan_id IN (SELECT id FROM public."StudyPlan" WHERE user_id = user_id_param) AND is_archived = false;

  UPDATE public."ProgressLog" SET is_archived = true WHERE user_id = user_id_param AND is_archived = false;
  UPDATE public."MistakeLog" SET is_archived = true WHERE user_id = user_id_param AND is_archived = false;
END;
$$ LANGUAGE plpgsql;
