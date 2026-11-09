# Analysis Sharing System Setup Guide

## Overview

This system allows users to share audit analyses with other users in the system and receive notifications when analyses are shared with them.

## Database Setup

### 1. Run the Migration Scripts

Execute these SQL scripts in your Supabase SQL editor in the following order:

```sql
-- 1. First, create the profiles table
-- Execute: profiles_migration.sql

-- 2. Then, create the analysis sharing system
-- Execute: analysis_sharing_migration.sql
```

### 2. Verify Tables Created

After running the migrations, you should have these new tables:

- `profiles` - User profile information
- `shared_analyses` - Tracks which analyses are shared with which users
- `analysis_notifications` - Stores notifications for shared analyses

## Features

### ✅ **Analysis Sharing**

- **Share Button**: Appears on analysis page when analysis is completed
- **User Selection**: Choose multiple users to share with
- **Personal Message**: Add optional message when sharing
- **Real-time Search**: Search users by name or email

### ✅ **Notification System**

- **Automatic Notifications**: Created when analyses are shared
- **Notification Center**: View all shared analyses in `/dashboard/notifications`
- **Mark as Read**: Individual and bulk read status management
- **Search & Filter**: Find specific notifications

### ✅ **Database Integration**

- **Uses `audit_analysis` table**: As specified in your schema
- **Proper Foreign Keys**: Ensures data integrity
- **Automatic Triggers**: Creates notifications on share
- **Cascade Deletes**: Maintains data consistency

## API Endpoints

### `/api/users`

- **Method**: GET
- **Purpose**: Fetch available users for sharing
- **Returns**: List of users with id, full_name, email, role
- **Fallback**: Demo users if profiles table is empty

## User Interface

### Analysis Page (`/dashboard/analysis`)

- **Share Analysis Button**: Appears after analysis completion
- **Sharing Modal**: User selection and message input
- **Integration**: Seamlessly integrated with existing workflow

### Notifications Page (`/dashboard/notifications`)

- **Notification List**: Shows all shared analyses
- **Mark as Read**: Individual and bulk actions
- **Search**: Filter notifications by content
- **View Details**: Full analysis preview

### Saved Analyses Page (`/dashboard/saved-analyses`)

- **Updated**: Now uses `audit_analysis` table
- **Consistent**: Maintains all existing functionality

## Database Schema

### `audit_analysis` Table

```sql
create table public.audit_analysis (
  id uuid not null default extensions.uuid_generate_v4 (),
  audit_id uuid not null,
  analysis_type character varying(50) not null,
  results jsonb not null,
  created_by uuid not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint audit_analysis_pkey primary key (id),
  constraint fk_audit_analysis_audit foreign KEY (audit_id) references audits (id) on delete CASCADE,
  constraint fk_audit_analysis_creator foreign KEY (created_by) references auth.users (id) on delete CASCADE
);
```

### `shared_analyses` Table

```sql
CREATE TABLE public.shared_analyses (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL,
    shared_by UUID NOT NULL,
    shared_with UUID NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT shared_analyses_pkey PRIMARY KEY (id),
    CONSTRAINT fk_shared_analyses_analysis FOREIGN KEY (analysis_id) REFERENCES public.audit_analysis (id) ON DELETE CASCADE,
    CONSTRAINT fk_shared_analyses_shared_by FOREIGN KEY (shared_by) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_shared_analyses_shared_with FOREIGN KEY (shared_with) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT unique_analysis_share UNIQUE (analysis_id, shared_with)
);
```

### `analysis_notifications` Table

```sql
CREATE TABLE public.analysis_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    shared_by UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'analysis_shared',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT analysis_notifications_pkey PRIMARY KEY (id),
    CONSTRAINT fk_analysis_notifications_user FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT fk_analysis_notifications_analysis FOREIGN KEY (analysis_id) REFERENCES public.audit_analysis (id) ON DELETE CASCADE,
    CONSTRAINT fk_analysis_notifications_shared_by FOREIGN KEY (shared_by) REFERENCES auth.users (id) ON DELETE CASCADE
);
```

## Usage Workflow

### 1. **Create Analysis**

- User runs analysis on audit findings
- Analysis is automatically saved to `audit_analysis` table

### 2. **Share Analysis**

- Click "Share Analysis" button
- Select users from the modal
- Add optional personal message
- Click "Share" to send

### 3. **Receive Notifications**

- Recipients get notifications in `/dashboard/notifications`
- Can view full analysis details
- Mark as read when viewed

### 4. **Manage Notifications**

- Search and filter notifications
- Mark individual or all as read
- Delete unwanted notifications

## Troubleshooting

### Common Issues

1. **"No users available" in sharing modal**

   - Solution: Run `profiles_migration.sql` to create profiles table
   - Fallback: Demo users will be shown

2. **Notifications not appearing**

   - Check if `analysis_notifications` table exists
   - Verify triggers are created properly

3. **Sharing fails**
   - Check if `shared_analyses` table exists
   - Verify user IDs are valid

### Database Verification

Run this query to verify setup:

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('audit_analysis', 'shared_analyses', 'analysis_notifications', 'profiles');

-- Check if triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%analysis%';
```

## Security Notes

- **Row Level Security**: Consider adding RLS policies for production
- **User Validation**: Sharing validates user existence
- **Data Privacy**: Only shared users can see shared analyses
- **Audit Trail**: All sharing actions are logged

## Next Steps

1. **Run the migration scripts** in Supabase
2. **Test the sharing functionality** with demo users
3. **Add real users** to the profiles table
4. **Configure RLS policies** for production use
5. **Set up email notifications** (optional enhancement)

The analysis sharing system is now fully integrated with your existing audit analysis workflow!
