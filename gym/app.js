'use strict';

/* =========================================================
   LiftLog — a science-based weight lifting tracker
   All data lives in this device's localStorage.
   Weights are stored in kg and converted for display.
   ========================================================= */

const MUSCLES = ['Legs', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Calves'];
const EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'EZ Bar', 'Kettlebell', 'Band', 'Smith Machine', 'Other'];
const KG_PER_LB = 0.45359237;
const STORE_KEY = 'liftlog.v1';
const DAY = 86400000;

// [name, muscle, equipment, repMin, repMax]
const DEFAULT_EXERCISES = [
  ['Barbell Back Squat', 'Legs', 'Barbell', 6, 10],
  ['Romanian Deadlift', 'Legs', 'Barbell', 8, 12],
  ['Leg Press', 'Legs', 'Machine', 10, 15],
  ['Bulgarian Split Squat', 'Legs', 'Dumbbell', 8, 12],
  ['Leg Extension', 'Legs', 'Machine', 10, 15],
  ['Lying Leg Curl', 'Legs', 'Machine', 10, 15],
  ['Seated Leg Curl', 'Legs', 'Machine', 10, 15],
  ['Hip Thrust', 'Legs', 'Barbell', 8, 12],
  ['Barbell Bench Press', 'Chest', 'Barbell', 6, 10],
  ['Incline Dumbbell Press', 'Chest', 'Dumbbell', 8, 12],
  ['Dumbbell Bench Press', 'Chest', 'Dumbbell', 8, 12],
  ['Cable Fly', 'Chest', 'Cable', 10, 15],
  ['Chest Dip', 'Chest', 'Bodyweight', 6, 12],
  ['Push-Up', 'Chest', 'Bodyweight', 8, 20],
  ['Pull-Up', 'Back', 'Bodyweight', 6, 12],
  ['Lat Pulldown', 'Back', 'Cable', 8, 12],
  ['Barbell Row', 'Back', 'Barbell', 6, 10],
  ['Chest-Supported Dumbbell Row', 'Back', 'Dumbbell', 8, 12],
  ['Seated Cable Row', 'Back', 'Cable', 10, 15],
  ['Deadlift', 'Back', 'Barbell', 3, 6],
  ['Overhead Press', 'Shoulders', 'Barbell', 6, 10],
  ['Seated Dumbbell Press', 'Shoulders', 'Dumbbell', 8, 12],
  ['Dumbbell Lateral Raise', 'Shoulders', 'Dumbbell', 12, 20],
  ['Cable Lateral Raise', 'Shoulders', 'Cable', 12, 20],
  ['Rear Delt Fly', 'Shoulders', 'Dumbbell', 12, 20],
  ['Face Pull', 'Shoulders', 'Cable', 12, 20],
  ['Barbell Curl', 'Biceps', 'Barbell', 8, 12],
  ['Incline Dumbbell Curl', 'Biceps', 'Dumbbell', 10, 15],
  ['Hammer Curl', 'Biceps', 'Dumbbell', 10, 15],
  ['Preacher Curl', 'Biceps', 'EZ Bar', 8, 12],
  ['Tricep Pushdown', 'Triceps', 'Cable', 10, 15],
  ['Overhead Cable Extension', 'Triceps', 'Cable', 10, 15],
  ['Close-Grip Bench Press', 'Triceps', 'Barbell', 6, 10],
  ['Skull Crusher', 'Triceps', 'EZ Bar', 8, 12],
  ['Cable Crunch', 'Abs', 'Cable', 10, 15],
  ['Hanging Leg Raise', 'Abs', 'Bodyweight', 8, 15],
  ['Ab Wheel Rollout', 'Abs', 'Bodyweight', 8, 15],
  ['Decline Crunch', 'Abs', 'Bodyweight', 10, 20],
  ['Standing Calf Raise', 'Calves', 'Machine', 10, 15],
  ['Seated Calf Raise', 'Calves', 'Machine', 12, 20],
];

const DEFAULT_ROUTINES = [
  ['Leg Day', ['Barbell Back Squat', 'Romanian Deadlift', 'Leg Press', 'Lying Leg Curl', 'Standing Calf Raise']],
  ['Chest & Triceps', ['Barbell Bench Press', 'Incline Dumbbell Press', 'Cable Fly', 'Tricep Pushdown', 'Overhead Cable Extension']],
  ['Back & Biceps', ['Pull-Up', 'Barbell Row', 'Lat Pulldown', 'Barbell Curl', 'Hammer Curl']],
  ['Shoulders & Abs', ['Overhead Press', 'Dumbbell Lateral Raise', 'Rear Delt Fly', 'Cable Crunch', 'Hanging Leg Raise']],
  ['Arm Day', ['Close-Grip Bench Press', 'Barbell Curl', 'Skull Crusher', 'Incline Dumbbell Curl', 'Tricep Pushdown', 'Hammer Curl']],
];

const METRICS = {
  e1rm: { label: 'Est. 1RM', weight: true },
  top: { label: 'Heaviest', weight: true },
  vol: { label: 'Volume', weight: true },
  reps: { label: 'Best reps', weight: false },
};

/* ---------------- Icons ---------------- */
const P = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const icon = (name, size = 20) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;

/* ---------------- Helpers ---------------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const exIdFor = (name) => 'ex-' + slug(name);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);

const unit = () => state.settings.unit;
function toDisp(kg) {
  if (kg == null || kg === '') return '';
  const v = unit() === 'lb' ? kg / KG_PER_LB : kg;
  return Math.round(v * 10) / 10;
}
function fromDisp(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  if (!isFinite(n)) return null;
  return unit() === 'lb' ? n * KG_PER_LB : n;
}
const fmtNum = (n, d = 1) => Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
const fmtW = (kg) => `${fmtNum(toDisp(kg || 0))} ${unit()}`;
const fmtVol = (kg) => `${fmtNum(Math.round(toDisp(kg || 0)), 0)} ${unit()}`;
const fmtVolShort = (kg) => { const v = toDisp(kg || 0); return v >= 10000 ? `${fmtNum(v / 1000)}k ${unit()}` : fmtVol(kg); };
const fmtSet = (s) => (s.weight ? `${fmtNum(toDisp(s.weight))} ${unit()} × ${s.reps}` : `${s.reps} reps`);
const e1rm = (w, r) => (!w || !r ? 0 : r === 1 ? w : w * (1 + r / 30)); // Epley

function fmtDate(ts, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Date(ts).toLocaleDateString(undefined, opts);
}
function fmtDur(ms) {
  const m = Math.max(1, Math.round(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}
function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
function relDays(ts) {
  const n = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
  return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
}

/* ---------------- State ---------------- */
function freshState() {
  return {
    version: 1,
    settings: { unit: 'kg', rest: 90, coach: { goal: 'Build muscle', level: 'Intermediate (1–3 years)', days: 4, projectUrl: '' } },
    exercises: DEFAULT_EXERCISES.map(([name, muscle, equipment, repMin, repMax]) => ({
      id: exIdFor(name), name, muscle, equipment, repMin, repMax, custom: false,
    })),
    // Fixed ids so default routines match up when syncing between devices
    routines: DEFAULT_ROUTINES.map(([name, list]) => ({ id: 'rt-' + slug(name), name, exerciseIds: list.map(exIdFor) })),
    workouts: [],
    active: null,
    deleted: { workouts: [], routines: [], exercises: [] }, // ids removed, so sync doesn't bring them back
    updatedAt: 0,
  };
}

function normalizeState(s) {
  const base = freshState();
  return {
    ...base, ...s,
    settings: { ...base.settings, ...(s.settings || {}), coach: { ...base.settings.coach, ...(s.settings?.coach || {}) } },
    deleted: { ...base.deleted, ...(s.deleted || {}) },
  };
}

function tombstone(kind, id) {
  if (!id) return;
  const list = state.deleted[kind];
  if (!list.includes(id)) list.push(id);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      return normalizeState(JSON.parse(raw));
    }
  } catch (e) {
    console.warn('Could not load saved data', e);
  }
  return freshState();
}

let state = loadState();
let saveTimer = null;
function writeNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    toast('⚠️ Could not save — storage unavailable');
  }
}
function save(now = false) {
  state.updatedAt = Date.now();
  window.LiftSync?.onLocalChange();
  if (now) return writeNow();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 300);
}
window.addEventListener('pagehide', () => { if (saveTimer) writeNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) writeNow(); });

const ui = {
  tab: 'workout',
  stack: [],          // detail screens: {type:'exercise'|'workout'|'routine', id}
  exSearch: '',
  exMuscle: 'All',
  metric: 'e1rm',
  range: 'all',
  rest: null,         // {end, total}
  picker: null,
  draft: null,        // routine being edited
  confirm: null,
};

/* ---------------- Queries ---------------- */
const exById = (id) => state.exercises.find((e) => e.id === id);
const exName = (id) => exById(id)?.name || 'Deleted exercise';

function sessionsFor(exerciseId) {
  const out = [];
  for (const w of state.workouts) {
    for (const we of w.exercises) {
      if (we.exerciseId !== exerciseId) continue;
      const sets = we.sets.filter((s) => s.done !== false && s.reps > 0);
      if (sets.length) out.push({ date: w.start, workoutId: w.id, sets });
    }
  }
  return out.sort((a, b) => a.date - b.date);
}
const lastSession = (exerciseId) => sessionsFor(exerciseId).at(-1) || null;

function sessionMetrics(sets) {
  let top = 0, best = 0, vol = 0, reps = 0;
  for (const s of sets) {
    const w = s.weight || 0;
    top = Math.max(top, w);
    best = Math.max(best, e1rm(w, s.reps));
    vol += w * s.reps;
    reps = Math.max(reps, s.reps);
  }
  return { top, e1rm: best, vol, reps };
}
function bestSet(sets) {
  return sets.reduce((b, s) => {
    const score = e1rm(s.weight || 0, s.reps) || s.reps / 1000;
    return !b || score > b.score ? { ...s, score } : b;
  }, null);
}
function workoutTotals(w) {
  let sets = 0, vol = 0;
  for (const we of w.exercises) for (const s of we.sets) { sets++; vol += (s.weight || 0) * s.reps; }
  return { sets, vol };
}
const isBodyweight = (sessions) => sessions.length > 0 && sessions.every((s) => s.sets.every((x) => !x.weight));

function findPRs(workout) {
  const prs = [];
  for (const we of workout.exercises) {
    const prev = sessionsFor(we.exerciseId).filter((s) => s.date < workout.start);
    if (!prev.length) continue; // first time doing an exercise isn't a PR
    let bestTop = 0, best1rm = 0, bestReps = 0;
    for (const s of prev) {
      const m = sessionMetrics(s.sets);
      bestTop = Math.max(bestTop, m.top); best1rm = Math.max(best1rm, m.e1rm); bestReps = Math.max(bestReps, m.reps);
    }
    const m = sessionMetrics(we.sets);
    if (m.top > 0 && m.top > bestTop + 1e-9) prs.push({ exerciseId: we.exerciseId, kind: 'top', value: m.top });
    else if (m.e1rm > best1rm + 1e-9) prs.push({ exerciseId: we.exerciseId, kind: 'e1rm', value: m.e1rm });
    else if (!m.top && m.reps > bestReps) prs.push({ exerciseId: we.exerciseId, kind: 'reps', value: m.reps });
  }
  return prs;
}
const prLabel = (p) => p.kind === 'top' ? `Heaviest: ${fmtW(p.value)}` : p.kind === 'e1rm' ? `Est. 1RM: ${fmtW(p.value)}` : `Most reps: ${p.value}`;

// Double progression: work inside the rep range, add weight once you hit the top on every set.
function suggestion(ex, last, target) {
  if (!last && target?.weight) {
    return `Coach's plan: start at <b>${fmtW(target.weight)}</b> for <b>${ex.repMin}–${ex.repMax} reps</b>, stopping 1–3 reps short of failure.`;
  }
  if (!last) {
    return `New exercise — pick a weight you can do for <b>${ex.repMin}–${ex.repMax} reps</b>, stopping 1–3 reps short of failure.`;
  }
  const top = Math.max(...last.sets.map((s) => s.weight || 0));
  const topSets = last.sets.filter((s) => (s.weight || 0) === top);
  const repsList = topSets.map((s) => s.reps).join(', ');
  if (!top) {
    return `Last time: <b>${repsList} reps</b>. Beat it by adding a rep to any set — or add weight once you pass ${ex.repMax}.`;
  }
  const inc = unit() === 'lb' ? '5 lb' : '2.5 kg';
  if (topSets.every((s) => s.reps >= ex.repMax)) {
    return `🔼 You hit ${ex.repMax}+ reps on every set at <b>${fmtW(top)}</b>. Time to add weight (~${inc}) and work back up the rep range.`;
  }
  return `Last time: <b>${fmtW(top)}</b> × ${repsList}. Beat it by adding a rep — add weight once all sets reach <b>${ex.repMax} reps</b>.`;
}

/* ---------------- Workout actions ---------------- */
function newSet() { return { id: uid(), weight: null, reps: null, done: false }; }
// `target` comes from a routine imported from the coach: { sets, repMin, repMax, weight }
function addExerciseToActive(exerciseId, target = null) {
  const last = lastSession(exerciseId);
  const n = target?.sets || (last ? Math.min(last.sets.length, 8) : 3);
  state.active.exercises.push({ uid: uid(), exerciseId, target, sets: Array.from({ length: n }, newSet) });
}
function startWorkout(routine) {
  if (state.active) {
    toast('Finish or cancel your current workout first');
    ui.tab = 'workout'; ui.stack = []; render();
    return;
  }
  const weekday = new Date().toLocaleDateString(undefined, { weekday: 'long' });
  state.active = { id: uid(), name: routine ? routine.name : `${weekday} Workout`, routineId: routine?.id || null, start: Date.now(), exercises: [] };
  (routine?.exerciseIds || []).forEach((id) => { if (exById(id)) addExerciseToActive(id, routine.targets?.[id] || null); });
  save(true);
  ui.tab = 'workout'; ui.stack = [];
  render();
}
function findWE(weUid) { return state.active?.exercises.find((x) => x.uid === weUid); }

function finishWorkout() {
  const a = state.active;
  const exercises = a.exercises
    .map((we) => ({
      exerciseId: we.exerciseId,
      sets: we.sets.filter((s) => s.done && s.reps > 0).map((s) => ({ weight: s.weight || 0, reps: s.reps })),
    }))
    .filter((we) => we.sets.length);
  if (!exercises.length) {
    confirmModal('No completed sets', 'Tap ✓ on each set you finish. Discard this workout?', 'Discard workout', () => {
      tombstone('workouts', state.active.id); state.active = null; ui.rest = null; save(true); render();
    }, true);
    return;
  }
  const unfinished = a.exercises.reduce((n, we) => n + we.sets.filter((s) => !s.done).length, 0);
  confirmModal('Finish workout?', unfinished ? `${unfinished} unticked set${unfinished > 1 ? 's' : ''} won't be saved.` : 'Nice work. Save this session?', 'Finish', () => {
    const w = { id: a.id, name: a.name.trim() || 'Workout', routineId: a.routineId, start: a.start, end: Date.now(), exercises };
    w.prs = findPRs(w);
    state.workouts.push(w);
    state.active = null; ui.rest = null;
    save(true); render();
    showSummary(w);
  });
}

/* ---------------- Rest timer & dock ---------------- */
function startRest() {
  const total = state.settings.rest;
  if (!total) return;
  ui.rest = { end: Date.now() + total * 1000, total };
  updateDock(true);
}
let dockMode = null;
function updateDock(force = false) {
  const dock = $('#dock');
  let mode = null;
  if (ui.rest) mode = 'rest';
  else if (state.active && (ui.tab !== 'workout' || ui.stack.length)) mode = 'resume';
  if (mode !== dockMode || force) {
    dockMode = mode;
    dock.hidden = !mode;
    if (mode === 'rest') {
      dock.innerHTML = `<div class="grow"><div class="lbl">Rest</div><div class="t" id="restT"></div><div class="bar"><i id="restBar"></i></div></div>
        <button class="btn sm" data-action="rest-adjust" data-d="-15">−15</button>
        <button class="btn sm" data-action="rest-adjust" data-d="15">+15</button>
        <button class="btn primary sm" data-action="rest-skip">Skip</button>`;
    } else if (mode === 'resume') {
      dock.innerHTML = `<div class="grow"><div class="lbl">Workout in progress</div><div class="t" style="font-size:16px" id="dockName"></div></div>
        <span class="elapsed muted" id="dockElapsed"></span>
        <button class="btn primary sm" data-action="resume">Resume</button>`;
    }
  }
  if (mode === 'rest') {
    const left = ui.rest.end - Date.now();
    if (left <= 0) {
      ui.rest = null;
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      toast('Rest over — time for your next set 💪');
      updateDock();
      return;
    }
    $('#restT').textContent = clock(left + 999);
    $('#restBar').style.width = `${Math.min(100, (left / (ui.rest.total * 1000)) * 100)}%`;
  } else if (mode === 'resume') {
    $('#dockName').textContent = state.active.name || 'Workout';
    $('#dockElapsed').textContent = clock(Date.now() - state.active.start);
  }
}
setInterval(() => {
  const el = $('#elapsed');
  if (el && state.active) el.textContent = clock(Date.now() - state.active.start);
  updateDock();
}, 500);

/* ---------------- Views ---------------- */
let pendingCharts = [];
const gearBtn = `<button class="icon-btn" data-action="settings" aria-label="Settings">${icon('gear', 22)}</button>`;
// Top-right button: "Sign in" when signed out, your initial when signed in (sync.js keeps it current).
// Falls back to the gear when cloud sync isn't set up.
function accountBtn() {
  let inner = gearBtn;
  if (window.LiftSync) inner = LiftSync.accountBtnHtml();
  else if (window.LIFTLOG_CONFIG?.supabaseUrl) inner = '<span class="avatar placeholder" aria-hidden="true"></span>';
  return `<span class="account-slot">${inner}</span>`;
}

function viewWorkout() {
  if (state.active) return viewActive();
  const lastByRoutine = {};
  for (const w of state.workouts) if (w.routineId) lastByRoutine[w.routineId] = Math.max(lastByRoutine[w.routineId] || 0, w.start);

  const cards = state.routines.map((r) => {
    const exs = r.exerciseIds.map(exById).filter(Boolean);
    const muscles = [...new Set(exs.map((e) => e.muscle))];
    const last = lastByRoutine[r.id];
    return `<div class="card routine">
      <div class="row-between">
        <h3>${esc(r.name)}</h3>
        <button class="icon-btn" data-action="edit-routine" data-id="${r.id}" aria-label="Edit ${esc(r.name)}">${icon('edit', 18)}</button>
      </div>
      ${muscles.length ? `<div class="chips">${muscles.map((m) => `<span class="tag">${m}</span>`).join('')}</div>` : ''}
      <p class="muted small">${exs.map((e) => esc(e.name)).join(' · ') || 'No exercises yet — tap edit to add some.'}</p>
      <div class="row-between">
        <span class="muted small">${last ? `Last done ${relDays(last)}` : 'Not done yet'}</span>
        <button class="btn primary sm" data-action="start-routine" data-id="${r.id}">Start</button>
      </div>
    </div>`;
  }).join('');

  return {
    title: 'Workout',
    actions: accountBtn(),
    body: `
      <button class="btn primary block lg" data-action="start-empty">${icon('plus')} Start empty workout</button>
      <div class="section-head"><h2>My routines</h2><div class="row-gap">${window.LiftCoach ? '<button class="btn ghost sm" data-action="plan-import">📋 Import</button>' : ''}<button class="btn ghost sm" data-action="new-routine">${icon('plus', 16)} New</button></div></div>
      ${cards || `<div class="empty"><div class="big">🏋️</div>No routines yet.</div>`}`,
  };
}

function viewActive() {
  const a = state.active;
  const cards = a.exercises.map((we) => {
    const base = exById(we.exerciseId) || { id: we.exerciseId, name: 'Deleted exercise', muscle: '', repMin: 8, repMax: 12 };
    const t = we.target;
    const ex = t ? { ...base, repMin: t.repMin, repMax: t.repMax } : base; // the plan's rep range wins
    const last = lastSession(we.exerciseId);
    const rows = we.sets.map((s, i) => {
      const p = last?.sets[i];
      const prev = p ? (p.weight ? `${fmtNum(toDisp(p.weight))} × ${p.reps}` : `${p.reps} reps`) : '—';
      return `<div class="set-row ${s.done ? 'done' : ''}" data-we="${we.uid}" data-set="${s.id}">
        <span class="set-num">${i + 1}</span>
        <span class="prev">${prev}</span>
        <input class="num" type="text" inputmode="decimal" autocomplete="off" data-field="weight" value="${s.weight == null ? '' : toDisp(s.weight)}" placeholder="${p ? toDisp(p.weight || 0) : t?.weight ? toDisp(t.weight) : ''}" aria-label="Set ${i + 1} weight (${unit()})">
        <input class="num" type="text" inputmode="numeric" autocomplete="off" data-field="reps" value="${s.reps ?? ''}" placeholder="${p ? p.reps : ''}" aria-label="Set ${i + 1} reps">
        <button class="check" data-action="toggle-set" aria-label="Mark set ${i + 1} complete">${icon('check')}</button>
      </div>`;
    }).join('');
    return `<div class="card">
      <div class="row-between">
        <div><button class="link" data-action="open-exercise" data-id="${ex.id}">${esc(ex.name)}</button>
        <div class="muted small">${esc(ex.muscle)}${ex.repMin ? ` · target ${ex.repMin}–${ex.repMax} reps` : ''}</div></div>
        <button class="icon-btn" data-action="remove-exercise" data-we="${we.uid}" aria-label="Remove ${esc(ex.name)}">${icon('trash', 18)}</button>
      </div>
      <div class="hint">${suggestion(ex, last, t)}</div>
      <div>
        <div class="set-row head"><span>Set</span><span>Previous</span><span>${unit()}</span><span>Reps</span><span></span></div>
        ${rows}
      </div>
      <div class="row-gap">
        <button class="btn ghost sm" data-action="add-set" data-we="${we.uid}">${icon('plus', 16)} Add set</button>
        ${we.sets.length > 1 ? `<button class="btn ghost sm" data-action="remove-set" data-we="${we.uid}">Remove last set</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return {
    titleHtml: `<input id="workoutName" class="name-input" value="${esc(a.name)}" aria-label="Workout name">
      <div class="sub">⏱ <span id="elapsed" class="elapsed">${clock(Date.now() - a.start)}</span> · started ${new Date(a.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>`,
    actions: `<button class="btn primary sm" data-action="finish">Finish</button>`,
    body: `
      ${cards || `<div class="empty"><div class="big">💪</div>Add your first exercise to get going.</div>`}
      <button class="btn block lg" data-action="add-exercise">${icon('plus')} Add exercise</button>
      <button class="btn danger block" data-action="cancel-workout">Cancel workout</button>`,
  };
}

function viewHistory() {
  const ws = [...state.workouts].sort((a, b) => b.start - a.start);
  if (!ws.length) {
    return { title: 'History', actions: accountBtn(), body: `<div class="empty"><div class="big">📅</div>No workouts yet.<br>Finished workouts will show up here.</div>` };
  }
  let html = '', lastMonth = '';
  for (const w of ws) {
    const month = fmtDate(w.start, { month: 'long', year: 'numeric' });
    if (month !== lastMonth) { html += `<div class="group-label">${month}</div>`; lastMonth = month; }
    const t = workoutTotals(w);
    const lines = w.exercises.slice(0, 6).map((we) => {
      const b = bestSet(we.sets);
      return `<div class="row-between small"><span>${we.sets.length} × ${esc(exName(we.exerciseId))}</span><span class="muted tnum">${b ? fmtSet(b) : ''}</span></div>`;
    }).join('');
    const more = w.exercises.length > 6 ? `<div class="muted small">+${w.exercises.length - 6} more</div>` : '';
    html += `<div class="card tap" data-action="open-workout" data-id="${w.id}">
      <div class="row-between"><h3>${esc(w.name)}</h3>${w.prs?.length ? `<span class="pr-badge">🏆 ${w.prs.length} PR${w.prs.length > 1 ? 's' : ''}</span>` : ''}</div>
      <div class="muted small">${fmtDate(w.start)} · ${fmtDur(w.end - w.start)} · ${t.sets} sets · ${fmtVol(t.vol)}</div>
      <div>${lines}${more}</div>
    </div>`;
  }
  return { title: 'History', actions: accountBtn(), body: html };
}

function viewWorkoutDetail(id) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) { ui.stack.pop(); return currentView(); }
  const t = workoutTotals(w);
  const prMap = {};
  (w.prs || []).forEach((p) => { prMap[p.exerciseId] = p; });
  const blocks = w.exercises.map((we) => `<div class="card">
      <div class="row-between"><button class="link" data-action="open-exercise" data-id="${we.exerciseId}">${esc(exName(we.exerciseId))}</button>
      ${prMap[we.exerciseId] ? `<span class="pr-badge">🏆 ${prLabel(prMap[we.exerciseId])}</span>` : ''}</div>
      <table class="sets-table">${we.sets.map((s, i) => `<tr><td>Set ${i + 1}</td><td>${fmtSet(s)}</td><td>${s.weight ? `1RM ≈ ${fmtW(e1rm(s.weight, s.reps))}` : ''}</td></tr>`).join('')}</table>
    </div>`).join('');
  return {
    title: w.name,
    body: `
      <div class="muted">${fmtDate(w.start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · ${new Date(w.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</div>
      <div class="stats">
        <div class="stat"><div class="v">${fmtDur(w.end - w.start)}</div><div class="k">Duration</div></div>
        <div class="stat"><div class="v">${t.sets}</div><div class="k">Sets</div></div>
        <div class="stat"><div class="v">${fmtVolShort(t.vol)}</div><div class="k">Volume</div></div>
      </div>
      ${blocks}
      ${window.LiftCoach ? `<button class="btn block" data-action="coach-open" data-kind="review" data-id="${w.id}">🤖 Ask coach about this workout</button>` : ''}
      <button class="btn block" data-action="save-as-routine" data-id="${w.id}">Save as routine</button>
      <button class="btn danger block" data-action="delete-workout" data-id="${w.id}">Delete workout</button>`,
  };
}

// Sets, volume and sets-per-muscle over the last `days` days
function recentTotals(days = 7) {
  const recent = state.workouts.filter((w) => w.start >= Date.now() - days * DAY);
  let sets = 0, vol = 0;
  const perMuscle = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
  for (const w of recent) {
    for (const we of w.exercises) {
      const m = exById(we.exerciseId)?.muscle;
      for (const s of we.sets) {
        sets++; vol += (s.weight || 0) * s.reps;
        if (m && m in perMuscle) perMuscle[m]++;
      }
    }
  }
  return { recent, sets, vol, perMuscle };
}

function viewProgress() {
  const { recent, sets: sets7, vol: vol7, perMuscle } = recentTotals(7);
  const maxScale = Math.max(22, ...Object.values(perMuscle));
  const pct = (n) => (n / maxScale) * 100;
  const volRows = MUSCLES.map((m) => `<div class="vol-row" title="${m}: ${perMuscle[m]} sets in the last 7 days">
      <span class="name">${m}</span>
      <div class="vol-track"><div class="vol-zone" style="left:${pct(10)}%;width:${pct(20) - pct(10)}%"></div>${perMuscle[m] ? `<div class="vol-fill" style="width:${pct(perMuscle[m])}%"></div>` : ''}</div>
      <span class="n">${perMuscle[m]}</span>
    </div>`).join('');

  // Exercise list with trend
  const items = [];
  for (const ex of state.exercises) {
    const ss = sessionsFor(ex.id);
    if (!ss.length) continue;
    const bw = isBodyweight(ss);
    const vals = ss.map((s) => { const m = sessionMetrics(s.sets); return bw ? m.reps : m.e1rm; });
    items.push({ ex, ss, bw, vals, last: ss.at(-1).date });
  }
  items.sort((a, b) => b.last - a.last);
  const list = items.map(({ ex, ss, bw, vals }) => {
    const first = vals[0], lastV = vals.at(-1);
    const change = first ? ((lastV - first) / first) * 100 : 0;
    const delta = ss.length > 1 ? `<span class="delta ${change > 0.05 ? 'up' : change < -0.05 ? 'down' : ''}">${change > 0 ? '+' : ''}${fmtNum(change, 0)}%</span>` : '';
    return `<button class="list-item" data-action="open-exercise" data-id="${ex.id}">
      <div class="grow"><div class="t">${esc(ex.name)}</div>
      <div class="s">${bw ? `Best ${fmtNum(lastV, 0)} reps` : `Est. 1RM ${fmtW(lastV)}`} · ${ss.length} session${ss.length > 1 ? 's' : ''}</div></div>
      ${sparkline(vals.slice(-12))}
      ${delta}
      <span class="chev">${icon('chev', 18)}</span>
    </button>`;
  }).join('');

  return {
    title: 'Progress',
    actions: accountBtn(),
    body: `
      ${window.LiftCoach ? LiftCoach.cardHtml() : ''}
      <div class="stats">
        <div class="stat"><div class="v">${recent.length}</div><div class="k">Workouts · 7d</div></div>
        <div class="stat"><div class="v">${sets7}</div><div class="k">Sets · 7d</div></div>
        <div class="stat"><div class="v">${fmtVolShort(vol7)}</div><div class="k">Volume · 7d</div></div>
      </div>
      <div class="card">
        <div><h2>Weekly sets per muscle</h2><p class="muted small">Last 7 days. Research suggests roughly 10–20 hard sets per muscle per week for growth.</p></div>
        ${volRows}
        <div class="legend"><span><i style="background:var(--accent)"></i>Your sets</span><span><i style="background:var(--good-soft);border:1px dashed var(--good)"></i>10–20 set target</span></div>
      </div>
      <div class="section-head"><h2>Exercise progress</h2></div>
      ${items.length ? `<div class="list">${list}</div>` : `<div class="empty"><div class="big">📈</div>Log a workout to see your strength progress here.</div>`}`,
  };
}

function sparkline(vals) {
  if (vals.length < 2) return '';
  const w = 64, h = 24, min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${((i / (vals.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`).join('');
  return `<svg class="spark" width="${w}" height="${h}" aria-hidden="true"><path d="${d}"/></svg>`;
}

function filteredExercises(search, muscle) {
  const q = search.trim().toLowerCase();
  return state.exercises
    .filter((e) => !e.archived && (muscle === 'All' || e.muscle === muscle) && (!q || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function exListHtml() {
  const exs = filteredExercises(ui.exSearch, ui.exMuscle);
  if (!exs.length) return `<div class="empty">No exercises found.<button class="btn ghost" data-action="new-exercise">${icon('plus', 16)} Create “${esc(ui.exSearch || 'new exercise')}”</button></div>`;
  const counts = {};
  for (const w of state.workouts) for (const we of w.exercises) counts[we.exerciseId] = (counts[we.exerciseId] || 0) + 1;
  return MUSCLES.map((m) => {
    const group = exs.filter((e) => e.muscle === m);
    if (!group.length) return '';
    return `<div class="group-label">${m}</div><div class="list">${group.map((e) => `<button class="list-item" data-action="open-exercise" data-id="${e.id}">
        <div class="grow"><div class="t">${esc(e.name)}${e.custom ? ' <span class="tag">Custom</span>' : ''}</div>
        <div class="s">${esc(e.equipment)} · ${e.repMin}–${e.repMax} reps${counts[e.id] ? ` · ${counts[e.id]} session${counts[e.id] > 1 ? 's' : ''}` : ''}</div></div>
        <span class="chev">${icon('chev', 18)}</span></button>`).join('')}</div>`;
  }).join('');
}

function muscleChips(active, action) {
  return ['All', ...MUSCLES].map((m) => `<button class="chip ${m === active ? 'active' : ''}" data-action="${action}" data-m="${m}">${m}</button>`).join('');
}

function viewExercises() {
  return {
    title: 'Exercises',
    actions: `<button class="icon-btn" data-action="new-exercise" aria-label="Add exercise">${icon('plus', 24)}</button>${accountBtn()}`,
    body: `
      <input id="exSearch" class="input" type="search" placeholder="Search exercises" value="${esc(ui.exSearch)}" autocomplete="off">
      <div class="chips scroll" id="exChips">${muscleChips(ui.exMuscle, 'ex-muscle')}</div>
      <div id="exList" style="display:flex;flex-direction:column;gap:12px">${exListHtml()}</div>`,
  };
}

function viewExerciseDetail(id) {
  const ex = exById(id);
  if (!ex) { ui.stack.pop(); return currentView(); }
  const all = sessionsFor(id);
  const bw = isBodyweight(all);
  let metric = ui.metric;
  if (bw && METRICS[metric].weight) metric = 'reps';

  const ranges = { '1m': 30, '3m': 91, '6m': 182, '1y': 365, all: 0 };
  const days = ranges[ui.range];
  const sessions = days ? all.filter((s) => s.date >= Date.now() - days * DAY) : all;

  const pts = sessions.map((s) => {
    const m = sessionMetrics(s.sets);
    const raw = m[metric];
    const b = bestSet(s.sets);
    return { x: s.date, y: METRICS[metric].weight ? toDisp(raw) : raw, detail: b ? `Best set ${fmtSet(b)}` : '' };
  });
  const chartId = 'chart-' + uid();
  pendingCharts.push({ id: chartId, pts, suffix: METRICS[metric].weight ? ` ${unit()}` : ' reps', label: METRICS[metric].label });

  // Personal records
  let pr = { e1rm: 0, top: 0, reps: 0, vol: 0 };
  let topSet = null;
  for (const s of all) {
    const m = sessionMetrics(s.sets);
    pr.e1rm = Math.max(pr.e1rm, m.e1rm); pr.vol = Math.max(pr.vol, m.vol); pr.reps = Math.max(pr.reps, m.reps);
    if (m.top > pr.top) { pr.top = m.top; topSet = s.sets.filter((x) => x.weight === m.top).sort((a, b) => b.reps - a.reps)[0]; }
  }

  const history = [...all].reverse().slice(0, 30).map((s) => `<div class="card tap" data-action="open-workout" data-id="${s.workoutId}">
      <div class="row-between"><b>${fmtDate(s.date)}</b><span class="muted small">${s.sets.length} sets</span></div>
      <table class="sets-table">${s.sets.map((x, i) => `<tr><td>${i + 1}</td><td>${fmtSet(x)}</td><td>${x.weight ? `≈ ${fmtW(e1rm(x.weight, x.reps))}` : ''}</td></tr>`).join('')}</table>
    </div>`).join('');

  const metricKeys = bw ? ['reps'] : Object.keys(METRICS);
  return {
    title: ex.name,
    actions: `<button class="icon-btn" data-action="edit-exercise" data-id="${ex.id}" aria-label="Edit exercise">${icon('edit', 20)}</button>`,
    body: `
      <div class="chips"><span class="tag">${esc(ex.muscle)}</span><span class="tag">${esc(ex.equipment)}</span><span class="tag">${ex.repMin}–${ex.repMax} reps</span>${ex.custom ? '<span class="tag">Custom</span>' : ''}</div>
      ${all.length ? `
      <div class="stats two">
        ${bw ? '' : `<div class="stat"><div class="v">${fmtW(pr.e1rm)}</div><div class="k">Best est. 1RM</div></div>
        <div class="stat"><div class="v">${fmtW(pr.top)}</div><div class="k">Heaviest${topSet ? ` · ${topSet.reps} rep${topSet.reps > 1 ? 's' : ''}` : ''}</div></div>`}
        <div class="stat"><div class="v">${pr.reps}</div><div class="k">Most reps (one set)</div></div>
        ${bw ? `<div class="stat"><div class="v">${all.length}</div><div class="k">Sessions</div></div>` : `<div class="stat"><div class="v">${fmtVolShort(pr.vol)}</div><div class="k">Best session volume</div></div>`}
      </div>
      <div class="card">
        ${metricKeys.length > 1 ? `<div class="seg">${metricKeys.map((k) => `<button class="${k === metric ? 'active' : ''}" data-action="metric" data-v="${k}">${METRICS[k].label}</button>`).join('')}</div>` : `<h2>Best reps per session</h2>`}
        <div class="chart" id="${chartId}"></div>
        <div class="seg">${Object.keys(ranges).map((r) => `<button class="${r === ui.range ? 'active' : ''}" data-action="range" data-v="${r}">${r.toUpperCase()}</button>`).join('')}</div>
        ${metric === 'e1rm' ? '<p class="muted small">Estimated 1-rep max from your best set each session (Epley formula) — the fairest way to compare sets of different reps.</p>' : ''}
      </div>
      <div class="section-head"><h2>History</h2></div>
      ${history}` : `<div class="empty"><div class="big">📈</div>No sessions logged yet.<br>Your progression graph will appear after your first workout with this exercise.</div>`}
      ${state.active ? '' : `<button class="btn primary block" data-action="quick-start" data-id="${ex.id}">Start workout with this exercise</button>`}`,
  };
}

function viewRoutineEditor() {
  const d = ui.draft;
  const rows = d.exerciseIds.map((id, i) => `<div class="list-item">
      <div class="grow"><div class="t">${esc(exName(id))}</div><div class="s">${esc(exById(id)?.muscle || '')}</div></div>
      <div class="reorder">
        <button class="icon-btn" data-action="routine-move" data-i="${i}" data-d="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('up', 18)}</button>
        <button class="icon-btn" data-action="routine-move" data-i="${i}" data-d="1" aria-label="Move down" ${i === d.exerciseIds.length - 1 ? 'disabled' : ''}>${icon('down', 18)}</button>
        <button class="icon-btn" data-action="routine-remove" data-i="${i}" aria-label="Remove">${icon('x', 18)}</button>
      </div>
    </div>`).join('');
  return {
    title: d.id ? 'Edit routine' : 'New routine',
    actions: `<button class="btn primary sm" data-action="routine-save">Save</button>`,
    body: `
      <label class="label">Routine name<input id="routineName" class="input" value="${esc(d.name)}" placeholder="e.g. Leg Day" autocomplete="off"></label>
      <div class="section-head"><h2>Exercises</h2><span class="muted small">${d.exerciseIds.length}</span></div>
      ${rows ? `<div class="list">${rows}</div>` : '<div class="empty">No exercises yet.</div>'}
      <button class="btn block" data-action="routine-add">${icon('plus')} Add exercises</button>
      ${d.id ? '<button class="btn danger block" data-action="routine-delete">Delete routine</button>' : ''}`,
  };
}

/* ---------------- Render ---------------- */
function currentView() {
  const top = ui.stack.at(-1);
  if (top?.type === 'exercise') return viewExerciseDetail(top.id);
  if (top?.type === 'workout') return viewWorkoutDetail(top.id);
  if (top?.type === 'routine') return viewRoutineEditor();
  return { workout: viewWorkout, history: viewHistory, progress: viewProgress, exercises: viewExercises }[ui.tab]();
}

// "Not backed up" reminder from sync.js — only on the main tabs, never mid-workout
function bannerSlot() {
  if (ui.stack.length || (ui.tab === 'workout' && state.active)) return '';
  return `<div id="syncBanner">${window.LiftSync?.bannerHtml() || ''}</div>`;
}

let lastKey = '';
function render({ keepScroll } = {}) {
  pendingCharts = [];
  const top = ui.stack.at(-1);
  const key = top ? `${top.type}:${top.id}` : `${ui.tab}:${state.active ? 'active' : ''}`;
  const y = window.scrollY;
  const v = currentView();
  $('#app').innerHTML = `
    <header class="topbar">
      ${ui.stack.length ? `<button class="icon-btn back" data-action="back" aria-label="Back">${icon('back', 26)}</button>` : ''}
      <div class="title">${v.titleHtml || `<h1>${esc(v.title)}</h1>`}</div>
      <div class="top-actions">${v.actions || ''}</div>
    </header>
    <main class="content">${bannerSlot()}${v.body}</main>`;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === ui.tab));
  drawPendingCharts();
  window.scrollTo(0, keepScroll || key === lastKey ? y : 0);
  lastKey = key;
  updateDock();
}

/* ---------------- Chart ---------------- */
function niceTicks(min, max, count = 4) {
  if (min === max) { const pad = Math.abs(min) * 0.1 || 1; min -= pad; max += pad; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}
const fmtTick = (v) => (Math.abs(v) >= 10000 ? `${fmtNum(v / 1000)}k` : fmtNum(v));

function drawPendingCharts() {
  for (const c of pendingCharts) {
    const host = document.getElementById(c.id);
    if (host) drawLineChart(host, c);
  }
}
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawPendingCharts, 150); });

function drawLineChart(host, { pts, suffix, label }) {
  if (!pts.length) { host.innerHTML = '<div class="chart-empty">No sessions in this time range.</div>'; return; }
  const W = Math.max(260, host.clientWidth), H = 220;
  const m = { l: 44, r: 18, t: 22, b: 28 };
  let x0 = pts[0].x, x1 = pts.at(-1).x;
  if (x0 === x1) { x0 -= 3 * DAY; x1 += 3 * DAY; }
  const ys = pts.map((p) => p.y);
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const y0 = ticks[0], y1 = ticks.at(-1);
  const sx = (x) => m.l + ((x - x0) / (x1 - x0)) * (W - m.l - m.r);
  const sy = (y) => m.t + (1 - (y - y0) / (y1 - y0 || 1)) * (H - m.t - m.b);

  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)} over time">`;
  for (const t of ticks) {
    s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${sy(t)}" y2="${sy(t)}"/>`;
    s += `<text class="axis" x="${m.l - 8}" y="${sy(t) + 4}" text-anchor="end">${fmtTick(t)}</text>`;
  }
  // x labels: start, (middle), end
  const xl = pts.length === 1 ? [pts[0].x] : W > 420 ? [x0, (x0 + x1) / 2, x1] : [x0, x1];
  xl.forEach((x, i) => {
    const anchor = pts.length === 1 ? 'middle' : i === 0 ? 'start' : i === xl.length - 1 ? 'end' : 'middle';
    s += `<text class="axis" x="${sx(x)}" y="${H - 6}" text-anchor="${anchor}">${fmtDate(x, { month: 'short', day: 'numeric' })}</text>`;
  });
  if (pts.length > 1) {
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
    s += `<path class="area" d="${line}L${sx(pts.at(-1).x).toFixed(1)},${sy(y0)}L${sx(pts[0].x).toFixed(1)},${sy(y0)}Z"/>`;
    s += `<path class="line" d="${line}"/>`;
  }
  const showDots = pts.length <= 40;
  pts.forEach((p, i) => {
    const isLast = i === pts.length - 1;
    if (showDots || isLast) s += `<circle class="dot ${isLast ? 'last' : ''}" cx="${sx(p.x)}" cy="${sy(p.y)}" r="4"/>`;
  });
  const lp = pts.at(-1);
  const lx = Math.min(Math.max(sx(lp.x), m.l + 20), W - m.r);
  s += `<text class="val" x="${lx}" y="${sy(lp.y) - 10}" text-anchor="${pts.length === 1 ? 'middle' : 'end'}">${fmtNum(lp.y)}${suffix}</text>`;
  s += `<line class="cross" id="${host.id}-x" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>`;
  s += `<circle class="hl" id="${host.id}-h" r="6" visibility="hidden"/>`;
  s += `<rect x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}" fill="transparent"/>`;
  s += '</svg>';
  host.innerHTML = s + '<div class="tip" hidden></div>' + (pts.length === 1 ? '<p class="muted small" style="text-align:center;margin-top:-6px">Log another session to see your trend line.</p>' : '');

  const svg = host.querySelector('svg'), tip = host.querySelector('.tip');
  const cross = host.querySelector(`#${host.id}-x`), hl = host.querySelector(`#${host.id}-h`);
  const show = (e) => {
    const r = svg.getBoundingClientRect();
    const x = e.clientX - r.left;
    let best = 0;
    pts.forEach((p, i) => { if (Math.abs(sx(p.x) - x) < Math.abs(sx(pts[best].x) - x)) best = i; });
    const p = pts[best], px = sx(p.x), py = sy(p.y);
    cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
    hl.setAttribute('cx', px); hl.setAttribute('cy', py); hl.setAttribute('visibility', 'visible');
    tip.innerHTML = `${fmtDate(p.x)}<br><b>${fmtNum(p.y)}${suffix}</b>${p.detail ? `<br>${esc(p.detail)}` : ''}`;
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.min(Math.max(px - tw / 2, 0), W - tw)}px`;
    tip.style.top = `${Math.max(py - tip.offsetHeight - 14, -10)}px`;
  };
  const hide = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); hl.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', hide);
}

/* ---------------- Modals ---------------- */
function showModal(html) {
  const el = $('#modal');
  el.innerHTML = `<div class="backdrop" data-action="modal-close"></div>${html}`;
  el.hidden = false;
  document.body.classList.add('modal-open');
}
function closeModal() {
  const el = $('#modal');
  el.hidden = true; el.innerHTML = '';
  document.body.classList.remove('modal-open');
  ui.picker = null; ui.confirm = null;
}

function confirmModal(title, text, okLabel, onOk, danger = false) {
  ui.confirm = onOk;
  showModal(`<div class="sheet center">
    <h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
    <button class="btn ${danger ? 'danger' : 'primary'} block lg" data-action="confirm-ok">${esc(okLabel)}</button>
    <button class="btn block" data-action="modal-close">Cancel</button>
  </div>`);
  // closeModal clears ui.confirm, so keep a reference for the OK button
  ui.confirm = onOk;
}

function showSummary(w) {
  const t = workoutTotals(w);
  showModal(`<div class="sheet center">
    <div style="font-size:44px">💪</div>
    <h2>Workout complete!</h2>
    <p class="muted">${esc(w.name)} · ${fmtDate(w.start)}</p>
    <div class="stats">
      <div class="stat"><div class="v">${fmtDur(w.end - w.start)}</div><div class="k">Duration</div></div>
      <div class="stat"><div class="v">${t.sets}</div><div class="k">Sets</div></div>
      <div class="stat"><div class="v">${fmtVolShort(t.vol)}</div><div class="k">Volume</div></div>
    </div>
    ${w.prs.length ? `<div class="pr-list"><b>🏆 New personal records</b>${w.prs.map((p) => `<div class="pr-item"><span>${esc(exName(p.exerciseId))}</span><b>${prLabel(p)}</b></div>`).join('')}</div>` : ''}
    ${window.LiftCoach ? `<button class="btn block lg" data-action="coach-open" data-kind="review" data-id="${w.id}">🤖 Ask coach to review this workout</button>` : ''}
    <button class="btn primary block lg" data-action="modal-close">Done</button>
  </div>`);
}

/* Exercise picker (multi-select) */
function openPicker(onDone, title = 'Add exercises') {
  showModal(`<div class="sheet full">
    <div class="sheet-head"><button class="btn ghost sm" data-action="modal-close">Cancel</button><h2>${esc(title)}</h2><button class="btn primary sm" data-action="picker-done" id="pickerDone" disabled>Add</button></div>
    <input id="pickerSearch" class="input" type="search" placeholder="Search exercises" autocomplete="off" enterkeyhint="search">
    <div class="chips scroll" id="pickerChips"></div>
    <div id="pickerList" class="picker-list"></div>
  </div>`);
  ui.picker = { selected: [], search: '', muscle: 'All', onDone, title };
  renderPicker();
  // Scrolling the results tucks the keyboard away so you can see the whole list
  $('#pickerList').addEventListener('scroll', () => {
    if (document.activeElement?.id === 'pickerSearch') document.activeElement.blur();
  }, { passive: true });
}
function renderPicker() {
  const p = ui.picker;
  if (!p) return;
  $('#pickerChips').innerHTML = muscleChips(p.muscle, 'picker-muscle');
  const exs = filteredExercises(p.search, p.muscle);
  const q = p.search.trim();
  const exact = q && exs.some((e) => e.name.toLowerCase() === q.toLowerCase());
  const create = exact ? '' : `<button class="pick create" data-action="picker-new">
      <span class="plus">${icon('plus', 16)}</span><div class="grow">${q ? `Create “${esc(q)}”` : 'Create new exercise'}</div></button>`;
  $('#pickerList').innerHTML = (q ? create : '') + exs.map((e) => `<button class="pick ${p.selected.includes(e.id) ? 'sel' : ''}" data-action="picker-toggle" data-id="${e.id}">
      <div class="grow"><div>${esc(e.name)}</div><div class="s">${esc(e.muscle)} · ${esc(e.equipment)}</div></div>
      <span class="box">${icon('check', 16)}</span></button>`).join('') + (q ? '' : create);
  const btn = $('#pickerDone');
  btn.disabled = !p.selected.length;
  btn.textContent = p.selected.length ? `Add (${p.selected.length})` : 'Add';
}

/* Create / edit exercise */
function openExerciseForm(ex, after, preset = {}) {
  const name = preset.name ?? ui.exSearch ?? '';
  const muscle = preset.muscle ?? ui.exMuscle;
  const e = ex || { name, muscle: muscle !== 'All' ? muscle : 'Legs', equipment: 'Barbell', repMin: 8, repMax: 12 };
  ui.exFormAfter = after || null;
  ui.exFormId = ex?.id || null;
  showModal(`<div class="sheet">
    <div class="sheet-head"><button class="btn ghost sm" data-action="modal-close">Cancel</button><h2>${ex ? 'Edit exercise' : 'New exercise'}</h2><button class="btn primary sm" data-action="save-exercise">Save</button></div>
    <label class="label">Name<input id="fName" class="input" value="${esc(e.name)}" placeholder="e.g. Hack Squat" autocomplete="off"></label>
    <div class="grid-2">
      <label class="label">Muscle group<select id="fMuscle" class="input">${MUSCLES.map((m) => `<option ${m === e.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="label">Equipment<select id="fEquip" class="input">${EQUIPMENT.map((m) => `<option ${m === e.equipment ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
    </div>
    <div class="grid-2">
      <label class="label">Rep range min<input id="fMin" class="input" inputmode="numeric" value="${e.repMin}"></label>
      <label class="label">Rep range max<input id="fMax" class="input" inputmode="numeric" value="${e.repMax}"></label>
    </div>
    <p class="muted small">The rep range drives your progression tips: once you hit the top of the range on every set, the app tells you to add weight.</p>
    ${ex ? `<button class="btn danger block" data-action="delete-exercise" data-id="${ex.id}">Delete exercise</button>` : ''}
  </div>`);
  if (!ex) setTimeout(() => $('#fName')?.focus(), 50);
}

function saveExerciseForm() {
  const name = $('#fName').value.trim();
  if (!name) { toast('Give the exercise a name'); return; }
  const muscle = $('#fMuscle').value, equipment = $('#fEquip').value;
  let repMin = parseInt($('#fMin').value, 10) || 8, repMax = parseInt($('#fMax').value, 10) || 12;
  if (repMin > repMax) [repMin, repMax] = [repMax, repMin];
  const dupe = state.exercises.find((e) => !e.archived && e.id !== ui.exFormId && e.name.toLowerCase() === name.toLowerCase());
  if (dupe) { toast('An exercise with that name already exists'); return; }
  let id = ui.exFormId;
  if (id) {
    Object.assign(exById(id), { name, muscle, equipment, repMin, repMax });
  } else {
    id = 'cx-' + uid();
    state.exercises.push({ id, name, muscle, equipment, repMin, repMax, custom: true });
  }
  save(true);
  const after = ui.exFormAfter;
  closeModal();
  toast(ui.exFormId ? 'Exercise updated' : `Added “${name}”`);
  if (after) after(id); else render({ keepScroll: true });
}

function openSettings() {
  const s = state.settings;
  showModal(`<div class="sheet">
    <div class="sheet-head"><span></span><h2>${window.LiftSync?.configured ? 'Account & settings' : 'Settings'}</h2><button class="btn ghost sm" data-action="modal-close">Done</button></div>
    <div class="card" id="cloudCard">${window.LiftSync ? LiftSync.cardHtml() : ''}</div>
    <div class="card">
      <div class="field"><span>Units</span><div class="seg">${['kg', 'lb'].map((u) => `<button class="${s.unit === u ? 'active' : ''}" data-action="set-unit" data-v="${u}">${u}</button>`).join('')}</div></div>
      <div class="field"><span>Rest timer</span><div class="seg">${[0, 60, 90, 120, 180].map((r) => `<button class="${s.rest === r ? 'active' : ''}" data-action="set-rest" data-v="${r}">${r ? (r < 120 ? `${r}s` : `${r / 60}m`) : 'Off'}</button>`).join('')}</div></div>
    </div>
    <div class="card">
      <h3>Backup</h3>
      <p class="muted small">Save a copy of all your data as a file, or restore one.</p>
      <div class="grid-2"><button class="btn" data-action="export">Export</button><button class="btn" data-action="import">Import</button></div>
    </div>
    <button class="btn danger block" data-action="reset">Reset all data</button>
    <p class="muted small" style="text-align:center">LiftLog · ${state.workouts.length} workouts · ${state.exercises.filter((e) => !e.archived).length} exercises</p>
  </div>`);
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `liftlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json,.json';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.exercises) || !Array.isArray(data.workouts)) throw new Error('bad file');
      confirmModal('Import backup?', `This replaces your current data with ${data.workouts.length} workouts from the file.`, 'Replace my data', () => {
        state = normalizeState(data);
        save(true); ui.stack = []; render(); toast('Backup imported');
      }, true);
    } catch {
      toast('That file is not a LiftLog backup');
    }
  };
  input.click();
}

/* ---------------- Toast ---------------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ---------------- Event handling ---------------- */
const actions = {
  tab(el) { ui.tab = el.dataset.tab; ui.stack = []; render(); },
  back() { ui.stack.pop(); render(); },
  resume() { ui.tab = 'workout'; ui.stack = []; render(); },
  settings: openSettings,
  'modal-close': closeModal,
  'confirm-ok'() { const fn = ui.confirm; closeModal(); fn && fn(); },

  'start-empty'() { startWorkout(null); },
  'start-routine'(el) { startWorkout(state.routines.find((r) => r.id === el.dataset.id)); },
  'quick-start'(el) { startWorkout(null); if (state.active && !state.active.exercises.length) { addExerciseToActive(el.dataset.id); save(); render(); } },
  'edit-routine'(el) {
    const r = state.routines.find((x) => x.id === el.dataset.id);
    ui.draft = { id: r.id, name: r.name, exerciseIds: [...r.exerciseIds] };
    ui.stack.push({ type: 'routine', id: r.id }); render();
  },
  'new-routine'() { ui.draft = { id: null, name: '', exerciseIds: [] }; ui.stack.push({ type: 'routine', id: 'new' }); render(); },
  'routine-add'() {
    openPicker((ids) => { ids.forEach((id) => { if (!ui.draft.exerciseIds.includes(id)) ui.draft.exerciseIds.push(id); }); render({ keepScroll: true }); }, 'Add to routine');
  },
  'routine-remove'(el) { ui.draft.exerciseIds.splice(+el.dataset.i, 1); render({ keepScroll: true }); },
  'routine-move'(el) {
    const i = +el.dataset.i, j = i + +el.dataset.d, arr = ui.draft.exerciseIds;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; render({ keepScroll: true });
  },
  'routine-save'() {
    const d = ui.draft;
    if (!d.name.trim()) { toast('Give your routine a name'); $('#routineName')?.focus(); return; }
    if (d.id) Object.assign(state.routines.find((r) => r.id === d.id), { name: d.name.trim(), exerciseIds: d.exerciseIds });
    else state.routines.push({ id: uid(), name: d.name.trim(), exerciseIds: d.exerciseIds });
    save(true); ui.stack.pop(); render(); toast('Routine saved');
  },
  'routine-delete'() {
    confirmModal('Delete routine?', `“${ui.draft.name}” will be removed. Your workout history is kept.`, 'Delete', () => {
      state.routines = state.routines.filter((r) => r.id !== ui.draft.id);
      tombstone('routines', ui.draft.id);
      save(true); ui.stack.pop(); render();
    }, true);
  },

  'add-exercise'() {
    openPicker((ids) => { ids.forEach(addExerciseToActive); save(); render({ keepScroll: true }); setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 30); });
  },
  'remove-exercise'(el) {
    const we = findWE(el.dataset.we);
    const doIt = () => { state.active.exercises = state.active.exercises.filter((x) => x !== we); save(); render({ keepScroll: true }); };
    if (we.sets.some((s) => s.done)) confirmModal('Remove exercise?', `Remove ${exName(we.exerciseId)} and its sets from this workout?`, 'Remove', doIt, true);
    else doIt();
  },
  'add-set'(el) {
    const we = findWE(el.dataset.we);
    const prev = we.sets.at(-1);
    we.sets.push({ ...newSet(), weight: prev?.weight ?? null, reps: prev?.reps ?? null });
    save(); render({ keepScroll: true });
  },
  'remove-set'(el) { const we = findWE(el.dataset.we); if (we.sets.length > 1) { we.sets.pop(); save(); render({ keepScroll: true }); } },
  'toggle-set'(el) {
    const row = el.closest('.set-row');
    const we = findWE(row.dataset.we);
    const set = we?.sets.find((s) => s.id === row.dataset.set);
    if (!set) return;
    if (!set.done) {
      // Empty inputs fall back to last session's numbers (the grey placeholders)
      if (set.weight == null) {
        const ph = row.querySelector('[data-field="weight"]').placeholder;
        set.weight = ph !== '' ? fromDisp(ph) : 0;
      }
      if (set.reps == null) {
        const ph = row.querySelector('[data-field="reps"]').placeholder;
        set.reps = ph !== '' ? parseInt(ph, 10) : null;
      }
      if (!(set.reps > 0)) { toast('Enter your reps first'); row.querySelector('[data-field="reps"]').focus(); return; }
      set.done = true;
      startRest();
    } else {
      set.done = false;
    }
    save(); render({ keepScroll: true });
  },
  finish: finishWorkout,
  'cancel-workout'() {
    confirmModal('Cancel workout?', 'Everything logged in this workout will be discarded.', 'Discard workout', () => {
      tombstone('workouts', state.active.id); state.active = null; ui.rest = null; save(true); render();
    }, true);
  },
  'rest-adjust'(el) { if (ui.rest) { ui.rest.end += +el.dataset.d * 1000; ui.rest.total = Math.max(ui.rest.total, (ui.rest.end - Date.now()) / 1000); updateDock(); } },
  'rest-skip'() { ui.rest = null; updateDock(); },

  'open-exercise'(el) { ui.stack.push({ type: 'exercise', id: el.dataset.id }); render(); },
  'open-workout'(el) { ui.stack.push({ type: 'workout', id: el.dataset.id }); render(); },
  'delete-workout'(el) {
    confirmModal('Delete workout?', 'This permanently removes it from your history and graphs.', 'Delete', () => {
      state.workouts = state.workouts.filter((w) => w.id !== el.dataset.id);
      tombstone('workouts', el.dataset.id);
      save(true); ui.stack.pop(); render();
    }, true);
  },
  'save-as-routine'(el) {
    const w = state.workouts.find((x) => x.id === el.dataset.id);
    ui.draft = { id: null, name: w.name, exerciseIds: [...new Set(w.exercises.map((we) => we.exerciseId))].filter(exById) };
    ui.stack.push({ type: 'routine', id: 'new' }); render();
  },

  metric(el) { ui.metric = el.dataset.v; render({ keepScroll: true }); },
  range(el) { ui.range = el.dataset.v; render({ keepScroll: true }); },
  'ex-muscle'(el) {
    ui.exMuscle = el.dataset.m;
    $('#exChips').innerHTML = muscleChips(ui.exMuscle, 'ex-muscle');
    $('#exList').innerHTML = exListHtml();
  },
  'new-exercise'() { openExerciseForm(null); },
  'edit-exercise'(el) { openExerciseForm(exById(el.dataset.id)); },
  'save-exercise': saveExerciseForm,
  'delete-exercise'(el) {
    const id = el.dataset.id, ex = exById(id);
    const used = state.workouts.some((w) => w.exercises.some((we) => we.exerciseId === id));
    confirmModal(`Delete ${ex.name}?`, used ? 'It will be removed from your library and routines. Past workouts keep their history.' : 'It will be removed from your library and routines.', 'Delete', () => {
      if (used) ex.archived = true; else { state.exercises = state.exercises.filter((e) => e.id !== id); tombstone('exercises', id); }
      state.routines.forEach((r) => { r.exerciseIds = r.exerciseIds.filter((x) => x !== id); });
      save(true);
      if (ui.stack.at(-1)?.type === 'exercise') ui.stack.pop();
      render();
    }, true);
  },

  'picker-muscle'(el) { ui.picker.muscle = el.dataset.m; renderPicker(); },
  'picker-toggle'(el) {
    const p = ui.picker, id = el.dataset.id;
    p.selected = p.selected.includes(id) ? p.selected.filter((x) => x !== id) : [...p.selected, id];
    renderPicker();
  },
  'picker-done'() { const { selected, onDone } = ui.picker; closeModal(); onDone(selected); },
  'picker-new'() {
    const p = ui.picker;
    openExerciseForm(null, (id) => {
      // Back to the picker with the new exercise found and ticked
      openPicker(p.onDone, p.title);
      const name = exById(id).name;
      Object.assign(ui.picker, { selected: [...p.selected, id], search: name });
      $('#pickerSearch').value = name;
      renderPicker();
    }, { name: p.search.trim(), muscle: p.muscle });
  },

  'set-unit'(el) { state.settings.unit = el.dataset.v; save(true); openSettings(); render({ keepScroll: true }); },
  'set-rest'(el) { state.settings.rest = +el.dataset.v; save(true); openSettings(); },
  export: exportData,
  import: importData,
  reset() {
    confirmModal('Reset all data?', 'This deletes every workout, routine and custom exercise — also from the cloud if you are signed in. Export a backup first if you want to keep them.', 'Delete everything', () => {
      state = freshState(); save(true); ui.stack = []; ui.rest = null; render(); toast('All data reset');
    }, true);
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el, e); }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.field && state.active) {
    const row = t.closest('.set-row');
    const set = findWE(row.dataset.we)?.sets.find((s) => s.id === row.dataset.set);
    if (!set) return;
    if (t.dataset.field === 'weight') set.weight = t.value.trim() === '' ? null : fromDisp(t.value);
    else { const n = parseInt(t.value, 10); set.reps = isFinite(n) && n > 0 ? n : null; }
    save();
  } else if (t.id === 'workoutName' && state.active) {
    state.active.name = t.value; save();
  } else if (t.id === 'routineName' && ui.draft) {
    ui.draft.name = t.value;
  } else if (t.id === 'exSearch') {
    ui.exSearch = t.value; $('#exList').innerHTML = exListHtml();
  } else if (t.id === 'pickerSearch' && ui.picker) {
    ui.picker.search = t.value; renderPicker();
  }
});

// Enter in a set input jumps to the next input
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
  if (e.key === 'Enter' && ['pickerSearch', 'exSearch'].includes(e.target.id)) { e.preventDefault(); e.target.blur(); return; }
  if (e.key !== 'Enter' || !e.target.classList.contains('num')) return;
  e.preventDefault();
  const inputs = [...document.querySelectorAll('.num')];
  const next = inputs[inputs.indexOf(e.target) + 1];
  if (next) next.focus(); else e.target.blur();
});

/* ---------------- Keyboard-aware viewport ---------------- */
// Phone keyboards cover the bottom of the screen without resizing the page.
// Track the visible area so pop-ups always sit above the keyboard.
function syncViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement.style;
  root.setProperty('--vv-height', `${vv.height}px`);
  root.setProperty('--vv-top', `${vv.offsetTop}px`);
}
window.visualViewport?.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('scroll', syncViewport);
syncViewport();

/* ---------------- Boot ---------------- */
render();
navigator.storage?.persist?.().catch(() => {});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
