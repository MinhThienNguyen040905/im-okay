export type PushDecision =
  "unasked" | "skipped" | "denied" | "granted" | "unavailable";

export type DeviceRegistrationState = "none" | "pending" | "registered";

export type OnboardingDraft = {
  displayName?: string;
  introSeen: boolean;
  timezone?: string;
  pushDecision: PushDecision;
  deviceRegistration: DeviceRegistrationState;
  intervalHours?: 24 | 36 | 48;
  completed: boolean;
};

export type ProfileInput = {
  displayName: string;
  timezone: string;
};

export type DeviceInput = {
  expoPushToken: string;
  platform: "android" | "ios";
};

export type OnboardingApi = {
  saveProfile: (input: ProfileInput) => Promise<void>;
  registerDevice: (input: DeviceInput) => Promise<void>;
  saveSafetyPlan: (intervalHours: 24 | 36 | 48) => Promise<void>;
};

export const emptyDraft: OnboardingDraft = {
  introSeen: false,
  pushDecision: "unasked",
  deviceRegistration: "none",
  completed: false,
};
