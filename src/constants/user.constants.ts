export const USER_ROLES = {
  STUDENT: "student",
  TUTOR: "tutor",
  ADMIN: "admin",
  PENDING: "pending",
} as const;

// Generate type utility matching: "student" | "tutor" | "admin"
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
