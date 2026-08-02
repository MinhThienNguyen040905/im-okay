import { useEffect, useRef } from "react";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";

import { isAllowedIncomingLink, REJECTED_LINK_PATH } from "./deepLinks";

export const InboundLinkGuard = () => {
  const router = useRouter();
  const url = Linking.useURL();
  const handledUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!url || handledUrl.current === url) return;
    handledUrl.current = url;
    if (!isAllowedIncomingLink(url)) router.replace(REJECTED_LINK_PATH);
  }, [router, url]);

  return null;
};
