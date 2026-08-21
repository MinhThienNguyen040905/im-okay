import { z } from "zod";
import { translate, type AppLocale } from "@/features/i18n/I18nProvider";

export const createAddTrustedContactSchema = (locale: AppLocale = "vi") =>
  z.object({
    displayName: z
      .string()
      .trim()
      .min(
        1,
        translate("contacts.nameRequired", "Hãy nhập tên liên hệ.", {}, locale),
      )
      .max(
        80,
        translate(
          "contacts.nameMax",
          "Tên không được dài quá 80 ký tự.",
          {},
          locale,
        ),
      ),
    email: z
      .string()
      .trim()
      .min(
        1,
        translate("contacts.emailRequired", "Hãy nhập email.", {}, locale),
      )
      .pipe(
        z.email(
          translate(
            "contacts.emailInvalid",
            "Email chưa đúng định dạng.",
            {},
            locale,
          ),
        ),
      ),
    consentConfirmed: z.boolean().refine((value) => value, {
      message: translate(
        "contacts.consentRequired",
        "Bạn cần xác nhận đã trao đổi với người này.",
        {},
        locale,
      ),
    }),
  });

// Preserve the default Vietnamese schema as the public value used by existing
// consumers; screens that react to a locale change use the factory above.
export const addTrustedContactSchema = createAddTrustedContactSchema();

export type AddTrustedContactForm = z.infer<typeof addTrustedContactSchema>;
