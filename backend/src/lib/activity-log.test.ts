import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { resolveActivityDataDir } from "./activity-log.js";

test("uses ADMIN_DATA_DIR when configured for persistent admin storage", () => {
  const configuredDir = path.join(process.cwd(), ".tmp", "admin-data");

  assert.equal(resolveActivityDataDir(configuredDir), path.resolve(configuredDir));
});

test("falls back to the bundled data directory when ADMIN_DATA_DIR is empty", () => {
  const fallbackDir = path.join(process.cwd(), "backend-data");

  assert.equal(resolveActivityDataDir("", fallbackDir), fallbackDir);
  assert.equal(resolveActivityDataDir("   ", fallbackDir), fallbackDir);
  assert.equal(resolveActivityDataDir(undefined, fallbackDir), fallbackDir);
});
