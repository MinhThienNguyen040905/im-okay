const DEFAULT_AUTH_ERROR =
  "Không thể hoàn tất đăng nhập. Vui lòng thử lại sau.";

const messageFor = (error: unknown) => {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  return typeof error === "string" ? error : "";
};

export const toFriendlyAuthError = (error: unknown) => {
  const message = messageFor(error);

  if (/over_email_send_rate_limit|email rate limit exceeded/i.test(message)) {
    return "Đã yêu cầu quá nhiều liên kết đăng nhập. Hãy dùng email mới nhất đã nhận hoặc chờ một lúc rồi thử lại.";
  }

  if (/otp_expired|email link is invalid|link.*expired/i.test(message)) {
    return "Liên kết đăng nhập đã hết hạn hoặc đã được dùng. Hãy yêu cầu một liên kết mới.";
  }

  if (/network request failed|failed to fetch|networkerror/i.test(message)) {
    return "Không thể kết nối để đăng nhập. Hãy kiểm tra mạng rồi thử lại.";
  }

  return DEFAULT_AUTH_ERROR;
};
