# Work Items Dashboard

A comprehensive dashboard for viewing your Jira and Confluence work items from the last 7 days.

## Features

- **Multiple View Modes**: Timeline, Card Grid, and Table views
- **Smart Filtering**: Filter by source (Jira/Confluence), status, and search by title
- **Real-time Data**: Fetches fresh data from Jira and Confluence APIs
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Status Indicators**: Color-coded status lozenges and priority badges

## Access

Navigate to `/work-items` in your browser to view the dashboard.

## Views

### Timeline View
- Chronological display grouped by date
- Shows full details with status, priority, assignee
- Color-coded status badges
- Relative timestamps (e.g., "2h ago", "yesterday")

### Card Grid View
- Responsive grid layout (1-3 columns depending on screen size)
- Color-coded left border indicating status
- Priority icons (🔴 High, 🟠 Medium, 🟢 Low)
- Compact view with essential information

### Table View
- Traditional table layout with sortable columns
- Shows Key, Title, Type, Status, Priority, and Updated date
- Quick "View" links to open items in Jira/Confluence

## Filters

- **Search**: Free-text search across work item titles
- **Source Filter**: Show all items, Jira only, or Confluence only
- **Status Filter**: Filter by work item status (Done, In Progress, etc.)

## API Endpoint

The dashboard fetches data from `/api/work-items` which:
- Queries Jira for issues assigned to the current user updated in the last 7 days
- Queries Confluence for pages contributed by the current user in the last 7 days
- Merges and sorts results by update time

## Environment Setup

Ensure your `.env.local` file contains:
```
ATLASSIAN_API_TOKEN=your_token_here
```

## Technical Details

- Built with Next.js 15 and React 19
- Uses AI SDK patterns for data fetching
- Styled with Tailwind CSS and ADS design tokens
- TypeScript for type safety
- Fully accessible with ARIA labels and semantic HTML
