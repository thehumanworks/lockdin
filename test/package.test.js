const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const { version } = require(path.join(repoRoot, "package.json"));
const zipPath = path.join(repoRoot, "dist", `lockdin-${version}.zip`);

function listZipEntries(filePath) {
  return execFileSync("unzip", ["-Z", "-1", filePath], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
}

test("package artifact excludes hidden files from assets", () => {
  execFileSync("npm", ["run", "package"], { cwd: repoRoot, stdio: "ignore" });

  const entries = listZipEntries(zipPath);

  assert.equal(entries.includes("manifest.json"), true);
  assert.equal(entries.some((entry) => /(^|\/)\.[^/]+$/.test(entry)), false);
});
