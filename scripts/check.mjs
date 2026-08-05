import { readFile, access } from "node:fs/promises";
import { Script } from "node:vm";

const requiredFiles = ["index.html","audio-recorder-worklet.js","vendor/jszip.min.js","VERSION.json","README.md","COPYRIGHT.md","LICENSE.md"];
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

if (version) {
  if (packageJson.version !== version.version) fail(`Version mismatch: package.json=${packageJson.version}, VERSION.json=${version.version}`);
  if (!readme.includes(`v${version.version}`)) fail("README.md does not mention the current version");
  if (!indexHtml.includes(`version: \"${version.version}\"`)) fail("index.html APP.version does not match VERSION.json");
  if (!copyright.includes(version.copyrightOwner)) fail("COPYRIGHT.md does not contain the declared copyright owner");
}

if (!indexHtml.includes("audio-recorder-worklet.js")) fail("index.html does not reference the external AudioWorklet file");
if (!worklet.includes('registerProcessor("ney-recorder"')) fail("AudioWorklet processor registration is missing");
if (!indexHtml.includes("vendor/jszip.min.js")) fail("index.html does not reference the vendored JSZip file");

try { new Script(worklet, { filename: "audio-recorder-worklet.js" }); }
catch (error) { fail(`AudioWorklet JavaScript syntax error: ${error.message}`); }

const inlineScripts = [...indexHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(source => source.trim());
for (const [index, source] of inlineScripts.entries()) {
  try { new Script(source, { filename: `index.inline.${index + 1}.js` }); }
  catch (error) { fail(`Inline JavaScript syntax error: ${error.message}`); }
}

if (failures.length) {
  console.error("Repository checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Repository checks passed for Ney Meyar v${version.version}.`);
