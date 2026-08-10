import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const requiredProviderSecretNames = [
  "INTERNAL_FUNCTION_SECRET",
  "NOTIFICATION_DELIVERY_ENABLED",
  "NOTIFICATION_PROVIDER_MODE",
  "PUBLIC_CONTACT_WEB_ORIGINS",
  "PUBLIC_CONTACT_WEB_URL",
  "RESEND_API_KEY",
  "RESEND_FROM",
];

export const extractSecretNames = (records) =>
  new Set(
    Array.isArray(records)
      ? records.flatMap((record) =>
          record && typeof record.name === "string" ? [record.name] : [],
        )
      : [],
  );

export const assessProviderReadiness = ({
  deviceConsented,
  recipientsConsented,
  secretNames,
  senderVerified,
}) => {
  const missingSecretNames = requiredProviderSecretNames.filter(
    (name) => !secretNames.has(name),
  );
  const missingConfirmations = [
    ["verified Resend sender", senderVerified],
    ["consented test recipients", recipientsConsented],
    ["consented test device", deviceConsented],
  ].flatMap(([label, confirmed]) => (confirmed ? [] : [label]));

  return {
    missingConfirmations,
    missingSecretNames,
    readyForControlledSmoke:
      missingSecretNames.length === 0 && missingConfirmations.length === 0,
  };
};

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến ${name}.`);
  return value;
};

const confirmed = (name) => process.env[name]?.trim() === "true";

const readStagingSecretNames = (repoRoot, projectRef) => {
  const cliEntry = path.join(
    repoRoot,
    "node_modules",
    "supabase",
    "dist",
    "supabase.js",
  );
  if (!existsSync(cliEntry)) {
    throw new Error("Supabase CLI dependency is missing from node_modules.");
  }

  const args = [
    "secrets",
    "list",
    "--project-ref",
    projectRef,
    "--output",
    "json",
  ];
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(
      "Không thể đọc danh sách tên secret staging. Hãy kiểm tra Supabase CLI login và project ref.",
    );
  }

  return extractSecretNames(JSON.parse(result.stdout));
};

const run = () => {
  const projectRef = required("STAGING_EXPECTED_PROJECT_REF");
  if (!/^[a-z0-9]{20}$/.test(projectRef)) {
    throw new Error("STAGING_EXPECTED_PROJECT_REF không hợp lệ.");
  }

  const repoRoot = path.resolve(import.meta.dirname, "..");
  const secretNames = readStagingSecretNames(repoRoot, projectRef);
  const readiness = assessProviderReadiness({
    deviceConsented: confirmed("S4_PROVIDER_DEVICE_CONSENTED"),
    recipientsConsented: confirmed("S4_PROVIDER_RECIPIENTS_CONSENTED"),
    secretNames,
    senderVerified: confirmed("S4_RESEND_SENDER_VERIFIED"),
  });

  console.info(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        deliveryMutation: "not_performed",
        manualValueReviewRequired: [
          "NOTIFICATION_PROVIDER_MODE=live",
          "NOTIFICATION_DELIVERY_ENABLED=false before smoke",
          "RESEND_FROM matches the verified sender",
        ],
        projectRef,
        ...readiness,
      },
      null,
      2,
    ),
  );

  if (!readiness.readyForControlledSmoke) process.exitCode = 1;
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run();
}
