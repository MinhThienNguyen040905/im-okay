export type DeliveryTemplateInput = {
  payload: Record<string, unknown>;
  publicToken?: string | null;
  publicWebUrl: string;
  templateKey: string;
  templateVersion: number;
};

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character]!,
  );

const text = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

export const renderNotification = (input: DeliveryTemplateInput) => {
  if (input.templateVersion !== 1)
    throw new TypeError("UNKNOWN_TEMPLATE_VERSION");
  const owner = text(input.payload.ownerDisplayName, "Người thân của bạn");
  const safeOwner = escapeHtml(owner);
  const baseUrl = input.publicWebUrl.replace(/\/$/, "");

  if (input.templateKey === "trusted-contact-invitation") {
    if (!input.publicToken) throw new TypeError("PUBLIC_TOKEN_REQUIRED");
    const url = `${baseUrl}/invitations/${encodeURIComponent(input.publicToken)}`;
    return {
      body: `${owner} mời bạn làm liên hệ tin cậy trên I’m Okay. Mở liên kết để chấp nhận hoặc từ chối: ${url}`,
      html: `<p><strong>${safeOwner}</strong> mời bạn làm liên hệ tin cậy trên I’m Okay.</p><p><a href="${escapeHtml(url)}">Xem lời mời</a></p>`,
      subject: `Lời mời liên hệ tin cậy từ ${owner}`,
      title: "Lời mời liên hệ tin cậy",
    };
  }
  if (input.templateKey === "trusted-contact-alert") {
    if (!input.publicToken) throw new TypeError("PUBLIC_TOKEN_REQUIRED");
    const url = `${baseUrl}/alerts/${encodeURIComponent(input.publicToken)}`;
    return {
      body: `I’m Okay chưa nhận được xác nhận an toàn từ ${owner}. Hãy mở liên kết và kiểm tra: ${url}`,
      html: `<p>I’m Okay chưa nhận được xác nhận an toàn từ <strong>${safeOwner}</strong>.</p><p><a href="${escapeHtml(url)}">Xem cảnh báo</a></p>`,
      subject: `Cảnh báo an toàn của ${owner}`,
      title: "Cảnh báo an toàn",
    };
  }
  if (input.templateKey === "alert-correction") {
    return {
      body: `${owner} đã xác nhận an toàn. Cảnh báo trước đó đã kết thúc.`,
      html: `<p><strong>${safeOwner}</strong> đã xác nhận an toàn. Cảnh báo trước đó đã kết thúc.</p>`,
      subject: `${owner} đã xác nhận an toàn`,
      title: "Đã xác nhận an toàn",
    };
  }
  if (input.templateKey === "user-reminder") {
    return {
      body: "Đã đến lúc mở I’m Okay và xác nhận bạn vẫn ổn.",
      subject: "Nhắc xác nhận an toàn",
      title: "Bạn vẫn ổn chứ?",
    };
  }
  throw new TypeError("UNKNOWN_TEMPLATE");
};
