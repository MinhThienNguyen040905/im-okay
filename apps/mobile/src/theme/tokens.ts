import type { TextStyle } from "react-native";

export const colors = {
  primary: "#0F766E",
  onPrimary: "#FFFFFF",
  primaryPressed: "#115E59",
  primaryContainer: "#CCFBF1",
  onPrimaryContainer: "#134E4A",
  secondary: "#334155",
  onSecondary: "#FFFFFF",
  background: "#F7FAF9",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF4F2",
  textPrimary: "#102A2A",
  textSecondary: "#526463",
  border: "#CBD8D5",
  success: "#157A4B",
  successContainer: "#DCFCE7",
  warning: "#8A4B00",
  warningContainer: "#FFF3D6",
  danger: "#B42318",
  dangerPressed: "#912018",
  dangerContainer: "#FEE4E2",
  focus: "#2563EB",
  overlay: "rgba(16, 42, 42, 0.42)",
  transparent: "transparent",
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const sizes = {
  minimumTouchTarget: 48,
  button: 52,
  buttonDanger: 56,
  contentMaxWidth: 560,
} as const;

const systemFont = "System";

export const typography = {
  display: {
    fontFamily: systemFont,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
    letterSpacing: -0.64,
  },
  headingLarge: {
    fontFamily: systemFont,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 31,
  },
  headingMedium: {
    fontFamily: systemFont,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 27,
  },
  bodyLarge: {
    fontFamily: systemFont,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 25,
  },
  bodyMedium: {
    fontFamily: systemFont,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 21,
  },
  label: {
    fontFamily: systemFont,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  caption: {
    fontFamily: systemFont,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
  numeric: {
    fontVariant: ["tabular-nums"],
  },
} satisfies Record<string, TextStyle>;
