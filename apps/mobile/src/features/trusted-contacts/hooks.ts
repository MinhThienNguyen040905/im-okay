import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";

import { remainingUntilServerTime } from "@/lib/time/serverClock";

export const useTrustedContactsRefresh = (refresh: () => void) => {
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") refresh();
      },
    );
    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener(refresh);

    return () => {
      appStateSubscription.remove();
      notificationSubscription.remove();
    };
  }, [refresh]);
};

export const useResendCooldown = (
  resendAvailableAt: string | null,
  clockOffsetMs: number,
) => {
  const [clientNowMs, setClientNowMs] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setClientNowMs(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  return remainingUntilServerTime(
    resendAvailableAt,
    clockOffsetMs,
    clientNowMs,
  );
};
