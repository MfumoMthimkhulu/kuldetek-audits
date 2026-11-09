# Kuldetek Auditing Dashboard Setup Guide

This guide will help you set up the comprehensive audit dashboard with system alerts and data visualizations.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database with Supabase
- Next.js project set up

## Database Setup

### 1. Run the Database Migrations

Execute the following SQL files in your Supabase SQL editor in this order:

1. **Create the audits table** (if not already created):

```sql
-- The audits table should already exist based on your schema
-- If not, create it with the provided schema
```

2. **Run the system alerts migration**:

```bash
# Execute the contents of system_alerts_migration.sql in Supabase
```

3. **Insert sample data** (optional, for testing):

```bash
# Execute the contents of sample_data_insertion.sql in Supabase
```

### 2. Database Tables Created

The migration creates the following tables:

- `system_alerts` - System alerts and notifications
- `audit_metrics` - Analytics data for audits
- `audit_progress` - Progress tracking for audits
- `audit_tasks` - Individual tasks within audits
- `audit_findings` - Findings from audit tasks
- `audit_evidence` - Evidence files for audit tasks

## Installation

### 1. Install Dependencies

```bash
npm install recharts lucide-react
```

### 2. Environment Variables

Ensure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Features

### Dashboard Overview

The main dashboard (`/dashboard`) now includes:

1. **Real-time Metrics Cards**:

   - Total Audits count
   - Active System Alerts
   - Compliance Score calculation
   - Audit Categories count

2. **Interactive Charts**:

   - Pie chart showing audit status distribution
   - Bar chart displaying alert severity levels
   - Progress overview chart for recent audits

3. **Recent Data Lists**:
   - Latest audits with status indicators
   - System alerts with severity levels
   - Real-time data from your database

### System Alerts Management

Access the alerts management at `/dashboard/alerts`:

- **View all alerts** with filtering options
- **Create new alerts** with severity levels
- **Update alert status** (active, acknowledged, resolved, dismissed)
- **Edit alert details**
- **Delete alerts**

### Alert Severity Levels

- **Critical** (Red) - Immediate attention required
- **High** (Orange) - Important issues
- **Medium** (Yellow) - Moderate priority
- **Low** (Green) - Low priority items

### Alert Categories

- Security
- System
- Audit
- Compliance
- Performance
- Maintenance

## Usage

### 1. Viewing the Dashboard

Navigate to `/dashboard` to see:

- Real-time audit metrics
- Visual charts and graphs
- Recent audits and alerts
- Progress tracking

### 2. Managing Alerts

1. Go to `/dashboard/alerts`
2. Use filters to view specific alert types
3. Click "Create Alert" to add new alerts
4. Use action buttons to manage existing alerts

### 3. Understanding the Data

- **Audit Status**: In Progress, Completed, Not Started
- **Alert Status**: Active, Acknowledged, Resolved, Dismissed
- **Compliance Score**: Calculated based on completed vs total audits

## Customization

### Adding New Chart Types

The dashboard uses Recharts library. To add new charts:

1. Import the required components from 'recharts'
2. Add new chart components in the dashboard
3. Style them using the existing CSS classes

### Modifying Alert Categories

To add new alert categories:

1. Update the `system_alerts_migration.sql` file
2. Add the new category to the constraint
3. Update the AlertManagement component dropdown

### Styling

All styles are in `app/Dashboard.css`. Key classes:

- `.charts-grid` - Grid layout for charts
- `.alert-item` - Alert styling
- `.audit-item` - Audit item styling
- `.metric-card` - Metric card styling

## Troubleshooting

### Common Issues

1. **Charts not displaying**: Ensure Recharts is properly installed
2. **Data not loading**: Check Supabase connection and table permissions
3. **Alerts not updating**: Verify database triggers are working

### Database Permissions

Ensure your Supabase user has permissions to:

- SELECT from all tables
- INSERT/UPDATE/DELETE on system_alerts
- Access to auth.users table

## API Endpoints

The dashboard uses these Supabase queries:

- `audits` table - Main audit data
- `system_alerts` table - Alert management
- `audit_progress` table - Progress tracking
- `audit_metrics` table - Analytics data

## Security Considerations

- All database operations use Supabase RLS (Row Level Security)
- User authentication required for all dashboard access
- Alert management restricted to authenticated users

## Performance

- Charts are responsive and optimized for different screen sizes
- Data is fetched efficiently with proper indexing
- Real-time updates every 30 seconds for notifications

## Support

For issues or questions:

1. Check the browser console for errors
2. Verify database connections
3. Ensure all dependencies are installed
4. Check Supabase logs for database errors

## Future Enhancements

Potential improvements:

- Real-time WebSocket updates
- Advanced filtering and search
- Export functionality for reports
- Mobile app integration
- Advanced analytics and reporting
