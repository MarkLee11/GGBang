# Scheduled Location Unlock - Cron Configuration

## Overview
This document provides configuration examples for setting up automated location unlock jobs that run every 5 minutes across different platforms.

## 🕒 **Cron Schedule**
```
*/5 * * * * - Every 5 minutes
```

## 🚀 **Platform Setup Options**

### **Option 1: Supabase Cron (Recommended)**

If your Supabase project supports scheduled functions, use the following configuration:

```sql
-- Add to your Supabase SQL editor
SELECT cron.schedule(
  'auto-unlock-locations',  -- Job name
  '*/5 * * * *',           -- Every 5 minutes
  $$ 
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-location-unlock',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || 'YOUR_SERVICE_ROLE_KEY',
        'x-scheduled-job', 'true'
      ),
      body := jsonb_build_object('source', 'supabase-cron')
    );
  $$
);
```

**Enable the cron extension:**
```sql
-- Run this first if cron is not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### **Option 2: Vercel Cron Jobs**

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/unlock-locations",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Create `pages/api/cron/unlock-locations.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify this is a cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/scheduled-location-unlock`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'x-scheduled-job': 'true'
        },
        body: JSON.stringify({ source: 'vercel-cron' })
      }
    )

    const result = await response.json()
    res.status(200).json(result)
  } catch (error) {
    console.error('Cron job failed:', error)
    res.status(500).json({ error: 'Cron job failed' })
  }
}
```

### **Option 3: Cloudflare Workers Cron**

Create `wrangler.toml`:

```toml
[triggers]
crons = ["*/5 * * * *"]
```

Create the worker script:

```typescript
export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      const response = await fetch(
        `${env.SUPABASE_URL}/functions/v1/scheduled-location-unlock`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'x-scheduled-job': 'true'
          },
          body: JSON.stringify({ source: 'cloudflare-cron' })
        }
      )

      const result = await response.json()
      console.log('Unlock job result:', result)
    } catch (error) {
      console.error('Scheduled unlock failed:', error)
    }
  }
}
```

### **Option 4: GitHub Actions Cron**

Create `.github/workflows/unlock-locations.yml`:

```yaml
name: Auto Unlock Event Locations

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  unlock-locations:
    runs-on: ubuntu-latest
    steps:
      - name: Call unlock function
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "x-scheduled-job: true" \
            -d '{"source": "github-actions"}' \
            "${{ secrets.SUPABASE_URL }}/functions/v1/scheduled-location-unlock"
```

### **Option 5: External Cron Service (Cron-job.org, EasyCron)**

**HTTP Request Configuration:**
- **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-location-unlock`
- **Method**: `POST`
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  x-scheduled-job: true
  ```
- **Body**:
  ```json
  {"source": "external-cron"}
  ```
- **Schedule**: `*/5 * * * *`

## 🔧 **Environment Variables**

Ensure these are set in your deployment environment:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-cron-secret-for-verification
```

## 🧪 **Testing the Schedule**

### **Manual Test**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "x-scheduled-job: true" \
  -d '{"source": "manual-test"}' \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/scheduled-location-unlock"
```

### **Expected Response**
```json
{
  "ok": true,
  "processed": 2,
  "unlocked": 1,
  "skipped": 1,
  "errors": 0,
  "results": [
    {
      "eventId": 123,
      "title": "Summer Beach Party",
      "action": "unlocked"
    },
    {
      "eventId": 124,
      "title": "Tech Meetup",
      "action": "skipped",
      "details": "Not in unlock window"
    }
  ]
}
```

## 📊 **Monitoring & Logging**

### **Check Unlock Logs**
```sql
-- Recent unlock activity
SELECT * FROM location_unlock_logs 
ORDER BY unlocked_at DESC 
LIMIT 20;

-- Hourly summary
SELECT * FROM unlock_activity_summary;

-- Events unlocked today
SELECT 
  l.event_title,
  l.action,
  l.unlocked_at,
  e.date,
  e.time
FROM location_unlock_logs l
JOIN events e ON l.event_id = e.id
WHERE l.unlocked_at >= CURRENT_DATE
ORDER BY l.unlocked_at DESC;
```

### **Monitor Function Logs**
- Check Supabase Dashboard > Edge Functions > Logs
- Look for scheduled job execution patterns
- Monitor for errors or timeouts

## ⚠️ **Important Considerations**

### **Timezone Handling**
- All event times are stored in UTC
- The unlock logic automatically handles timezone conversion
- No additional timezone configuration needed

### **Idempotency**
- Multiple unlock attempts are safe
- Database constraints prevent duplicate unlocks
- Function returns success even if already unlocked

### **Error Handling**
- Failed unlocks are logged with error details
- Job continues processing other events if one fails
- Alerts can be set up based on error logs

### **Performance**
- Function processes only eligible events (indexed queries)
- Minimal database load with efficient filtering
- Logs are automatically cleaned up (optional retention policy)

### **Security**
- Service role key required for execution
- Optional verification headers for additional security
- RLS policies protect unlock logs

## 🚀 **Deployment Checklist**

1. ✅ **Deploy Edge Function**
   ```bash
   supabase functions deploy scheduled-location-unlock
   ```

2. ✅ **Run Database Migration**
   ```bash
   supabase db push
   ```

3. ✅ **Set Environment Variables**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. ✅ **Configure Cron Job** (choose one platform)
   - Supabase Cron
   - Vercel Cron
   - Cloudflare Workers
   - GitHub Actions
   - External service

5. ✅ **Test Manual Execution**
   ```bash
   curl -X POST [endpoint] -H [headers] -d [body]
   ```

6. ✅ **Monitor First Few Executions**
   - Check function logs
   - Verify unlock_logs table
   - Confirm events are being processed

The automated location unlock system is now ready for production deployment! 🎯
