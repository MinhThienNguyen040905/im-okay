import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import {
  requestPushSetup,
  subscribeToPushTokenChanges,
  type PushSetupResult,
} from "../notifications/push";
import { createOnboardingApi } from "./api";
import {
  emptyDraft,
  type OnboardingDraft,
  type ProfileInput,
  type PushDecision,
} from "./types";

const INTRO_KEY = "imokay.onboarding.intro-seen.v1";
const draftKey = (userId: string) => `imokay.onboarding.${userId}.v1`;

type OnboardingContextValue = {
  draft: OnboardingDraft;
  loading: boolean;
  completeIntro: () => Promise<void>;
  saveProfile: (input: ProfileInput) => Promise<void>;
  setPushDecision: (decision: PushDecision) => Promise<void>;
  requestPush: () => Promise<PushSetupResult>;
  saveSafetyPlan: (hours: 24 | 36 | 48) => Promise<void>;
  syncAuthoritativeSettings: (input: {
    displayName: string;
    timezone: string;
    intervalHours: 24 | 36 | 48;
  }) => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingProvider = ({ children }: PropsWithChildren) => {
  const { session } = useAuth();
  const [draft, setDraft] = useState<OnboardingDraft>(emptyDraft);
  const draftRef = useRef<OnboardingDraft>(emptyDraft);
  const ownerKey = session?.user.id ?? "signed-out";
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const retryAttemptedFor = useRef<string | null>(null);
  const loading = loadedFor !== ownerKey;

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      AsyncStorage.getItem(INTRO_KEY),
      session ? AsyncStorage.getItem(draftKey(session.user.id)) : null,
    ])
      .then(([intro, saved]) => {
        if (!mounted) return;
        const restored = saved
          ? ({ ...emptyDraft, ...JSON.parse(saved) } as OnboardingDraft)
          : emptyDraft;
        const next = { ...restored, introSeen: intro === "true" };
        draftRef.current = next;
        setDraft(next);
        setLoadedFor(ownerKey);
      })
      .catch(() => mounted && setLoadedFor(ownerKey));

    return () => {
      mounted = false;
    };
  }, [ownerKey, session]);

  const persist = useCallback(
    async (next: OnboardingDraft) => {
      draftRef.current = next;
      setDraft(next);
      if (session) {
        await AsyncStorage.setItem(
          draftKey(session.user.id),
          JSON.stringify(next),
        );
      }
    },
    [session],
  );

  const updateDraft = useCallback(
    (patch: Partial<OnboardingDraft>) =>
      persist({ ...draftRef.current, ...patch }),
    [persist],
  );

  const registerToken = useCallback(
    async (expoPushToken: string) => {
      if (!session || Platform.OS === "web") return "pending" as const;
      const api = createOnboardingApi(session);
      try {
        await api.registerDevice({
          expoPushToken,
          platform: Platform.OS === "ios" ? "ios" : "android",
        });
        await updateDraft({ deviceRegistration: "registered" });
        return "registered" as const;
      } catch {
        await updateDraft({ deviceRegistration: "pending" });
        return "pending" as const;
      }
    },
    [session, updateDraft],
  );

  useEffect(() => {
    if (!session) return;
    const subscription = subscribeToPushTokenChanges((token) => {
      void registerToken(token);
    });
    return () => subscription.remove();
  }, [registerToken, session]);

  useEffect(() => {
    if (
      !session ||
      loading ||
      draft.pushDecision !== "granted" ||
      draft.deviceRegistration !== "pending" ||
      retryAttemptedFor.current === ownerKey
    ) {
      return;
    }

    retryAttemptedFor.current = ownerKey;
    void requestPushSetup()
      .then((result) => {
        if (result.expoPushToken) void registerToken(result.expoPushToken);
      })
      .catch(() => undefined);
  }, [draft, loading, ownerKey, registerToken, session]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      draft,
      loading,
      async completeIntro() {
        await AsyncStorage.setItem(INTRO_KEY, "true");
        await updateDraft({ introSeen: true });
      },
      async saveProfile(input) {
        if (!session) throw new Error("Bạn cần đăng nhập trước.");
        await createOnboardingApi(session).saveProfile(input);
        await updateDraft(input);
      },
      async setPushDecision(decision) {
        await updateDraft({ pushDecision: decision });
      },
      async requestPush() {
        const result = await requestPushSetup();
        let registration = draft.deviceRegistration;
        if (result.expoPushToken) {
          registration = await registerToken(result.expoPushToken);
        }
        await updateDraft({
          pushDecision: result.decision,
          deviceRegistration: result.expoPushToken
            ? registration
            : result.decision === "granted"
              ? "pending"
              : "none",
        });
        return result;
      },
      async saveSafetyPlan(hours) {
        if (!session) throw new Error("Bạn cần đăng nhập trước.");
        await createOnboardingApi(session).saveSafetyPlan(hours);
        await updateDraft({
          intervalHours: hours,
          completed: true,
        });
      },
      async syncAuthoritativeSettings(input) {
        await updateDraft({ ...input, completed: true });
      },
    }),
    [draft, loading, registerToken, session, updateDraft],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error("useOnboarding phải được dùng trong OnboardingProvider.");
  }
  return value;
};
