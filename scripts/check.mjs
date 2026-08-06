import { readFile, access } from "node:fs/promises";
import { Script } from "node:vm";

const requiredFiles = [
  "index.html",
  "audio-recorder-worklet.js",
  "vendor/jszip.min.js",
  "vendor/jszip-core.min.js",
  "ui-rebuild.js",
  "ui-enhancements.js",
  "theme-base.css",
  "theme-oriental.css",
  "theme-ney-luxury.css",
  "assets/ney-dokah-reference.webp",
  "VERSION.json",
  "README.md",
  "COPYRIGHT.md",
  "LICENSE.md"
];
const failures = [];
const fail = message => failures.push(message);

for (const file of requiredFiles) {
  try { await access(file); } catch { fail(`Missing required file: ${file}`); }
}

let version = null;
try { version = JSON.parse(await readFile("VERSION.json", "utf8")); }
catch (error) { fail(`VERSION.json is invalid: ${error.message}`); }

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const readme = await readFile("README.md", "utf8");
const copyright = await readFile("COPYRIGHT.md", "utf8");
const indexHtml = await readFile("index.html", "utf8");
const worklet = await readFile("audio-recorder-worklet.js", "utf8");
const loader = await readFile("vendor/jszip.min.js", "utf8");
const uiRebuild = await readFile("ui-rebuild.js", "utf8");
const uiEnhancements = await readFile("ui-enhancements.js", "utf8");
const luxuryTheme = await readFile("theme-ney-luxury.css", "utf8");

if (version) {
  if (packageJson.version !== version.version) fail(`Version mismatch: package.json=${packageJson.version}, VERSION.json=${version.version}`);
  if (!readme.includes(`v${version.version}`)) fail("README.md does not mention the current version");
  if (!indexHtml.includes(`version: \"${version.version}\"`)) fail("index.html APP.version does not match VERSION.json");
  if (!copyright.includes(version.copyrightOwner)) fail("COPYRIGHT.md does not contain the declared copyright owner");
}

if (!indexHtml.includes("audio-recorder-worklet.js")) fail("index.html does not reference the external AudioWorklet file");
if (!worklet.includes('registerProcessor("ney-recorder"')) fail("AudioWorklet processor registration is missing");
if (!indexHtml.includes("vendor/jszip.min.js")) fail("index.html does not reference the vendored interface loader");
if (!loader.includes("theme-ney-luxury.css")) fail("Interface loader does not load the luxury ney identity stylesheet");
if (!loader.includes("ui-rebuild.js") || !loader.includes("ui-enhancements.js")) fail("Interface loader is missing rebuilt UI scripts");

for (const token of [
  "--lux-gold-light",
  "--lux-teal",
  ".brand-mark::before",
  ".note-stage::after",
  ".tuner-track",
  "@media (max-width: 900px)",
  "@media (max-width: 640px)",
  "prefers-reduced-motion"
]) {
  if (!luxuryTheme.includes(token)) fail(`Luxury identity stylesheet is missing required token: ${token}`);
}

for (const [filename, source] of [
  ["audio-recorder-worklet.js", worklet],
  ["vendor/jszip.min.js", loader],
  ["ui-rebuild.js", uiRebuild],
  ["ui-enhancements.js", uiEnhancements]
]) {
  try { new Script(source, { filename }); }
  catch (error) { fail(`${filename} JavaScript syntax error: ${error.message}`); }
}

const inlineScripts = [...indexHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(source => source.trim());
for (const [index, source] of inlineScripts.entries()) {
  try { new Script(source, { filename: `index.inline.${index + 1}.js` }); }
  catch (error) { fail(`Inline JavaScript syntax error: ${error.message}`); }
}

if (failures.length) {
  console.error("Repository checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Repository checks passed for Ney Meyar v${version.version} with luxury ney identity.`);
