import { redirectIncomingLink } from "@/features/security/deepLinks";

export const redirectSystemPath = ({
  path,
}: {
  path: string;
  initial: boolean;
}) => redirectIncomingLink(path);
