import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relative) =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

test("W01 and W02-W05 routes are token-scoped and never render the token", () => {
  const invitation = read("../src/app/invitations/[token].tsx");
  const alert = read("../src/app/alerts/[token].tsx");
  assert.match(invitation, /Chấp nhận lời mời/);
  assert.match(alert, /Tôi sẽ kiểm tra/);
  assert.match(alert, /Kết quả|an toàn/);
  assert.doesNotMatch(invitation, /\{token\}/);
  assert.doesNotMatch(alert, /\{token\}/);
});

test("public web declares privacy headers and keyboard-accessible controls", () => {
  const headers = read("../public/_headers");
  const appConfig = JSON.parse(read("../app.json"));
  const invitation = read("../src/app/invitations/[token].tsx");
  const alert = read("../src/app/alerts/[token].tsx");
  for (const required of [
    "no-store",
    "no-referrer",
    "noindex",
    "frame-ancestors 'none'",
  ]) {
    assert.match(headers, new RegExp(required));
  }
  assert.match(invitation, /accessibilityRole="checkbox"/);
  assert.match(alert, /accessibilityRole="radio"/);
  assert.match(invitation, /minHeight: 48/);
  assert.equal(appConfig.expo.web.lang, "vi");
});

test("responsive shell is mobile-first with a bounded desktop container", () => {
  const shell = read("../src/components/Shell.tsx");
  assert.match(shell, /maxWidth: 720/);
  assert.match(shell, /paddingHorizontal: 16/);
  assert.match(shell, /width: "100%"/);
});
