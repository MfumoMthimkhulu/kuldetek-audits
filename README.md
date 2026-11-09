# Kuldetek Auditing - Security Audit Platform

A comprehensive security audit and compliance management platform built with Next.js and Supabase.

## Features

### Admin Panel

The admin panel provides user management capabilities for administrators:

#### User Management

- **View Users**: Display all registered users in a table format
- **Add Users**: Create new user accounts with roles and departments
- **Edit Users**: Modify user information including name, role, and department
- **Delete Users**: Remove user profiles from the system

#### User Roles

- **User**: Default role for regular users
- **Admin**: Full system access and user management
- **Security Analyst**: Security-focused operations
- **Auditor**: Audit and compliance tasks

#### Current Limitations

⚠️ **Important Notes:**

- User creation uses the regular signup flow (requires email confirmation)
- User deletion only removes the profile (auth user remains due to client-side limitations)
- Admin functions require server-side implementation for full functionality
- Role-based access control is implemented but may need additional server-side validation

#### Technical Implementation

- Client-side Supabase operations for profile management
- Form validation and error handling
- Responsive table design with inline editing
- Real-time feedback with success/error messages

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:

```bash
npm run dev
```

## Database Schema

The application uses a `profiles` table with the following structure:

- `id`: User ID (UUID) - Foreign key to auth.users
- `email`: Email address (unique)
- `full_name`: Full name of the user (required)
- `country`: User's country
- `phone`: Phone number
- `cert_url`: Certification URL
- `is_certified`: Boolean flag for certification status
- `role`: User role (defaults to 'user')
- `created_at`: Account creation timestamp
- `updated_at`: Last update date (triggered automatically)

### Constraints

- Primary key: `id`
- Foreign key: `id` references `auth.users(id)` on delete CASCADE
- Unique constraint: `email`
- Trigger: `update_profiles_updated_at` updates `updated_at` on row changes

## Security Considerations

- Admin panel is only accessible to users with `role: 'admin'`
- Form validation prevents invalid data submission
- Error handling provides user-friendly feedback
- Confirmation dialogs for destructive actions

## Future Enhancements

- Server-side admin functions for secure user management
- Email notifications for user creation/deletion
- Audit logs for admin actions
- Enhanced role-based permissions
- Bulk user operations
# Running the portfolio demo

The portfolio app uses React and Vite. With Node.js 20.19+ or 22.12+, run `npm ci` and then `npm run dev` from the folder containing `package.json`. Open the URL printed by Vite.

The Vite app always runs in demo mode. Run `npm start` to serve the prebuilt preview. If `dist` is missing or you have edited the source, run `npm run build` first. The `dist` folder can be deployed to a static host configured to serve `index.html` for app routes.

Choose an auditor, reviewer or auditee on the landing page. Use the top bar to switch accounts or sign out. Demo accounts simulate sign-in in the current browser. Sample audits, fieldwork, reports and changes are stored locally, and analysis and report generation summarize the audit's findings. Use fictional inputs and small attachments for the demo.

The original connected app is available through `npm run dev:next`. With both Supabase settings supplied and the demo flag off, that version opens its sign-in flow.
