/*
  # Rebuild Database Schema

  1. New Tables
    - `events`
      - `id` (bigint, primary key, auto-increment)
      - `created_at` (timestamp with time zone, default now())
      - `title` (text, not null)
      - `description` (text, nullable)
      - `date` (date, not null)
      - `time` (time without time zone, not null)
      - `location` (text, not null)
      - `country` (text, not null, default 'United States')
      - `organizer` (text, not null)
      - `category` (text, not null, default 'Other')
      - `image` (text, nullable)
      - `user_id` (uuid, foreign key to auth.users)

    - `event_attendees`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `event_id` (bigint, foreign key to events.id)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access to events
    - Add policies for authenticated users to manage their own data

  3. Indexes
    - Add indexes for better query performance
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS event_attendees CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Create events table
CREATE TABLE events (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz DEFAULT now() NOT NULL,
  title text NOT NULL,
  description text,
  date date NOT NULL,
  time time without time zone NOT NULL,
  location text NOT NULL,
  country text DEFAULT 'United States' NOT NULL,
  organizer text NOT NULL,
  category text DEFAULT 'Other' NOT NULL,
  image text,
  user_id uuid REFERENCES auth.users(id)
);

-- Create event_attendees table
CREATE TABLE event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id bigint REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Public read access for events"
  ON events
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update only their own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND user_id IS NOT NULL)
  WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can delete only their own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Event attendees policies
CREATE POLICY "Anyone can view event attendees"
  ON event_attendees
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage their own attendance"
  ON event_attendees
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX events_date_idx ON events(date);
CREATE INDEX events_category_idx ON events(category);
CREATE INDEX events_country_idx ON events(country);
CREATE INDEX events_location_idx ON events(location);
CREATE INDEX events_user_id_idx ON events(user_id);
CREATE INDEX events_user_id_auth_idx ON events(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX event_attendees_event_id_idx ON event_attendees(event_id);
CREATE INDEX event_attendees_user_id_idx ON event_attendees(user_id);
CREATE INDEX event_attendees_created_at_idx ON event_attendees(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_attendees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_event_attendees_updated_at_trigger
  BEFORE UPDATE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_event_attendees_updated_at();

-- Insert some sample events for testing
INSERT INTO events (title, description, date, time, location, country, organizer, category, image) VALUES
('Pride Festival 2025', 'Annual Pride celebration with music, food, and community', '2025-06-15', '12:00:00', 'Central Park', 'United States', 'NYC Pride Committee', 'Festival', 'https://images.pexels.com/photos/3692748/pexels-photo-3692748.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Drag Queen Bingo Night', 'Fun bingo night hosted by fabulous drag queens', '2025-02-20', '19:00:00', 'Rainbow Bar', 'United States', 'Rainbow Entertainment', 'Bar', 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Gay Book Club Meeting', 'Monthly discussion of LGBTQ+ literature', '2025-02-25', '18:30:00', 'Community Center', 'United States', 'Rainbow Readers', 'Social Meetup', 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Club Night: House Music', 'Dance the night away to the best house music', '2025-02-22', '22:00:00', 'Pulse Nightclub', 'United States', 'DJ Rainbow', 'Club Night', 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400'),
('LGBTQ+ Career Workshop', 'Professional development and networking event', '2025-03-05', '14:00:00', 'Business Center', 'United States', 'Pride Professionals', 'Workshop', 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400');