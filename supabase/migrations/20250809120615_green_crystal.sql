/*
  # Replace all event cities with new made-up cities

  1. Updates
    - Updates all existing events with new city names
    - Assigns random cities to all events in the database
*/

-- Update all existing events with new city names
UPDATE events SET location = 'Miami' WHERE id % 10 = 0;
UPDATE events SET location = 'Austin' WHERE id % 10 = 1;
UPDATE events SET location = 'Seattle' WHERE id % 10 = 2;
UPDATE events SET location = 'Denver' WHERE id % 10 = 3;
UPDATE events SET location = 'Portland' WHERE id % 10 = 4;
UPDATE events SET location = 'Nashville' WHERE id % 10 = 5;
UPDATE events SET location = 'Atlanta' WHERE id % 10 = 6;
UPDATE events SET location = 'Phoenix' WHERE id % 10 = 7;
UPDATE events SET location = 'Boston' WHERE id % 10 = 8;
UPDATE events SET location = 'Las Vegas' WHERE id % 10 = 9;