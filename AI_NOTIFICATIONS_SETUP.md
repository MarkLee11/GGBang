# AI-Powered Notifications Setup Guide 🤖✉️

## Overview
This system provides intelligent, personalized notifications with email delivery for join requests, approvals, rejections, and location unlocks using OpenAI GPT-4 and multiple email providers.

## 🔧 **Environment Variables Setup**

### **Required Variables**
```env
# Supabase (Required)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### **AI Configuration (Optional)**
```env
# OpenAI for AI-generated copy (falls back to static messages if not provided)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### **Email Configuration (Choose one option)**

#### **Option 1: Resend (Recommended)**
```env
RESEND_API_KEY=re_your-resend-api-key-here
EMAIL_SENDER=noreply@yourdomain.com
```

#### **Option 2: SMTP Fallback**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### **Option 3: No Email (Development)**
```env
# Leave email variables empty - notifications will still work in frontend
# Emails will be logged to console but not sent
```

## 🚀 **Quick Setup Steps**

### **1. Create `.env` File**
```bash
# Copy example and fill in your values
cp .env.example .env
```

### **2. Get OpenAI API Key (Optional)**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env` as `OPENAI_API_KEY=sk-...`

### **3. Set Up Email Provider**

#### **Option A: Resend (Recommended)**
1. Sign up at [Resend](https://resend.com)
2. Create API key
3. Verify your domain (or use `onboarding@resend.dev` for testing)
4. Add to `.env`:
   ```env
   RESEND_API_KEY=re_...
   EMAIL_SENDER=noreply@yourdomain.com
   ```

#### **Option B: Gmail SMTP**
1. Enable 2FA on your Gmail account
2. Generate an App Password
3. Add to `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

### **4. Deploy Edge Functions**
```bash
# Deploy the updated functions with notification support
supabase functions deploy join-request
supabase functions deploy join-approve
supabase functions deploy join-reject
```

### **5. Test the System**
1. Submit a join request → Host receives email notification
2. Approve request → Applicant receives email notification
3. Check frontend toasts for AI-generated messages

## 🧠 **AI-Generated Copy Examples**

### **Join Request Created**
- **Input**: Someone requests to join "Summer Beach Party" on Friday
- **AI Output**: "Alex just requested to join 'Summer Beach Party' this Friday! Check their profile and approve their request in your event dashboard. 🏖️"

### **Request Approved**
- **Input**: Request approved for "Tech Meetup" on Tuesday
- **AI Output**: "Awesome news! You're officially in for 'Tech Meetup' this Tuesday. Get ready to network and learn! 🚀"

### **Request Rejected**
- **Input**: Request declined for "House Party" 
- **AI Output**: "Your request for 'House Party' wasn't approved this time, but don't worry - there are tons of amazing events waiting for you! ✨"

## 📧 **Email Template Features**

### **Professional Design**
- Beautiful gradient branding
- Mobile-responsive layout
- Clean typography and spacing
- Call-to-action buttons

### **Personalized Content**
- AI-generated personalized messages
- Event-specific details
- Context-aware tone and language
- Dynamic action buttons

### **Sample Email Structure**
```html
┌─────────────────────────────┐
│          GGBang             │
│     (Gradient Logo)         │
├─────────────────────────────┤
│                             │
│  🎉 Request Approved!       │
│                             │
│  [AI-Generated Message]     │
│                             │
│  ┌─────────────────────┐   │
│  │   View Event Details │   │
│  └─────────────────────┘   │
│                             │
│  Unsubscribe preferences    │
└─────────────────────────────┘
```

## 🎯 **Frontend Toast Notifications**

### **Smart Truncation**
- AI messages shortened to 120 characters for mobile
- Intelligent sentence boundary detection
- Fallback to word boundaries with ellipsis

### **Visual Design**
```typescript
// Success toast (approvals)
🎉 Awesome news! You're officially in for 'Summer Beach Party' this Friday. Get ready to...

// Info toast (requests)
ℹ️  Alex just requested to join 'Summer Beach Party'! Check their profile in your dashboard.

// Error toast (network issues)
❌ Network error occurred. Please try again.
```

### **Auto-dismiss Timing**
- Success: 4 seconds
- Info: 4 seconds  
- Error: 6 seconds
- Manual close button available

## 🔄 **Notification Flow**

### **Join Request Submitted**
1. **User** submits request with message
2. **Edge Function** creates database record
3. **AI** generates personalized copy
4. **Email** sent to event host
5. **Toast** shown to user: "Request submitted successfully!"

### **Request Approved**
1. **Host** clicks approve button
2. **Edge Function** updates database atomically
3. **AI** generates celebration copy
4. **Email** sent to applicant
5. **Toast** shown to host: "Request approved! Applicant notified."

### **Request Rejected**
1. **Host** clicks reject with optional note
2. **Edge Function** updates status
3. **AI** generates supportive copy
4. **Email** sent to applicant
5. **Toast** shown to host: "Request declined. Applicant notified."

## 🛡️ **Error Handling & Fallbacks**

### **AI Fallbacks**
- If OpenAI API fails → Use predefined friendly messages
- If API key missing → Automatic fallback mode
- If response too long → Truncate or use fallback
- If inappropriate content → Content filters applied

### **Email Fallbacks**
- Resend fails → Attempt SMTP
- SMTP fails → Log error, continue operation
- No email config → Operations succeed, no emails sent
- Invalid recipients → Skip email, log warning

### **Frontend Resilience**
- Network errors → Show error toast with retry option
- API timeouts → Graceful degradation with fallback messages
- Missing data → Default to generic but friendly copy

## 📊 **Monitoring & Debugging**

### **Console Logs**
```javascript
// AI generation logs
"AI notification generated: [message]"
"Falling back to static message due to: [reason]"

// Email sending logs  
"Email sent via Resend: [messageId]"
"Email fallback to SMTP successful"
"Email sending failed: [error]"

// Notification results
"Host notification result: { emailSent: true, message: '...' }"
```

### **Error Tracking**
- All notification failures logged but don't break user flow
- Email delivery issues reported to console
- AI generation errors handled gracefully
- Frontend toast system tracks success/failure rates

## 🎨 **Customization Options**

### **AI Prompt Customization**
Edit `src/lib/aiCopy.ts` to modify AI behavior:
```typescript
const PROMPTS = {
  request_created: `
    You are generating a notification for an event host.
    Create a [warm/formal/casual] message that:
    - [Your custom requirements]
    Keep it under 150 characters.
  `
}
```

### **Email Template Customization**
Edit `src/lib/mailer.ts` or `supabase/functions/_shared/notifications.ts`:
```typescript
// Customize colors, fonts, layout
const emailTemplate = `
  <style>
    .logo { color: #your-brand-color; }
    .button { background: #your-button-color; }
  </style>
`
```

### **Toast Styling**
Edit `src/components/ToastNotifications.tsx`:
```typescript
// Customize toast appearance, timing, animations
const toastStyles = {
  success: 'bg-green-900/90 border-green-500/30',
  // ... your custom styles
}
```

## 🚀 **Production Deployment Checklist**

### **Environment Variables**
- ✅ All Supabase keys configured
- ✅ Email provider configured (Resend or SMTP)
- ✅ OpenAI API key added (optional)
- ✅ EMAIL_SENDER domain verified

### **Edge Functions**
- ✅ All functions deployed with notification support
- ✅ Service role permissions configured
- ✅ CORS headers properly set

### **Frontend**
- ✅ Toast notification system integrated
- ✅ Error handling implemented
- ✅ Success messages user-tested

### **Testing**
- ✅ Join request flow tested end-to-end
- ✅ Email delivery confirmed
- ✅ AI copy generation working
- ✅ Fallback behavior verified

## 💡 **Pro Tips**

### **Cost Optimization**
- OpenAI costs ~$0.0001 per notification (very cheap)
- Resend: 3,000 free emails/month
- SMTP: Usually free with existing email service

### **Performance**
- AI generation takes 1-3 seconds (async, doesn't block user)
- Email sending happens in background
- Toast notifications show immediately

### **User Experience**
- Users see instant feedback via toasts
- Email provides detailed context and actions
- Fallback messages ensure system never fails silently

The AI-powered notification system is now ready to provide intelligent, personalized communication that enhances user engagement and creates a premium experience! 🌟
