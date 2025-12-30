-- Add target_user_id column to broadcast_messages
ALTER TABLE public.broadcast_messages 
ADD COLUMN target_user_id uuid REFERENCES auth.users(id);