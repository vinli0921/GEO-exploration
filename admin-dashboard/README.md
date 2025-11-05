# Admin Dashboard

Next.js 14 admin dashboard for viewing and analyzing session data from the Chrome extension.

## Features

- Real-time session statistics and monitoring
- Session browser with filtering and search
- Detailed event viewer with timeline visualization
- Participant activity summaries
- Session data export (JSON)
- Server health monitoring
- Responsive design with shadcn/ui components

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Recharts for data visualization

## Setup

### Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your backend API URL

# Start development server
npm run dev
```

Dashboard runs on http://localhost:3000

### Production Deployment (Vercel)

```bash
# Deploy to Vercel
vercel --prod

# Expected URL: https://geo-exploration.vercel.app
```

## Environment Variables

Required in `.env.local` (development) or `.env.production` (production):

```bash
NEXT_PUBLIC_API_URL=https://geo-exploration-backend.vercel.app/api
```

**Development**: Use `http://localhost:5000/api` for local backend
**Production**: Use your deployed Vercel backend URL

## Project Structure

```
admin-dashboard/
├── app/
│   ├── layout.tsx          # Root layout with sidebar
│   ├── page.tsx            # Dashboard home (statistics)
│   ├── sessions/
│   │   └── page.tsx        # Sessions list view
│   └── participants/
│       └── page.tsx        # Participants summary
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── dashboard-stats.tsx # Statistics cards
│   ├── session-list.tsx    # Sessions table
│   └── event-viewer.tsx    # Event timeline
├── lib/
│   └── utils.ts            # Utility functions
└── public/                 # Static assets
```

## API Integration

Dashboard connects to backend API for all data operations:

**Endpoints Used:**
- `GET /api/health` - Server health check
- `GET /api/sessions/stats` - Dashboard statistics
- `GET /api/sessions/list` - List all sessions
- `GET /api/sessions/:id` - Session details
- `GET /api/sessions/:id/events` - Session events
- `GET /api/sessions/:id/export` - Export session data

API URL is configured via `NEXT_PUBLIC_API_URL` environment variable.

## Key Features

### Dashboard Home
- Total sessions, participants, events
- Active vs complete sessions
- Server status indicator
- Recent activity summary

### Sessions Browser
- Searchable/filterable table of all sessions
- Sort by date, participant, duration, events
- Click to view detailed session info
- Export individual sessions

### Session Details
- Full session metadata
- Event timeline with filtering
- Event type breakdown
- Page visit history
- Export as JSON

### Participants View
- Per-participant statistics
- Session count and duration
- Activity patterns
- Data export

## Development

### Adding New Components

```bash
# Add shadcn/ui component
npx shadcn-ui@latest add [component-name]
```

### Environment Variables

**Development** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Production** (`.env.production` or Vercel dashboard):
```bash
NEXT_PUBLIC_API_URL=https://geo-exploration-backend.vercel.app/api
```

### Build and Test

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## Deployment

### Vercel Deployment

```bash
# Initial setup
vercel

# Production deployment
vercel --prod
```

**Configuration in Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_URL` = `https://geo-exploration-backend.vercel.app/api`
3. Redeploy if needed

### Manual Deployment

```bash
# Build for production
npm run build

# Output is in .next/ folder
# Deploy to any Node.js hosting
```

## Testing

### Test API Connection

1. Start dashboard: `npm run dev`
2. Open http://localhost:3000
3. Check server status indicator in sidebar
4. Should show "Server Online" if backend is running

### Test Data Display

1. Record a test session with Chrome extension
2. Wait for upload (5 minutes or stop recording)
3. Refresh dashboard
4. Session should appear in Sessions tab

## Troubleshooting

**Server Status Shows "Offline"**
- Verify backend is running and accessible
- Check `NEXT_PUBLIC_API_URL` in environment variables
- Open browser DevTools → Network tab to see failed requests
- Verify CORS is enabled on backend

**No Sessions Displayed**
- Check that sessions exist in Supabase database
- Verify API endpoint `/api/sessions/list` returns data
- Check browser console for errors
- Ensure backend has correct database credentials

**Build Fails**
- Clear `.next` folder: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run build`

**Environment Variables Not Working**
- Ensure variable starts with `NEXT_PUBLIC_` for client-side access
- Restart dev server after changing `.env.local`
- In Vercel, redeploy after updating environment variables

## Performance

Dashboard is optimized with:
- Server Components for data fetching
- Client Components only where needed
- Automatic code splitting
- Image optimization
- Static page generation where possible

Typical load time: <2 seconds

## Security

**Authentication**: Not currently implemented (add if needed)

**CORS**: Backend must allow dashboard origin
**API Access**: Dashboard uses anonymous public API endpoints
**Data**: No sensitive data displayed (participant IDs only)

For production use, consider adding:
- Authentication (NextAuth.js)
- Role-based access control
- API key authentication
- Rate limiting

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Customization

### Update Branding

Edit `app/layout.tsx`:
```tsx
<title>Your Study Name - Admin Dashboard</title>
```

### Modify Theme

Edit `tailwind.config.ts` for custom colors and styling.

### Add New Pages

```bash
# Create new page
mkdir -p app/your-page
touch app/your-page/page.tsx
```

## Resources

- Next.js Docs: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/docs
- Vercel Deployment: https://vercel.com/docs
