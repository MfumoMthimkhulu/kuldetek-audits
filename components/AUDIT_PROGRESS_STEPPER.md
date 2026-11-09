# Audit Progress Stepper

The `AuditProgressStepper` component provides a visual progress indicator for the audit workflow, improving user experience by showing:

1. **Current Step**: Highlights where the user is in the audit process
2. **Completed Steps**: Shows which steps have been finished (with clickable navigation back)
3. **Upcoming Steps**: Displays what steps are remaining
4. **Progress Bar**: Visual percentage of completion

## Usage

```tsx
import AuditProgressStepper from "@/components/AuditProgressStepper";

<AuditProgressStepper
  currentStep="audit-plan"
  auditId={auditId}
  planId={planId}
/>;
```

## Props

- `currentStep`: The current step in the audit process ("audit-plan", "task-creation", "audit-summary", "fieldwork")
- `auditId`: The audit ID for navigation
- `planId`: The plan ID for navigation (optional)
- `className`: Additional CSS classes (optional)

## Features

### Visual Indicators

- **Green circle with checkmark**: Completed steps
- **Blue circle with number**: Current step
- **Gray circle with number**: Upcoming steps

### Navigation

- Users can click on completed steps to navigate back
- Current step is highlighted but not clickable
- Future steps are disabled

### Progress Bar

- Shows overall completion percentage
- Smooth transitions between steps
- Gradient styling for visual appeal

## Audit Process Flow

The stepper tracks these steps in order:

1. **Audit Planning** (`/dashboard/audit-plan`)
   - Define scope, objectives, and structure
2. **Task Creation** (`/dashboard/audit-wizard/step3`)
   - Create and customize audit tasks
3. **Audit Summary** (`/dashboard/audit-summary`)
   - Review and finalize audit plan
4. **Fieldwork Execution** (`/dashboard/audit-fieldwork`)
   - Execute tasks and collect evidence

## Integration

The component is integrated into all major audit process pages:

- `app/dashboard/audit-plan/page.tsx`
- `app/dashboard/audit-wizard/step3/page.jsx`
- `app/dashboard/audit-summary/page.tsx`
- `app/dashboard/audit-fieldwork/page.tsx`

Each page passes the appropriate `currentStep` value to show the user's progress through the audit workflow.
