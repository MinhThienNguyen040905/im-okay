import assert from "node:assert/strict";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến ${name}.`);
  return value;
};

if (required("S4_SECURITY_SMOKE_CONFIRMATION") !== "staging") {
  throw new Error(
    "Từ chối chạy: S4_SECURITY_SMOKE_CONFIRMATION phải bằng staging.",
  );
}

const supabaseUrl = new URL(required("STAGING_SUPABASE_URL"));
assert.equal(supabaseUrl.protocol, "https:");
assert.notEqual(supabaseUrl.hostname, "localhost");
assert.notEqual(supabaseUrl.hostname, "127.0.0.1");

const expectedProjectRef = required("STAGING_EXPECTED_PROJECT_REF");
assert.equal(
  supabaseUrl.hostname,
  `${expectedProjectRef}.supabase.co`,
  "STAGING_SUPABASE_URL không khớp project ref đã xác nhận.",
);

const baseUrl = supabaseUrl.toString().replace(/\/$/, "");
const publishableKey = required("STAGING_SUPABASE_PUBLISHABLE_KEY");
const secretKey = required("STAGING_SUPABASE_SECRET_KEY");
const runId = crypto.randomUUID();
const createdUserIds = [];

const fetchWithTimeout = (url, options = {}) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });

const responseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const requireStatus = async (response, expected) => {
  const statuses = Array.isArray(expected) ? expected : [expected];
  if (!statuses.includes(response.status)) {
    const body = await responseBody(response);
    throw new Error(
      `HTTP ${response.status}, cần ${statuses.join("/")}: ${JSON.stringify(body)}`,
    );
  }
};

const adminHeaders = {
  apikey: secretKey,
  authorization: `Bearer ${secretKey}`,
  "content-type": "application/json",
};

const createUser = async (suffix, displayName) => {
  const email = `s4-security-${runId}-${suffix}@example.test`;
  const password = `S4-${crypto.randomUUID()}-Aa1!`;
  const response = await fetchWithTimeout(`${baseUrl}/auth/v1/admin/users`, {
    body: JSON.stringify({
      email,
      email_confirm: true,
      password,
      user_metadata: {
        display_name: displayName,
        timezone: "Asia/Ho_Chi_Minh",
      },
    }),
    headers: adminHeaders,
    method: "POST",
  });
  await requireStatus(response, 200);
  const user = await response.json();
  assert.equal(typeof user.id, "string");
  createdUserIds.push(user.id);
  return { displayName, email, id: user.id, password };
};

const deleteUser = async (userId) => {
  const response = await fetchWithTimeout(
    `${baseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    { headers: adminHeaders, method: "DELETE" },
  );
  await requireStatus(response, [200, 204, 404]);
};

const signIn = async ({ email, password }) => {
  const response = await fetchWithTimeout(
    `${baseUrl}/auth/v1/token?grant_type=password`,
    {
      body: JSON.stringify({ email, password }),
      headers: {
        apikey: publishableKey,
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  await requireStatus(response, 200);
  const session = await response.json();
  assert.equal(typeof session.access_token, "string");
  assert.equal(typeof session.refresh_token, "string");
  return session;
};

const authHeaders = (accessToken, extra = {}) => ({
  apikey: publishableKey,
  authorization: `Bearer ${accessToken}`,
  ...extra,
});

const rest = (path, accessToken, options = {}) =>
  fetchWithTimeout(`${baseUrl}/rest/v1${path}`, {
    ...options,
    headers: {
      ...authHeaders(accessToken),
      ...options.headers,
    },
  });

const edge = (path, accessToken, options = {}) =>
  fetchWithTimeout(`${baseUrl}/functions/v1/api/v1${path}`, {
    ...options,
    headers: {
      ...authHeaders(accessToken),
      ...options.headers,
    },
  });

let cleanupPassed = false;
try {
  const userA = await createUser("a", "S4 Security A");
  const userB = await createUser("b", "S4 Security B");
  const [sessionA, sessionB] = await Promise.all([
    signIn(userA),
    signIn(userB),
  ]);

  const malformedJwt = await edge("/me", "not-a-jwt");
  await requireStatus(malformedJwt, 401);

  const edgeAResponse = await edge(
    `/me?userId=${encodeURIComponent(userB.id)}`,
    sessionA.access_token,
  );
  await requireStatus(edgeAResponse, 200);
  const edgeBResponse = await edge(
    `/me?userId=${encodeURIComponent(userA.id)}`,
    sessionB.access_token,
  );
  await requireStatus(edgeBResponse, 200);
  const edgeA = await edgeAResponse.json();
  const edgeB = await edgeBResponse.json();
  assert.equal(edgeA.profile.displayName, userA.displayName);
  assert.equal(edgeB.profile.displayName, userB.displayName);

  const ownProfilesResponse = await rest(
    "/profiles?select=user_id,display_name,timezone",
    sessionA.access_token,
  );
  await requireStatus(ownProfilesResponse, 200);
  const ownProfiles = await ownProfilesResponse.json();
  assert.equal(ownProfiles.length, 1);
  assert.equal(ownProfiles[0].user_id, userA.id);

  const crossReadResponse = await rest(
    `/profiles?select=user_id,display_name&user_id=eq.${encodeURIComponent(userB.id)}`,
    sessionA.access_token,
  );
  await requireStatus(crossReadResponse, 200);
  assert.deepEqual(await crossReadResponse.json(), []);

  const crossUpdateResponse = await rest(
    `/profiles?user_id=eq.${encodeURIComponent(userB.id)}`,
    sessionA.access_token,
    {
      body: JSON.stringify({ display_name: "IDOR SHOULD NOT APPLY" }),
      headers: {
        "content-type": "application/json",
        prefer: "return=representation",
      },
      method: "PATCH",
    },
  );
  await requireStatus(crossUpdateResponse, [200, 204, 401, 403]);
  if (crossUpdateResponse.status === 200) {
    assert.deepEqual(await crossUpdateResponse.json(), []);
  }
  const crossUpdateResult = [401, 403].includes(crossUpdateResponse.status)
    ? "blocked"
    : "no-op";

  const userBProfileResponse = await rest(
    "/profiles?select=display_name",
    sessionB.access_token,
  );
  await requireStatus(userBProfileResponse, 200);
  const [userBProfile] = await userBProfileResponse.json();
  assert.equal(userBProfile.display_name, userB.displayName);

  const actorSpoofRpc = await rest(
    "/rpc/internal_get_onboarding_state",
    sessionA.access_token,
    {
      body: JSON.stringify({ p_actor_user_id: userB.id }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
  await requireStatus(actorSpoofRpc, [401, 403, 404]);

  const restrictedInsert = await rest("/audit_logs", sessionA.access_token, {
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  await requireStatus(restrictedInsert, [401, 403, 404]);

  console.info(
    JSON.stringify(
      {
        actorSpoofRpc: "blocked",
        createdSyntheticUsers: 2,
        edgeActorBinding: "pass",
        malformedJwt: "rejected",
        projectRef: expectedProjectRef,
        restrictedTableMutation: "blocked",
        rlsCrossRead: "empty",
        rlsCrossUpdate: crossUpdateResult,
        runId,
      },
      null,
      2,
    ),
  );
} finally {
  const cleanupTargetCount = createdUserIds.length;
  const cleanupErrors = [];
  for (const userId of createdUserIds.reverse()) {
    try {
      await deleteUser(userId);
    } catch (error) {
      cleanupErrors.push(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  cleanupPassed = cleanupErrors.length === 0;
  if (!cleanupPassed) {
    throw new Error(`Cleanup user test thất bại: ${cleanupErrors.join(" | ")}`);
  }
  console.info(
    `Cleanup ${cleanupTargetCount}/${cleanupTargetCount} synthetic auth users: pass.`,
  );
}

assert.equal(cleanupPassed, true);
