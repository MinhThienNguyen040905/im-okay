import { Redirect } from "expo-router";

// MA2 will replace this temporary route with session/onboarding restoration.
export default function IndexRoute() {
  return <Redirect href="/(main)" />;
}
