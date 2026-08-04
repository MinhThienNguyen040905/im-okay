export type RpcName =
  | "internal_disable_device"
  | "internal_disable_safety_plan"
  | "internal_get_onboarding_state"
  | "internal_get_safety_status"
  | "internal_perform_check_in"
  | "internal_register_device"
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

export const createServiceRoleDatabaseGateway = (): DatabaseGateway => {
  const supabaseUrl = requiredEnvironment("SUPABASE_URL").replace(/\/$/, "");
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY")?.trim();
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
