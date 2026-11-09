import { toast } from "sonner";

// Success notifications
export const showSuccess = (message: string, description?: string) => {
  toast.success(message, {
    description,
    duration: 4000,
  });
};

// Error notifications
export const showError = (message: string, description?: string) => {
  toast.error(message, {
    description,
    duration: 6000,
  });
};

// Warning notifications
export const showWarning = (message: string, description?: string) => {
  toast.warning(message, {
    description,
    duration: 5000,
  });
};

// Info notifications
export const showInfo = (message: string, description?: string) => {
  toast.info(message, {
    description,
    duration: 4000,
  });
};

// Loading notifications
export const showLoading = (message: string) => {
  return toast.loading(message, {
    duration: Infinity,
  });
};

// Dismiss loading and show result
export const dismissLoading = (
  toastId: string | number,
  type: "success" | "error" | "warning" = "success",
  message?: string
) => {
  toast.dismiss(toastId);
  if (message) {
    switch (type) {
      case "success":
        showSuccess(message);
        break;
      case "error":
        showError(message);
        break;
      case "warning":
        showWarning(message);
        break;
    }
  }
};

// Validation error notifications
export const showValidationError = (field: string, message: string) => {
  toast.error(`Validation Error: ${field}`, {
    description: message,
    duration: 5000,
  });
};

// Form validation helper
export const validateRequired = (value: any, fieldName: string): boolean => {
  if (!value || (typeof value === "string" && value.trim() === "")) {
    showValidationError(fieldName, `${fieldName} is required`);
    return false;
  }
  return true;
};

// File upload notifications
export const showUploadSuccess = (fileName: string) => {
  showSuccess("File Uploaded", `${fileName} has been uploaded successfully`);
};

export const showUploadError = (fileName: string, error: string) => {
  showError("Upload Failed", `Failed to upload ${fileName}: ${error}`);
};

// Database operation notifications
export const showSaveSuccess = (item: string) => {
  showSuccess("Saved Successfully", `${item} has been saved`);
};

export const showSaveError = (item: string, error: string) => {
  showError("Save Failed", `Failed to save ${item}: ${error}`);
};

export const showDeleteSuccess = (item: string) => {
  showSuccess("Deleted Successfully", `${item} has been deleted`);
};

export const showDeleteError = (item: string, error: string) => {
  showError("Delete Failed", `Failed to delete ${item}: ${error}`);
};

// Network error notifications
export const showNetworkError = (operation: string) => {
  showError(
    "Network Error",
    `Failed to ${operation}. Please check your connection and try again.`
  );
};

// Permission/access notifications
export const showAccessDenied = (resource: string) => {
  showError("Access Denied", `You don't have permission to access ${resource}`);
};

// Task-specific notifications
export const showTaskStarted = (taskName: string) => {
  showInfo("Task Started", `You have started working on: ${taskName}`);
};

export const showTaskCompleted = (taskName: string) => {
  showSuccess("Task Completed", `${taskName} has been completed successfully`);
};

export const showTaskBlocked = (taskName: string, reason?: string) => {
  showWarning(
    "Task Blocked",
    `${taskName} is blocked${reason ? `: ${reason}` : ""}`
  );
};

export const showEvidenceUploaded = (fileName: string) => {
  showSuccess("Evidence Uploaded", `${fileName} has been added to the task`);
};

export const showFindingDocumented = (severity: string) => {
  showWarning(
    "Finding Documented",
    `A ${severity} severity finding has been documented`
  );
};
