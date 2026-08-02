export const trustedContactsQueryKey = (userId: string) =>
  ["trusted-contacts", userId] as const;
