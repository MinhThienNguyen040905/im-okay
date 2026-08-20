import { toFriendlyAuthError } from "../authErrors";

describe("friendly auth errors", () => {
  it.each([
    new Error("email rate limit exceeded"),
    new Error("over_email_send_rate_limit"),
  ])("maps email rate-limit errors without exposing provider copy", (error) => {
    expect(toFriendlyAuthError(error)).toBe(
      "Đã yêu cầu quá nhiều liên kết đăng nhập. Hãy dùng email mới nhất đã nhận hoặc chờ một lúc rồi thử lại.",
    );
  });

  it.each([
    new Error("Đăng nhập không thành công: otp_expired"),
    new Error("Email link is invalid or has expired"),
  ])("maps expired-link errors", (error) => {
    expect(toFriendlyAuthError(error)).toBe(
      "Liên kết đăng nhập đã hết hạn hoặc đã được dùng. Hãy yêu cầu một liên kết mới.",
    );
  });

  it("maps network errors", () => {
    expect(toFriendlyAuthError(new TypeError("Network request failed"))).toBe(
      "Không thể kết nối để đăng nhập. Hãy kiểm tra mạng rồi thử lại.",
    );
  });

  it.each([
    new Error("google_provider_unavailable"),
    new Error("Unsupported provider: provider is not enabled"),
  ])("maps unavailable Google provider errors", (error) => {
    expect(toFriendlyAuthError(error)).toBe(
      "Đăng nhập bằng Google hiện chưa sẵn sàng. Hãy tiếp tục bằng email hoặc thử lại sau.",
    );
  });

  it("does not expose unknown backend details", () => {
    expect(toFriendlyAuthError(new Error("database internals"))).toBe(
      "Không thể hoàn tất đăng nhập. Vui lòng thử lại sau.",
    );
  });
});
