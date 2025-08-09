/*
  # Step 1 & 2: Update Categories and Seed Data

  1. Update categories to: Bar, Club, Festival, Social Meetup, Home Party, Other
  2. Remove all existing events
  3. Insert 20 realistic small gay outings (2-12 people) within next 30 days
*/

-- Clear existing events and attendees
DELETE FROM event_attendees;
DELETE FROM events;

-- Insert 20 realistic small gay outings
INSERT INTO events (title, description, date, time, location, country, organizer, category, image, user_id) VALUES
-- Bar Events (4)
('Happy Hour Hangout', 'Join us for drinks and good vibes at a cozy gay bar in the Castro! Perfect for meeting new friends over cocktails. Small group of 4-6 people.', '2025-01-15', '18:30', 'San Francisco', 'United States', 'Mike Castro', 'Bar', 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Wine Tasting Evening', 'Intimate wine tasting at a trendy wine bar in Soho. Come discover new wines with fellow wine lovers! Group of 6-8 people.', '2025-01-18', '19:00', 'London', 'United Kingdom', 'James London', 'Bar', 'https://images.pexels.com/photos/1407846/pexels-photo-1407846.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Pub Quiz Night', 'Weekly pub quiz at our favorite gay-friendly pub in Kreuzberg! Form a team of 4-5 friends and test your knowledge while having fun.', '2025-01-22', '20:00', 'Berlin', 'Germany', 'Alex Berlin', 'Bar', 'https://images.pexels.com/photos/1267697/pexels-photo-1267697.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Cocktail Making Class', 'Learn to make amazing cocktails with a small group at a trendy bar in Chueca! Max 8 people for hands-on experience.', '2025-01-25', '17:00', 'Madrid', 'Spain', 'Carlos Madrid', 'Bar', 'https://images.pexels.com/photos/1304540/pexels-photo-1304540.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),

-- Club Events (3)
('House Music Night', 'Small group dance session at an underground club in Reguliersdwarsstraat! Love house music? Join our crew of 6-8 dancers.', '2025-01-17', '23:00', 'Amsterdam', 'Netherlands', 'Robin Amsterdam', 'Club', 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('90s Pop Dance Party', 'Nostalgic 90s pop night at a fun club in Darlinghurst! Small group of 8-10 people ready to dance to the best throwback hits.', '2025-01-20', '22:30', 'Sydney', 'Australia', 'Danny Sydney', 'Club', 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Latin Night Dancing', 'Salsa and reggaeton night at a vibrant club in Roma Norte! Join 6-8 people for an energetic night of Latin dancing.', '2025-01-28', '21:30', 'Mexico City', 'Mexico', 'Luis Mexico', 'Club', 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),

-- Festival Events (3)
('Pride Picnic Prep', 'Small gathering to plan our Pride picnic! Meet 8-10 organizers in Dolores Park to coordinate food, activities, and logistics.', '2025-01-16', '14:00', 'San Francisco', 'United States', 'Sam Pride', 'Festival', 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Music Festival Meetup', 'Pre-festival meetup for 6-8 people attending the summer music festival! Plan our group strategy and get excited together.', '2025-01-24', '16:00', 'Toronto', 'Canada', 'Jordan Toronto', 'Festival', 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Food Truck Festival', 'Explore the weekend food truck festival with a small group of 5-7 foodies! Try different cuisines and enjoy good company.', '2025-01-30', '12:00', 'Portland', 'United States', 'Casey Portland', 'Festival', 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),

-- Social Meetup Events (5)
('Coffee & Chat', 'Casual coffee meetup for 4-6 people in a cozy café in Le Marais. Perfect for meaningful conversations and making new connections.', '2025-01-14', '10:30', 'Paris', 'France', 'Pierre Paris', 'Social Meetup', 'https://images.pexels.com/photos/1267697/pexels-photo-1267697.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Board Game Afternoon', 'Fun board game session for 6-8 people at a friendly café in Shibuya! Bring your competitive spirit and sense of humor.', '2025-01-19', '15:00', 'Tokyo', 'Japan', 'Yuki Tokyo', 'Social Meetup', 'https://images.pexels.com/photos/1304540/pexels-photo-1304540.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Sunday Brunch Club', 'Weekly brunch gathering for 8-10 people at a trendy spot in Fitzroy! Great food, mimosas, and even better company.', '2025-01-21', '11:00', 'Melbourne', 'Australia', 'Ryan Melbourne', 'Social Meetup', 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Book Club Discussion', 'Monthly book club for 6-8 readers in Zona Rosa! This month: "Red: A Crayon\'s Story" - a beautiful LGBTQ+ themed book.', '2025-01-26', '18:00', 'Mexico City', 'Mexico', 'Maria Mexico', 'Social Meetup', 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Photography Walk', 'Explore the city through photography with 5-7 fellow photographers! Capture beautiful moments and share tips in Gamla Stan.', '2025-01-31', '13:00', 'Stockholm', 'Sweden', 'Erik Stockholm', 'Social Meetup', 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),

-- Home Party Events (3)
('Movie Night Marathon', 'Cozy movie night at my place for 6-8 people! LGBTQ+ film marathon with popcorn, snacks, and good company in Chueca area.', '2025-01-23', '19:30', 'Madrid', 'Spain', 'Diego Madrid', 'Home Party', 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Game Night Extravaganza', 'Epic game night for 8-10 people! Video games, card games, and party games at my apartment in Kreuzberg. Snacks provided!', '2025-01-27', '20:00', 'Berlin', 'Germany', 'Max Berlin', 'Home Party', 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Potluck Dinner Party', 'Bring a dish and join 10-12 people for a delicious potluck dinner at my place in the Castro! Great way to try new foods and make friends.', '2025-01-29', '18:00', 'San Francisco', 'United States', 'Tyler SF', 'Home Party', 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),

-- Other Events (2)
('Museum Tour & Coffee', 'Private small group tour of the modern art museum for 5-6 people, followed by coffee and discussion in Soho area.', '2025-01-32', '14:30', 'London', 'United Kingdom', 'Oliver London', 'Other', 'https://images.pexels.com/photos/1407846/pexels-photo-1407846.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid()),
('Cooking Class Adventure', 'Learn to cook Thai cuisine with 6-8 people at a local cooking school in Silom! Hands-on experience and delicious results.', '2025-02-01', '16:00', 'Bangkok', 'Thailand', 'Somchai Bangkok', 'Other', 'https://images.pexels.com/photos/1304540/pexels-photo-1304540.jpeg?auto=compress&cs=tinysrgb&w=400', gen_random_uuid());