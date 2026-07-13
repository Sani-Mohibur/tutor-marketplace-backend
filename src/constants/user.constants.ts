export const USER_ROLES = {
  STUDENT: "student",
  TUTOR: "tutor",
  ADMIN: "admin",
  PENDING: "pending",
  SUPPORT_ADMIN: "support_admin",
} as const;

// Generate type utility matching: "student" | "tutor" | "admin"
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
