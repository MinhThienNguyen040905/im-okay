import * as Location from "expo-location";

import type { LocationShareInput } from "./types";

const CAPTURE_TIMEOUT_MS = 12_000;

export type LocationCaptureResult =
  | { location: LocationShareInput; status: "captured" }
  | { status: "denied" | "unavailable" };

const withTimeout = <T>(promise: Promise<T>) =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error("LOCATION_TIMEOUT")),
        CAPTURE_TIMEOUT_MS,
      );
    }),
  ]);

export const captureCurrentLocation =
  async (): Promise<LocationCaptureResult> => {
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      const permission = existing.granted
        ? existing
        : await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return { status: "denied" };

      const position = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        }),
      );
      const { accuracy, latitude, longitude } = position.coords;
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(accuracy) ||
        !accuracy ||
        accuracy <= 0
      ) {
        return { status: "unavailable" };
      }
      return {
        location: {
          accuracyMeters: Math.min(Math.round(accuracy), 50_000),
          latitude,
          longitude,
        },
        status: "captured",
      };
    } catch {
      return { status: "unavailable" };
    }
  };
