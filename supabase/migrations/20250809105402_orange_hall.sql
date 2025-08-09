/*
  # Recreate event_attendees table with proper authentication

  1. New Tables
    - `event_attendees`
      - `id` (uuid, primary key)
      - `event_id` (bigint, foreign key to events)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `event_attendees` table
    - Add policy for public read access (anyone can view attendees)
    - Add policy for authenticated users to manage their own attendance
    - Add unique constraint to prevent duplicate attendance

  3. Indexes
    - Index on event_id for fast event lookups
    - Index on user_id for fast user lookups
    - Index on created_at for sorting
    - Unique index on (event_id, user_id) combination

  4. Triggers
    - Auto-update updated_at timestamp on row changes
</security>
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.event_attendees CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.update_event_attendees_updated_at() CASCADE;

-- Create the event_attendees table
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id bigint NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.event_attendees 
ADD CONSTRAINT event_attendees_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.event_attendees 
ADD CONSTRAINT event_attendees_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate attendance
ALTER TABLE public.event_attendees 
ADD CONSTRAINT event_attendees_event_user_unique 
UNIQUE (event_id, user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS event_attendees_event_id_idx ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS event_attendees_user_id_idx ON public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS event_attendees_created_at_idx ON public.event_attendees(created_at);

-- Create unique index for the constraint
CREATE UNIQUE INDEX IF NOT EXISTS event_attendees_event_user_unique 
ON public.event_attendees(event_id, user_id);

-- Enable Row Level Security
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy 1: Anyone can view event attendees (public read access)
CREATE POLICY "Anyone can view event attendees"
  ON public.event_attendees
  FOR SELECT
  TO public
  USING (true);

-- Policy 2: Authenticated users can manage their own attendance
CREATE POLICY "Authenticated users can manage their own attendance"
  ON public.event_attendees
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_event_attendees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_event_attendees_updated_at_trigger
  BEFORE UPDATE ON public.event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_attendees_updated_at();