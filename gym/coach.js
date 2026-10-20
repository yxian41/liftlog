'use strict';

/* =========================================================
   Ask Coach
   Builds a short, coach-ready summary of your training,
   copies it, and opens Claude (claude.ai / the Claude app).
   You paste it there, so it runs on your own Claude plan.

   Import plan
   Paste a plan Claude wrote ("Monday: Upper A" + lines like
   "Barbell Bench Press — 4 × 6–8 @ 60 kg") and it becomes
   routines, with sets, rep ranges and starting weights.
   ========================================================= */

window.LiftCoach = (() => {
  const GOALS = ['Build muscle', 'Get stronger', 'Build muscle & strength', 'Lose fat, keep muscle', 'General fitness'];
  const LEVELS = ['Beginner (under 1 year)', 'Intermediate (1–3 years)', 'Advanced (3+ years)'];
  const WEEKS = 8; // history window for trends
  const ROUTINE_FORMAT = 'Write each day as a heading like "Monday: Upper A", then one line per exercise like "Barbell Bench Press — 4 × 6–8 @ 60 kg".';

  const TOPICS = {
    review: { label: 'Review my last workout', ask: 'Review this workout: what went well, and what weight × reps should I aim for on each exercise next time?' },
    weekly: { label: 'Weekly check-in', ask: 'Weekly check-in: enough sets per muscle? What’s progressing vs stalling? Give me my top 3 focuses for next week.' },
    plateau: { label: 'Break a plateau', ask: 'Look at my stalled lifts (⚠️): what are the likely reasons, and what’s a concrete plan to break through?' },
    routine: { label: 'Build me a new routine', ask: `Design a weekly plan for my goal and schedule, using my numbers for starting weights. ${ROUTINE_FORMAT}` },
    custom: { label: 'Ask my own question', ask: '' },
  };

  let topic = 'weekly';
  let workoutId = null;
  let fullLog = false;

  const coach = () => state.settings.coach;

  /* ---------- Compact training summary ---------- */
  const day = (ts) => fmtDate(ts, { month: 'short', day: 'numeric' });
  const w = (kg) => fmtNum(toDisp(kg));

  // 60×10,9,8 when the weight stays the same; "60×10, 65×8" when it changes; "10,9,8 reps" for bodyweight
  function setsTxt(sets) {
    const groups = [];
    for (const s of sets) {
      const g = groups.at(-1);
      if (g && g.weight === (s.weight || 0)) g.reps.push(s.reps);
      else groups.push({ weight: s.weight || 0, reps: [s.reps] });
    }
    return groups.map((g) => (g.weight ? `${w(g.weight)}×${g.reps.join(',')}` : `${g.reps.join(',')} reps`)).join(', ');
  }

  function liftRows(since) {
    const rows = [];
    for (const ex of state.exercises) {
      const all = sessionsFor(ex.id);
      const recent = all.filter((s) => s.date >= since);
      if (!recent.length) continue;
      const bw = isBodyweight(all);
      const score = (s) => { const m = sessionMetrics(s.sets); return bw ? m.reps : m.e1rm; };
      const first = score(recent[0]), last = score(recent.at(-1));
      let mark = '🆕', stalled = false;
      if (recent.length >= 2) mark = last > first * 1.005 ? '↑' : last < first * 0.995 ? '↓' : '→';
      if (all.length >= 4 && Math.max(...all.slice(-3).map(score)) <= Math.max(...all.slice(0, -3).map(score))) { mark = '⚠️ stalled'; stalled = true; }
      const trend = recent.length >= 2 ? (bw ? ` ${first}→${last} reps` : ` ${Math.round(toDisp(first))}→${Math.round(toDisp(last))}`) : '';
      rows.push({ ex, stalled, flat: mark === '→' || mark === '↓', text: `• ${ex.name}${trend} ${mark} · last ${setsTxt(recent.at(-1).sets)}` });
    }
    const order = (r) => MUSCLES.indexOf(r.ex.muscle);
    return rows.sort((a, b) => order(a) - order(b) || a.ex.name.localeCompare(b.ex.name));
  }

  const workoutLine = (wk) => `${day(wk.start)} ${wk.name}: ${wk.exercises.map((we) => `${exName(we.exerciseId)} ${setsTxt(we.sets)}`).join(' · ')}`;

  function buildReport() {
    const c = coach();
    const extra = (document.getElementById('coachExtra')?.value || '').trim();
    const ask = topic === 'custom' ? extra : TOPICS[topic].ask + (extra ? `\nAlso: ${extra}` : '');
    const since = Date.now() - WEEKS * 7 * DAY;
    const workouts = [...state.workouts].sort((a, b) => b.start - a.start);
    const L = [ask, '', '— My LiftLog data —'];
    L.push(`Me: ${c.goal} · ${c.level.split(' (')[0]} · ${c.days} days/week · ${unit()}`);

    if (!workouts.length) {
      L.push('No workouts logged yet.');
    } else if (topic === 'review') {
      const wk = state.workouts.find((x) => x.id === workoutId) || workouts[0];
      L.push(`Workout: ${wk.name}, ${fmtDate(wk.start)}, ${fmtDur(wk.end - wk.start)}`);
      for (const we of wk.exercises) {
        const ex = exById(we.exerciseId);
        const prev = sessionsFor(we.exerciseId).filter((s) => s.date < wk.start).at(-1);
        L.push(`• ${exName(we.exerciseId)}${ex ? ` [${ex.repMin}–${ex.repMax}]` : ''}: ${setsTxt(we.sets)} (${prev ? `prev ${setsTxt(prev.sets)}` : 'first time'})`);
      }
      if (wk.prs?.length) L.push(`PRs: ${wk.prs.map((p) => exName(p.exerciseId)).join(', ')}`);
    } else {
      const { perMuscle } = recentTotals(7);
      L.push(`Sets last 7 days (aim 10–20): ${MUSCLES.map((m) => `${m} ${perMuscle[m]}`).join(', ')}`);

      let rows = liftRows(since);
      if (topic === 'plateau') {
        const stuck = rows.filter((r) => r.stalled || r.flat);
        if (stuck.length) {
          const others = rows.length - stuck.length;
          rows = stuck;
          if (others) rows.push({ text: `(${others} other lift${others > 1 ? 's' : ''} progressing)` });
        }
      }
      if (rows.length) L.push(`Lifts, last ${WEEKS} weeks (est. 1RM first→last):`, ...rows.map((r) => r.text));

      if (topic === 'routine' && state.routines.length) {
        L.push('Current routines:', ...state.routines.map((r) => `• ${r.name}: ${r.exerciseIds.map(exName).join(', ')}`));
      }
      const logCount = fullLog ? 12 : topic === 'custom' ? 3 : 0;
      const recent = workouts.filter((x) => x.start >= since).slice(0, logCount);
      if (recent.length) L.push(fullLog ? 'Workout log:' : 'Last workouts:', ...recent.map(workoutLine));
    }
    L.push(`(60×9,8,7 = 3 sets at 60 ${unit()} for 9, 8, 7 reps · ↑ up · → flat · ↓ down · ⚠️ no new best in 3+ sessions)`);
    return L.join('\n');
  }

  /* ---------- Ask Coach UI ---------- */
  function cardHtml() {
    return `<div class="card coach-card">
      <div class="row-between"><div><h2>🤖 Ask Coach</h2><p class="muted small">Get advice from Claude based on your real training data.</p></div></div>
      <div class="row-gap">
        <button class="btn primary sm" data-action="coach-open" data-kind="weekly">Weekly check-in</button>
        <button class="btn sm" data-action="coach-open" data-kind="custom">Ask a question</button>
      </div>
    </div>`;
  }

  function sheetHtml() {
    const c = coach();
    const opt = (list, v) => list.map((x) => `<option ${String(x) === String(v) ? 'selected' : ''}>${x}</option>`).join('');
    return `<div class="sheet">
      <div class="sheet-head"><button class="btn ghost sm" data-action="modal-close">Close</button><h2>Ask Coach</h2><span></span></div>
      <p class="muted small">LiftLog copies a short summary of your training, then opens Claude. Paste it there and chat. It uses your own Claude plan, so there's no extra cost.</p>
      <div class="picker-list" id="coachTopics">${Object.entries(TOPICS).map(([k, t]) => `<button class="pick ${k === topic ? 'sel' : ''}" data-action="coach-topic" data-kind="${k}">
          <div class="grow">${t.label}</div><span class="box radio">${icon('check', 16)}</span></button>`).join('')}</div>
      <label class="label">${topic === 'custom' ? 'Your question' : 'Anything to add? (optional)'}
        <textarea id="coachExtra" class="input textarea" rows="3" placeholder="${topic === 'custom' ? 'e.g. How do I grow my side delts?' : 'e.g. My left knee feels sore on squats'}"></textarea></label>
      ${topic === 'review' ? '' : `<label class="check-row"><input type="checkbox" id="coachFull" ${fullLog ? 'checked' : ''}> Include full workout log (longer)</label>`}
      <details class="coach-about" ${c.goal ? '' : 'open'}>
        <summary>About you · ${esc(c.goal)} · ${c.days} days/week</summary>
        <div class="grid-2">
          <label class="label">Goal<select class="input" data-coach="goal">${opt(GOALS, c.goal)}</select></label>
          <label class="label">Days per week<select class="input" data-coach="days">${opt([2, 3, 4, 5, 6], c.days)}</select></label>
        </div>
        <label class="label">Experience<select class="input" data-coach="level">${opt(LEVELS, c.level)}</select></label>
        <label class="label">Your Claude “Gym Coach” project link (optional)
          <input class="input" data-coach="projectUrl" type="url" inputmode="url" autocomplete="off" placeholder="https://claude.ai/project/…" value="${esc(c.projectUrl)}"></label>
        <p class="muted small">If you add a project link, the coach opens there so it remembers your coaching instructions.</p>
      </details>
      <button class="btn primary block lg" data-action="coach-go">Copy &amp; open Claude</button>
      <p class="small" id="coachMsg" hidden></p>
      <details class="coach-preview"><summary>Preview what gets copied</summary><pre id="coachPreview"></pre></details>
    </div>`;
  }

  function open(kind, id) {
    topic = TOPICS[kind] ? kind : 'weekly';
    workoutId = id || null;
    showModal(sheetHtml());
  }

  const claudeUrl = () => {
    const u = (coach().projectUrl || '').trim();
    return /^https:\/\/claude\.ai\//.test(u) ? u : 'https://claude.ai/new';
  };

  function message(html, isError = false) {
    const el = document.getElementById('coachMsg');
    if (!el) return;
    el.hidden = false;
    el.style.color = isError ? 'var(--danger)' : 'var(--good)';
    el.innerHTML = html;
  }

  // Older iPhones / non-HTTPS pages: copy through a hidden textarea
  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }

  function go() {
    if (topic === 'custom' && !(document.getElementById('coachExtra')?.value || '').trim()) {
      message('Type your question first.', true);
      document.getElementById('coachExtra')?.focus();
      return;
    }
    const text = buildReport();
    document.getElementById('coachPreview').textContent = text;
    const opened = () => message(topic === 'routine'
      ? '✓ Copied! Paste it in Claude and send. When Claude replies with your plan, copy it and tap <b>Workout → 📋 Import</b> to turn it into routines.'
      : '✓ Copied! In Claude, tap the message box → <b>Paste</b> → send.');
    const failed = () => {
      message('Couldn’t copy automatically. Open the preview below, select all the text and copy it.', true);
      document.querySelector('.coach-preview').open = true;
    };
    // Copy and open in the same tap so the browser allows both
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(opened, () => (legacyCopy(text) ? opened() : failed()));
    else if (legacyCopy(text)) opened(); else failed();
    window.open(claudeUrl(), '_blank', 'noopener');
  }

  /* ---------- Import a plan from Claude ---------- */
  // "• Barbell Bench Press — 4 × 6–8 @ 60 kg" (bullets, dash style, "x" and the weight are all optional)
  const EX_RE = /^(?:[-*•‣▪]|\d+[.)])?\s*(.+?)\s+[—–-]\s+(\d+)\s*(?:sets?\s*)?[×xX]\s*(\d+)(?:\s*[–—-]\s*(\d+))?\s*(?:reps?)?(?:\s*@\s*(.+?))?\s*$/;
  const WEEKDAY = /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b|^day\s*\d/i;
  const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '').replace(/e?s$/, '');

  let plan = null; // { days: [{ name, items: [{ name, sets, repMin, repMax, weight, exerciseId|null, key }] }], newOnes: Map }

  function parseWeight(txt) {
    if (!txt || /body\s*weight|^bw\b/i.test(txt)) return null;
    const m = txt.match(/([\d.,]+)\s*(kgs?|lbs?)?/i);
    if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.'));
    if (!isFinite(n) || n <= 0) return null;
    if (!m[2]) return fromDisp(n);
    return /lb/i.test(m[2]) ? n * KG_PER_LB : n;
  }

  function headingName(h) {
    const parts = h.split(/\s*[:–—-]\s+|\s*:\s*/);
    if (parts.length > 1 && WEEKDAY.test(parts[0]) && parts.slice(1).join(' ').trim()) return parts.slice(1).join(' ').trim();
    return h;
  }

  function parsePlan(text) {
    const days = [];
    let cur = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/\*\*|__|`/g, '').trim();
      if (!line) continue;
      const m = line.match(EX_RE);
      if (m) {
        if (!cur) { cur = { name: 'Imported routine', items: [] }; days.push(cur); }
        const [, name, sets, a, b, weight] = m;
        const repMin = +a, repMax = b ? +b : +a;
        cur.items.push({ name: name.replace(/^[-*•\s]+/, '').trim(), sets: Math.min(+sets, 10), repMin: Math.min(repMin, repMax), repMax: Math.max(repMin, repMax), weight: parseWeight(weight) });
        continue;
      }
      const h = line.replace(/^#+\s*/, '').replace(/:$/, '').trim();
      if (h.length <= 40 && !/[.!?]$/.test(h) && (/^#/.test(line) || /:$/.test(line) || WEEKDAY.test(h))) {
        cur = { name: headingName(h), items: [] };
        days.push(cur);
      }
    }
    return days.filter((d) => d.items.length);
  }

  function matchExercise(name) {
    const n = norm(name);
    const lib = state.exercises.map((e) => ({ e, n: norm(e.name) }));
    const exact = lib.find((x) => x.n === n && !x.e.archived) || lib.find((x) => x.n === n);
    if (exact) return exact.e;
    const loose = lib.filter((x) => !x.e.archived && n.length >= 5 && (x.n.endsWith(n) || n.endsWith(x.n)));
    return loose.length === 1 ? loose[0].e : null;
  }

  function guessMuscle(name) {
    const n = name.toLowerCase();
    const rules = [
      [/calf|calves/, 'Calves'], [/leg curl|nordic|hamstring|good morning|leg extension|squat|lunge|leg press|glute|hip thrust|romanian|rdl|step.?up/, 'Legs'],
      [/crunch|ab |abs|plank|leg raise|sit.?up|rollout|core|oblique/, 'Abs'], [/tricep|pushdown|skull|close.?grip|dip/, 'Triceps'],
      [/curl/, 'Biceps'], [/lateral|delt|overhead press|shoulder|face pull|shrug|military|arnold/, 'Shoulders'],
      [/bench|chest|fly|flye|push.?up|pec/, 'Chest'], [/row|pulldown|pull.?up|chin.?up|deadlift|lat\b|back/, 'Back'],
    ];
    return (rules.find(([re]) => re.test(n)) || [null, 'Legs'])[1];
  }
  const guessEquipment = (name) => (EQUIPMENT.find((e) => name.toLowerCase().includes(e.toLowerCase())) || 'Other');

  function importStartHtml(text = '') {
    return `<div class="sheet">
      <div class="sheet-head"><button class="btn ghost sm" data-action="modal-close">Cancel</button><h2>Import plan</h2><button class="btn primary sm" data-action="plan-preview">Next</button></div>
      <p class="muted small">Paste a training plan from Claude. LiftLog turns each day into a routine, with its sets, rep ranges and starting weights.</p>
      <textarea id="planText" class="input textarea" rows="10" placeholder="Monday: Upper A&#10;• Barbell Bench Press — 4 × 6–8&#10;• Barbell Row — 4 × 6–8 @ 60 kg&#10;…">${esc(text)}</textarea>
      <p class="small" id="planMsg" hidden></p>
      <p class="muted small">Tip: ask the coach for <b>Build me a new routine</b> and it replies in the right format.</p>
    </div>`;
  }

  function previewHtml() {
    const newNames = [...plan.newOnes.values()];
    const rows = plan.days.map((d, di) => `<div class="card">
        <input class="input plan-name" data-day="${di}" value="${esc(d.name)}" aria-label="Routine name">
        ${d.items.map((it) => `<div class="row-between small plan-item">
            <span>${esc(it.exerciseId ? exName(it.exerciseId) : it.name)}${it.exerciseId ? '' : ' <span class="tag">New</span>'}</span>
            <span class="muted tnum">${it.sets} × ${it.repMin === it.repMax ? it.repMin : `${it.repMin}–${it.repMax}`}${it.weight ? ` @ ${fmtW(it.weight)}` : ''}</span>
          </div>`).join('')}
      </div>`).join('');
    const newBlock = newNames.length ? `<div class="card"><h3>New exercises</h3>
        <p class="muted small">These aren't in your library yet. Check the muscle group for each.</p>
        ${newNames.map((x) => `<div class="field"><span class="small">${esc(x.name)}</span>
          <select class="input plan-muscle" data-key="${esc(x.key)}" style="max-width:150px">${MUSCLES.map((m) => `<option ${m === x.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></div>`).join('')}
      </div>` : '';
    return `<div class="sheet">
      <div class="sheet-head"><button class="btn ghost sm" data-action="plan-back">Back</button><h2>${plan.days.length} routine${plan.days.length > 1 ? 's' : ''}</h2><button class="btn primary sm" data-action="plan-save">Save</button></div>
      ${rows}
      ${newBlock}
      ${state.routines.length ? `<label class="check-row"><input type="checkbox" id="planReplace"> Replace my current ${state.routines.length} routines</label>` : ''}
    </div>`;
  }

  function preview() {
    const text = document.getElementById('planText').value;
    const days = parsePlan(text);
    if (!days.length) {
      const el = document.getElementById('planMsg');
      el.hidden = false; el.style.color = 'var(--danger)';
      el.textContent = 'Couldn’t find any exercises. Each exercise needs a line like “Barbell Row — 4 × 6–8”.';
      return;
    }
    const newOnes = new Map();
    for (const d of days) {
      for (const it of d.items) {
        const ex = matchExercise(it.name);
        it.exerciseId = ex?.id || null;
        it.key = norm(it.name);
        if (!ex && !newOnes.has(it.key)) newOnes.set(it.key, { key: it.key, name: it.name, muscle: guessMuscle(it.name), repMin: it.repMin, repMax: it.repMax });
      }
    }
    plan = { text, days, newOnes };
    showModal(previewHtml());
  }

  function savePlan() {
    document.querySelectorAll('.plan-muscle').forEach((sel) => { plan.newOnes.get(sel.dataset.key).muscle = sel.value; });
    document.querySelectorAll('.plan-name').forEach((inp) => { plan.days[+inp.dataset.day].name = inp.value.trim() || plan.days[+inp.dataset.day].name; });
    const created = {};
    for (const x of plan.newOnes.values()) {
      const id = 'cx-' + uid();
      state.exercises.push({ id, name: x.name, muscle: x.muscle, equipment: guessEquipment(x.name), repMin: x.repMin, repMax: x.repMax, custom: true });
      created[x.key] = id;
    }
    if (document.getElementById('planReplace')?.checked) {
      state.routines.forEach((r) => tombstone('routines', r.id));
      state.routines = [];
    }
    for (const d of plan.days) {
      const exerciseIds = [], targets = {};
      for (const it of d.items) {
        const id = it.exerciseId || created[it.key];
        const ex = exById(id);
        if (ex?.archived) ex.archived = false;
        if (exerciseIds.includes(id)) continue;
        exerciseIds.push(id);
        targets[id] = { sets: it.sets, repMin: it.repMin, repMax: it.repMax, weight: it.weight };
      }
      state.routines.push({ id: uid(), name: d.name, exerciseIds, targets });
    }
    const n = plan.days.length;
    plan = null;
    save(true);
    closeModal();
    ui.tab = 'workout'; ui.stack = [];
    render();
    toast(`Added ${n} routine${n > 1 ? 's' : ''} from your coach 💪`);
  }

  /* ---------- Actions ---------- */
  Object.assign(actions, {
    'coach-open'(el) { open(el.dataset.kind, el.dataset.id); },
    'coach-topic'(el) {
      const extra = document.getElementById('coachExtra')?.value || '';
      topic = el.dataset.kind;
      const about = document.querySelector('.coach-about')?.open;
      showModal(sheetHtml());
      document.getElementById('coachExtra').value = extra;
      if (about) document.querySelector('.coach-about').open = true;
    },
    'coach-go': go,
    'plan-import'() { showModal(importStartHtml()); },
    'plan-preview': preview,
    'plan-back'() { showModal(importStartHtml(plan?.text || '')); },
    'plan-save': savePlan,
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'coachFull') { fullLog = e.target.checked; return; }
    const key = e.target.dataset?.coach;
    if (!key) return;
    let v = e.target.value.trim();
    if (key === 'days') v = +v;
    if (key === 'projectUrl' && v && !/^https:\/\/claude\.ai\//.test(v)) {
      toast('That link should start with https://claude.ai/');
      return;
    }
    coach()[key] = v;
    save();
    const sum = document.querySelector('.coach-about summary');
    if (sum) sum.textContent = `About you · ${coach().goal} · ${coach().days} days/week`;
  });

  return { cardHtml, open, buildReport, parsePlan };
})();

// The first screen was drawn before this file loaded; redraw so the coach buttons appear
render({ keepScroll: true });
