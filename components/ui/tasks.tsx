import * as React from "react";
import { cn } from "@/lib/utils";

const Tasks = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props} />
));
Tasks.displayName = "Tasks";

const TaskItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    href?: string;
  }
>(({ className, href, children, ...props }, ref) => {
  const Component = href ? "a" : "div";

  return (
    <Component
      ref={ref}
      href={href}
      className={cn(
        "flex items-center space-x-4 rounded-lg border p-4 transition-colors hover:bg-accent hover:text-accent-foreground",
        href && "cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});
TaskItem.displayName = "TaskItem";

const TaskContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 space-y-1", className)} {...props} />
));
TaskContent.displayName = "TaskContent";

const TaskTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-sm font-medium leading-none", className)}
    {...props}
  />
));
TaskTitle.displayName = "TaskTitle";

const TaskDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
TaskDescription.displayName = "TaskDescription";

const TaskMeta = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
));
TaskMeta.displayName = "TaskMeta";

export { Tasks, TaskItem, TaskContent, TaskTitle, TaskDescription, TaskMeta };
