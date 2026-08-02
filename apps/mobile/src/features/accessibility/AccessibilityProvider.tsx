import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AccessibilityInfo } from "react-native";

type AccessibilityPreferences = {
  reduceMotionEnabled: boolean;
  screenReaderEnabled: boolean;
};

const defaults: AccessibilityPreferences = {
  reduceMotionEnabled: false,
  screenReaderEnabled: false,
};

const AccessibilityContext = createContext<AccessibilityPreferences>(defaults);

export const modalAnimationForPreference = (reduceMotionEnabled: boolean) =>
  reduceMotionEnabled ? ("none" as const) : ("slide" as const);

export const AccessibilityProvider = ({ children }: PropsWithChildren) => {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    void Promise.all([
      AccessibilityInfo.isReduceMotionEnabled(),
      AccessibilityInfo.isScreenReaderEnabled(),
    ]).then(([reduceMotion, screenReader]) => {
      if (!mounted) return;
      setReduceMotionEnabled(reduceMotion);
      setScreenReaderEnabled(screenReader);
    });

    const reduceMotionSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotionEnabled,
    );
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderEnabled,
    );

    return () => {
      mounted = false;
      reduceMotionSubscription.remove();
      screenReaderSubscription.remove();
    };
  }, []);

  const value = useMemo(
    () => ({ reduceMotionEnabled, screenReaderEnabled }),
    [reduceMotionEnabled, screenReaderEnabled],
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibilityPreferences = () =>
  useContext(AccessibilityContext);
