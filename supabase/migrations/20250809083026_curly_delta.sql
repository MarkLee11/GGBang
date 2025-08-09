/*
  # Insert Mock Events Data

  1. Data Migration
    - Inserts sample events from the frontend mockup into the events table
    - Maps all properties to their corresponding database columns
    - Uses realistic data for Gay community events

  2. Event Categories
    - Bar, Club, Festival, Concert, Restaurant events
    - Diverse locations across major US cities
    - Proper date/time formatting for database storage
*/

INSERT INTO events (title, date, time, location, organizer, description, category, image) VALUES
(
  'Gay Party',
  '2024-08-25',
  '20:00:00',
  'New York, NY',
  'Rainbow Events NYC',
  'An electrifying night of music, dancing, and celebration.',
  'Club',
  'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'
),
(
  'Drag Show',
  '2024-09-10',
  '19:30:00',
  'Los Angeles, CA',
  'LA Drag Collective',
  'Join us for a smooth and soulful evening of drag performances.',
  'Bar',
  'https://images.pexels.com/photos/3184398/pexels-photo-3184398.jpeg?auto=compress&cs=tinysrgb&w=400'
),
(
  'Leather Night',
  '2024-09-18',
  '22:00:00',
  'Chicago, IL',
  'Chicago Leather Society',
  'Get ready for a kinky and wild night with the leather community.',
  'Club',
  'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'
),
(
  'Pride Music Festival',
  '2024-09-22',
  '18:00:00',
  'San Francisco, CA',
  'SF Pride Music Committee',
  'Experience the best indie films that explore Gay stories and lives.',
  'Festival',
  'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400'
),
(
  'Rainbow Brunch',
  '2024-08-30',
  '14:00:00',
  'Miami, FL',
  'Miami Gay Brunch Club',
  'Splash into summer with our rainbow pool party celebration.',
  'Restaurant',
  'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400'
),
(
  'Live Jazz Concert',
  '2024-08-29',
  '20:30:00',
  'Austin, TX',
  'Austin Jazz Society',
  'Sing your heart out at our weekly Gay karaoke night.',
  'Concert',
  'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'
);