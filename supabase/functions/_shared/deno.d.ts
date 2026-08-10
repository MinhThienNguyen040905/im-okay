declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

declare module "npm:nodemailer@9.0.5" {
  type Transport = {
    sendMail(
      options: import("./notification-providers.ts").SmtpSendOptions,
    ): Promise<import("./notification-providers.ts").SmtpSendResult>;
  };

  type TransportOptions = {
    auth: { pass: string; user: string };
    connectionTimeout: number;
    greetingTimeout: number;
    host: string;
    port: number;
    secure: boolean;
    socketTimeout: number;
    tls: { minVersion: string };
  };

  export const createTransport: (options: TransportOptions) => Transport;
  const nodemailer: { createTransport: typeof createTransport };
  export default nodemailer;
}
