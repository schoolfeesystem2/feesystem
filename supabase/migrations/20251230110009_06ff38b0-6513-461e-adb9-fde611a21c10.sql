-- Add academic_year and term columns to classes table
ALTER TABLE public.classes 
ADD COLUMN academic_year text NOT NULL DEFAULT '2025',
ADD COLUMN term text NOT NULL DEFAULT 'Term 1';

-- Add unique constraint to prevent duplicates for same school/class/year/term
ALTER TABLE public.classes
ADD CONSTRAINT unique_class_year_term UNIQUE (user_id, name, academic_year, term);