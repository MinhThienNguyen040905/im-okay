---
version: "alpha"
name: "I'm Okay"
description: "Calm, trustworthy and accessible safety check-in experience for people living alone and their trusted contacts."
colors:
  primary: "#0F766E"
  on-primary: "#FFFFFF"
  primary-hover: "#115E59"
  primary-container: "#CCFBF1"
  on-primary-container: "#134E4A"
  secondary: "#334155"
  on-secondary: "#FFFFFF"
  background: "#F7FAF9"
  surface: "#FFFFFF"
  surface-muted: "#EEF4F2"
  text-primary: "#102A2A"
  text-secondary: "#526463"
  border: "#CBD8D5"
  success: "#157A4B"
  success-container: "#DCFCE7"
  warning: "#8A4B00"
  warning-container: "#FFF3D6"
  danger: "#B42318"
  danger-hover: "#912018"
  danger-container: "#FEE4E2"
  focus: "#2563EB"
typography:
  display:
    fontFamily: "Inter"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  heading-lg:
    fontFamily: "Inter"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.3
  heading-md:
    fontFamily: "Inter"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.35
  body-lg:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  body-md:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "32px"
  xxxl: "40px"
  huge: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "52px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "52px"
    padding: "0 20px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "56px"
    padding: "0 20px"
  button-danger-hover:
    backgroundColor: "{colors.danger-hover}"
    textColor: "{colors.on-primary}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "20px"
  card-muted:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    height: "52px"
    padding: "0 16px"
  badge-success:
    backgroundColor: "{colors.success-container}"
    textColor: "{colors.success}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  badge-warning:
    backgroundColor: "{colors.warning-container}"
    textColor: "{colors.warning}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  badge-danger:
    backgroundColor: "{colors.danger-container}"
    textColor: "{colors.danger}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  text-muted:
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-md}"
  divider:
    backgroundColor: "{colors.border}"
    height: "1px"
    width: "100%"
  focus-indicator:
    backgroundColor: "{colors.focus}"
    rounded: "{rounded.sm}"
    size: "2px"
---

## Overview

I’m Okay should feel like a calm, dependable friend rather than a hospital system or surveillance product. Use generous whitespace, clear hierarchy, concise Vietnamese copy and one obvious primary action per screen. The visual tone is warm, reassuring, modern and quietly serious.

Design both the Expo mobile app and the trusted-contact responsive web experience as one family. Mobile is optimized for a 390 × 844 px viewport. Web is mobile-first because recipients usually open alert links from email or SMS, then expands gracefully to a centered desktop card or two-column layout.

## Colors

Use deep teal as the primary action and trust color. Use soft mint containers to communicate safety without visual noise. Reserve red exclusively for real danger, destructive actions and active SOS states. Use amber for approaching deadlines and warnings. Never use danger red as decoration.

Keep primary text dark green-charcoal instead of pure black. Use warm off-white backgrounds and white surfaces. Maintain WCAG AA contrast for all text, icons and interactive controls.

## Typography

Use Inter for design consistency; map to the closest native system font during implementation if needed. Use sentence case, not all caps. Keep headings short and supportive. Use tabular figures for countdown timers and dates when possible.

Vietnamese copy must use correct accents. Do not use lorem ipsum. Avoid clinical, frightening or blaming language such as “Bạn đã thất bại điểm danh”. Prefer “Bạn chưa xác nhận an toàn”.

## Layout

Use an 8 px base spacing rhythm. Mobile screens have 20 px horizontal padding, respect safe areas and keep the main action reachable by thumb. Use a maximum content width of 560 px for web alert flows and 1120 px only when a desktop two-column layout materially improves clarity.

Use cards sparingly to group related information. Avoid nesting cards inside cards. Keep touch targets at least 48 × 48 px. Allow layouts to grow for larger accessibility font sizes without clipping.

## Elevation & Depth

Use subtle borders and extremely soft shadows only when required to separate floating surfaces. Prefer spacing, background tone and borders over heavy elevation. Do not use glassmorphism, neon glow, excessive gradients or glossy 3D effects.

## Shapes

Use 12–16 px rounded corners for normal controls and cards. Use pill shapes for compact status badges only. Use circles for identity avatars, status icons and the large check-in action. Avoid playful blob shapes that weaken the sense of reliability.

## Components

Use filled teal buttons for the primary next step and outlined/white buttons for secondary actions. Use one red button only for SOS or a genuinely destructive action. Inputs must have persistent labels above the field, clear focus states, helper/error copy and never rely only on placeholder text.

Use simple outlined icons with consistent 2 px strokes. Pair unfamiliar icons with text. Status patterns must combine color, icon and wording. The mobile bottom navigation has three destinations: “Trang chủ”, “Lịch sử”, “Cài đặt”.

## Do's and Don'ts

Do:

- Make the current safety status understandable in three seconds.
- Show exact dates and times near relative countdowns.
- Use calm confirmation language and reversible actions.
- Distinguish “Diễn tập” from “Cảnh báo thật” in both label and color.
- Design empty, loading, disabled and error states without changing layout structure.

Don't:

- Present the app as guaranteed emergency rescue.
- Add maps, medical imagery, ambulances or heart-rate graphics unless explicitly requested.
- Hide critical details behind ambiguous icons.
- Use red for ordinary navigation or harmless reminders.
- Put more than one competing primary CTA on a screen.
- Display sensitive address, health or location data on an unauthenticated link by default.
