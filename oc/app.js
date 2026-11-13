/* OpenCode Remote — пульт управления чатами OpenCode Desktop с телефона. */
'use strict';

const VERSION = '1.0.0';
const store = {
  get: k => localStorage.getItem('oc-' + k),
  set: (k, v) => v == null ? localStorage.removeItem('oc-' + k) : localStorage.setItem('oc-' + k, v),
};

let base = null, info = null, authed = false, pending = null, booting = false, evCtl = null;
const S = {
  sessions: [], next: null, active: {}, runStart: {}, perm: {}, projects: [], q: '', dir: '', archived: false,
  models: null, agents: null, commands: null, cur: null, live: false, up: true, steer: store.get('steer') === '1', titles: {},
};

/* ================= экран привязки ================= */

let gateSubmit = null;
function gate({ msg = '', err = false, input = null, retry = false } = {}) {
  $('#gate').classList.add('open');
  $('#gateMsg').textContent = msg;
  $('#gateMsg').className = err ? 'err' : '';
  const inp = $('#gateInput');
  inp.hidden = $('#gateBtn').hidden = !input;
  gateSubmit = input?.submit || null;
  if (input) {
    inp.value = '';
    inp.placeholder = input.placeholder;
    inp.className = input.code ? 'code' : '';
    inp.inputMode = input.code ? 'numeric' : 'url';
    inp.autocomplete = input.code ? 'one-time-code' : 'off';
    $('#gateBtn').textContent = input.button;
    setTimeout(() => inp.focus(), 60);
  }
  $('#gateRetry').hidden = !retry;
  $('#gateRetry').textContent = typeof retry === 'string' ? retry : 'Повторить';
  $('#gateInfo').textContent = info?.updated ? 'Адрес компьютера обновлён: ' + new Date(info.updated).toLocaleString('ru-RU') : '';
}
const ungate = () => $('#gate').classList.remove('open');
$('#gateBtn').onclick = () => gateSubmit?.($('#gateInput').value.trim());
$('#gateInput').onkeydown = e => { if (e.key === 'Enter') $('#gateBtn').click(); };
$('#gateRetry').onclick = () => boot();

/* ================= связь ================= */

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64u = s => b64(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4));

async function decryptUrl(keyText) {
  const key = await crypto.subtle.importKey('raw', b64u(keyText), 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(info.iv) }, key, b64(info.data));
  return JSON.parse(new TextDecoder().decode(plain)).url;
}
const offline = msg => Object.assign(new Error(msg), { offline: true });
async function resolveBase() {
  if (info.self) return location.origin;
  if (info.v !== 2 || !info.data) throw offline('Компьютер ещё не опубликовал адрес. Подождите минуту и повторите.');
  const key = store.get('key');
  if (!key) throw Object.assign(new Error(''), { unpaired: true });
  try { return await decryptUrl(key); } catch { throw Object.assign(new Error('Привязка устарела (на компьютере её сбросили). Привяжите заново.'), { unpaired: true, stale: true }); }
}

function parsePair(text) {
  const m = /[#&]pair=([\w-]{43})\.([\w-]{16,})/.exec(text || '');
  return m ? { key: m[1], code: m[2] } : null;
}
pending = parsePair(location.hash);
if (pending) history.replaceState(null, '', location.pathname + location.search);

function deviceName() {
  const ua = navigator.userAgent;
  const model = /Android [\d.]+; (?:[a-z]{2}-[a-z]{2}; )?([^;)]+?)(?: Build|\))/i.exec(ua)?.[1];
  const kind = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : 'Браузер';
  return model && model !== 'K' ? `${model} (${kind})` : kind;
}

let gotUnauthorized = false;
async function api(path, { method = 'GET', body, timeout = 30000, signal } = {}) {
  const headers = { authorization: 'Bearer ' + store.get('token') };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  signal?.addEventListener('abort', () => ctl.abort());
  let res;
  try {
    res = await fetch(base + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: ctl.signal, cache: 'no-store' });
  } catch {
    if (signal?.aborted) throw Object.assign(new Error('Отменено'), { aborted: true });
    markNet(false);
    throw Object.assign(new Error('Нет связи с компьютером'), { net: true });
  } finally { clearTimeout(t); }
  markNet(true);
  const text = await res.text();
  let j = null;
  try { j = text ? JSON.parse(text) : null; } catch { j = { raw: text.slice(0, 300) }; }
  if (res.status === 401 && !path.startsWith('/br/pair')) {
    if (!gotUnauthorized) { gotUnauthorized = true; setTimeout(() => { gotUnauthorized = false; boot(); }, 300); }
    throw Object.assign(new Error('Требуется вход'), { status: 401, auth: true });
  }
  if (!res.ok) {
    const nice = j?._tag === 'SessionBusyError' ? 'Чат сейчас занят: дождитесь ответа или нажмите «Стоп»'
      : res.status === 403 ? 'Это действие отключено в настройках OpenCode'
        : res.status === 413 ? 'Слишком большой файл' : null;
    throw Object.assign(new Error(nice || j?.message || j?.error || ('Ошибка ' + res.status)), { status: res.status, body: j });
  }
  return j;
}
const loc = dir => dir ? `location[directory]=${encodeURIComponent(dir)}` : '';
const post = (p, body) => api(p, { method: 'POST', body: body ?? {} });

let netOk = true;
function markNet(ok) { if (netOk !== ok) { netOk = ok; updateDot(); if (ok && authed) refreshAll(); } }

/* ================= запуск / привязка ================= */

function showUnpaired(msg = '') {
  gate({
    msg: (msg ? msg + '\n\n' : '') + 'Это устройство ещё не привязано.\nОтправьте в Telegram команду /ocpair и откройте присланную ссылку здесь — или вставьте её ниже.',
    err: !!msg, input: { placeholder: 'Ссылка привязки', button: 'Привязать', submit: pastePair },
  });
}
function pastePair(text) {
  const p = parsePair(text);
  if (!p) return showUnpaired('Это не ссылка привязки (в ней должно быть #pair=…)');
  let target;
  try { target = new URL(text.trim()); } catch {}
  if (target && /^https?:$/.test(target.protocol) && target.origin + target.pathname !== location.origin + location.pathname) { location.href = target.href; return; }
  pending = p;
  boot();
}
function showTotp(onCode, err = '') {
  gate({ msg: (err ? err + '\n' : '') + 'Введите 6-значный код из Authenticator («Cursor Remote»)', err: !!err, input: { placeholder: '000000', button: 'Подтвердить', code: true, submit: onCode } });
}
async function doPair(totp) {
  gate({ msg: 'Привязываю устройство…' });
  let r, body;
  try {
    r = await fetch(base + '/br/pair', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: pending.code, name: deviceName(), totp }) });
    body = await r.json().catch(() => ({}));
  } catch { return gate({ msg: 'Нет связи с компьютером. Ссылка действует 10 минут — повторите чуть позже.', err: true, retry: true }); }
  if (r.ok) { store.set('token', body.token); pending = null; return enter(); }
  if (body.needTotp) return showTotp(code => doPair(code), body.error);
  pending = null;
  if (store.get('token')) return gate({ msg: (body.error || 'Не удалось привязать') + '\n\nЭто устройство уже было привязано — можно продолжать.', err: true, retry: 'Продолжить' });
  showUnpaired(body.error || 'Не удалось привязать');
}
async function verifyTotpCode(code) {
  gate({ msg: 'Проверяю…' });
  try { await post('/br/totp', { code }); enter(); } catch (e) { if (e.auth) return; showTotp(verifyTotpCode, e.message); }
}

let retryTimer = null;
async function boot() {
  if (booting) return;
  booting = true;
  authed = false; evCtl?.abort(); clearTimeout(retryTimer);
  try {
    gate({ msg: 'Ищу компьютер…' });
    let res;
    try { res = await fetch('url.json?t=' + Date.now(), { cache: 'no-store' }); }
    catch { return gate({ msg: 'Не удалось загрузить адрес компьютера. Проверьте интернет на телефоне.', err: true, retry: true }); }
    info = res.ok ? await res.json().catch(() => null) : null;
    if (!info) return gate({ msg: 'Адрес компьютера ещё не опубликован. Подождите около минуты и повторите.', err: true, retry: true });
    if (pending) store.set('key', pending.key);
    try { base = await resolveBase(); } catch (e) {
      if (e.offline) return gate({ msg: e.message, retry: true });
      if (e.stale) { store.set('key', null); store.set('token', null); }
      return showUnpaired(e.message);
    }
    if (pending) return await doPair();
    if (!store.get('token')) return showUnpaired();
    let me;
    try { me = await (await fetch(base + '/br/me', { headers: { authorization: 'Bearer ' + store.get('token') }, cache: 'no-store' })).json(); }
    catch {
      retryTimer = setTimeout(() => { if (!authed) boot(); }, 12000);
      return gate({ msg: 'Компьютер не отвечает: выключен, спит или сервис перезапускается (новый адрес появляется минуты через 1–2). Попробую снова сам…', retry: true });
    }
    if (!me.paired) { store.set('token', null); return showUnpaired('Это устройство отвязано. Привяжите заново.'); }
    if (me.needTotp) return showTotp(verifyTotpCode);
    enter();
  } finally { booting = false; }
}

function enter() {
  authed = true;
  ungate();
  loadPrefs();
  startEvents();
  route();
  postViewing();
}

/* ================= уведомления на экране ================= */

function toast(msg, kind = '', ms = 3500, onclick) {
  const t = h('div', { class: 'toast ' + kind, onclick: () => { t.remove(); onclick?.(); } }, msg);
  if (onclick) t.style.pointerEvents = 'auto';
  $('#toasts').append(t);
  setTimeout(() => t.remove(), ms);
}

function updateDot() {
  const d = $('#dot');
  d.className = 'dot ' + (!netOk ? 'off' : (S.live && S.up) ? 'live' : 'warn');
  d.title = !netOk ? 'Нет связи с компьютером' : !S.up ? 'OpenCode на компьютере недоступен' : S.live ? 'Онлайн' : 'Подключаюсь…';
}

/* ================= поток событий ================= */

// События приходят long-poll запросами /br/poll: бесплатный туннель Cloudflare не отдаёт SSE потоком (буферизует до конца ответа).
// Номер последнего события помним между перезапусками цикла, поэтому при возврате из фона ничего не теряется;
// если мост перезапускался или разрыв слишком большой, он отвечает reset - тогда обновляем экран целиком.
let pollSince = null;
async function startEvents() {
  evCtl?.abort();
  const ctl = new AbortController();
  evCtl = ctl;
  let backoff = 800, firstOk = true;
  while (!ctl.signal.aborted && authed) {
    try {
      const r = await api(`/br/poll?wait=20${pollSince == null ? '' : '&since=' + pollSince}`, { timeout: 45000, signal: ctl.signal });
      if (ctl.signal.aborted) return;
      const wasLive = S.live;
      S.live = true; backoff = 800;
      if (S.up !== (r.up !== false)) { S.up = r.up !== false; if (S.up) refreshAll(); }
      updateDot();
      if (r.reset) { pollSince = r.seq; if (!firstOk) refreshAll(); firstOk = false; continue; }
      firstOk = false;
      pollSince = r.seq;
      if (!wasLive && S.cur) scheduleTail(true);
      for (const ev of r.events || []) { try { onEvent(ev); } catch (e) { console.warn('event', e); } }
    } catch (e) {
      if (ctl.signal.aborted || e.aborted) { if (evCtl !== ctl) return; }
      if (e.auth) return;
      S.live = false; updateDot();
      await sleep(backoff); backoff = Math.min(backoff * 1.7, 8000);
      if (evCtl !== ctl) return;
    }
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && authed) { startEvents(); refreshAll(); }
  postViewing();
});
window.addEventListener('online', () => { if (authed) { startEvents(); refreshAll(); } });

let listTimer = null;
const scheduleList = () => { if (listTimer) return; listTimer = setTimeout(() => { listTimer = null; if (!$('#list-view').classList.contains('hidden')) loadSessions(); }, 1200); };

function refreshAll() {
  if (!authed) return;
  loadSessions().catch(() => {});
  if (S.cur) { loadInfo(); scheduleTail(true); loadDock(); }
}

function onEvent(ev) {
  const t = ev.type, d = ev.data || {};
  if (t === 'bridge.hello') { S.up = d.up !== false; updateDot(); return; }
  if (t === 'bridge.upstream') { S.up = d.up; updateDot(); if (d.up) refreshAll(); return; }
  const sid = d.sessionID || d.request?.sessionID || d.form?.sessionID || d.info?.sessionID;

  if (t === 'session.execution.started') { S.active[sid] = { type: 'running' }; S.runStart[sid] = ev.created || Date.now(); }
  else if (t.startsWith('session.execution.')) {
    delete S.active[sid]; delete S.runStart[sid];
    if (t === 'session.execution.succeeded' && !(S.cur && S.cur.id === sid && document.visibilityState === 'visible')) {
      toast('✅ Готово: ' + (S.titles[sid] || 'чат'), 'ok', 5000, () => openHash(sid));
    }
  }
  if (t === 'permission.asked') {
    S.perm[sid] = (S.perm[sid] || 0) + 1;
    if (!(S.cur && S.cur.id === sid)) toast('⏳ Нужно разрешение: ' + (S.titles[sid] || 'чат'), '', 6000, () => openHash(sid));
  }
  if (t === 'permission.replied') S.perm[sid] = Math.max(0, (S.perm[sid] || 1) - 1);
  if (t === 'form.created' && !(S.cur && S.cur.id === sid)) toast('❓ Вопрос от агента: ' + (S.titles[sid] || 'чат'), '', 6000, () => openHash(sid));

  if (/^session\.(created|renamed|deleted|archived|unarchived|usage\.updated|moved|forked|model\.selected|agent\.selected|execution\.)/.test(t) || t.startsWith('permission.')) scheduleList();
  if (S.cur && sid === S.cur.id) curEvent(ev);
  else if (S.cur && t.startsWith('rpc.')) curEvent(ev);
}

/* ================= маршрутизация ================= */

const openHash = id => { location.hash = 's=' + id; };
window.addEventListener('hashchange', () => { if (!parsePair(location.hash)) route(); else { pending = parsePair(location.hash); history.replaceState(null, '', location.pathname + location.search); boot(); } });
function route() {
  if (!authed) return;
  const m = /[#&]s=([\w.-]+)/.exec(location.hash);
  if (m) { if (!S.cur || S.cur.id !== m[1]) openSession(m[1]); else showView('chat'); }
  else { closeSession(); showView('list'); loadSessions(); }
}
function showView(v) {
  $('#list-view').classList.toggle('hidden', v !== 'list');
  $('#chat-view').classList.toggle('hidden', v !== 'chat');
}
let routedFromList = false;
$('#btn-back').onclick = () => { if (history.length > 1 && routedFromList) history.back(); else location.hash = ''; };

/* ================= список чатов ================= */

async function loadProjects() {
  try {
    const list = await api('/api/project');
    S.projects = (Array.isArray(list) ? list : list.data || [])
      .filter(p => p.canonical && !/[\\/]Temp[\\/]|[\\/]AppData[\\/]/i.test(p.canonical))
      .sort((a, b) => (b.time?.active || 0) - (a.time?.active || 0));
  } catch {}
}

async function loadSessions(append = false) {
  if (!authed) return;
  const p = new URLSearchParams({ limit: '40', order: 'desc', parentID: 'null', archived: S.archived ? 'true' : 'false' });
  if (S.q) p.set('search', S.q);
  if (S.dir) p.set('directory', S.dir);
  if (append && S.next) p.set('cursor', S.next);
  try {
    const [r, act] = await Promise.all([api('/api/session?' + p), api('/api/session/active').catch(() => ({ data: S.active }))]);
    S.active = act.data || {};
    const rows = r.data || [];
    S.sessions = append ? [...S.sessions, ...rows] : rows;
    S.next = r.cursor?.next || null;
    for (const s of S.sessions) S.titles[s.id] = s.title || 'Без названия';
    for (const id of Object.keys(S.active)) api(`/api/session/${id}/permission`).then(x => { S.perm[id] = (x.data || []).length; renderList(); }).catch(() => {});
    if (!S.projects.length) await loadProjects();
    renderList();
  } catch (e) { if (!e.net && !e.auth) toast(e.message, 'err'); }
}

function renderProjects() {
  const box = $('#projects');
  box.innerHTML = '';
  if (S.projects.length < 2) return;
  box.append(h('button', { class: 'chip' + (!S.dir ? ' on' : ''), onclick: () => { S.dir = ''; loadSessions(); } }, 'Все проекты'));
  for (const p of S.projects.slice(0, 10)) box.append(h('button', { class: 'chip' + (S.dir === p.canonical ? ' on' : ''), onclick: () => { S.dir = p.canonical; loadSessions(); } }, p.name || baseName(p.canonical)));
}

function renderList() {
  renderProjects();
  $('#btn-archived').classList.toggle('on', S.archived);
  const box = $('#sessions');
  const keep = box.scrollTop;
  box.innerHTML = '';
  if (!S.sessions.length) { box.append(h('div', { class: 'empty' }, S.q ? 'Ничего не найдено' : (netOk ? 'Чатов пока нет' : 'Нет связи с компьютером'))); return; }
  let lastDay = '';
  for (const s of S.sessions) {
    const ts = s.time?.updated || s.time?.created;
    const day = dayLabel(ts);
    if (day !== lastDay) { box.append(h('div', { class: 'day' }, day)); lastDay = day; }
    const running = S.active[s.id], perm = S.perm[s.id] > 0;
    const stat = running ? h('span', { class: 'spin' }) : s.outcome === 'failed' ? '⚠️' : s.outcome === 'succeeded' ? '✓' : s.outcome === 'interrupted' ? '■' : '·';
    const model = s.model ? (s.model.id || '').replace(/^gemini-4-/, 'G4 ') + (s.model.variant && s.model.variant !== 'default' ? ' · ' + s.model.variant : '') : '';
    box.append(h('div', { class: 'srow', onclick: () => { routedFromList = true; openHash(s.id); } },
      h('div', { class: 'sstat' }, stat),
      h('div', { class: 'sbody' },
        h('div', { class: 'stitle' }, s.title || 'Без названия'),
        h('div', { class: 'smeta' },
          running ? h('span', { class: 'badge run' }, 'работает') : null,
          perm ? h('span', { class: 'badge perm' }, 'ждёт разрешения') : null,
          s.outcome === 'failed' && !running ? h('span', { class: 'badge err' }, 'ошибка') : null,
          `${baseName(s.location?.directory)} · ${model} · ${ago(ts)}`))));
  }
  if (S.next) box.append(h('button', { class: 'btn more', onclick: () => loadSessions(true) }, 'Показать ещё'));
  box.scrollTop = keep;
}

$('#btn-refresh').onclick = () => { loadSessions(); toast('Обновлено', 'ok', 1200); };
$('#btn-settings').onclick = () => settingsSheet();
$('#btn-new').onclick = () => newSessionSheet();
$('#btn-archived').onclick = () => { S.archived = !S.archived; loadSessions(); };
let searchTimer;
$('#search').oninput = e => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { S.q = e.target.value.trim(); loadSessions(); }, 350); };

/* ================= окна (bottom sheet) ================= */

function sheet(title, build, { full = false } = {}) {
  const back = h('div', { class: 'back', onclick: e => { if (e.target === back) close(); } });
  const body = h('div', { class: 'body' });
  const titleEl = h('div', { class: 't' }, title);
  const box = h('div', { class: 'sheet' + (full ? ' full' : '') }, h('header', {}, titleEl, h('button', { class: 'ico', onclick: () => close(), 'aria-label': 'Закрыть' }, '✕')), body);
  back.append(box);
  $('#sheet-root').append(back);
  let onClose = null;
  function close() { back.remove(); onClose?.(); }
  const api2 = { close, body, setTitle: t => { titleEl.textContent = t; }, onClose: fn => { onClose = fn; } };
  build(body, api2);
  return api2;
}
const menuItem = (icon, label, desc, fn, cls = '') => h('button', { class: 'mi ' + cls, onclick: fn }, h('span', { class: 'i' }, icon), h('span', {}, label, desc ? h('div', { class: 'd' }, desc) : null));

async function guard(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg, 'ok', 1800); return r; }
  catch (e) { if (!e.auth) toast(e.message || 'Ошибка', 'err', 5000); return undefined; }
}

/* ================= новый чат ================= */

async function newSessionSheet() {
  if (!S.projects.length) await loadProjects();
  sheet('Новый чат', (body, { close }) => {
    const dirs = [];
    for (const p of S.projects) dirs.push({ dir: p.canonical, name: p.name || baseName(p.canonical) });
    for (const s of S.sessions) if (s.location?.directory && !dirs.some(d => d.dir === s.location.directory)) dirs.push({ dir: s.location.directory, name: baseName(s.location.directory) });
    let chosen = S.dir || dirs[0]?.dir || '';
    const sel = h('select', {}, dirs.map(d => h('option', { value: d.dir, selected: d.dir === chosen }, `${d.name} — ${d.dir}`)));
    sel.onchange = () => { chosen = sel.value; };
    const ta = h('textarea', { rows: 4, placeholder: 'Что нужно сделать? (необязательно)' });
    const go = h('button', { class: 'btn pri', onclick: async () => {
      go.disabled = true;
      const last = S.sessions.find(s => s.location?.directory === chosen && s.model) || S.sessions.find(s => s.model);
      const created = await guard(() => post('/api/session', { location: { directory: chosen }, ...(last?.model ? { model: last.model } : {}), ...(last?.agent ? { agent: last.agent } : {}) }));
      if (!created) { go.disabled = false; return; }
      const sess = created.data || created;
      const text = ta.value.trim();
      if (text) await guard(() => post(`/api/session/${sess.id}/prompt`, { text }));
      close(); routedFromList = true; openHash(sess.id);
    } }, 'Создать чат');
    body.append(h('div', { class: 'sec' }, 'Проект'), sel, h('div', { class: 'sec' }, 'Первое сообщение'), ta, h('div', { class: 'btnrow' }, go));
  });
}

/* ================= чат: состояние ================= */

function closeSession() {
  if (!S.cur) return;
  clearTimeout(S.cur.tailTimer);
  S.cur = null;
  $('#msgs').innerHTML = ''; $('#dock').innerHTML = '';
  postViewing();
}

async function openSession(id) {
  S.cur = { id, info: null, msgs: new Map(), els: new Map(), sigs: new Map(), open: new Set(), perms: [], forms: [], inbox: [], nr: null, older: null, tailTimer: null, tailBusy: false, tailAgain: false, atts: [], recording: null };
  showView('chat');
  $('#msgs').innerHTML = ''; $('#dock').innerHTML = '';
  $('#chat-title').textContent = S.titles[id] || '…'; $('#chat-sub').textContent = '';
  $('#inp').value = ''; autoGrow(); renderAtts(); renderQuick(); renderStatus();
  const cur = S.cur;
  try {
    await Promise.all([loadInfo(), loadMessages(true)]);
    if (S.cur !== cur) return;
    await loadDock();
  } catch (e) {
    if (e.status === 404) { toast('Чат не найден', 'err'); location.hash = ''; return; }
    if (!e.auth) toast(e.message, 'err');
  }
  scrollBottom(true);
  postViewing();
  api('/api/command').then(r => { S.commands = r.data || []; }).catch(() => {});
}

async function loadInfo() {
  const c = S.cur; if (!c) return;
  const r = await api(`/api/session/${c.id}`);
  if (S.cur !== c) return;
  c.info = r.data || r;
  S.titles[c.id] = c.info.title || 'Без названия';
  renderHeader();
  renderStatus();
}

function renderHeader() {
  const c = S.cur; if (!c?.info) return;
  const i = c.info;
  $('#chat-title').textContent = i.title || 'Без названия';
  const m = i.model;
  $('#chat-sub').textContent = [baseName(i.location?.directory), i.agent, m ? (m.id + (m.variant && m.variant !== 'default' ? ' · ' + m.variant : '')) : ''].filter(Boolean).join(' · ');
}

async function loadMessages(initial = false) {
  const c = S.cur; if (!c) return;
  const r = await api(`/api/session/${c.id}/message?limit=30&order=desc`);
  if (S.cur !== c) return;
  if (initial) { c.msgs.clear(); c.els.clear(); c.sigs.clear(); $('#msgs').innerHTML = ''; }
  c.older = r.cursor?.next || null;
  mergeMessages((r.data || []).slice().reverse());
  renderOlderButton();
}

async function loadOlder() {
  const c = S.cur; if (!c?.older) return;
  const box = $('#msgs');
  const prevH = box.scrollHeight;
  const r = await api(`/api/session/${c.id}/message?limit=30&order=desc&cursor=${encodeURIComponent(c.older)}`);
  if (S.cur !== c) return;
  c.older = r.cursor?.next || null;
  mergeMessages((r.data || []).slice().reverse(), { keepScroll: true });
  renderOlderButton();
  box.scrollTop += box.scrollHeight - prevH;
}

function renderOlderButton() {
  const box = $('#msgs');
  box.querySelector('.older')?.remove();
  if (S.cur?.older) box.prepend(h('button', { class: 'btn more older', onclick: () => guard(loadOlder) }, 'Загрузить предыдущие'));
}

function scheduleTail(now = false) {
  const c = S.cur; if (!c) return;
  if (c.tailBusy) { c.tailAgain = true; return; }
  if (c.tailTimer && !now) return;
  clearTimeout(c.tailTimer);
  c.tailTimer = setTimeout(async () => {
    c.tailTimer = null; c.tailBusy = true;
    try {
      const r = await api(`/api/session/${c.id}/message?limit=10&order=desc`);
      if (S.cur === c) mergeMessages((r.data || []).slice().reverse());
    } catch {}
    c.tailBusy = false;
    if (c.tailAgain && S.cur === c) { c.tailAgain = false; scheduleTail(); }
  }, now ? 0 : 450);
}

function curEvent(ev) {
  const c = S.cur, t = ev.type;
  if (t.startsWith('rpc.')) { loadNr(); return; }
  if (t === 'session.deleted') { toast('Чат удалён', 'err'); location.hash = ''; return; }
  if (t.startsWith('permission.') || t.startsWith('form.')) { loadDock(); return; }
  if (t.startsWith('session.inbox.')) { loadInbox(); scheduleTail(); return; }
  if (t.startsWith('session.execution.')) { loadInfo(); scheduleTail(true); loadDock(); renderStatus(); renderQuick(); return; }
  if (/^session\.(revert|compaction\.(ended|failed|started))/.test(t)) { loadInfo(); loadMessages(true); return; }
  if (/^session\.(renamed|model\.selected|agent\.selected|usage\.updated|moved|archived|unarchived|metadata)/.test(t)) { loadInfo(); if (/selected|moved/.test(t)) scheduleTail(); return; }
  scheduleTail();
  if (c.info && t === 'session.step.ended') loadInfo();
}

async function loadInbox() {
  const c = S.cur; if (!c) return;
  try { const r = await api(`/api/session/${c.id}/inbox`); if (S.cur === c) { c.inbox = r.data || []; renderDock(); } } catch {}
}
async function loadDock() {
  const c = S.cur; if (!c) return;
  try {
    const [p, f, i] = await Promise.all([
      api(`/api/session/${c.id}/permission`).catch(() => ({ data: [] })),
      api(`/api/session/${c.id}/form`).catch(() => ({ data: [] })),
      api(`/api/session/${c.id}/inbox`).catch(() => ({ data: [] })),
    ]);
    if (S.cur !== c) return;
    c.perms = p.data || []; c.forms = f.data || []; c.inbox = i.data || [];
    S.perm[c.id] = c.perms.length;
    renderDock(); renderStatus();
  } catch {}
  loadNr();
}
async function loadNr() {
  const c = S.cur; if (!c) return;
  try {
    const r = await post('/api/rpc/night-retry/list', { input: {} });
    if (S.cur === c) { c.nr = (r.output?.sessions || []).find(s => s.sessionID === c.id) || null; renderStatus(); }
  } catch {}
}

/* ================= чат: сообщения ================= */

const TOOL_ICON = { shell: '⌨️', bash: '⌨️', read: '📖', edit: '✏️', write: '📝', apply_patch: '🩹', patch: '🩹', grep: '🔎', glob: '🗂', find: '🔎', list: '🗂', webfetch: '🌐', websearch: '🌐', task: '🤖', agent: '🤖', todowrite: '☑️', todoread: '☑️', question: '❓', skill: '🧩' };
const toolIcon = n => TOOL_ICON[String(n).toLowerCase()] || '🔧';

function toolSummary(c) {
  const i = c.state?.input;
  if (typeof i === 'string') return i.replace(/\s+/g, ' ').slice(0, 120);
  if (!i) return '';
  const v = i.description || i.command || i.filePath || i.path || i.pattern || i.query || i.url || i.prompt || i.name || '';
  return String(typeof v === 'string' ? v : JSON.stringify(v)).replace(/\s+/g, ' ').slice(0, 120);
}

function toolOutput(c) {
  const st = c.state || {};
  const parts = [];
  for (const x of st.content || []) {
    if (x.type === 'text') parts.push(x.text);
    else if (x.type === 'file') parts.push(`[файл: ${x.name || x.uri} ${x.mime || ''}]`);
  }
  if (st.error) parts.push('Ошибка: ' + (st.error.message || st.error.type));
  return parts.join('\n');
}

function detailsEl(key, summary, bodyFn, cls = '') {
  const c = S.cur;
  const d = h('details', { class: 'blk ' + cls, ...(c.open.has(key) ? { open: true } : {}) });
  d.append(summary);
  let filled = false;
  const fill = () => { if (filled) return; filled = true; d.append(h('div', { class: 'in' }, bodyFn())); };
  if (d.open) fill();
  d.addEventListener('toggle', () => { if (d.open) { c.open.add(key); fill(); } else c.open.delete(key); });
  return d;
}

function toolCard(m, c, idx) {
  const st = c.state?.status;
  const stIcon = st === 'completed' ? h('span', { class: 'st ok' }, '✓') : st === 'error' ? h('span', { class: 'st er' }, '✗') : h('span', { class: 'st' }, h('span', { class: 'spin' }));
  const summary = h('summary', {}, h('span', {}, toolIcon(c.name)), h('span', { class: 'nm' }, c.name), h('span', { class: 'sm' }, toolSummary(c)), stIcon);
  return detailsEl(`${m.id}:${idx}`, summary, () => {
    const box = h('div');
    const i = c.state?.input;
    const name = String(c.name).toLowerCase();
    if (i && typeof i === 'object' && (name === 'edit') && ('oldString' in i || 'newString' in i)) {
      box.append(h('div', { class: 'muted' }, i.filePath || ''), h('pre', { class: 'out diff', html: miniDiff(i.oldString, i.newString) }));
    } else if (i && typeof i === 'object' && name === 'write' && 'content' in i) {
      box.append(h('div', { class: 'muted' }, i.filePath || ''), h('pre', { class: 'out' }, String(i.content).slice(0, 8000)));
    } else if (i && typeof i === 'object' && (i.command || i.filePath) && Object.keys(i).length <= 3) {
      box.append(h('pre', { class: 'out' }, i.command ? String(i.command) : JSON.stringify(i, null, 2)));
    } else if (i) {
      box.append(h('pre', { class: 'out' }, typeof i === 'string' ? i : JSON.stringify(i, null, 2)));
    }
    const out = toolOutput(c);
    if (out) box.append(h('pre', { class: 'out' }, out));
    if (c.clipped) box.append(h('div', { class: 'muted' }, 'Вывод сокращён для телефона. ', h('a', { href: '#', onclick: e => { e.preventDefault(); fullMessage(m.id); } }, 'Показать полностью')));
    return box;
  });
}

async function fullMessage(id) {
  const c = S.cur; if (!c) return;
  const r = await guard(() => api(`/api/session/${c.id}/message/${id}?full=1`));
  if (r?.data) upsert(r.data, true);
}

function renderMsg(m) {
  const c = S.cur;
  const time = clock(m.time?.created || Date.now());
  switch (m.type) {
    case 'user': {
      const el = h('div', { class: 'msg user', 'data-id': m.id });
      const files = (m.files || []);
      if (files.length) el.append(h('div', { class: 'thumbs' }, files.map(f => f.data && /^image\//.test(f.mime) ? h('img', { src: `data:${f.mime};base64,${f.data}`, alt: f.name || '' }) : h('span', { class: 'fchip' }, '📎 ' + (f.name || f.mime || 'файл')))));
      if (m.text) el.append(h('div', { class: 'bubble' }, m.text));
      el.append(h('div', { class: 'meta' }, time, h('button', { 'aria-label': 'Действия', onclick: () => msgMenu(m) }, '⋯')));
      return el;
    }
    case 'assistant': {
      const el = h('div', { class: 'msg assistant', 'data-id': m.id });
      (m.content || []).forEach((p, idx) => {
        if (p.type === 'text') { if (p.text) el.append(h('div', { class: 'md', html: md(p.text) })); }
        else if (p.type === 'reasoning') {
          if (!p.text) return;
          el.append(detailsEl(`${m.id}:r${idx}`, h('summary', {}, '💭 Размышление', h('span', { class: 'sm' }, p.text.replace(/[*#\n]+/g, ' ').trim().slice(0, 80))), () => h('div', { class: 'md', html: md(p.text) }), 'reasoning'));
        } else if (p.type === 'tool') el.append(toolCard(m, p, idx));
      });
      if (m.error) el.append(h('div', { class: 'err-box' }, '⚠️ ' + (m.error.message || m.error.type || 'Ошибка')));
      if (m.retry) el.append(h('div', { class: 'retry-box' }, `↻ Повтор №${m.retry.attempt}${m.retry.at ? ' в ' + clock(m.retry.at) : ''}: ${(m.retry.error?.message || '').slice(0, 200)}`));
      const done = m.time?.completed;
      el.append(h('div', { class: 'meta' }, time, m.model?.id ? m.model.id.replace(/^gemini-4-/, 'G4 ') : '', done && m.time?.created ? fmtDur(done - m.time.created) : '',
        m.cost ? fmtCost(m.cost) : '', h('button', { 'aria-label': 'Действия', onclick: () => msgMenu(m) }, '⋯')));
      return el;
    }
    case 'shell': {
      const el = h('div', { class: 'msg assistant', 'data-id': m.id });
      el.append(detailsEl(`${m.id}:sh`, h('summary', {}, h('span', {}, '⌨️'), h('span', { class: 'nm' }, 'команда'), h('span', { class: 'sm' }, m.command || ''),
        m.status === 'running' ? h('span', { class: 'st' }, h('span', { class: 'spin' })) : h('span', { class: 'st ' + (m.exit === 0 ? 'ok' : 'er') }, m.exit === 0 ? '✓' : '✗ ' + m.exit)),
      () => h('div', {}, h('pre', { class: 'out' }, m.command || ''), m.output?.output ? h('pre', { class: 'out' }, m.output.output) : null)));
      return el;
    }
    case 'compaction': return h('div', { class: 'divider', 'data-id': m.id }, m.status === 'running' ? '🗜 Сжимаю контекст…' : m.status === 'failed' ? '🗜 Не удалось сжать контекст' : '🗜 Контекст сжат');
    case 'agent-switched': return h('div', { class: 'divider', 'data-id': m.id }, `Режим: ${m.agent}`);
    case 'model-switched': return h('div', { class: 'divider', 'data-id': m.id }, `Модель: ${m.model?.id}${m.model?.variant ? ' · ' + m.model.variant : ''}`);
    case 'location-switched': return h('div', { class: 'divider', 'data-id': m.id }, `Папка: ${baseName(m.location?.directory)}`);
    case 'synthetic': case 'system': case 'skill': {
      const el = h('div', { class: 'msg', 'data-id': m.id });
      el.append(detailsEl(`${m.id}:sy`, h('summary', {}, h('span', {}, m.type === 'skill' ? '🧩' : 'ℹ️'), h('span', { class: 'nm' }, m.type === 'skill' ? 'навык ' + (m.name || '') : (m.description || 'служебное')), h('span', { class: 'sm' }, (m.text || '').replace(/\s+/g, ' ').slice(0, 80))),
        () => h('pre', { class: 'out' }, m.text || '')));
      return el;
    }
    default: return h('div', { 'data-id': m.id });
  }
}

const sigOf = m => JSON.stringify(m);
function upsert(m, force = false) {
  const c = S.cur; if (!c) return;
  const box = $('#msgs');
  const sig = sigOf(m);
  const old = c.els.get(m.id);
  if (old && !force && c.sigs.get(m.id) === sig) return;
  c.sigs.set(m.id, sig);
  c.msgs.set(m.id, m);
  const el = renderMsg(m);
  if (old) { old.replaceWith(el); c.els.set(m.id, el); return; }
  c.els.set(m.id, el);
  // вставка по времени создания
  const ts = m.time?.created || 0;
  let before = null;
  for (const [id, other] of c.msgs) { if (id !== m.id && (other.time?.created || 0) > ts) { before = c.els.get(id); break; } }
  if (before && before.parentNode === box) box.insertBefore(el, before); else box.append(el);
}

function mergeMessages(list) {
  const box = $('#msgs');
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 140;
  for (const m of list) upsert(m);
  renderTyping();
  if (near) scrollBottom();
  updateBottomBtn();
}

function renderTyping() {
  const box = $('#msgs');
  box.querySelector('.typing')?.remove();
  const c = S.cur;
  if (c && S.active[c.id]) box.append(h('div', { class: 'typing' }, h('span', { class: 'spin' }), ' агент работает…'));
}

function scrollBottom(force) { const b = $('#msgs'); b.scrollTop = b.scrollHeight; updateBottomBtn(); }
function updateBottomBtn() { const b = $('#msgs'); $('#btn-bottom').classList.toggle('hidden', b.scrollHeight - b.scrollTop - b.clientHeight < 300); }
$('#msgs').addEventListener('scroll', updateBottomBtn, { passive: true });
$('#btn-bottom').onclick = () => scrollBottom(true);

/* ================= чат: статус, карточки, очередь ================= */

let tickTimer = null;
function renderStatus() {
  const c = S.cur; const bar = $('#statusbar');
  const stop = $('#btn-stop');
  if (!c) { bar.classList.add('hidden'); return; }
  const running = Boolean(S.active[c.id]);
  stop.classList.toggle('hidden', !running);
  bar.className = 'statusbar';
  bar.innerHTML = '';
  const i = c.info;
  const rows = [];
  if (running) {
    const start = S.runStart[c.id] || i?.time?.busy;
    const el = h('div', { class: 'statusbar run' }, h('span', { class: 'spin' }), h('span', { class: 'grow' }, 'Агент работает' + (start ? ' · ' + fmtDur(Date.now() - start) : '')), h('button', { onclick: () => stopRun() }, 'Стоп'));
    rows.push(el);
  }
  if (c.perms?.length) rows.push(h('div', { class: 'statusbar warn' }, '⏳ Агент ждёт вашего разрешения (карточка ниже)'));
  if (i?.revert) rows.push(h('div', { class: 'statusbar warn' }, h('span', { class: 'grow' }, `↩ Подготовлен откат${i.revert.files?.length ? ` · файлов: ${i.revert.files.length}` : ''}`),
    h('button', { onclick: () => revertCommit() }, 'Применить'), h('button', { onclick: () => revertClear() }, 'Отмена')));
  if (c.nr?.armed) {
    const when = c.nr.nextAt ? ' · следующая попытка ' + clock(c.nr.nextAt) : '';
    rows.push(h('div', { class: 'statusbar' }, h('span', { class: 'grow' }, `🌙 Ночной ретрай: ${c.nr.phase || 'включён'}${c.nr.attempts ? ' · попыток ' + c.nr.attempts : ''}${when}`), h('button', { onclick: () => nightSheet() }, 'Настроить')));
  }
  if (rows.length) { bar.className = ''; bar.append(...rows); } else bar.classList.add('hidden');
  clearInterval(tickTimer);
  if (running) tickTimer = setInterval(() => { if (!S.cur || !S.active[S.cur.id]) return clearInterval(tickTimer); renderStatus(); }, 5000);
  renderTyping();
}

const stopRun = () => guard(async () => { await post(`/api/session/${S.cur.id}/interrupt`, {}); delete S.active[S.cur.id]; renderStatus(); scheduleTail(true); }, 'Остановлено');
$('#btn-stop').onclick = stopRun;

function renderDock() {
  const c = S.cur; const dock = $('#dock');
  if (!c) return;
  dock.innerHTML = '';
  for (const p of c.perms) dock.append(permCard(p));
  for (const f of c.forms) dock.append(formCard(f));
  for (const q of c.inbox) {
    const text = q.payload?.text || (q.type === 'compaction' ? 'сжатие контекста' : q.type);
    dock.append(h('div', { class: 'qitem' }, h('span', {}, q.delivery === 'steer' ? '⇢' : '⏱'), h('span', { class: 't' }, 'В очереди: ' + text),
      q.type === 'user' && q.delivery !== 'steer' ? h('button', { title: 'Отправить сразу', onclick: () => guard(async () => { await api(`/api/session/${c.id}/inbox/${q.id}`, { method: 'PATCH', body: { delivery: 'steer' } }); loadInbox(); }) }, 'сразу') : null,
      h('button', { title: 'Убрать из очереди', onclick: () => guard(async () => { await api(`/api/session/${c.id}/inbox/${q.id}`, { method: 'DELETE' }); loadInbox(); }) }, '✕')));
  }
}

function permCard(p) {
  const c = S.cur;
  const reply = decision => guard(async () => {
    await post(`/api/session/${c.id}/permission/${p.id}/reply`, { decision });
    c.perms = c.perms.filter(x => x.id !== p.id); S.perm[c.id] = c.perms.length; renderDock(); renderStatus();
  }, { once: 'Разрешено', always: 'Разрешено всегда', reject: 'Отклонено' }[decision]);
  return h('div', { class: 'card perm' },
    h('h4', {}, '⏳ Нужно разрешение'),
    h('div', {}, p.message || p.action || ''),
    p.resources?.length ? h('div', { class: 'what' }, p.resources.join('\n')) : null,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn ok', onclick: () => reply('once') }, 'Разрешить'), h('button', { class: 'btn', onclick: () => reply('always') }, 'Всегда'), h('button', { class: 'btn no', onclick: () => reply('reject') }, 'Отклонить')));
}

function fieldVisible(f, ans) {
  return !f.hidden && (f.when || []).every(w => { const v = ans[w.key]; return w.op === 'neq' ? v !== w.value : v === w.value; });
}
function formCard(form) {
  const c = S.cur;
  const ans = {};
  for (const f of form.fields || []) if (f.default != null) ans[f.key] = f.default;
  const box = h('div', { class: 'card' });
  const fieldsBox = h('div');
  const render = () => {
    fieldsBox.innerHTML = '';
    for (const f of form.fields || []) {
      if (!fieldVisible(f, ans)) continue;
      const wrap = h('div', { class: 'field' }, f.title ? h('label', {}, f.title + (f.required ? ' *' : '')) : null, f.description ? h('div', { class: 'desc' }, f.description) : null);
      if (f.type === 'external') wrap.append(h('a', { class: 'btn', href: f.url, target: '_blank', rel: 'noopener noreferrer' }, 'Открыть ссылку'));
      else if (f.type === 'boolean') wrap.append(h('label', { class: 'opt' }, h('input', { type: 'checkbox', ...(ans[f.key] ? { checked: true } : {}), onchange: e => { ans[f.key] = e.target.checked; render(); } }), 'Да'));
      else if (f.type === 'multiselect') {
        const cur = new Set(ans[f.key] || []);
        for (const o of f.options || []) wrap.append(h('label', { class: 'opt' }, h('input', { type: 'checkbox', ...(cur.has(o.value) ? { checked: true } : {}), onchange: e => { e.target.checked ? cur.add(o.value) : cur.delete(o.value); ans[f.key] = [...cur]; } }), h('span', {}, o.label, o.description ? h('div', { class: 'desc' }, o.description) : null)));
        if (f.custom) wrap.append(h('input', { type: 'text', placeholder: 'Другое…', onchange: e => { const v = e.target.value.trim(); if (v) { cur.add(v); ans[f.key] = [...cur]; } } }));
      } else if (f.type === 'string' && f.options?.length) {
        for (const o of f.options) wrap.append(h('label', { class: 'opt' }, h('input', { type: 'radio', name: form.id + f.key, ...(ans[f.key] === o.value ? { checked: true } : {}), onchange: () => { ans[f.key] = o.value; render(); } }), h('span', {}, o.label, o.description ? h('div', { class: 'desc' }, o.description) : null)));
        if (f.custom) wrap.append(h('input', { type: 'text', placeholder: 'Свой вариант…', value: f.options.some(o => o.value === ans[f.key]) ? '' : (ans[f.key] || ''), oninput: e => { ans[f.key] = e.target.value; } }));
      } else if (f.type === 'number' || f.type === 'integer') {
        wrap.append(h('input', { type: 'number', ...(f.type === 'integer' ? { step: 1 } : {}), value: ans[f.key] ?? '', oninput: e => { ans[f.key] = e.target.value === '' ? undefined : Number(e.target.value); } }));
      } else {
        const multi = (f.maxLength || 0) > 120 || !f.format;
        wrap.append(h(multi ? 'textarea' : 'input', { ...(multi ? { rows: 3 } : { type: 'text' }), placeholder: f.placeholder || '', value: ans[f.key] ?? '', oninput: e => { ans[f.key] = e.target.value; } }));
        if (multi) wrap.lastChild.value = ans[f.key] ?? '';
      }
      fieldsBox.append(wrap);
    }
  };
  render();
  const send = h('button', { class: 'btn pri', onclick: () => guard(async () => {
    const answer = {};
    for (const f of form.fields || []) { if (f.type === 'external') continue; if (fieldVisible(f, ans) && ans[f.key] !== undefined && ans[f.key] !== '') answer[f.key] = ans[f.key]; }
    await post(`/api/session/${c.id}/form/${form.id}/reply`, { answer });
    c.forms = c.forms.filter(x => x.id !== form.id); renderDock();
  }, 'Ответ отправлен') }, 'Отправить ответ');
  const cancel = h('button', { class: 'btn', onclick: () => guard(async () => { await api(`/api/session/${c.id}/form/${form.id}`, { method: 'DELETE' }); c.forms = c.forms.filter(x => x.id !== form.id); renderDock(); }, 'Отменено') }, 'Отмена');
  box.append(h('h4', {}, '❓ ' + (form.title || 'Вопрос от агента')), fieldsBox, h('div', { class: 'btnrow' }, send, cancel));
  return box;
}

/* ================= композер ================= */

const inp = $('#inp');
function autoGrow() { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, window.innerHeight * 0.4) + 'px'; }
inp.addEventListener('input', () => { autoGrow(); updateSend(); slashHint(); });
inp.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doSend(); } });
function updateSend() { $('#btn-send').disabled = !inp.value.trim() && !(S.cur?.atts.length); }

function renderQuick() {
  const box = $('#quick'); box.innerHTML = '';
  const c = S.cur; if (!c) return;
  const running = Boolean(S.active[c.id]);
  if (running) box.append(h('button', { class: 'chip' + (S.steer ? ' on' : ''), title: 'Куда попадёт сообщение, пока агент работает', onclick: () => { S.steer = !S.steer; store.set('steer', S.steer ? '1' : null); renderQuick(); toast(S.steer ? 'Сообщения вмешиваются сразу' : 'Сообщения встают в очередь', '', 1800); } }, S.steer ? '⇢ Вмешаться' : '⏱ В очередь'));
  for (const q of ['Продолжай', 'Да', 'Нет']) box.append(h('button', { class: 'chip', onclick: () => doSend(q) }, q));
  box.append(h('button', { class: 'chip', onclick: () => nightSheet() }, '🌙 Ночной ретрай'));
}

async function doSend(forced) {
  const c = S.cur; if (!c) return;
  let text = (forced ?? inp.value).trim();
  const atts = forced ? [] : c.atts.slice();
  if (!text && !atts.length) return;
  const running = Boolean(S.active[c.id]);
  const delivery = running ? (S.steer ? 'steer' : 'queue') : null;
  $('#btn-send').disabled = true;
  try {
    const m = /^\/(\S+)\s*([\s\S]*)$/.exec(text);
    if (m && !atts.length && S.commands?.some(x => x.name === m[1])) await post(`/api/session/${c.id}/command`, { name: m[1], text: m[2], delivery });
    else {
      const body = { text, ...(delivery ? { delivery } : {}) };
      if (atts.length) body.files = atts.map(a => ({ uri: a.dataUrl, source: { type: 'inline' }, name: a.name }));
      await post(`/api/session/${c.id}/prompt`, body);
    }
    if (forced == null) { inp.value = ''; c.atts = []; renderAtts(); autoGrow(); }
    $('#slash').classList.add('hidden');
    S.active[c.id] = S.active[c.id] || { type: 'running' }; S.runStart[c.id] = S.runStart[c.id] || Date.now();
    renderStatus(); renderQuick(); scheduleTail(true); scrollBottom(true);
    setTimeout(() => { loadInbox(); scheduleTail(true); }, 700);
  } catch (e) { if (!e.auth) toast(e.message, 'err', 6000); }
  updateSend();
}
$('#btn-send').onclick = () => doSend();

function slashHint() {
  const box = $('#slash'); const v = inp.value;
  if (!v.startsWith('/') || /\s/.test(v) || !S.commands?.length) return box.classList.add('hidden');
  const items = S.commands.filter(x => x.name.startsWith(v.slice(1)));
  if (!items.length) return box.classList.add('hidden');
  box.innerHTML = '';
  for (const x of items.slice(0, 8)) box.append(h('div', { onclick: () => { inp.value = '/' + x.name + ' '; box.classList.add('hidden'); inp.focus(); autoGrow(); } }, h('b', {}, '/' + x.name), h('span', {}, x.description || '')));
  box.classList.remove('hidden');
}

/* вложения */
$('#btn-attach').onclick = () => $('#file').click();
$('#file').onchange = async e => {
  const c = S.cur; if (!c) return;
  for (const f of e.target.files) {
    if (f.size > 25 * 1024 * 1024) { toast(`«${f.name}» больше 25 МБ`, 'err'); continue; }
    try { c.atts.push(await readAttachment(f)); } catch { toast('Не удалось прочитать ' + f.name, 'err'); }
  }
  e.target.value = '';
  renderAtts(); updateSend();
};
function readAttachment(f) {
  return new Promise((resolve, reject) => {
    const mime = f.type || 'application/octet-stream';
    const read = blob => { const r = new FileReader(); r.onload = () => resolve({ name: f.name || 'file', mime: blob.type || mime, dataUrl: r.result }); r.onerror = reject; r.readAsDataURL(blob); };
    if (/^image\/(jpeg|png|webp)$/.test(mime) && f.size > 700 * 1024) {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1800 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        cv.toBlob(b => b ? read(new File([b], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })) : read(f), 'image/jpeg', 0.86);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => read(f);
      img.src = URL.createObjectURL(f);
    } else read(f);
  });
}
function renderAtts() {
  const box = $('#attachments'); const c = S.cur;
  box.innerHTML = '';
  box.classList.toggle('hidden', !c?.atts.length);
  (c?.atts || []).forEach((a, i) => box.append(h('div', { class: 'att' }, /^image\//.test(a.mime) ? h('img', { src: a.dataUrl }) : '📎 ' + a.name, h('button', { 'aria-label': 'Убрать', onclick: () => { c.atts.splice(i, 1); renderAtts(); updateSend(); } }, '✕'))));
}
inp.addEventListener('paste', async e => {
  const files = [...(e.clipboardData?.files || [])];
  if (!files.length || !S.cur) return;
  e.preventDefault();
  for (const f of files) S.cur.atts.push(await readAttachment(f));
  renderAtts(); updateSend();
});

/* голосовой ввод: запись -> WAV 16 кГц -> RPC плагина voice-input (Gemini на компьютере) */
$('#btn-mic').onclick = async () => {
  const c = S.cur; if (!c) return;
  const mic = $('#btn-mic');
  if (c.recording) { c.recording.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return toast('Браузер не поддерживает запись голоса (нужен HTTPS и современный браузер)', 'err', 6000);
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } }); }
  catch { return toast('Нет доступа к микрофону', 'err'); }
  const rec = new MediaRecorder(stream);
  const chunks = [];
  const t0 = Date.now();
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const timer = setInterval(() => { mic.textContent = '⏺ ' + Math.round((Date.now() - t0) / 1000); }, 500);
  mic.classList.add('rec'); mic.textContent = '⏺ 0';
  rec.onstop = async () => {
    clearInterval(timer); stream.getTracks().forEach(t => t.stop());
    mic.classList.remove('rec'); mic.textContent = '⏳'; c.recording = null;
    try {
      if (!chunks.length || Date.now() - t0 < 700) throw new Error('Запись слишком короткая');
      const wav = await toWav16k(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      const r = await post('/api/rpc/voice-input/transcribe', { input: { audio: bufToB64(wav) } });
      const out = r.output || {};
      if (out.error) throw new Error(out.error);
      if (out.text) { inp.value = (inp.value ? inp.value.replace(/\s*$/, ' ') : '') + out.text; autoGrow(); updateSend(); inp.focus(); }
      else toast('Речь не распознана', 'err');
    } catch (e) { toast('Голос: ' + e.message, 'err', 6000); }
    mic.textContent = '🎤';
  };
  c.recording = rec;
  rec.start();
  setTimeout(() => { if (c.recording === rec) rec.stop(); }, 120000);
};

/* ================= меню чата ================= */

$('#btn-menu').onclick = () => chatMenu();
$('#titlebox').onclick = () => renameSheet();

function chatMenu() {
  const c = S.cur; if (!c?.info) return;
  const i = c.info;
  sheet('Чат', (body, { close }) => {
    const go = fn => () => { close(); fn(); };
    body.append(
      menuItem('✏️', 'Переименовать', '', go(renameSheet)),
      menuItem('🧠', 'Модель и режим', i.model ? `${i.model.id}${i.model.variant ? ' · ' + i.model.variant : ''} · ${i.agent || ''}` : '', go(modelSheet)),
      menuItem('🌙', 'Ночной ретрай', c.nr?.armed ? 'включён' : 'выключен', go(nightSheet)),
      menuItem('📝', 'Изменения в файлах', 'diff этого чата', go(diffSheet)),
      menuItem('📊', 'Контекст и расход', '', go(contextSheet)),
      menuItem('🗜', 'Сжать контекст', 'compact', go(() => guard(() => post(`/api/session/${c.id}/compact`, { delivery: S.active[c.id] ? 'queue' : null }), 'Сжатие запущено'))),
      menuItem('⌨️', 'Выполнить команду на ПК', 'в папке проекта', go(shellSheet)),
      menuItem('📁', 'Файлы проекта', '', go(filesSheet)),
      menuItem('⏰', 'Расписание', 'отложенные и повторяющиеся сообщения', go(scheduleSheet)),
      menuItem('⑂', 'Форк чата', 'копия чата для другой ветки работы', go(() => guard(async () => { const r = await post(`/api/session/${c.id}/fork`, {}); routedFromList = true; openHash((r.data || r).id); }, 'Форк создан'))),
      menuItem(i.time?.archived ? '📤' : '📥', i.time?.archived ? 'Вернуть из архива' : 'В архив', '', go(() => guard(async () => { await api(`/api/session/${c.id}`, { method: 'PATCH', body: { archived: !i.time?.archived } }); loadInfo(); }, i.time?.archived ? 'Возвращён' : 'В архиве'))),
      menuItem('🔗', 'Копировать ссылку на чат', '', go(() => { navigator.clipboard?.writeText(location.origin + location.pathname + '#s=' + c.id).then(() => toast('Ссылка скопирована', 'ok', 1500)); })),
      menuItem('🗑', 'Удалить чат', 'без возможности восстановления', go(() => { if (confirm('Удалить чат «' + (i.title || c.id) + '» навсегда?')) guard(async () => { await api(`/api/session/${c.id}`, { method: 'DELETE' }); location.hash = ''; }, 'Удалено'); }), 'danger'),
    );
  });
}

function renameSheet() {
  const c = S.cur; if (!c?.info) return;
  sheet('Название чата', (body, { close }) => {
    const t = h('input', { type: 'text', value: c.info.title || '' });
    body.append(t, h('div', { class: 'btnrow' }, h('button', { class: 'btn pri', onclick: () => guard(async () => { await api(`/api/session/${c.id}`, { method: 'PATCH', body: { title: t.value.trim() || null } }); close(); loadInfo(); }, 'Переименовано') }, 'Сохранить')));
    setTimeout(() => t.focus(), 80);
  });
}

function msgMenu(m) {
  const c = S.cur; if (!c) return;
  const text = m.type === 'user' ? m.text : (m.content || []).filter(x => x.type === 'text').map(x => x.text).join('\n');
  sheet('Сообщение', (body, { close }) => {
    const go = fn => () => { close(); fn(); };
    body.append(
      menuItem('📋', 'Копировать текст', '', go(() => navigator.clipboard?.writeText(text || '').then(() => toast('Скопировано', 'ok', 1200)))),
      m.type === 'user' ? menuItem('↻', 'Отправить ещё раз', '', go(() => doSend(m.text))) : null,
      menuItem('⑂', 'Форк до этого сообщения', 'новый чат с историей до него', go(() => guard(async () => { const r = await post(`/api/session/${c.id}/fork`, { before: m.id }); routedFromList = true; openHash((r.data || r).id); }, 'Форк создан'))),
      menuItem('↩', 'Откатить до этого сообщения', 'подготовка отката, потом подтверждение', go(() => guard(async () => { await post(`/api/session/${c.id}/revert/stage`, { messageID: m.id, files: true }); await loadInfo(); toast('Откат подготовлен — подтвердите вверху', '', 4000); }))),
      m.type === 'assistant' ? menuItem('🔍', 'Показать полностью (без сокращений)', '', go(() => fullMessage(m.id))) : null,
    );
  });
}

const revertCommit = () => guard(async () => { await post(`/api/session/${S.cur.id}/revert/commit`, {}); await loadInfo(); loadMessages(true); }, 'Откат применён');
const revertClear = () => guard(async () => { await api(`/api/session/${S.cur.id}/revert`, { method: 'DELETE' }); await loadInfo(); loadMessages(true); }, 'Откат отменён');

/* ================= модель и режим ================= */

async function modelSheet() {
  const c = S.cur; if (!c?.info) return;
  const dir = c.info.location?.directory;
  try {
    if (!S.models) S.models = (await api('/api/model')).data || [];
    S.agents = (await api('/api/agent?' + loc(dir))).data || [];
  } catch (e) { return toast(e.message, 'err'); }
  const cur = c.info.model || {};
  sheet('Модель и режим', body => {
    const agents = S.agents.filter(a => !a.hidden && a.mode !== 'subagent');
    body.append(h('div', { class: 'sec' }, 'Режим агента'), h('div', { class: 'chips', style: 'padding:0' }, agents.map(a => h('button', { class: 'chip' + (c.info.agent === a.id ? ' on' : ''), onclick: () => guard(async () => { await post(`/api/session/${c.id}/agent`, { agent: a.id }); await loadInfo(); modelSheet(); }, 'Режим: ' + a.name) }, a.name))));
    const search = h('input', { type: 'text', placeholder: 'Поиск модели', style: 'margin-top:8px' });
    const list = h('div');
    body.append(h('div', { class: 'sec' }, 'Модель'), search, list);
    const draw = () => {
      list.innerHTML = '';
      const q = search.value.toLowerCase();
      const groups = new Map();
      for (const m of S.models) {
        if (m.type && m.type !== 'chat') continue;
        if (q && !(m.name + ' ' + m.id + ' ' + m.providerID).toLowerCase().includes(q)) continue;
        if (!groups.has(m.providerID)) groups.set(m.providerID, []);
        groups.get(m.providerID).push(m);
      }
      for (const [prov, ms] of groups) {
        list.append(h('div', { class: 'sec' }, prov));
        for (const m of ms) {
          const isCur = cur.id === m.id && cur.providerID === m.providerID;
          const row = h('div', {}, h('button', { class: 'mi', onclick: () => { row.querySelector('.vars').classList.toggle('hidden'); } }, h('span', { class: 'i' }, isCur ? '●' : '○'), h('span', {}, m.name, h('div', { class: 'd' }, m.id))));
          const vars = h('div', { class: 'chips vars' + (isCur || q ? '' : ' hidden'), style: 'padding:0 0 8px 38px;flex-wrap:wrap' });
          const variants = [{ id: 'default' }, ...(m.variants || [])];
          for (const v of variants) vars.append(h('button', { class: 'chip' + (isCur && (cur.variant || 'default') === v.id ? ' on' : ''), onclick: () => guard(async () => {
            await post(`/api/session/${c.id}/model`, { model: { id: m.id, providerID: m.providerID, ...(v.id !== 'default' ? { variant: v.id } : {}) } });
            await loadInfo(); scheduleTail(true); document.querySelector('#sheet-root .back')?.remove();
          }, `${m.name}${v.id !== 'default' ? ' · ' + v.id : ''}`) }, v.id === 'default' ? 'по умолчанию' : v.id));
          row.append(vars); list.append(row);
        }
      }
      if (!list.childNodes.length) list.append(h('div', { class: 'empty' }, 'Ничего не найдено'));
    };
    search.oninput = draw; draw();
  }, { full: true });
}

/* ================= изменения / контекст ================= */

async function diffSheet() {
  const c = S.cur; if (!c) return;
  sheet('Изменения в файлах', async body => {
    body.append(h('div', { class: 'muted' }, 'Загрузка…'));
    const r = await guard(() => api(`/api/session/${c.id}/diff`, { timeout: 60000 }));
    body.innerHTML = '';
    const files = r?.data || [];
    if (!files.length) return body.append(h('div', { class: 'empty' }, 'Изменений пока нет'));
    body.append(h('div', { class: 'muted' }, `Файлов: ${files.length} · +${files.reduce((a, f) => a + f.additions, 0)} −${files.reduce((a, f) => a + f.deletions, 0)}`));
    for (const f of files) {
      const d = h('details', { class: 'blk' }, h('summary', {}, h('span', { class: 'nm' }, baseName(f.file)), h('span', { class: 'sm' }, f.file), h('span', { class: 'st ok' }, '+' + f.additions), h('span', { class: 'st er' }, '−' + f.deletions)));
      let filled = false;
      d.addEventListener('toggle', () => { if (d.open && !filled) { filled = true; d.append(h('div', { class: 'in' }, h('pre', { class: 'out diff', html: patchHtml(f.patch) }))); } });
      body.append(d);
    }
  }, { full: true });
}

async function contextSheet() {
  const c = S.cur; if (!c?.info) return;
  const i = c.info, t = i.tokens || {};
  sheet('Контекст и расход', async body => {
    const kv = (k, v) => h('div', { class: 'kv' }, h('span', {}, k), h('span', {}, v));
    body.append(kv('Расход чата', fmtCost(i.cost)), kv('Токены: вход', fmtNum(t.input)), kv('Токены: выход', fmtNum(t.output)), kv('Токены: размышления', fmtNum(t.reasoning)),
      kv('Кэш: чтение / запись', `${fmtNum(t.cache?.read)} / ${fmtNum(t.cache?.write)}`), kv('Создан', new Date(i.time.created).toLocaleString('ru-RU')), kv('Обновлён', new Date(i.time.updated).toLocaleString('ru-RU')),
      kv('Папка', i.location?.directory || ''), kv('ID чата', i.id));
    const lim = await api('/api/experimental/usage/limits').catch(() => null);
    const d = lim?.data;
    if (d?.budgets?.length) {
      body.append(h('div', { class: 'sec' }, 'Бюджеты'));
      for (const b of d.budgets) body.append(kv(b.id, `${fmtCost(b.spent)} из ${fmtCost(b.limit)}`));
    }
  });
}

/* ================= команда, файлы, расписание ================= */

function shellSheet() {
  const c = S.cur; if (!c) return;
  sheet('Команда на компьютере', (body, { close }) => {
    const ta = h('textarea', { rows: 3, placeholder: 'Например: git status', style: 'font-family:ui-monospace,Consolas,monospace' });
    body.append(h('div', { class: 'muted' }, 'Выполнится в папке проекта и попадёт в чат (как «!команда» в OpenCode).'), ta,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn pri', onclick: () => { const cmd = ta.value.trim(); if (!cmd) return; guard(async () => { await post(`/api/session/${c.id}/shell`, { command: cmd }); close(); scheduleTail(true); }, 'Команда запущена'); } }, 'Выполнить')));
    setTimeout(() => ta.focus(), 80);
  });
}

function filesSheet() {
  const c = S.cur; if (!c?.info) return;
  const dir = c.info.location?.directory;
  sheet('Файлы проекта', (body, { setTitle }) => {
    const stack = [''];
    const view = h('div');
    body.append(view);
    const show = async rel => {
      view.innerHTML = ''; view.append(h('div', { class: 'muted' }, 'Загрузка…'));
      const r = await guard(() => api(`/api/fs/list?${loc(dir)}${rel ? '&path=' + encodeURIComponent(rel) : ''}`));
      view.innerHTML = '';
      setTitle(rel || baseName(dir));
      if (stack.length > 1) view.append(menuItem('↰', '..', '', () => { stack.pop(); show(stack[stack.length - 1]); }));
      const items = (r?.data || []).slice().sort((a, b) => (a.type === b.type ? a.path.localeCompare(b.path) : a.type === 'directory' ? -1 : 1));
      if (!items.length) view.append(h('div', { class: 'empty' }, 'Пусто'));
      for (const it of items) {
        const name = baseName(it.path);
        view.append(menuItem(it.type === 'directory' ? '📁' : '📄', name, '', () => { if (it.type === 'directory') { stack.push(it.path); show(it.path); } else openFile(it.path); }));
      }
    };
    const openFile = async p => {
      view.innerHTML = ''; view.append(h('div', { class: 'muted' }, 'Загрузка…'));
      try {
        const res = await fetch(base + '/api/fs/read/' + p.replace(/\\/g, '/').split('/').filter(Boolean).map(encodeURIComponent).join('/') + '?' + loc(dir), { headers: { authorization: 'Bearer ' + store.get('token') } });
        if (!res.ok) throw new Error('Ошибка ' + res.status);
        const type = res.headers.get('content-type') || '';
        view.innerHTML = '';
        view.append(menuItem('↰', baseName(p), 'назад к списку', () => show(stack[stack.length - 1])));
        if (/^image\//.test(type)) view.append(h('img', { src: URL.createObjectURL(await res.blob()), style: 'max-width:100%;border-radius:10px' }));
        else { const t = await res.text(); view.append(h('pre', { class: 'out', style: 'max-height:none' }, t.length > 150000 ? t.slice(0, 150000) + '\n… (обрезано)' : t)); }
      } catch (e) { view.innerHTML = ''; view.append(h('div', { class: 'err-box' }, e.message), menuItem('↰', 'Назад', '', () => show(stack[stack.length - 1]))); }
    };
    show('');
  }, { full: true });
}

function scheduleSheet() {
  const c = S.cur; if (!c) return;
  sheet('Расписание чата', (body, { close }) => {
    const list = h('div');
    const load = async () => {
      list.innerHTML = '';
      let r;
      try { r = await api(`/api/experimental/schedule?sessionID=${c.id}`); }
      catch (e) {
        if (e.status === 403) { list.append(h('div', { class: 'err-box' }, 'Расписания выключены в настройках OpenCode (experimental.schedules). Включите их в конфиге на компьютере.')); form.classList.add('hidden'); return; }
        return toast(e.message, 'err');
      }
      const items = r?.data || [];
      if (!items.length) list.append(h('div', { class: 'muted' }, 'Расписаний нет'));
      for (const s of items) {
        const when = s.when?.every ? `каждые ${s.when.every}` : s.when?.in ? `через ${s.when.in}` : s.when?.cron ? `cron ${s.when.cron}` : s.when?.at ? `в ${s.when.at}` : '';
        list.append(h('div', { class: 'card', style: 'margin:8px 0' }, h('h4', {}, `${s.name || 'Задача'} · ${s.status}`), h('div', { class: 'muted' }, `${when}${s.nextDueAt ? ' · следующий запуск ' + new Date(s.nextDueAt).toLocaleString('ru-RU') : ''} · запусков: ${s.runCount}`),
          h('div', { class: 'what' }, s.action?.prompt || s.action?.text || ''),
          h('div', { class: 'btnrow' },
            s.status === 'active' ? h('button', { class: 'btn', onclick: () => guard(async () => { await post(`/api/experimental/schedule/${s.id}/pause`, {}); load(); }, 'Пауза') }, 'Пауза') : null,
            s.status === 'paused' ? h('button', { class: 'btn', onclick: () => guard(async () => { await post(`/api/experimental/schedule/${s.id}/resume`, {}); load(); }, 'Возобновлено') }, 'Продолжить') : null,
            h('button', { class: 'btn no', onclick: () => guard(async () => { await api(`/api/experimental/schedule/${s.id}`, { method: 'DELETE' }); load(); }, 'Удалено') }, 'Удалить'))));
      }
    };
    const mode = h('select', {}, h('option', { value: 'in' }, 'Один раз, через'), h('option', { value: 'every' }, 'Повторять каждые'));
    const mins = h('input', { type: 'number', min: 1, value: 30, style: 'width:90px' });
    const text = h('textarea', { rows: 2, placeholder: 'Что отправить в чат (например: Продолжай)' });
    const form = h('div', {}, h('div', { class: 'sec' }, 'Новая задача'), h('div', { class: 'row' }, mode, mins, h('span', {}, 'мин')), text,
      h('div', { class: 'btnrow' }, h('button', { class: 'btn pri', onclick: () => { const p = text.value.trim(); if (!p) return; guard(async () => { await post('/api/experimental/schedule', { sessionID: c.id, when: { [mode.value]: `${Math.max(1, Number(mins.value) || 1)}m` }, prompt: p }); text.value = ''; load(); }, 'Задача создана'); } }, 'Создать')));
    body.append(list, form);
    load();
  });
}

/* ================= ночной ретрай ================= */

async function nightSheet() {
  const c = S.cur; if (!c) return;
  await loadNr();
  sheet('Ночной ретрай', (body, { close }) => {
    const nr = c.nr;
    const kv = (k, v) => h('div', { class: 'kv' }, h('span', {}, k), h('span', {}, v));
    body.append(h('div', { class: 'muted' }, 'Плагин повторяет «Продолжай», когда агент остановился из-за лимита или ошибки провайдера.'));
    body.append(kv('Состояние', nr?.armed ? `включён (${nr.phase || ''})` : 'выключен'));
    if (nr?.armed) {
      body.append(kv('Попыток', String(nr.attempts || 0)));
      if (nr.nextAt) body.append(kv('Следующая попытка', new Date(nr.nextAt).toLocaleTimeString('ru-RU')));
      if (nr.lastError) body.append(kv('Последняя ошибка', String(nr.lastError).slice(0, 200)));
    }
    const sel = h('select', {}, [5, 10, 15, 20, 30, 45, 60, 120].map(m => h('option', { value: m * 60000, selected: (nr?.intervalMs || 15 * 60000) === m * 60000 }, `каждые ${m} мин`)));
    body.append(h('div', { class: 'sec' }, 'Интервал повторов'), sel);
    const rpc = (method, input, msg) => guard(async () => { const r = await post('/api/rpc/night-retry/' + method, { input }); if (r.output?.error) throw new Error(r.output.error); await loadNr(); close(); }, msg);
    body.append(h('div', { class: 'btnrow' },
      !nr?.armed ? h('button', { class: 'btn pri', onclick: () => rpc('arm', { sessionID: c.id, intervalMs: Number(sel.value) }, 'Ночной ретрай включён') }, 'Включить') : null,
      nr?.armed ? h('button', { class: 'btn', onclick: () => rpc('setInterval', { sessionID: c.id, intervalMs: Number(sel.value) }, 'Интервал изменён') }, 'Сменить интервал') : null,
      h('button', { class: 'btn', onclick: () => rpc('arm', { sessionID: c.id, intervalMs: Number(sel.value), kickNow: true }, 'Повтор отправлен') }, 'Повторить сейчас'),
      nr?.armed ? h('button', { class: 'btn no', onclick: () => rpc('disarm', { sessionID: c.id }, 'Выключено') }, 'Выключить') : null));
  });
}

/* ================= настройки ================= */

async function loadPrefs() { try { S.prefs = await api('/br/prefs'); } catch {} }

async function settingsSheet() {
  sheet('Настройки', async (body, { close }) => {
    const [health, devs, prefs] = await Promise.all([api('/br/health').catch(() => null), api('/br/devices').catch(() => ({ devices: [] })), api('/br/prefs').catch(() => null)]);
    const kv = (k, v) => h('div', { class: 'kv' }, h('span', {}, k), h('span', {}, v));
    body.append(h('div', { class: 'sec' }, 'Состояние'));
    if (health) {
      body.append(kv('Пульт', 'v' + health.version + ' · работает ' + fmtDur(health.uptime * 1000)),
        kv('OpenCode на ПК', health.upstream.up ? 'на связи' + (health.upstream.opencode ? ' · v' + health.upstream.opencode : '') : 'нет связи'),
        kv('Адрес', health.tunnel.url || '—'), kv('Публикация', { published: 'опубликован', local: 'локально', publishing: 'публикуется…', error: 'ошибка: ' + (health.tunnel.error || ''), idle: '—' }[health.tunnel.publish] || '—'),
        kv('Telegram', health.telegram ? 'подключён' : 'не настроен'), kv('Устройств', String(health.devices)));
    }
    if (prefs) {
      body.append(h('div', { class: 'sec' }, 'Уведомления в Telegram и на телефон'));
      const sw = (key, label) => h('label', { class: 'sw' }, h('span', {}, label), h('input', { type: 'checkbox', ...(prefs.prefs[key] ? { checked: true } : {}), onchange: e => guard(() => post('/br/prefs', { [key]: e.target.checked })) }));
      body.append(sw('done', '✅ Агент закончил работу'), sw('error', '⚠️ Ошибка выполнения'), sw('permission', '⏳ Нужно разрешение'), sw('form', '❓ Вопрос от агента'), sw('telegram', 'Отправлять в Telegram'), sw('push', 'Отправлять push на телефон'));
      const mr = h('input', { type: 'number', min: 0, max: 3600, value: prefs.prefs.minRunSec, style: 'width:90px', onchange: e => guard(() => post('/br/prefs', { minRunSec: Number(e.target.value) })) });
      body.append(h('div', { class: 'sw' }, h('span', {}, 'Уведомлять о «Готово», если работа длилась дольше (сек)'), mr));
      body.append(h('div', { class: 'btnrow' },
        h('button', { class: 'btn', onclick: () => guard(async () => { const r = await post('/br/notify/test', {}); toast(`Telegram: ${r.telegram ? 'отправлено' : 'нет'} · push: ${r.pushed || 0}`, 'ok', 4000); }) }, 'Тестовое уведомление'),
        h('button', { class: 'btn', onclick: () => enablePush() }, 'Включить push на этом телефоне')));
    }
    body.append(h('div', { class: 'sec' }, 'Привязанные устройства'));
    for (const d of devs.devices) {
      body.append(h('div', { class: 'kv' }, h('span', {}, d.name + (d.current ? ' (это устройство)' : '')), h('span', {}, ago(d.lastSeen),
        d.current ? null : h('button', { class: 'btn no', style: 'margin-left:8px;padding:3px 10px', onclick: () => { if (confirm('Отвязать «' + d.name + '»?')) guard(async () => { await post('/br/devices/remove', { id: d.id }); close(); settingsSheet(); }, 'Отвязано'); } }, '✕'))));
    }
    body.append(h('div', { class: 'btnrow' },
      h('button', { class: 'btn', onclick: async () => { for (const k of await caches.keys()) await caches.delete(k); (await navigator.serviceWorker?.getRegistrations?.() || []).forEach(r => r.unregister()); location.reload(); } }, 'Обновить приложение'),
      h('button', { class: 'btn no', onclick: () => { if (confirm('Выйти и отвязать это устройство?')) guard(async () => { await post('/br/logout', {}); store.set('token', null); location.hash = ''; location.reload(); }); } }, 'Выйти')));
    body.append(h('div', { class: 'muted', style: 'margin-top:12px' }, 'OpenCode Remote v' + VERSION));
  }, { full: true });
}

async function enablePush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Этот браузер не поддерживает push (на iPhone сначала добавьте пульт на экран «Домой»).');
    if (await Notification.requestPermission() !== 'granted') throw new Error('Разрешение на уведомления не выдано');
    const reg = await navigator.serviceWorker.ready;
    const { key } = await api('/br/push/key');
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(key) });
    await post('/br/push/subscribe', { sub: sub.toJSON() });
    toast('Push включён на этом телефоне', 'ok');
  } catch (e) { toast(e.message, 'err', 6000); }
}

/* ================= «сейчас смотрю этот чат» (чтобы не дублировать уведомления) ================= */

function postViewing() {
  if (!authed) return;
  post('/br/viewing', { sessionID: S.cur?.id || null, visible: document.visibilityState === 'visible' }).catch(() => {});
}
setInterval(postViewing, 25000);

/* ================= клавиатура телефона ================= */

function fitViewport() { const vv = window.visualViewport; if (vv) $('#app').style.height = vv.height + 'px'; }
window.visualViewport?.addEventListener('resize', () => { fitViewport(); if (S.cur) { const b = $('#msgs'); if (b.scrollHeight - b.scrollTop - b.clientHeight < 400) scrollBottom(); } });
fitViewport();

navigator.serviceWorker?.addEventListener('message', e => { if (e.data?.openSession) openHash(e.data.openSession); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

boot();
