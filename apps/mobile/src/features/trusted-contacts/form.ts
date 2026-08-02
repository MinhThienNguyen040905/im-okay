import { z } from "zod";

export const addTrustedContactSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Hãy nhập tên liên hệ.")
    .max(80, "Tên không được dài quá 80 ký tự."),
  email: z
    .string()
    .trim()
    .min(1, "Hãy nhập email.")
    .pipe(z.email("Email chưa đúng định dạng.")),
  consentConfirmed: z.boolean().refine((value) => value, {
    message: "Bạn cần xác nhận đã trao đổi với người này.",
  }),
});

export type AddTrustedContactForm = z.infer<typeof addTrustedContactSchema>;
