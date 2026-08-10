const AUTH_CALLBACK_PATH = "/auth/callback";
export const REJECTED_LINK_PATH = "/unexpected-link";

const allowedAuthParameters = new Set([
  "access_token",
  "code",
  "error",
  "error_code",
  "error_description",
  "expires_at",
  "expires_in",
  "refresh_token",
  "sb",
  "token_type",
  "type",
]);

const pathForUrl = (url: URL) => {
  if (url.protocol === "exp:" || url.protocol === "exps:") {
    return url.pathname.replace(/^\/--(?=\/|$)/, "") || "/";
  }
  if (url.hostname && url.hostname !== "app") {
    return `/${url.hostname}${url.pathname}`.replace(/\/$/, "") || "/";
  }
  return url.pathname.replace(/\/$/, "") || "/";
};

const parameterNames = (url: URL) => {
  const names = [...url.searchParams.keys()];
  const fragment = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (fragment) {
    names.push(...new URLSearchParams(fragment).keys());
  }
  return names;
};

export const isAllowedIncomingLink = (path: string) => {
  try {
    const url = new URL(path, "imokay://app/");
    if (!["imokay:", "exp:", "exps:"].includes(url.protocol)) return false;
    const routePath = pathForUrl(url);
    const parameters = parameterNames(url);

    if (routePath === "/") return parameters.length === 0;
    if (routePath !== AUTH_CALLBACK_PATH) return false;
    return parameters.every((name) => allowedAuthParameters.has(name));
  } catch {
    return false;
  }
};

export const redirectIncomingLink = (path: string) =>
  isAllowedIncomingLink(path) ? path : REJECTED_LINK_PATH;
