/*
  # Clear existing events and add small gay outing samples

  1. Data Cleanup
    - Remove all existing events and attendees
  
  2. Sample Events
    - Add 20 new small-scale gay outing events
    - Focus on intimate gatherings (2-12 people)
    - Vary across different categories and cities
    - Use realistic dates within next 30 days
*/

-- Clear existing data
DELETE FROM event_attendees;
DELETE FROM events;

-- Reset the sequence for events table
ALTER SEQUENCE events_id_seq RESTART WITH 1;

-- Insert 20 sample small gay outings
INSERT INTO events (title, description, date, time, location, country, organizer, category, image) VALUES
-- Bar events
('Join 6 Friends for Cocktails at Local Gay Bar', 'Casual drinks and good vibes at our favorite neighborhood spot. Perfect for meeting new people in a relaxed setting!', '2025-01-15', '19:30', 'Berlin', 'Germany', 'Alex Rainbow', 'Bar', 'https://images.pexels.com/photos/274192/pexels-photo-274192.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Happy Hour Hangout (Max 8 People)', 'Join us for discounted drinks and great conversation. Small group, big fun!', '2025-01-18', '17:00', 'San Francisco', 'United States', 'Mike Chen', 'Bar', 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Cozy Wine Bar Night (4-6 People)', 'Intimate evening at a charming wine bar. Perfect for deeper conversations and new friendships.', '2025-01-22', '20:00', 'Paris', 'France', 'Jean-Luc Martin', 'Bar', 'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Club events  
('Dance Night: Small Group Club Adventure', 'Hit the dance floor with 8 awesome guys! Great music, good energy, safe space.', '2025-01-17', '22:00', 'London', 'United Kingdom', 'James Wilson', 'Club', 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Saturday Night Out (Max 10 People)', 'Join our crew for an epic night of dancing and fun at the best gay club in town!', '2025-01-25', '21:30', 'Sydney', 'Australia', 'Ryan Thompson', 'Club', 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Festival events
('Pride Picnic Meetup (8-12 People)', 'Join us for a fun picnic during the local pride festival. Bring snacks to share!', '2025-01-20', '14:00', 'Amsterdam', 'Netherlands', 'Lars van Berg', 'Festival', 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Small Group Festival Experience', 'Experience the music festival together! Meet at the entrance and explore as a group.', '2025-01-28', '16:00', 'Barcelona', 'Spain', 'Carlos Rodriguez', 'Festival', 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Social Meetup events
('Coffee & Chat (4-6 New Friends)', 'Casual coffee meetup for gay guys new to the city. Friendly, welcoming atmosphere!', '2025-01-16', '15:00', 'Toronto', 'Canada', 'David Kim', 'Social Meetup', 'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Board Game Night (6-8 People)', 'Fun evening of board games, snacks, and great company. All skill levels welcome!', '2025-01-19', '19:00', 'Melbourne', 'Australia', 'Tom Anderson', 'Social Meetup', 'https://images.pexels.com/photos/1040157/pexels-photo-1040157.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Brunch Buddies (Max 8 People)', 'Sunday brunch with mimosas and good conversation. Perfect way to start the weekend!', '2025-01-26', '11:00', 'New York', 'United States', 'Marcus Johnson', 'Social Meetup', 'https://images.pexels.com/photos/1581384/pexels-photo-1581384.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Home Party events
('Cozy House Party (8-10 Friends)', 'Intimate house party with music, drinks, and great vibes. Bring a friend if you like!', '2025-01-21', '20:00', 'Los Angeles', 'United States', 'Jake Martinez', 'Home Party', 'https://images.pexels.com/photos/1267697/pexels-photo-1267697.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Game Night at My Place (6-8 People)', 'Video games, card games, and chill vibes at my apartment. Snacks provided!', '2025-01-24', '18:30', 'Chicago', 'United States', 'Alex Rivera', 'Home Party', 'https://images.pexels.com/photos/1040157/pexels-photo-1040157.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Movie Night Gathering (4-6 People)', 'Cozy movie night with popcorn and good company. Vote on what to watch!', '2025-01-29', '19:30', 'Vancouver', 'Canada', 'Chris Lee', 'Home Party', 'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Sauna events
('Relaxing Sauna Session (4-6 People)', 'Unwind and socialize at the local gay-friendly sauna. Perfect for stress relief!', '2025-01-23', '15:00', 'Helsinki', 'Finland', 'Mikael Virtanen', 'Sauna', 'https://images.pexels.com/photos/3188/spa-sauna-steam-room.jpg?auto=compress&cs=tinysrgb&w=400'),
('Sunday Sauna Hangout (Max 8 People)', 'Join us for a relaxing Sunday at the sauna. Great way to meet people in a chill environment.', '2025-01-27', '14:00', 'Stockholm', 'Sweden', 'Erik Johansson', 'Sauna', 'https://images.pexels.com/photos/3188/spa-sauna-steam-room.jpg?auto=compress&cs=tinysrgb&w=400'),

-- Karaoke events
('Karaoke Night Fun (6-10 People)', 'Sing your heart out with a fun group of guys! Private room booked for our crew.', '2025-01-30', '20:30', 'Tokyo', 'Japan', 'Hiroshi Tanaka', 'Karaoke', 'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Friday Night Karaoke (Max 8 People)', 'End the week with some singing and laughs! All voices welcome, no judgment zone.', '2025-01-31', '21:00', 'Seoul', 'South Korea', 'Min-jun Park', 'Karaoke', 'https://images.pexels.com/photos/1267697/pexels-photo-1267697.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Beach/Pool Gathering events
('Beach Day Hangout (8-12 People)', 'Sunny day at the beach with volleyball, swimming, and good vibes. Bring sunscreen!', '2025-02-01', '12:00', 'Miami', 'United States', 'Diego Santos', 'Beach/Pool Gathering', 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=400'),
('Pool Party Afternoon (6-10 People)', 'Chill pool party with music, drinks, and swimming. Perfect for a hot day!', '2025-02-03', '14:30', 'Tel Aviv', 'Israel', 'Avi Cohen', 'Beach/Pool Gathering', 'https://images.pexels.com/photos/1032650/pexels-photo-1032650.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Other events
('Museum Visit & Coffee (4-6 People)', 'Explore the art museum together, then grab coffee and discuss what we saw!', '2025-02-02', '13:00', 'Vienna', 'Austria', 'Franz Mueller', 'Other', 'https://images.pexels.com/photos/1267338/pexels-photo-1267338.jpeg?auto=compress&cs=tinysrgb&w=400');