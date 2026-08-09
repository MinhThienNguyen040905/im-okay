export type RpcName =
  | "internal_claim_notification_deliveries"
  | "internal_claim_expo_receipts"
  | "internal_consume_public_alert"
  | "internal_consume_public_invitation"
  | "internal_create_trusted_contact"
  | "internal_disable_device"
  | "internal_disable_safety_plan"
  | "internal_enforce_rate_limit"
  | "internal_get_alert_context"
  | "internal_get_history"
  | "internal_get_onboarding_state"
  | "internal_get_operational_snapshot"
  | "internal_get_public_alert"
  | "internal_get_public_invitation"
  | "internal_get_safety_status"
  | "internal_get_settings"
  | "internal_get_trusted_contacts"
  | "internal_perform_check_in"
  | "internal_record_expo_receipt"
  | "internal_record_notification_outcome"
  | "internal_register_device"
  | "internal_remove_trusted_contact"
  | "internal_reorder_trusted_contacts"
  | "internal_request_account_workflow"
  | "internal_resend_contact_invitation"
  | "internal_snooze_safety_plan"
  | "internal_start_alert"
  | "internal_update_profile"
  | "internal_upsert_safety_plan";

export type DatabaseGateway = {
  call(name: RpcName, parameters: Record<string, unknown>): Promise<unknown>;
};

export class DatabaseError extends Error {
  readonly databaseCode: string;
  readonly detail?: string;

  constructor(databaseCode: string, detail?: string) {
    super(databaseCode);
    this.name = "DatabaseError";
    this.databaseCode = databaseCode;
    this.detail = detail;
  }
}

type PostgrestErrorBody = {
  code?: unknown;
  message?: unknown;
};

const requiredEnvironment = (name: string): string => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new DatabaseError("DATABASE_UNAVAILABLE", name);
  return value;
};

const firstKeyFromDictionary = (name: string): string | undefined => {
  if (typeof Deno === "undefined") return undefined;
  const raw = Deno.env.get(name)?.trim();
  if (!raw) return undefined;
  try {
    const dictionary = JSON.parse(raw) as Record<string, unknown>;
    const preferred = dictionary.default;
    if (typeof preferred === "string" && preferred.trim()) {
      return preferred.trim();
    }
    return Object.values(dictionary)
      .find(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
      ?.trim();
  } catch {
    throw new DatabaseError("DATABASE_UNAVAILABLE", name);
  }
};

export const createServiceRoleDatabaseGateway = (): DatabaseGateway => {
  const supabaseUrl = requiredEnvironment("SUPABASE_URL").replace(/\/$/, "");
  const secretKey =
    Deno.env.get("SUPABASE_SECRET_KEY")?.trim() ||
    firstKeyFromDictionary("SUPABASE_SECRET_KEYS");
  const legacyServiceRoleKey = Deno.env
    .get("SUPABASE_SERVICE_ROLE_KEY")
    ?.trim();
  const serviceCredential =
    secretKey ||
    legacyServiceRoleKey ||
    requiredEnvironment("SUPABASE_SECRET_KEY");

  return {
    async call(name, parameters) {
      let response: Response;
      try {
        response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
          body: JSON.stringify(parameters),
          headers: {
            apikey: serviceCredential,
            ...(legacyServiceRoleKey
              ? { authorization: `Bearer ${legacyServiceRoleKey}` }
              : {}),
            "content-type": "application/json",
          },
          method: "POST",
        });
      } catch {
        throw new DatabaseError("DATABASE_UNAVAILABLE");
      }

      const body = (await response.json().catch(() => null)) as
        PostgrestErrorBody | unknown;
      if (!response.ok) {
        const errorBody = body as PostgrestErrorBody | null;
        throw new DatabaseError(
          typeof errorBody?.message === "string"
            ? errorBody.message
            : "DATABASE_ERROR",
          typeof errorBody?.code === "string" ? errorBody.code : undefined,
        );
      }
      return body;
    },
  };
};
