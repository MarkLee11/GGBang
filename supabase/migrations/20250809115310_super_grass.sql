/*
  # Add country column to events table

  1. Schema Changes
    - Add `country` column to `events` table with default value
    - Add index for better query performance on country field
    - Update existing events with sample country data

  2. Security
    - No changes to RLS policies needed as country is just additional data
*/

-- Add country column to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'country'
  ) THEN
    ALTER TABLE events ADD COLUMN country text DEFAULT 'United States' NOT NULL;
  END IF;
END $$;

-- Add index for country column for better query performance
CREATE INDEX IF NOT EXISTS events_country_idx ON events (country);

-- Update existing events with sample country data based on common locations
UPDATE events 
SET country = CASE 
  WHEN location ILIKE '%new york%' OR location ILIKE '%nyc%' OR location ILIKE '%manhattan%' OR location ILIKE '%brooklyn%' THEN 'United States'
  WHEN location ILIKE '%los angeles%' OR location ILIKE '%la%' OR location ILIKE '%hollywood%' OR location ILIKE '%california%' THEN 'United States'
  WHEN location ILIKE '%san francisco%' OR location ILIKE '%sf%' OR location ILIKE '%bay area%' THEN 'United States'
  WHEN location ILIKE '%chicago%' OR location ILIKE '%illinois%' THEN 'United States'
  WHEN location ILIKE '%miami%' OR location ILIKE '%florida%' THEN 'United States'
  WHEN location ILIKE '%london%' OR location ILIKE '%uk%' OR location ILIKE '%england%' THEN 'United Kingdom'
  WHEN location ILIKE '%berlin%' OR location ILIKE '%germany%' OR location ILIKE '%munich%' THEN 'Germany'
  WHEN location ILIKE '%amsterdam%' OR location ILIKE '%netherlands%' OR location ILIKE '%holland%' THEN 'Netherlands'
  WHEN location ILIKE '%paris%' OR location ILIKE '%france%' THEN 'France'
  WHEN location ILIKE '%toronto%' OR location ILIKE '%vancouver%' OR location ILIKE '%canada%' THEN 'Canada'
  WHEN location ILIKE '%sydney%' OR location ILIKE '%melbourne%' OR location ILIKE '%australia%' THEN 'Australia'
  WHEN location ILIKE '%madrid%' OR location ILIKE '%barcelona%' OR location ILIKE '%spain%' THEN 'Spain'
  WHEN location ILIKE '%rome%' OR location ILIKE '%milan%' OR location ILIKE '%italy%' THEN 'Italy'
  WHEN location ILIKE '%brazil%' OR location ILIKE '%rio%' OR location ILIKE '%sao paulo%' THEN 'Brazil'
  ELSE 'United States'
END
WHERE country = 'United States'; -- Only update records that still have the default value