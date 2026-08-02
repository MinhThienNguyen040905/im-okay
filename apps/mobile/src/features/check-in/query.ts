export const safetyStatusQueryKey = (userId: string) =>
  ["safety-status", userId] as const;
