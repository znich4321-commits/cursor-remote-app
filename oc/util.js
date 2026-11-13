/* Общие утилиты пульта: DOM, безопасный markdown, время, запись голоса в WAV. */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// h('div', {class:'x', onclick: fn, html: '<b>..</b>', 'data-id': 1}, child1, 'text', ...)
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

/* ---------- markdown (безопасный: сначала экранирование) ---------- */

function inline(raw) {
  const codes = [];
  let s = String(raw).replace(/`([^`\n]+)`/g, (_, c) => { codes.push(c); return `\u0001${codes.length - 1}\u0001`; });
  s = esc(s);
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>');
  s = s.replace(/~~([^~\n]+?)~~/g, '<s>$1</s>');
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
  return s.replace(/\u0001(\d+)\u0001/g, (_, i) => `<code>${esc(codes[i])}</code>`);
}

function md(src) {
  const blocks = [];
  let text = String(src ?? '').replace(/\r\n/g, '\n');
  const keep = html => { blocks.push(html); return `\u0002${blocks.length - 1}\u0002`; };
  text = text.replace(/```[\w+.-]*\n([\s\S]*?)```/g, (_, code) => keep(`<pre class="code"><code>${esc(code.replace(/\n$/, ''))}</code></pre>`));
  // незакрытый блок кода (ответ ещё печатается)
  text = text.replace(/```[\w+.-]*\n([\s\S]*)$/, (_, code) => keep(`<pre class="code"><code>${esc(code)}</code></pre>`));
  const lines = text.split('\n');
  const out = [];
  let para = [], list = null;
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join('\n')).replace(/\n/g, '<br>')}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.t}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.t}>`); list = null; } };
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    let m;
    if (/^\u0002\d+\u0002$/.test(ln.trim())) { flushPara(); flushList(); out.push(ln.trim()); continue; }
    if (!ln.trim()) { flushPara(); flushList(); continue; }
    if ((m = /^(#{1,4})\s+(.*)$/.exec(ln))) { flushPara(); flushList(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(ln)) { flushPara(); flushList(); out.push('<hr>'); continue; }
    if ((m = /^\s*>\s?(.*)$/.exec(ln))) { flushPara(); flushList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    if (/^\s*\|.*\|\s*$/.test(ln) && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1] || '')) {
      flushPara(); flushList();
      const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(ln); i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      i--;
      out.push(`<table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if ((m = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(ln))) {
      flushPara();
      const t = /\d/.test(m[1]) ? 'ol' : 'ul';
      if (!list || list.t !== t) { flushList(); list = { t, items: [] }; }
      list.items.push(m[2]);
      continue;
    }
    flushList();
    para.push(ln);
  }
  flushPara(); flushList();
  return out.join('').replace(/\u0002(\d+)\u0002/g, (_, i) => blocks[i]);
}

/* ---------- форматирование ---------- */

const pad2 = n => String(n).padStart(2, '0');
function ago(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return 'только что';
  if (s < 3600) return Math.round(s / 60) + ' мин назад';
  if (s < 86400) return Math.round(s / 3600) + ' ч назад';
  if (s < 7 * 86400) return Math.round(s / 86400) + ' дн назад';
  return new Date(ts).toLocaleDateString('ru-RU');
}
const clock = ts => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
function dayLabel(ts) {
  const d = new Date(ts), n = new Date();
  const sod = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((sod(n) - sod(d)) / 86400000);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() === n.getFullYear() ? undefined : 'numeric' });
}
const fmtNum = n => n >= 1e6 ? (n / 1e6).toFixed(2) + ' млн' : n >= 1e3 ? (n / 1e3).toFixed(1) + ' тыс' : String(n || 0);
const fmtCost = c => c == null ? '—' : '$' + (c < 1 ? c.toFixed(3) : c.toFixed(2));
const baseName = p => String(p || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop() || String(p || '');
function fmtDur(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return s + ' с';
  if (s < 3600) return Math.floor(s / 60) + ' мин ' + (s % 60) + ' с';
  return Math.floor(s / 3600) + ' ч ' + Math.floor((s % 3600) / 60) + ' мин';
}

/* ---------- голос: запись -> WAV 16 кГц моно (формат, который ждёт плагин voice-input) ---------- */

async function toWav16k(blob) {
  const buf = await blob.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  const audio = await new Promise((res, rej) => { const p = ac.decodeAudioData(buf.slice(0), res, rej); p?.then?.(res, rej); });
  try { ac.close?.(); } catch {}
  const len = Math.max(1, Math.ceil(audio.duration * 16000));
  const off = new OfflineAudioContext(1, len, 16000);
  const src = off.createBufferSource();
  src.buffer = audio; src.connect(off.destination); src.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const wav = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) wav.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); wav.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true);
  wav.setUint32(24, 16000, true); wav.setUint32(28, 32000, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true);
  w(36, 'data'); wav.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) wav.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  return wav.buffer;
}
function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// Простейший построчный diff для edit/write: удалённое красным, добавленное зелёным.
function miniDiff(oldS, newS) {
  const a = String(oldS ?? '').split('\n'), b = String(newS ?? '').split('\n');
  return a.map(l => `<span class="d">- ${esc(l)}</span>`).join('') + b.map(l => `<span class="a">+ ${esc(l)}</span>`).join('');
}
function patchHtml(patch) {
  return String(patch || '').split('\n').map(l => {
    const c = l[0];
    const cls = l.startsWith('@@') ? 'h' : c === '+' && !l.startsWith('+++') ? 'a' : c === '-' && !l.startsWith('---') ? 'd' : '';
    return cls ? `<span class="${cls}">${esc(l)}</span>` : esc(l) + '\n';
  }).join('');
}
