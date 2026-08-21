import { translate, type AppLocale } from "@/features/i18n/I18nProvider";

const messageFor = (error: unknown) => {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  return typeof error === "string" ? error : "";
};

export const toFriendlyAuthError = (
  error: unknown,
  locale: AppLocale = "vi",
) => {
  const message = messageFor(error);

  if (/over_email_send_rate_limit|email rate limit exceeded/i.test(message)) {
    return translate(
      "auth.rateLimited",
      "Đã yêu cầu quá nhiều liên kết đăng nhập. Hãy dùng email mới nhất đã nhận hoặc chờ một lúc rồi thử lại.",
      {},
      locale,
    );
  }

  if (/otp_expired|email link is invalid|link.*expired/i.test(message)) {
    return translate(
      "auth.linkExpired",
      "Liên kết đăng nhập đã hết hạn hoặc đã được dùng. Hãy yêu cầu một liên kết mới.",
      {},
      locale,
    );
  }

  if (
    /google_provider_unavailable|provider is not enabled|unsupported provider/i.test(
      message,
    )
  ) {
    return translate(
      "auth.googleUnavailable",
      "Đăng nhập bằng Google hiện chưa sẵn sàng. Hãy tiếp tục bằng email hoặc thử lại sau.",
      {},
      locale,
    );
  }

  if (/network request failed|failed to fetch|networkerror/i.test(message)) {
    return translate(
      "auth.networkFailed",
      "Không thể kết nối để đăng nhập. Hãy kiểm tra mạng rồi thử lại.",
      {},
      locale,
    );
  }

  return translate(
    "auth.failed",
    "Không thể hoàn tất đăng nhập. Vui lòng thử lại sau.",
    {},
    locale,
  );
};
