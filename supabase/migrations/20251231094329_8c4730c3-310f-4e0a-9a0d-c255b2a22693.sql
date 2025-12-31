-- Drop existing policies
DROP POLICY IF EXISTS "Users can delete own students" ON public.students;
DROP POLICY IF EXISTS "Users can insert own students" ON public.students;
DROP POLICY IF EXISTS "Users can update own students" ON public.students;
DROP POLICY IF EXISTS "Users can view own students" ON public.students;

-- Recreate policies with explicit authenticated role requirement
CREATE POLICY "Users can view own students" 
ON public.students 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own students" 
ON public.students 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own students" 
ON public.students 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own students" 
ON public.students 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);