import { FontAwesome } from "@expo/vector-icons";

type GoogleIconProps = {
  size?: number;
};

/** Brand mark used only for the Google authentication action. */
export const GoogleIcon = ({ size = 20 }: GoogleIconProps) => (
  <FontAwesome
    accessible={false}
    color="#4285F4"
    importantForAccessibility="no-hide-descendants"
    name="google"
    size={size}
    testID="google-brand-icon"
  />
);
