import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("foundation page does not promise an active invitation flow", () => {
  const source = readFileSync(
    new URL("../src/status.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /stage: "S1"/);
  assert.match(source, /sau khi.*kiểm thử/i);
  assert.doesNotMatch(source, /đã gửi|đã thông báo/i);
});
