# GGBang - Social Event Platform

A modern social event platform built with React, TypeScript, and Supabase.

## Features

- **Event Management**: Create and manage social events with capacity control
- **User Profiles**: Detailed user profiles with public and private information
- **Join Requests**: Request-based event participation system
- **Location Management**: Tiered location disclosure (hint → exact location)
- **Real-time Updates**: Live event status and request management
- **Anti-abuse Protection**: Rate limiting, cooldown periods, and validation

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL, Authentication, Edge Functions, Storage)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for profile images

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GGBang
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   Apply migrations to your Supabase project:
   ```bash
   npx supabase db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Project Structure

```
GGBang/
├── src/
│   ├── components/          # React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Library configurations (Supabase, Auth)
│   ├── utils/              # Utility functions
│   └── main.tsx           # Application entry point
├── supabase/
│   ├── functions/          # Edge Functions
│   ├── migrations/         # Database migrations
│   └── tests/             # Database tests
└── public/                # Static assets
```

## Key Features

### Event Management
- Create events with capacity limits
- Set location hints and exact addresses
- Unlock exact locations for approved participants
- Real-time capacity tracking

### User System
- Public and private profile information
- Multi-image profile support
- Interest and preference matching
- Verified user system

### Request System
- Message-based join requests
- Host approval/rejection workflow
- Anti-spam protection (max 5 pending requests)
- 7-day cooldown after rejection

### Security
- Row Level Security (RLS) policies
- JWT-based authentication
- Input validation and sanitization
- Rate limiting and abuse prevention

## Database Schema

### Core Tables
- `events` - Event information with capacity and location data
- `profiles` - Extended user profile information
- `join_requests` - Event participation requests
- `event_attendees` - Confirmed event participants

### Security Features
- RLS policies for data access control
- UUID-based foreign keys to auth.users
- Sensitive data isolation
- Audit trails for critical operations

## API Endpoints (Edge Functions)

- `POST /functions/v1/join-request` - Submit join request
- `POST /functions/v1/join-approve` - Approve join request
- `POST /functions/v1/join-reject` - Reject join request
- `POST /functions/v1/event-location-unlock` - Unlock event location

## Development

### Running Tests
```bash
# Frontend tests
npm test

# Database tests
npx supabase test db
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Your License Here]

## Support

For support, please open an issue on GitHub or contact [your-email@example.com].
