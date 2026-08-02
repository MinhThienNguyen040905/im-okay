export const calculateServerClockOffset = (
  serverTime: string,
  requestStartedAtMs: number,
  responseReceivedAtMs: number,
) => {
  const networkMidpoint =
    requestStartedAtMs + (responseReceivedAtMs - requestStartedAtMs) / 2;
  return Date.parse(serverTime) - networkMidpoint;
};

export const remainingUntilServerTime = (
  timestamp: string | null,
  clockOffsetMs: number,
  clientNowMs = Date.now(),
) => {
  if (!timestamp) return null;
  return Math.max(0, Date.parse(timestamp) - (clientNowMs + clockOffsetMs));
};
