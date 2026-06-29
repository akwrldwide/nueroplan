-- Enable Row Level Security (RLS)
ALTER TABLE public."GlobalAcademicSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SemesterWindow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SystemConfig" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to prevent errors
DROP POLICY IF EXISTS "Allow authenticated select on GlobalAcademicSession" ON public."GlobalAcademicSession";
DROP POLICY IF EXISTS "Allow authenticated select on SemesterWindow" ON public."SemesterWindow";
DROP POLICY IF EXISTS "Allow authenticated select on SystemConfig" ON public."SystemConfig";

-- Create SELECT policies for authenticated users
CREATE POLICY "Allow authenticated select on GlobalAcademicSession" ON public."GlobalAcademicSession"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated select on SemesterWindow" ON public."SemesterWindow"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated select on SystemConfig" ON public."SystemConfig"
  FOR SELECT TO authenticated USING (true);
