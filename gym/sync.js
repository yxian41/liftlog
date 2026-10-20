'use strict';

/* =========================================================
   Cloud sync (Supabase)
   - The app always saves to this device first (works offline).
   - When signed in, the whole data set is synced to one row
     per user in the `liftlog_data` table.
   - If two devices both changed things, the data is merged:
     workouts / routines / exercises are combined by id, and
     anything deleted on either device stays deleted.
   ========================================================= */

window.LiftSync = (() => {
  const cfg = window.LIFTLOG_CONFIG || {};
  const TABLE = 'liftlog_data';
  const META_KEY = 'liftlog.sync';
  const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);

  let client = null;
  let session = null;
  let authKnown = false; // don't flash the banner before we know whether you're signed in
  const SNOOZE_KEY = 'liftlog.bannerSnooze';
  let status = 'idle'; // idle | syncing | synced | pending | offline | error
  let lastError = '';
  let syncing = false;
  let again = false;
  let pushTimer = null;
  let rev = 0;
  let meta = readMeta(); // { userId, version, dirty, lastSync }

  function readMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch { return {}; }
  }
  function writeMeta() {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* storage unavailable */ }
  }

  /* ---------- Merge two copies of the data ---------- */
  function mergeStates(a, b) {
    const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b;
    const older = newer === a ? b : a;
    const deleted = {};
    for (const k of ['workouts', 'routines', 'exercises']) {
      deleted[k] = [...new Set([...(a.deleted?.[k] || []), ...(b.deleted?.[k] || [])])];
    }
    const unionById = (k) => {
      const map = new Map();
      for (const x of older[k] || []) map.set(x.id, x);
      for (const x of newer[k] || []) map.set(x.id, x); // newer copy wins on conflicts
      return [...map.values()].filter((x) => !deleted[k].includes(x.id));
    };
    const workouts = unionById('workouts').sort((x, y) => x.start - y.start);
    const keepActive = (w) => w && !deleted.workouts.includes(w.id) && !workouts.some((x) => x.id === w.id);
    return {
      ...older,
      ...newer,
      settings: { ...older.settings, ...newer.settings },
      exercises: unionById('exercises'),
      routines: unionById('routines'),
      workouts,
      active: keepActive(newer.active) ? newer.active : keepActive(older.active) ? older.active : null,
      deleted,
      updatedAt: Date.now(),
    };
  }

  function applyState(data) {
    state = normalizeState(data);
    writeNow();
    render({ keepScroll: true });
  }

  const isEditing = () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);

  /* ---------- Sync ---------- */
  async function sync() {
    if (!client || !session) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    if (syncing) { again = true; return; }
    syncing = true;
    setStatus('syncing');
    try {
      const userId = session.user.id;
      if (meta.userId !== userId) meta = { userId, version: null, dirty: true }; // first sync on this device: merge

      const { data: row, error } = await client.from(TABLE).select('data, updated_at').eq('user_id', userId).maybeSingle();
      if (error) throw error;

      if (row && row.updated_at !== meta.version) {
        // Someone (another device) changed the cloud copy since we last synced
        if (isEditing()) { setStatus('pending'); return; } // don't redraw while you're typing; retry soon
        if (meta.dirty) {
          applyState(mergeStates(state, row.data));
        } else {
          applyState(row.data);
          meta.version = row.updated_at;
        }
      }
      if (!row || meta.dirty) await push(userId);
      meta.lastSync = Date.now();
      writeMeta();
      lastError = '';
      setStatus('synced');
    } catch (e) {
      lastError = e?.message || String(e);
      console.warn('Sync failed', e);
      setStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      syncing = false;
      if (again || status === 'pending') { again = false; schedule(status === 'pending' ? 5000 : 500); }
    }
  }

  async function push(userId) {
    const revAtStart = rev;
    const { data, error } = await client
      .from(TABLE)
      .upsert({ user_id: userId, data: state, updated_at: new Date().toISOString() })
      .select('updated_at')
      .single();
    if (error) throw error;
    meta.version = data.updated_at;
    meta.dirty = rev !== revAtStart; // still dirty if you changed something mid-upload
    writeMeta();
  }

  function schedule(ms) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(sync, ms);
  }

  function onLocalChange() {
    rev++;
    meta.dirty = true;
    writeMeta();
    if (session) schedule(2500);
  }

  /* ---------- "Not backed up" banner ---------- */
  function snoozed() {
    try { return Number(localStorage.getItem(SNOOZE_KEY)) > Date.now(); } catch { return false; }
  }
  function bannerHtml() {
    if (!client || !authKnown || session || snoozed()) return '';
    const n = state.workouts.length;
    if (!n) return '';
    return `<div class="card sync-banner" role="status">
      <div><b>⚠️ Your workouts aren't backed up</b>
      <p class="small muted">${n} workout${n > 1 ? 's are' : ' is'} only saved on this device. Sign in to back up and sync with your other devices.</p></div>
      <div class="row-gap">
        <button class="btn primary sm" data-action="banner-signin">Sign in</button>
        <button class="btn ghost sm" data-action="banner-later">Later</button>
      </div>
    </div>`;
  }
  function updateBanner() {
    const el = document.getElementById('syncBanner');
    if (el) el.innerHTML = bannerHtml();
  }

  /* ---------- Settings card ---------- */
  function statusText() {
    switch (status) {
      case 'syncing': return 'Syncing…';
      case 'pending': return 'Changes waiting to sync…';
      case 'offline': return 'Offline. Your workouts are saved on this device and will sync when you are back online.';
      case 'error': return `⚠️ Sync problem: ${esc(lastError)}`;
      default: return meta.lastSync ? `✓ Synced ${timeAgo(meta.lastSync)}` : 'Not synced yet';
    }
  }
  function timeAgo(ts) {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 45) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    return fmtDate(ts) + ' ' + new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function cardHtml() {
    const head = '<h3>☁️ Cloud sync</h3>';
    if (!configured) {
      return `${head}<p class="muted small">Not set up yet. Add your Supabase Project URL and key to <b>config.js</b> to back up your data online and sync between devices (see README).</p>`;
    }
    if (!client) {
      return `${head}<p class="muted small">Couldn't load the sync library. Check your internet connection and reopen the app. Your data is still saved on this device.</p>`;
    }
    if (!session) {
      return `${head}<p class="muted small">Sign in to back up your workouts online and keep your phone and computer in sync.</p>
        <input id="cEmail" class="input" type="email" autocomplete="email" placeholder="Email">
        <input id="cPass" class="input" type="password" autocomplete="current-password" placeholder="Password (6+ characters)">
        <div class="grid-2"><button class="btn primary" data-action="cloud-signin">Sign in</button><button class="btn" data-action="cloud-signup">Create account</button></div>
        <p class="small" id="cMsg"></p>`;
    }
    return `<div class="account-row"><span class="avatar lg" aria-hidden="true">${esc(initial())}</span>
        <div class="grow"><b>${esc(displayName() || 'Signed in')}</b><div class="small muted">${esc(session.user.email)}</div></div></div>
      <p class="small muted" id="cStatus">${statusText()}</p>
      <div class="grid-2"><button class="btn" data-action="cloud-sync">Sync now</button><button class="btn danger" data-action="cloud-signout">Sign out</button></div>`;
  }
  function refreshCard() {
    const el = document.getElementById('cloudCard');
    if (el) el.innerHTML = cardHtml();
  }

  /* ---------- Header account button ---------- */
  function displayName() {
    const meta = session?.user?.user_metadata || {};
    return (meta.full_name || meta.name || '').trim();
  }
  function initial() {
    const ch = [...(displayName() || session?.user?.email || '')].find((c) => /\p{L}|\p{N}/u.test(c));
    return (ch || '?').toUpperCase();
  }
  function accountBtnHtml() {
    if (!client) return `<button class="icon-btn" data-action="settings" aria-label="Settings">${icon('gear', 22)}</button>`;
    if (!authKnown) return '<span class="avatar placeholder" aria-hidden="true"></span>';
    if (session) return `<button class="avatar" data-action="settings" aria-label="Account and settings for ${esc(session.user.email)}">${esc(initial())}</button>`;
    return '<button class="btn primary sm" data-action="banner-signin">Sign in</button>';
  }
  function updateAccountBtn() {
    document.querySelectorAll('.account-slot').forEach((el) => { el.innerHTML = accountBtnHtml(); });
  }
  function setStatus(s) {
    status = s;
    const el = document.getElementById('cStatus');
    if (el) el.innerHTML = statusText();
  }
  function cardMessage(text, isError = false) {
    const el = document.getElementById('cMsg');
    if (el) { el.textContent = text; el.style.color = isError ? 'var(--danger)' : 'var(--good)'; }
  }
  function credentials() {
    const email = document.getElementById('cEmail')?.value.trim();
    const password = document.getElementById('cPass')?.value || '';
    if (!email || password.length < 6) { cardMessage('Enter your email and a password of at least 6 characters.', true); return null; }
    return { email, password };
  }

  /* ---------- Actions (buttons in the settings card) ---------- */
  Object.assign(actions, {
    async 'cloud-signin'() {
      const c = credentials();
      if (!c) return;
      cardMessage('Signing in…');
      const { error } = await client.auth.signInWithPassword(c);
      if (error) cardMessage(error.message, true);
    },
    async 'cloud-signup'() {
      const c = credentials();
      if (!c) return;
      cardMessage('Creating account…');
      const { data, error } = await client.auth.signUp({ ...c, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) cardMessage(error.message, true);
      else if (!data.session) cardMessage('Account created! Check your email for a confirmation link, then come back and tap Sign in.');
    },
    'cloud-sync'() { sync(); },
    'banner-signin'() {
      openSettings();
      const card = document.getElementById('cloudCard');
      card?.scrollIntoView({ block: 'center' });
      setTimeout(() => document.getElementById('cEmail')?.focus(), 250);
    },
    'banner-later'() {
      try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + 3 * 86400000)); } catch { /* storage unavailable */ }
      updateBanner();
      toast("OK, I'll remind you in 3 days");
    },
    'cloud-signout'() {
      confirmModal('Sign out?', 'Your data stays on this device. It just stops syncing until you sign in again.', 'Sign out', async () => {
        await client.auth.signOut();
        toast('Signed out');
      });
    },
  });

  /* ---------- Start ---------- */
  if (configured && window.supabase?.createClient) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    client.auth.onAuthStateChange((event, s) => {
      const wasSignedIn = Boolean(session);
      session = s;
      authKnown = true;
      refreshCard();
      updateBanner();
      updateAccountBtn();
      if (s) {
        if (!wasSignedIn && event === 'SIGNED_IN') toast(`Signed in as ${s.user.email}`);
        setTimeout(sync, 0); // don't call Supabase from inside the auth callback
      }
    });
    window.addEventListener('online', () => sync());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
    setInterval(() => { if (!document.hidden) sync(); }, 60000);
  }

  // sync.js loads after the first screen is drawn: fill in the header button now
  setTimeout(updateAccountBtn, 0);

  return { cardHtml, bannerHtml, accountBtnHtml, onLocalChange, sync, mergeStates, get configured() { return configured; } };
})();
