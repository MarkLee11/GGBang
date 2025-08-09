/*
  # Replace categories and seed 20 small gay outings

  1. Data Cleanup
    - Remove all existing events and attendees
  
  2. New Sample Data
    - Insert 20 realistic small gay outings (2-12 people)
    - Spread across cities worldwide
    - Within next 30 days
    - Categories: Bar, Club, Festival, Social Meetup, Home Party, Other
    - Include place_hint (no exact addresses)
    - Friendly & casual tone
*/

-- Clear existing data
DELETE FROM event_attendees;
DELETE FROM events;

-- Insert 20 new small gay outing sample events
INSERT INTO events (title, description, date, time, location, country, organizer, category, image) VALUES

-- Bar Events (4 events)
('Happy Hour with 6 Gay Friends', 'Join us for cocktails and laughs at a cozy neighborhood bar. Great vibes, good drinks, and even better company! Max 6 people for intimate conversations.', '2025-01-15', '18:30', 'Berlin', 'Germany', 'Marco B.', 'Bar', 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Wine Tasting Night (Small Group)', 'Discover amazing wines with 4 other gay wine lovers. We''ll meet at a trendy wine bar in the Castro. Perfect for making new friends over great wine!', '2025-01-18', '19:00', 'San Francisco', 'United States', 'David L.', 'Bar', 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Pub Quiz Night - Gay Team', 'Looking for 5 smart guys to form our quiz team! Local gay-friendly pub, great atmosphere. Let''s win some prizes and have fun together.', '2025-01-22', '20:00', 'London', 'United Kingdom', 'James M.', 'Bar', 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Cocktail Making Class (8 Max)', 'Learn to make amazing cocktails with 7 other gay guys! Professional bartender will teach us. Then we drink what we make! Place hint: Soho area.', '2025-01-25', '17:00', 'New York', 'United States', 'Alex R.', 'Bar', 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Club Events (3 events)
('Dance Night - Small Crew', 'Join 8 gay guys for an epic night of dancing! We''ll hit the best club in town. Great music, amazing energy. Let''s dance until dawn!', '2025-01-17', '22:00', 'Madrid', 'Spain', 'Carlos S.', 'Club', 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Underground House Music Night', 'Small group of 6 house music lovers wanted! Amazing underground club with the best DJs. Intimate dance floor, incredible vibes.', '2025-01-20', '23:00', 'Amsterdam', 'Netherlands', 'Lars V.', 'Club', 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'),

('90s Pop Dance Party (10 Max)', 'Calling all 90s music lovers! Join 9 other gay guys for the ultimate throwback dance night. Spice Girls, Britney, and more! Place hint: Gay district.', '2025-01-28', '21:30', 'Toronto', 'Canada', 'Mike T.', 'Club', 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Festival Events (3 events)
('Pride Picnic in the Park', 'Casual Pride celebration with 10 gay friends! Bring snacks to share. We''ll have games, music, and great conversations. Family-friendly vibes.', '2025-01-19', '14:00', 'Sydney', 'Australia', 'Ryan K.', 'Festival', 'https://images.pexels.com/photos/3692748/pexels-photo-3692748.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Music Festival Meetup (8 People)', 'Join 7 other gay music lovers at the local indie festival! We''ll explore together, share food, and discover new bands. Great way to make friends.', '2025-01-24', '12:00', 'Austin', 'United States', 'Tyler J.', 'Festival', 'https://images.pexels.com/photos/3692748/pexels-photo-3692748.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Food Truck Festival Adventure', 'Explore the best food trucks with 5 other foodies! We''ll try different cuisines and rate our favorites. Perfect for gay guys who love good food!', '2025-01-26', '11:30', 'Melbourne', 'Australia', 'Sam P.', 'Festival', 'https://images.pexels.com/photos/3692748/pexels-photo-3692748.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Social Meetup Events (4 events)
('Coffee & Chat (New in Town)', 'New to the city? Join 4 other gay guys for coffee and friendly conversation. Perfect for making your first local friends! Cozy café in city center.', '2025-01-16', '10:00', 'Vancouver', 'Canada', 'Jordan C.', 'Social Meetup', 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Board Game Sunday (6 Max)', 'Love board games? Join 5 other gay gamers for an afternoon of fun! We have tons of games or bring your favorites. Snacks and laughs included.', '2025-01-21', '15:00', 'Chicago', 'United States', 'Ben W.', 'Social Meetup', 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Brunch & Gossip Session', 'Join 7 gay guys for the ultimate brunch experience! Bottomless mimosas, amazing food, and the best gossip. Place hint: Popular brunch spot downtown.', '2025-01-23', '11:00', 'Los Angeles', 'United States', 'Chris H.', 'Social Meetup', 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Book Club Discussion', 'Monthly gay book club meeting! This month: "Red: A Crayon''s Story". Join 8 thoughtful guys for deep discussions and wine. All reading levels welcome.', '2025-01-27', '19:30', 'Paris', 'France', 'Antoine D.', 'Social Meetup', 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Home Party Events (3 events)
('Cozy Movie Night (8 Max)', 'Join 7 gay guys for a fun movie night at my place! We''ll vote on the movie, make popcorn, and have great company. BYOB welcome!', '2025-01-18', '20:00', 'Portland', 'United States', 'Kevin S.', 'Home Party', 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Game Night & Pizza Party', 'Video games, board games, and pizza! Join 9 other gay gamers for an epic night. I have PS5, Switch, and tons of board games. Place hint: Near university.', '2025-01-29', '18:00', 'Dublin', 'Ireland', 'Liam O.', 'Home Party', 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Potluck Dinner Party (10 People)', 'Bring a dish and join 9 gay guys for a delicious potluck! Great way to try new foods and make lasting friendships. Vegetarian options welcome.', '2025-01-30', '19:00', 'Stockholm', 'Sweden', 'Erik N.', 'Home Party', 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400'),

-- Other Events (3 events)
('Museum Tour & Coffee', 'Explore the modern art museum with 5 other culture-loving gay guys! We''ll discuss the exhibits over coffee afterward. Perfect weekend activity.', '2025-01-19', '13:00', 'Barcelona', 'Spain', 'Pablo R.', 'Other', 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Hiking Adventure (Small Group)', 'Join 6 gay nature lovers for a scenic hike! Moderate difficulty, beautiful views. We''ll pack lunch and enjoy nature together. Place hint: 30 min from city.', '2025-01-25', '09:00', 'Denver', 'United States', 'Matt G.', 'Other', 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=400'),

('Cooking Class Together', 'Learn to make authentic Italian pasta with 7 other gay foodies! Professional chef will guide us. Then we eat our creations! BYOB encouraged.', '2025-01-31', '18:30', 'Rome', 'Italy', 'Giuseppe M.', 'Other', 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=400');