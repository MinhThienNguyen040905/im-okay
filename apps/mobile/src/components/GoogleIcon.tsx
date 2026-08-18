import { Image } from "react-native";

type GoogleIconProps = {
  size?: number;
};

/** Official multicolour Google G used only for the authentication action. */
export const GoogleIcon = ({ size = 20 }: GoogleIconProps) => (
  <Image
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    resizeMode="contain"
    source={require("../../assets/google-g.png")}
    style={{ height: size, width: size }}
    testID="google-brand-icon"
  />
);
