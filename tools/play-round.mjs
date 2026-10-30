#!/usr/bin/env node
// Play a round in the terminal, then upload it the same way the phone will:
// everything is kept locally while you play, and sent in one POST at the end.
//
//   node tools/play-round.mjs
//
// Needs the backend running on localhost:8080 only for the final upload
// (override with API=http://host:port/api/v1/rounds).
// Progress is saved to tools/.round-in-progress.json after every change, so
// quitting (or Ctrl+C) and re-running resumes the same round with the same clientId.

import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";

const API = process.env.API ?? "http://localhost:8080/api/v1/rounds";
const COURSE = JSON.parse(readFileSync(new URL("../mobile/assets/course.json", import.meta.url)));
const SAVE_FILE = new URL("./.round-in-progress.json", import.meta.url);

// same allowed values as the db CHECKs (V9, V10, V11)
const LIES = ["tee", "fairway", "rough", "sand", "green", "recovery"];
const GIR = ["hit", "long", "short", "left", "right", "no_chance"];
const FAIRWAY = ["hit", "long", "short", "left", "right"];
const SIDES = {
  front: range(1, 9),
  back: range(10, 18),
  full: range(1, 18),
};

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on("SIGINT", () => {
  console.log("\nProgress is saved. Run again to resume.");
  process.exit(0);
});

let round;   // exactly the UploadRoundRequest shape the server expects
let current; // hole number you're on

// ---------- input helpers ----------

function range(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

// buffered line reader, so piped input (e.g. a scripted round) isn't dropped
const lines = rl[Symbol.asyncIterator]();

async function ask(q, def) {
  const shown = def === undefined || def === null ? "" : ` [${def}]`;
  process.stdout.write(`${q}${shown}: `);
  const next = await lines.next();
  if (next.done) process.exit(0); // input ended; progress is already saved
  const a = next.value.trim();
  return a === "" && def !== undefined && def !== null ? String(def) : a;
}

// whole number in [min, max]; "-" clears to null when optional
async function askInt(q, { min, max, def, optional = false }) {
  for (;;) {
    const a = await ask(optional ? `${q} (- to clear)` : q, def);
    if (optional && (a === "-" || a === "")) return a === "-" ? null : (def ?? null);
    const n = a === "" ? NaN : Number(a);
    if (Number.isInteger(n) && n >= min && n <= max) return n;
    console.log(`  enter a whole number ${min}-${max}`);
  }
}

async function askDist(q, def) {
  for (;;) {
    const a = await ask(q, def);
    const n = a === "" ? NaN : Number(a);
    if (Number.isFinite(n) && n >= 0 && n <= 750) return n;
    console.log("  enter yards 0-750");
  }
}

// pick by number or by typing the value; "-" clears to null when optional
async function pick(q, options, { def, optional = false } = {}) {
  const list = options.map((o, i) => `${i + 1}) ${o}`).join("  ");
  for (;;) {
    const a = await ask(`${q}  ${list}${optional ? "  (- to clear)" : ""}`, def);
    if (optional && (a === "-" || a === "")) return a === "-" ? null : (def ?? null);
    const byNum = options[Number(a) - 1];
    if (byNum) return byNum;
    if (options.includes(a)) return a;
    console.log("  pick one of the options");
  }
}

async function yes(q, def = "n") {
  return (await ask(`${q} (y/n)`, def)).toLowerCase().startsWith("y");
}

// ---------- round state ----------

function save() {
  writeFileSync(SAVE_FILE, JSON.stringify({ round, current }, null, 2));
}

function courseHole(n) {
  return COURSE.holes.find((h) => h.holeNumber === n);
}

function teeYards(n) {
  return courseHole(n).tees.find((t) => t.name === round.tee)?.yards;
}

// the hole's entry, created the first time you record something on it
function holeEntry(n) {
  let h = round.holesPlayed.find((x) => x.holeNumber === n);
  if (!h) {
    h = { holeNumber: n, score: null, gir: null, fairway: null, putts: null,
          chips: null, sandShots: null, penalties: null, shots: [] };
    round.holesPlayed.push(h);
    round.holesPlayed.sort((a, b) => a.holeNumber - b.holeNumber);
  }
  return h;
}

function hasData(h) {
  return h.shots.length > 0 ||
    [h.score, h.gir, h.fairway, h.putts, h.chips, h.sandShots, h.penalties].some((v) => v !== null);
}

function sideHoles() {
  return SIDES[round.holes];
}

// ---------- screens ----------

async function startOrResume() {
  if (existsSync(SAVE_FILE)) {
    const saved = JSON.parse(readFileSync(SAVE_FILE));
    const r = saved.round;
    const recorded = r.holesPlayed.filter(hasData).length;
    console.log(`\nRound in progress: ${r.playedOn}, ${r.tee} tees, ${r.holes}, ${recorded} hole(s) recorded`);
    console.log(`clientId ${r.clientId}`);
    if (await yes("Resume it?", "y")) {
      ({ round, current } = saved);
      return;
    }
    if (!(await yes("Discard it and start a new round?"))) process.exit(0);
    unlinkSync(SAVE_FILE);
  }

  console.log(`\n${COURSE.name}`);
  const tee = await pick("Tee", COURSE.holes[0].tees.map((t) => t.name));
  const holes = await pick("Side", ["front", "back", "full"], { def: "full" });
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
  const playedOn = await ask("Date played", today);

  // generated once and saved with the round, so every retry of the upload sends the same id
  round = { clientId: randomUUID(), courseId: COURSE.courseId, tee, holes, playedOn, holesPlayed: [] };
  current = sideHoles()[0];
  save();
  console.log(`Started. clientId ${round.clientId}`);
}

function showHole() {
  const ch = courseHole(current);
  const h = round.holesPlayed.find((x) => x.holeNumber === current);
  const pos = sideHoles().indexOf(current) + 1;
  console.log(`\n── Hole ${current} · Par ${ch.par} · ${teeYards(current)} yds (${round.tee}) · ${pos} of ${sideHoles().length} ──`);
  if (!h || !hasData(h)) {
    console.log("  nothing recorded yet");
    return;
  }
  const show = (v) => (v === null ? "–" : v);
  console.log(`  Score ${show(h.score)}  Putts ${show(h.putts)}  GIR ${show(h.gir)}` +
    (ch.par > 3 ? `  Fairway ${show(h.fairway)}` : "") +
    `  Chips ${show(h.chips)}  Sand ${show(h.sandShots)}  Penalties ${show(h.penalties)}`);
  for (const s of h.shots) {
    const pen = s.penalties ? `  +${s.penalties} pen` : "";
    console.log(`  ${s.shotNumber}. ${s.club}: ${s.startDist} ${s.startLie} → ${s.endDist} ${s.endLie}${pen}`);
  }
}

async function editScore() {
  const h = holeEntry(current);
  // if shots are tracked, suggest strokes + penalty strokes
  const suggested = h.shots.length
    ? h.shots.length + h.shots.reduce((sum, s) => sum + (s.penalties ?? 0), 0)
    : h.score;
  h.score = await askInt("Score", { min: 1, max: 20, def: h.score ?? suggested, optional: true });
}

async function editStats() {
  const h = holeEntry(current);
  console.log("  enter keeps the current value");
  h.gir = await pick("GIR", GIR, { def: h.gir, optional: true });
  if (courseHole(current).par > 3) {
    h.fairway = await pick("Fairway", FAIRWAY, { def: h.fairway, optional: true });
  }
  h.putts = await askInt("Putts", { min: 0, max: 20, def: h.putts, optional: true });
  h.chips = await askInt("Chips", { min: 0, max: 20, def: h.chips, optional: true });
  h.sandShots = await askInt("Sand shots", { min: 0, max: 20, def: h.sandShots, optional: true });
  h.penalties = await askInt("Penalties", { min: 0, max: 20, def: h.penalties, optional: true });
}

async function addShot() {
  const h = holeEntry(current);
  const prev = h.shots.at(-1);
  const club = await ask("Club (e.g. Driver, 7i, PW, Putter)", prev ? undefined : "Driver");
  if (!club) return;
  // next shot starts where the last one ended; the first starts on the tee
  const startDist = await askDist("Start distance (yds)", prev ? prev.endDist : teeYards(current));
  const startLie = await pick("Start lie", LIES, { def: prev ? prev.endLie : "tee" });
  const endDist = await askDist("End distance (yds, 0 = holed)");
  const endLie = await pick("End lie", LIES, { def: endDist === 0 ? "green" : undefined });
  const penalties = await askInt("Penalty strokes", { min: 0, max: 5, def: 0 });
  h.shots.push({ shotNumber: h.shots.length + 1, club, startDist, endDist, startLie, endLie,
                 startLat: null, startLng: null, endLat: null, endLng: null, penalties });
  if (endDist === 0) console.log("  Holed. Use [s] to set the score.");
}

async function deleteShot() {
  const h = round.holesPlayed.find((x) => x.holeNumber === current);
  if (!h || h.shots.length === 0) return console.log("  no shots on this hole");
  const n = await askInt("Delete shot #", { min: 1, max: h.shots.length });
  h.shots.splice(n - 1, 1);
  h.shots.forEach((s, i) => (s.shotNumber = i + 1)); // keep numbering 1..n
}

async function clearHole() {
  if (!(await yes(`Clear everything on hole ${current}?`))) return;
  round.holesPlayed = round.holesPlayed.filter((x) => x.holeNumber !== current);
}

async function extendTo18() {
  if (round.holes === "full") return console.log("  already playing 18");
  if (await yes(`Extend this ${round.holes} nine to 18 holes?`, "y")) {
    round.holes = "full";
    console.log("  now playing 18");
  }
}

async function goTo() {
  const holes = sideHoles();
  current = await askInt("Go to hole", { min: holes[0], max: holes.at(-1) });
}

function scorecard() {
  const holes = sideHoles();
  const row = (label, f) => label.padEnd(7) + holes.map((n) => String(f(n)).padStart(4)).join("");
  const entry = (n) => round.holesPlayed.find((x) => x.holeNumber === n);
  const val = (n, k) => entry(n)?.[k] ?? "–";
  console.log("\n" + row("Hole", (n) => n));
  console.log(row("Par", (n) => courseHole(n).par));
  console.log(row("Score", (n) => val(n, "score")));
  console.log(row("Putts", (n) => val(n, "putts")));
  console.log(row("Shots", (n) => entry(n)?.shots.length || "–"));
  const scored = holes.filter((n) => entry(n)?.score != null);
  const sum = scored.reduce((t, n) => t + entry(n).score, 0);
  const par = scored.reduce((t, n) => t + courseHole(n).par, 0);
  const toPar = sum - par === 0 ? "E" : (sum - par > 0 ? `+${sum - par}` : sum - par);
  console.log(`\n${scored.length}/${holes.length} holes scored · ${sum} (${scored.length ? toPar : "–"})`);
  return scored.length === holes.length;
}

async function finish() {
  const complete = scorecard();
  if (!complete) {
    console.log("Not every hole has a score, so the server will leave the total blank (won't count for handicap).");
  }
  if (!(await yes("Upload this round?"))) return false;

  // only send holes you actually recorded something on
  const body = { ...round, holesPlayed: round.holesPlayed.filter(hasData) };
  let res;
  try {
    res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    console.log(`Couldn't reach ${API}. The round is still saved locally, so start the backend and run again to retry.`);
    return true;
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 201 || res.status === 200) {
    console.log(res.status === 201
      ? `201 Created: saved as round ${data.id} (total ${data.totalScore ?? "blank"})`
      : `200 OK: server already had this clientId, so this is round ${data.id} (no duplicate)`);
    if (await yes("Keep the local copy? (re-upload it to test the duplicate → 200 path)")) return true;
    unlinkSync(SAVE_FILE);
    return true;
  }
  console.log(`${res.status} ${data.error ?? ""} ${data.message ?? ""}`.trim());
  console.log("Nothing was saved on the server. The round is still saved locally, so fix it and finish again.");
  return false;
}

// ---------- main loop ----------

const MENU = "[s]core  [t] stats  [a]dd shot  [d]elete shot  [x] clear hole\n" +
             "[n]ext  [p]rev  [g]o to hole  [c]ard  [e]xtend to 18  [f]inish  [q]uit";

await startOrResume();
for (;;) {
  showHole();
  const cmd = (await ask(MENU)).toLowerCase();
  const holes = sideHoles();
  const i = holes.indexOf(current);
  if (cmd === "s") await editScore();
  else if (cmd === "t") await editStats();
  else if (cmd === "a") await addShot();
  else if (cmd === "d") await deleteShot();
  else if (cmd === "x") await clearHole();
  else if (cmd === "n") {
    if (i < holes.length - 1) current = holes[i + 1];
    else if (await finish()) break;
  } else if (cmd === "p") current = holes[Math.max(0, i - 1)];
  else if (cmd === "g") await goTo();
  else if (cmd === "c") scorecard();
  else if (cmd === "e") await extendTo18();
  else if (cmd === "f") { if (await finish()) break; }
  else if (cmd === "q") { console.log("Saved. Run again to resume."); break; }
  save();
}
rl.close();
