import { useCallback, useRef } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  type Text,
  type View,
} from "react-native";

export const focusAccessibilityNode = (
  node: Text | View | null,
  announcement?: string,
) => {
  const handle = findNodeHandle(node);
  if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  if (announcement) AccessibilityInfo.announceForAccessibility(announcement);
};

export const useAccessibilityFocus = <T extends Text | View>(
  announcement?: string,
) => {
  const ref = useRef<T>(null);
  const focus = useCallback(() => {
    // Native modal content is mounted just before onShow. Deferring one frame
    // avoids focusing the backdrop or the element that opened the modal.
    requestAnimationFrame(() =>
      focusAccessibilityNode(ref.current, announcement),
    );
  }, [announcement]);
  return { focus, ref };
};
