import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { AppState } from "react-native";

import type { AuthSession } from "@/features/auth/types";
import type { LocationShareInput } from "@/features/location/types";

import { createCheckInApi } from "./api";
import {
  clearCheckInAttempt,
  getOrCreateCheckInAttempt,
  shouldRetainCheckInAttempt,
} from "./attemptStore";
import { remainingUntilDeadline } from "./clock";
import { safetyStatusQueryKey } from "./query";
import type { SafetyStatusSnapshot } from "./types";

export const useServerCountdown = (
  deadline: string | null,
  clockOffsetMs: number,
) => {
  const [clientNowMs, setClientNowMs] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setClientNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return remainingUntilDeadline(deadline, clockOffsetMs, clientNowMs);
};

export const useSafetyStatusRefresh = (refresh: () => void) => {
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

export const useAuthoritativeCheckIn = (
  session: AuthSession,
  onSuccess?: (snapshot: SafetyStatusSnapshot) => void,
) => {
  const api = useMemo(() => createCheckInApi(session), [session]);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (location: LocationShareInput | null = null) => {
      const attempt = await getOrCreateCheckInAttempt(
        session.user.id,
        location,
      );
      return api.checkIn(attempt.idempotencyKey, attempt.location);
    },
    onSuccess: async (snapshot) => {
      await clearCheckInAttempt(session.user.id);
      queryClient.setQueryData(safetyStatusQueryKey(session.user.id), snapshot);
      onSuccess?.(snapshot);
      void queryClient.invalidateQueries({
        queryKey: safetyStatusQueryKey(session.user.id),
      });
    },
    onError: async (error) => {
      if (!shouldRetainCheckInAttempt(error)) {
        await clearCheckInAttempt(session.user.id);
      }
    },
  });
};
