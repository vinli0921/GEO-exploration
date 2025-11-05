# Admin Dashboard - Next.js + shadcn/ui

A modern, sleek admin dashboard built with Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui components for managing LLM search behavior study data.

## Features

- **Modern Stack**: Built with Next.js 14 App Router, TypeScript, and Tailwind CSS
- **Real-time Stats**: Live server health monitoring and auto-refreshing statistics
- **Responsive Design**: Fully responsive layout that works on all devices
- **Type-Safe**: Full TypeScript support for better development experience
- **Overview Dashboard**: Real-time statistics with animated stat cards
- **Session Management**: Browse, filter, and view detailed session information
- **Participant Analytics**: View aggregated participant data and completion rates
- **Data Export**: Download session data in various formats
- **Modal Dialogs**: Beautiful session details modal using Radix UI

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **State Management**: React Hooks

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Backend server running (see backend-server directory)

## Installation

1. **Install dependencies**:
   ```bash
   cd admin-dashboard
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

2. **Configure environment variables**:

   The `.env.local` file is already set up with:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5001/api
   ```

   Update this if your backend server runs on a different port.

3. **Start the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**:

   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
admin-dashboard/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Overview page (/)
│   ├── sessions/page.tsx    # Sessions page
│   ├── participants/page.tsx # Participants page
│   ├── analytics/page.tsx   # Analytics page
│   ├── export/page.tsx      # Export page
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   ├── sidebar.tsx          # Sidebar navigation
│   ├── stat-card.tsx        # Statistics card component
│   └── page-header.tsx      # Page header component
├── lib/                     # Utilities and services
│   ├── api.ts              # API service layer
│   └── utils.ts            # Helper functions
├── public/                  # Static assets
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.ts      # Tailwind CSS config
└── next.config.js          # Next.js config
```

## Available Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Pages

### Overview (/)
- Dashboard with key statistics in beautiful stat cards
- Recent sessions list with real-time updates
- Active sessions monitoring
- Auto-refresh every 30 seconds

### Sessions (/sessions)
- Comprehensive session table with sorting and filtering
- Pagination for large datasets
- Session status badges (Active/Complete)
- Quick actions (View, Download)
- Modal dialog for detailed session information

### Participants (/participants)
- Aggregated participant statistics
- Search functionality
- Completion rate tracking
- Event count summaries

### Analytics (/analytics)
- Placeholder for future analytics visualizations
- Event type distribution charts (coming soon)
- Session timeline graphs (coming soon)

### Export (/export)
- Export individual sessions by ID
- Filter exports by participant
- Bulk export functionality
- Multiple format support (JSON, CSV coming soon)

## API Integration

The dashboard connects to the backend API through the `ApiService` class in `lib/api.ts`:

### Endpoints Used:
- `GET /api/health` - Server health check
- `GET /api/sessions/stats` - Overall statistics
- `GET /api/sessions/list` - List sessions with pagination
- `GET /api/sessions/:id` - Session details
- `GET /api/sessions/:id/export` - Download session data

### Environment Variables:
- `NEXT_PUBLIC_API_URL` - Backend API base URL (default: http://localhost:5001/api)

## Customization

### Adding New Pages

1. Create a new file in the `app` directory:
   ```tsx
   // app/my-page/page.tsx
   export default function MyPage() {
     return <div>My Custom Page</div>
   }
   ```

2. Add navigation item in `components/sidebar.tsx`:
   ```tsx
   {
     title: "My Page",
     href: "/my-page",
     icon: YourIcon,
   }
   ```

### Styling

The dashboard uses Tailwind CSS with shadcn/ui's theming system. Customize colors in `app/globals.css`:

```css
:root {
  --primary: 250 70% 65%;  /* Purple/blue primary color */
  --secondary: 210 40% 96.1%;
  /* ... more variables */
}
```

### Adding Components

Use the shadcn CLI to add more components:

```bash
npx shadcn-ui@latest add [component-name]
```

Available components: https://ui.shadcn.com/docs/components

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Set environment variable: `NEXT_PUBLIC_API_URL`
4. Deploy!

### Docker

```bash
# Build
docker build -t admin-dashboard .

# Run
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=your-api-url admin-dashboard
```

### Static Export

For static hosting (if no server-side features needed):

```bash
npm run build
# The output will be in the .next folder
```

## Performance

- **Server Components**: Most components use React Server Components for optimal performance
- **Client Components**: Only interactive components use "use client" directive
- **Code Splitting**: Automatic code splitting by Next.js
- **Image Optimization**: Next.js Image component for optimized images

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Server Offline Error

**Problem**: Red "Server Offline" indicator in sidebar

**Solution**:
- Ensure backend server is running on the correct port
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS settings on backend
- Check browser console for network errors

### Build Errors

**Problem**: TypeScript errors during build

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Port Already in Use

**Problem**: Port 3000 is already in use

**Solution**:
```bash
# Use a different port
npm run dev -- -p 3001
```

## Future Enhancements

- [ ] Dark mode toggle
- [ ] Real-time updates with WebSockets
- [ ] Advanced data visualization with Chart.js or Recharts
- [ ] CSV export functionality
- [ ] User authentication
- [ ] Role-based access control
- [ ] Session replay viewer
- [ ] Advanced filtering and search
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License

## Support

For issues or questions, please open an issue in the repository.

---