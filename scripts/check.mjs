import { access, readFile } from "node:fs/promises";
import { Script } from "node:vm";

const required = ["index.html", "styles.css", "app.js", "assets/ney-dokah-reference.webp", "VERSION.json", "README.md", "COPYRIGHT.md", "LICENSE.md"];
const obsolete = ["theme-base.css", "theme-approved.css", "theme-oriental.css", "theme-oriental-r4.css", "theme-ney-luxury.css", "theme-reference-match.css", "ui-rebuild.js", "ui-enhancements.js", "ui-approved.js", "vendor/jszip.min.js", "vendor/jszip-core.min.js", "audio-recorder-worklet.js"];
const failures = [];
for (const file of required) { try { await access(file); } catch { failures.push(`Missing required file: ${file}`); } }
for (const file of obsolete) { try { await access(file); failures.push(`Obsolete file remains: ${file}`); } catch {} }
const html = await readFile("index.html", "utf8");
const css = await readFile("styles.css", "utf8");
const js = await readFile("app.js", "utf8");
for (const token of ["lang=\"ar\"", "dir=\"rtl\"", "styles.css", "app.js", "id=\"micButton\"", "id=\"recordingsList\"", "id=\"metronomeOrb\"", "id=\"exportFormat\"", "id=\"bpmValue\"", "id=\"tunerLowLimit\""]) if (!html.includes(token)) failures.push(`index.html missing ${token}`);
if (/<style[\s>]/i.test(html)) failures.push("index.html contains inline CSS");
if (/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(html)) failures.push("index.html contains inline application JavaScript");
for (const token of ["--gold-100", ".top-grid", ".bottom-grid", ".note-rosette", ".tuner-bar", "@media (max-width: 1200px)", "@media (max-width: 900px)", "@media (max-width: 640px)", "prefers-reduced-motion"]) if (!css.includes(token)) failures.push(`styles.css missing ${token}`);
for (const token of ["getUserMedia", "MediaRecorder", "autocorrelate", "noteFromFrequency", "showToast", "renderRecords", "encodeWav", "encodeMp3", "updateToleranceVisualization", "applySettings"]) if (!js.includes(token)) failures.push(`app.js missing ${token}`);
try { new Script(js, { filename: "app.js" }); } catch (error) { failures.push(`app.js syntax error: ${error.message}`); }
if (failures.length) { failures.forEach(item => console.error(`- ${item}`)); process.exit(1); }
console.log("Repository checks passed: real RTL HTML/CSS/Vanilla JS reference interface.");
