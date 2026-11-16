// 전주BURI 기와 초콜릿 소비자 설문 — 응답 화면(한국어·영어 공용)
// 표시 언어는 페이지의 <html lang>(ko | en)으로 정해집니다. 저장되는 문항 ID·선택지 코드는 언어와 무관합니다.
import {
  SURVEY_VERSION, FLAVORS, PRODUCT_IMAGE, PACKAGE_IMAGE, PRODUCT_NOTICE, TEXT_MAX, OTHER_MAX, AMOUNT_MAX, selectLimit,
  isVisible, validateQuestion, validateStep, validateAll, flavorCompletion, normalizeLang, normalizeSource,
} from './schema.js';
import { localize } from './i18n.js';

const LANG = normalizeLang(document.documentElement.lang);
const L = localize(LANG);
const U = L.ui;
const STEPS = L.steps;
const QUESTION_BY_ID = L.byId;
const SOURCE = normalizeSource(new URLSearchParams(location.search).get('source'));
const BASE_URL = location.pathname + location.search; // 조사 경로(source) 파라미터를 유지합니다.

const API_URL = '/api/survey/responses';
const DRAFT_KEY = `buriSurvey.draft.v2.${LANG}`;
const DONE_KEY = 'buriSurvey.completed.v1';
const DRAFT_TTL = 24 * 3600 * 1000;
const SUBMIT_TIMEOUT = 20000;

const $ = (sel, root = document) => root.querySelector(sel);
const view = $('#sv-view');
const top = $('#sv-top');
const nav = $('#sv-nav');
const prevBtn = $('#sv-prev');
const nextBtn = $('#sv-next');
const statusEl = $('#sv-status');

document.title = U.docTitle;
$('#sv-progress').setAttribute('aria-label', U.progressLabel);
nav.setAttribute('aria-label', U.navLabel);
const skip = $('.sv-skip');
if (skip) skip.textContent = U.skip;

// ---------- 저장소(임시 저장) ----------
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } },
  set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; } },
  del(key) { try { localStorage.removeItem(key); } catch { /* 무시 */ } },
};

const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

function freshState() {
  return {
    responseId: uuid(), startedAt: null, answers: {}, step: -1, maxStep: 0, tab: FLAVORS[0].id,
    priceShown: false, savedAt: null, source: SOURCE,
  };
}
let state = freshState();
let submitting = false;
let submitError = null;
let doneInfo = null;
let saveTimer = null;

function saveDraft(now = false) {
  if (state.step < 0 || doneInfo) return;
  clearTimeout(saveTimer);
  const write = () => { state.savedAt = new Date().toISOString(); store.set(DRAFT_KEY, state); };
  if (now) write(); else saveTimer = setTimeout(write, 250);
}
window.addEventListener('pagehide', () => saveDraft(true));
function loadDraft() {
  const d = store.get(DRAFT_KEY);
  if (!d || typeof d !== 'object' || !d.answers || !d.responseId) return null;
  if (d.savedAt && Date.now() - new Date(d.savedAt).getTime() > DRAFT_TTL) { store.del(DRAFT_KEY); return null; }
  return { ...freshState(), ...d };
}

// ---------- DOM 도우미 ----------
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
const announce = (msg) => { statusEl.textContent = ''; requestAnimationFrame(() => { statusEl.textContent = msg; }); };
const fmtNum = (n) => n.toLocaleString(U.locale);
const fmtDate = (iso, opts) => new Date(iso).toLocaleString(U.locale, opts);

function stickyOffset() {
  let off = top.hidden ? 0 : top.getBoundingClientRect().height;
  const tabs = $('.sv-tabs-wrap', view);
  if (tabs) off += tabs.getBoundingClientRect().height;
  return off + 12;
}
function scrollToEl(el) {
  const y = el.getBoundingClientRect().top + window.scrollY - stickyOffset();
  window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
}
function syncTopHeight() {
  document.documentElement.style.setProperty('--sv-top-h', `${top.hidden ? 0 : top.getBoundingClientRect().height}px`);
}
if ('ResizeObserver' in window) new ResizeObserver(syncTopHeight).observe(top);

// ---------- 문항 렌더링 ----------
function legend(q) {
  return h('legend', { class: 'sv-q__legend', id: `q-${q.id}-title` },
    h('span', { class: 'sv-q__num', text: `Q${q.num}.` }), q.title,
    q.hint ? h('span', { class: 'sv-q__hint', text: `(${q.hint})` }) : null);
}
function questionShell(q, ...body) {
  const err = h('p', { class: 'sv-q__error', id: `q-${q.id}-error`, role: 'alert' });
  const fs = h('fieldset', { class: 'sv-q', id: `q-${q.id}`, 'data-qid': q.id, 'aria-describedby': `q-${q.id}-error` },
    legend(q), q.note ? h('p', { class: 'sv-q__note', text: `※ ${q.note}` }) : null,
    q.image ? h('figure', { class: 'sv-q__figure' },
      h('img', { src: q.image.src, alt: q.image.alt, width: q.image.width, height: q.image.height, loading: 'lazy', decoding: 'async' }),
      q.image.caption ? h('figcaption', { text: q.image.caption }) : null) : null,
    ...body, err);
  if (!isVisible(q, state.answers)) fs.hidden = true;
  return fs;
}

function otherField(q) {
  const id = `q-${q.id}-other`;
  const input = h('input', {
    class: 'sv-input', type: 'text', id, maxlength: OTHER_MAX, autocomplete: 'off',
    'aria-label': U.otherAria(q.num), placeholder: U.otherPlaceholder,
    oninput: (e) => { state.answers[`${q.id}_other`] = e.target.value; changed(q.id); },
  });
  input.value = state.answers[`${q.id}_other`] || '';
  return h('div', { class: 'sv-other', id: `${id}-wrap` }, input);
}

function renderChoice(q) {
  const multi = q.type === 'multi';
  const name = `q-${q.id}`;
  const current = state.answers[q.id];
  const list = h('div', { class: 'sv-options' });
  q.options.forEach((o, i) => {
    const checked = multi ? (current || []).includes(o.value) : current === o.value;
    const input = h('input', { type: multi ? 'checkbox' : 'radio', name, value: String(i), id: `${name}-${i}`, checked });
    input.addEventListener('change', () => onChoice(q, i, input.checked));
    list.append(h('label', { class: `sv-opt${multi ? ' sv-opt--multi' : ''}`, for: `${name}-${i}` },
      input, h('span', { class: 'sv-opt__mark', 'aria-hidden': 'true' }), h('span', { class: 'sv-opt__text', text: o.label })));
    if (o.other) list.append(otherField(q));
  });
  const counter = selectLimit(q) ? h('p', { class: 'sv-counter', id: `q-${q.id}-counter`, 'aria-live': 'polite' }) : null;
  const fs = questionShell(q, list, counter);
  syncChoice(q, fs);
  return fs;
}

function renderSelect(q) {
  const sel = h('select', { class: 'sv-input sv-select', id: `q-${q.id}-select`, 'aria-label': U.selectAria(q.num) },
    h('option', { value: '', text: q.placeholder || '—' }),
    q.options.map((o, i) => h('option', { value: String(i), text: o.label })));
  const idx = q.options.findIndex((o) => o.value === state.answers[q.id]);
  sel.value = idx >= 0 ? String(idx) : '';
  const other = q.options.some((o) => o.other) ? otherField(q) : null;
  const sync = () => { if (other) other.hidden = state.answers[q.id] !== 'other'; };
  sel.addEventListener('change', () => {
    state.answers[q.id] = sel.value === '' ? undefined : q.options[Number(sel.value)].value;
    sync();
    changed(q.id);
  });
  sync();
  return questionShell(q, sel, other);
}

function onChoice(q, index, checked) {
  const o = q.options[index];
  if (q.type === 'multi') {
    let arr = [...(state.answers[q.id] || [])];
    if (checked) {
      if (o.exclusive) arr = [o.value];
      else arr = arr.filter((v) => !q.options.find((x) => x.value === v)?.exclusive).concat(arr.includes(o.value) ? [] : [o.value]);
      const limit = selectLimit(q);
      if (limit && arr.length > limit) arr = arr.slice(arr.length - limit);
    } else arr = arr.filter((v) => v !== o.value);
    state.answers[q.id] = q.options.map((x) => x.value).filter((v) => arr.includes(v)); // 화면 순서대로 정렬
  } else {
    state.answers[q.id] = o.value;
  }
  const fs = $(`#q-${q.id}`);
  if (fs) syncChoice(q, fs);
  changed(q.id);
}

function syncChoice(q, fs) {
  const multi = q.type === 'multi';
  const v = state.answers[q.id];
  const selected = multi ? (v || []) : (v === undefined ? [] : [v]);
  const limit = selectLimit(q);
  fs.querySelectorAll(`input[name="q-${q.id}"]`).forEach((input) => {
    const o = q.options[Number(input.value)];
    input.checked = selected.includes(o.value);
    if (limit) input.disabled = !input.checked && !o.exclusive && selected.length >= limit;
  });
  const otherWrap = fs.querySelector('.sv-other');
  if (otherWrap) otherWrap.hidden = !selected.includes('other');
  const counter = fs.querySelector('.sv-counter');
  if (counter) {
    const exclusivePicked = selected.some((x) => q.options.find((o) => o.value === x)?.exclusive);
    const unit = q.exact ? U.counterUnitExact(limit) : U.counterUnitMax(limit);
    counter.textContent = exclusivePicked ? '' : selected.length >= limit ? U.counterFull(selected.length, unit) : U.counter(selected.length, unit);
  }
}

function scaleRow(q, key, label) {
  const name = `q-${key}`;
  const current = state.answers[key];
  const picked = h('p', { class: 'sv-scale__picked', id: `${name}-picked`, 'aria-hidden': 'true' });
  const row = h('div', { class: 'sv-scale__row' });
  q.options.forEach((o, i) => {
    const input = h('input', { type: 'radio', name, value: String(i), id: `${name}-${i}`, checked: current === o.value, 'aria-label': U.scaleAria(o.value, o.label) });
    input.addEventListener('change', () => {
      state.answers[key] = o.value;
      picked.textContent = U.scalePicked(o.value, o.label);
      changed(q.id);
    });
    row.append(h('label', { class: 'sv-scale__btn', for: `${name}-${i}` }, input, h('span', { 'aria-hidden': 'true', text: String(o.value) })));
  });
  const cur = q.options.find((o) => o.value === current);
  if (cur) picked.textContent = U.scalePicked(cur.value, cur.label);
  const ends = h('div', { class: 'sv-scale__ends', 'aria-hidden': 'true' }, h('span', { text: `1 ${q.scaleEnds[0]}` }), h('span', { text: `5 ${q.scaleEnds[1]}` }));
  return h('div', { class: 'sv-scale', role: label ? 'radiogroup' : null, 'aria-label': label || null }, row, ends, picked);
}

function renderScale(q) { return questionShell(q, scaleRow(q, q.id)); }

function renderMatrix(q) {
  const rows = q.rows.map((r) => h('div', { class: 'sv-matrix__row' },
    h('p', { class: 'sv-matrix__label', id: `q-${r.id}-label`, text: r.label }),
    scaleRow(q, r.id, `${r.label} ${q.short}`)));
  return questionShell(q, h('div', { class: 'sv-matrix' }, rows));
}

function textArea(id, value, label, onInput) {
  const count = h('p', { class: 'sv-charcount', 'aria-hidden': 'true' });
  const setCount = (v) => { count.textContent = `${v.length} / ${TEXT_MAX}`; };
  const ta = h('textarea', { class: 'sv-textarea', id, maxlength: TEXT_MAX, 'aria-label': label, rows: 4,
    oninput: (e) => { setCount(e.target.value); onInput(e.target.value); } });
  ta.value = value || '';
  setCount(ta.value);
  return [ta, count];
}

function renderText(q) {
  const [ta, count] = textArea(`q-${q.id}-input`, state.answers[q.id], U.freeTextAria(q.num), (v) => { state.answers[q.id] = v; changed(q.id); });
  return questionShell(q, ta, count);
}

function renderAmount(q) {
  const a = state.answers;
  const id = `q-${q.id}`;
  // 최대 지불의향(wtp)은 판매가격 공개 이후 수정할 수 없습니다(최초 응답 보존).
  const locked = q.id === 'wtp' && state.priceShown;
  const preview = h('p', { class: 'sv-money__preview', id: `${id}-preview`, 'aria-live': 'polite' });
  const input = h('input', { class: 'sv-input sv-money__input', id: `${id}-amount`, type: 'text', inputmode: 'numeric',
    autocomplete: 'off', placeholder: '0', 'aria-label': U.amountAria(q.num), 'aria-describedby': `${id}-preview` });
  const box = h('div', { class: 'sv-money' }, input, h('span', { class: 'sv-money__unit', 'aria-hidden': 'true', text: U.amountUnit }));
  const none = h('input', { type: 'checkbox', id: `${id}-none`, checked: a[q.noneKey] === true });
  const noneLabel = h('label', { class: 'sv-opt sv-opt--multi', for: `${id}-none` }, none,
    h('span', { class: 'sv-opt__mark', 'aria-hidden': 'true' }), h('span', { class: 'sv-opt__text', text: q.noneLabel }));
  const sync = () => {
    const off = a[q.noneKey] === true;
    input.disabled = off || locked;
    none.disabled = locked;
    box.classList.toggle('is-off', off || locked);
    input.value = !off && Number.isInteger(a[q.amountKey]) ? fmtNum(a[q.amountKey]) : '';
    preview.textContent = !off && a[q.amountKey] ? U.amountPreview(a[q.amountKey]) : '';
  };
  input.addEventListener('input', () => {
    if (locked) return;
    const digits = input.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(0, 7);
    const n = digits ? Number(digits) : null;
    a[q.amountKey] = n;
    const caret = input.value.length - input.selectionStart;
    input.value = n ? fmtNum(n) : '';
    const pos = Math.max(0, input.value.length - caret);
    try { input.setSelectionRange(pos, pos); } catch { /* 일부 입력 타입 */ }
    preview.textContent = n ? U.amountPreview(n) + (n > AMOUNT_MAX ? U.amountTooMuch(AMOUNT_MAX) : '') : '';
    changed(q.id);
  });
  none.addEventListener('change', () => { if (locked) return; a[q.noneKey] = none.checked; sync(); changed(q.id); });
  sync();
  let notice = null;
  if (q.id === 'wtp') notice = h('p', { class: `sv-alert ${locked ? 'sv-alert--info' : ''}`, id: 'q-wtp-lock', text: locked ? U.wtpLocked : U.wtpConfirm });
  const fs = questionShell(q,
    h('label', { class: 'sv-label', for: `${id}-amount`, text: U.amountLabel }), box, preview,
    h('div', { class: 'sv-options' }, noneLabel), notice);
  if (locked) fs.classList.add('is-locked');
  return fs;
}

function renderQuestion(q) {
  switch (q.type) {
    case 'single': case 'multi': return renderChoice(q);
    case 'select': return renderSelect(q);
    case 'scale': return renderScale(q);
    case 'matrix': return renderMatrix(q);
    case 'text': return renderText(q);
    case 'amount': return renderAmount(q);
    default: return null;
  }
}

// ---------- 변경 처리 ----------
function changed(qid) {
  const q = QUESTION_BY_ID[qid];
  const fs = $(`#q-${qid}`);
  if (fs && fs.classList.contains('is-error') && !validateQuestion(q, state.answers, LANG)) setError(qid, null);
  // 조건부 문항 표시(연쇄 조건까지 모두 다시 계산)
  for (const step of STEPS) for (const other of step.questions) {
    if (!other.showIf) continue;
    const el = $(`#q-${other.id}`);
    if (el) { const vis = isVisible(other, state.answers); if (el.hidden === vis) { el.hidden = !vis; if (!vis) setError(other.id, null); } }
  }
  if (q && q.flavor) updateTabs();
  if (submitError) { submitError = null; const box = $('#sv-submit-error'); if (box) box.remove(); }
  saveDraft();
}

function setError(qid, msg) {
  const fs = $(`#q-${qid}`);
  if (!fs) return;
  fs.classList.toggle('is-error', !!msg);
  const p = $(`#q-${qid}-error`);
  if (p) p.textContent = msg || '';
}

// ---------- 시식 평가 탭 ----------
function renderTasting(step) {
  const tablist = h('div', { class: 'sv-tabs', role: 'tablist', 'aria-label': U.tabsAria });
  const panels = [];
  FLAVORS.forEach((f, i) => {
    const selected = state.tab === f.id;
    const tab = h('button', { type: 'button', role: 'tab', class: 'sv-tab', id: `tab-${f.id}`, 'aria-controls': `panel-${f.id}`,
      'aria-selected': selected ? 'true' : 'false', tabindex: selected ? '0' : '-1', 'data-flavor': f.id },
    h('span', { class: 'sv-tab__name', text: U.tabName(f) }), h('span', { class: 'sv-tab__state' }));
    tab.addEventListener('click', () => selectTab(f.id, { scroll: true }));
    tab.addEventListener('keydown', (e) => {
      let j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % FLAVORS.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + FLAVORS.length) % FLAVORS.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = FLAVORS.length - 1;
      if (j === null) return;
      e.preventDefault();
      selectTab(FLAVORS[j].id, { focusTab: true });
    });
    tablist.append(tab);

    const qs = step.questions.filter((q) => q.flavor === f.id);
    const intro = U.flavorIntro(f);
    const panel = h('section', { class: 'sv-tabpanel', role: 'tabpanel', id: `panel-${f.id}`, 'aria-labelledby': `tab-${f.id}`, tabindex: '-1', hidden: !selected },
      h('div', { class: 'sv-tabpanel__head' }, h('h2', { class: 'sv-h2', text: U.panelTitle(f) })),
      intro ? h('p', { class: 'sv-flavor-intro', text: intro }) : null,
      qs.map(renderQuestion),
      h('div', { class: 'sv-panel-next' }, FLAVORS[i + 1]
        ? h('button', { type: 'button', class: 'sv-btn sv-btn--ghost sv-btn--small', onclick: () => selectTab(nextOpenFlavor(f.id), { scroll: true, focusPanel: true }) }, U.nextFlavor)
        : null));
    panels.push(panel);
  });
  const wrap = h('div', {}, h('div', { class: 'sv-tabs-wrap' }, tablist), panels);
  queueMicrotask(updateTabs);
  return wrap;
}

function nextOpenFlavor(fromId) {
  const start = FLAVORS.findIndex((f) => f.id === fromId);
  for (let k = 1; k <= FLAVORS.length; k++) {
    const f = FLAVORS[(start + k) % FLAVORS.length];
    if (!flavorCompletion(f.id, state.answers).complete) return f.id;
  }
  return FLAVORS[Math.min(start + 1, FLAVORS.length - 1)].id;
}

function selectTab(id, { scroll = false, focusTab = false, focusPanel = false } = {}) {
  state.tab = id;
  FLAVORS.forEach((f) => {
    const tab = $(`#tab-${f.id}`);
    const panel = $(`#panel-${f.id}`);
    if (!tab || !panel) return;
    const on = f.id === id;
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
    tab.tabIndex = on ? 0 : -1;
    panel.hidden = !on;
  });
  const activeTab = $(`#tab-${id}`);
  const wrapEl = $('.sv-tabs-wrap');
  if (activeTab && wrapEl && wrapEl.scrollWidth > wrapEl.clientWidth) {
    const t = activeTab.getBoundingClientRect();
    const w = wrapEl.getBoundingClientRect();
    if (t.left < w.left) wrapEl.scrollLeft -= w.left - t.left + 16;
    else if (t.right > w.right) wrapEl.scrollLeft += t.right - w.right + 16;
  }
  if (focusTab) activeTab.focus();
  if (scroll) {
    const headH = top.hidden ? 0 : top.getBoundingClientRect().height;
    const y = wrapEl.parentElement.getBoundingClientRect().top + window.scrollY - headH;
    if (window.scrollY > y) window.scrollTo({ top: y });
  }
  if (focusPanel) $(`#panel-${id}`).focus({ preventScroll: true });
  announce(U.tabAnnounce(L.flavorName(FLAVORS.find((f) => f.id === id))));
  saveDraft();
}

function updateTabs() {
  FLAVORS.forEach((f) => {
    const tab = $(`#tab-${f.id}`);
    if (!tab) return;
    const c = flavorCompletion(f.id, state.answers);
    tab.classList.toggle('is-complete', c.complete);
    if (c.complete) tab.classList.remove('is-error');
    tab.querySelector('.sv-tab__state').replaceChildren(...(c.complete
      ? [h('span', { class: 'sv-tab__check', 'aria-hidden': 'true', text: '✓' }), U.tabDone]
      : [c.done ? U.tabPartial(c.done, c.total) : U.tabNone]));
    tab.setAttribute('aria-label', U.tabAria(L.flavorName(f), c));
  });
}

// ---------- 화면 ----------
function stepHead(step) {
  const sectionName = L.sections[step.section];
  const eyebrow = step.title === sectionName ? U.part(step.section) : `${U.part(step.section)} · ${sectionName}`;
  return h('div', { class: 'sv-step-head' },
    h('p', { class: 'sv-eyebrow', text: eyebrow }),
    h('h1', { class: 'sv-h1', id: 'sv-step-title', tabindex: '-1', text: step.title }));
}

function renderProductIntro() {
  const info = L.productInfo.filter((i) => typeof i.value === 'string' && i.value.trim());
  const media = PRODUCT_IMAGE.src
    ? h('figure', { class: 'sv-product__media' }, h('img', { src: PRODUCT_IMAGE.src, alt: LANG === 'en' ? 'Giwa Chocolate gift set: nine curved, roof-tile-shaped chocolates in a long box, next to a patterned sleeve' : PRODUCT_IMAGE.alt, width: PRODUCT_IMAGE.width, height: PRODUCT_IMAGE.height, loading: 'eager', decoding: 'async' }))
    : h('div', { class: 'sv-product__media' }, h('div', { class: 'sv-product__placeholder', role: 'img', 'aria-label': U.productImagePending }, U.productImagePending));
  return h('div', { class: 'sv-card sv-product' },
    h('div', { class: 'sv-lead', style: 'margin:0 0 1rem' }, U.productLead.map((t) => h('p', { text: t }))),
    media,
    h('p', { class: 'sv-info__title', text: U.compoTitle }),
    h('ul', { class: 'sv-compo', 'aria-label': U.compoTitle }, FLAVORS.map((f) => h('li', {}, h('strong', { text: L.flavorName(f) }), h('span', { text: U.compoEach })))),
    h('p', { class: 'sv-compo-total', text: U.compoTotal }),
    info.length ? h('div', { class: 'sv-info' }, h('h2', { class: 'sv-info__title', text: U.infoTitle }),
      h('dl', { class: 'sv-info__list' }, info.flatMap((i) => [h('dt', { text: i.label }), h('dd', { text: i.value })]))) : null,
    PACKAGE_IMAGE.src ? h('figure', { class: 'sv-product__media' }, h('img', { src: PACKAGE_IMAGE.src, alt: PACKAGE_IMAGE.alt, loading: 'lazy', decoding: 'async' })) : null,
    h('p', { class: 'sv-q__note', style: 'margin:1rem 0 0', text: U.prototypeNote }),
    h('p', { class: 'sv-lead', text: U.productAssume }));
}

function renderStep(index) {
  const step = STEPS[index];
  const body = [stepHead(step)];
  if (step.intro) body.push(h('div', { class: 'sv-intro-box' }, step.intro.map((t) => h('p', { text: t }))));
  if (step.type === 'product') body.push(renderProductIntro());
  body.push(h('div', { id: 'sv-error-summary' }));
  if (step.type === 'tasting') body.push(renderTasting(step));
  else body.push(...step.questions.map(renderQuestion));
  if (index === STEPS.length - 1 && submitError) body.push(submitErrorBox());
  view.replaceChildren(...body);

  top.hidden = false;
  nav.hidden = false;
  $('#sv-section').textContent = U.sectionLabel(step.section, L.sections[step.section]);
  $('#sv-count').textContent = U.stepCount(index + 1, STEPS.length);
  const pct = Math.round(((index + 1) / STEPS.length) * 100);
  $('#sv-progress').setAttribute('aria-valuenow', String(pct));
  $('#sv-progress').setAttribute('aria-valuetext', U.stepAria(index + 1, STEPS.length));
  $('#sv-progress-bar').style.width = `${pct}%`;
  prevBtn.textContent = U.prev;
  prevBtn.disabled = false;
  setNextLabel();
  syncTopHeight();
}

function setNextLabel() {
  const last = state.step === STEPS.length - 1;
  nextBtn.classList.toggle('is-busy', submitting);
  nextBtn.disabled = submitting;
  prevBtn.disabled = submitting;
  nextBtn.setAttribute('aria-busy', submitting ? 'true' : 'false');
  nextBtn.textContent = submitting ? U.submitting : last ? (submitError ? U.resubmit : U.submit) : U.next;
}

function renderIntro() {
  top.hidden = true;
  nav.hidden = true;
  syncTopHeight();
  const draft = loadDraft();
  const done = store.get(DONE_KEY);
  const fmt = (iso) => fmtDate(iso, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const notices = [];
  if (done && done.count > 0) {
    notices.push(h('div', { class: 'sv-alert sv-alert--info' },
      h('p', { text: U.doneRecord(done.lastAt ? fmt(done.lastAt) : '') }), h('p', { text: U.doneRecord2 })));
  }
  const actions = [];
  if (draft && draft.step >= 0) {
    notices.push(h('div', { class: 'sv-alert' }, h('p', { text: U.draftSaved(draft.savedAt ? fmt(draft.savedAt) : '', Math.min(draft.step, STEPS.length - 1) + 1) })));
    actions.push(h('button', { type: 'button', class: 'sv-btn sv-btn--primary sv-btn--block', onclick: () => resume(draft) }, U.resume));
    actions.push(h('button', { type: 'button', class: 'sv-btn sv-btn--ghost sv-btn--block', onclick: () => {
      if (window.confirm(U.restartConfirm)) { store.del(DRAFT_KEY); start(); }
    } }, U.restart));
  } else {
    actions.push(h('button', { type: 'button', class: 'sv-btn sv-btn--primary sv-btn--block', id: 'sv-start', onclick: start }, U.start));
  }
  const ingredients = PRODUCT_NOTICE.ingredients[LANG];
  view.replaceChildren(h('section', { class: 'sv-start', 'aria-labelledby': 'sv-intro-title' },
    h('p', { class: 'sv-lang-switch' }, h('a', { href: `../${location.search}`, hreflang: LANG === 'en' ? 'ko' : 'en', text: U.changeLang })),
    h('div', { class: 'sv-alert sv-alert--warn', role: 'note', 'aria-label': U.allergyTitle },
      h('p', { class: 'sv-alert__title', text: U.allergyTitle }),
      U.allergyLines.map((t) => h('p', { text: t })),
      ingredients ? h('p', {}, h('strong', { text: `${U.ingredientsLabel}: ` }), ingredients) : null),
    h('p', { class: 'sv-eyebrow', text: U.introEyebrow }),
    h('h1', { class: 'sv-h1', id: 'sv-intro-title', tabindex: '-1', text: U.introTitle }),
    h('div', { class: 'sv-start__body' }, U.introBody.map((t) => h('p', { text: t }))),
    h('ul', { class: 'sv-facts' }, U.facts(STEPS.length).map(([k, v]) => h('li', {}, h('b', { text: k }), v))),
    notices,
    h('div', { class: 'sv-actions' }, actions)));
}

function renderDone() {
  top.hidden = true;
  nav.hidden = true;
  syncTopHeight();
  const when = doneInfo && doneInfo.submittedAt ? fmtDate(doneInfo.submittedAt) : '';
  view.replaceChildren(h('section', { class: 'sv-done', 'aria-labelledby': 'sv-done-title' },
    h('p', { class: 'sv-done__badge', role: 'status' }, h('span', { 'aria-hidden': 'true', text: '✓' }), U.doneBadge),
    h('h1', { class: 'sv-h1', id: 'sv-done-title', tabindex: '-1', text: U.doneTitle }),
    h('p', { class: 'sv-lead', text: U.doneBody }),
    h('p', { class: 'sv-done__meta', text: U.doneMeta(when, doneInfo && doneInfo.id ? doneInfo.id.slice(0, 8) : '') }),
    h('div', { class: 'sv-actions' }, h('button', { type: 'button', class: 'sv-btn sv-btn--ghost sv-btn--block', onclick: () => {
      doneInfo = null; state = freshState(); renderIntro(); history.replaceState({ sv: -1 }, '', BASE_URL); focusTitle('#sv-intro-title');
    } }, U.nextPerson))));
}

const focusTitle = (sel) => { const t = $(sel); if (t) t.focus({ preventScroll: true }); };

// ---------- 이동 ----------
function markPriceShown(index) {
  if (STEPS[index] && STEPS[index].id === 'price' && !state.priceShown) state.priceShown = true;
}

function go(index, mode = 'push') {
  const from = state.step;
  state.step = index;
  state.maxStep = Math.max(state.maxStep, index);
  markPriceShown(index);
  if (mode === 'push') history.pushState({ sv: index, from }, '', `${BASE_URL}#${STEPS[index].id}`);
  else if (mode === 'replace') history.replaceState({ sv: index, from: history.state && history.state.from }, '', `${BASE_URL}#${STEPS[index].id}`);
  renderStep(index);
  window.scrollTo({ top: 0 });
  focusTitle('#sv-step-title');
  announce(U.stepAnnounce(index + 1, STEPS[index].title));
  saveDraft();
}

function start() {
  state = freshState();
  state.startedAt = new Date().toISOString();
  submitError = null;
  go(0);
}

function resume(draft) {
  state = draft;
  if (!state.source || state.source === 'general') state.source = SOURCE;
  submitError = null;
  go(Math.min(Math.max(draft.step, 0), STEPS.length - 1), 'push');
}

prevBtn.addEventListener('click', () => {
  if (submitting) return;
  const target = state.step - 1;
  if (target < 0) { saveDraft(true); history.pushState({ sv: -1 }, '', BASE_URL); renderIntro(); focusTitle('#sv-intro-title'); return; }
  if (history.state && history.state.sv === state.step && history.state.from === target) history.back();
  else go(target, 'push');
});

nextBtn.addEventListener('click', () => {
  if (submitting) return;
  const step = STEPS[state.step];
  const errors = validateStep(step.id, state.answers, LANG, STEPS);
  if (Object.keys(errors).length) { showErrors(step, errors); return; }
  if (state.step === STEPS.length - 1) submit();
  else go(state.step + 1);
});

window.addEventListener('popstate', (e) => {
  if (submitting) { history.pushState({ sv: state.step }, '', `${BASE_URL}#${STEPS[state.step].id}`); return; }
  if (doneInfo) { history.pushState({ sv: 'done' }, '', BASE_URL); return; }
  const s = e.state && typeof e.state.sv === 'number' ? e.state.sv : -1;
  if (s < 0) { saveDraft(true); renderIntro(); focusTitle('#sv-intro-title'); return; }
  if (s <= state.maxStep && s < STEPS.length) {
    state.step = s;
    markPriceShown(s);
    renderStep(s); window.scrollTo({ top: 0 }); focusTitle('#sv-step-title'); saveDraft();
  } else {
    history.replaceState({ sv: state.step }, '', state.step >= 0 ? `${BASE_URL}#${STEPS[state.step].id}` : BASE_URL);
  }
});

// ---------- 오류 표시 ----------
function showErrors(step, errors) {
  for (const q of step.questions) setError(q.id, errors[q.id] || null);
  const summary = $('#sv-error-summary');
  const ids = Object.keys(errors);
  if (step.type === 'tasting') {
    const byFlavor = FLAVORS.map((f) => ({ f, qs: step.questions.filter((q) => q.flavor === f.id && errors[q.id]) })).filter((x) => x.qs.length);
    FLAVORS.forEach((f) => { const t = $(`#tab-${f.id}`); if (t) t.classList.toggle('is-error', byFlavor.some((x) => x.f.id === f.id)); });
    summary.replaceChildren(h('div', { class: 'sv-alert sv-alert--error', role: 'alert', tabindex: '-1' },
      h('p', {}, h('strong', { text: U.tastingErrTitle }), U.tastingErrBody),
      h('ul', {}, byFlavor.map(({ f, qs }) => h('li', {}, h('strong', { text: `${L.flavorName(f)}: ` }),
        qs.map((q, i) => [i ? ', ' : '', h('button', { type: 'button', class: 'sv-linkbtn', onclick: () => jumpTo(q) }, `Q${q.num} ${q.short}`)]))))));
    const first = byFlavor[0];
    selectTab(first.f.id);
    announce(U.tastingErrAnnounce(L.flavorName(first.f)));
    const box = summary.firstChild;
    scrollToEl(box);
    box.focus({ preventScroll: true });
    return;
  }
  summary.replaceChildren(h('div', { class: 'sv-alert sv-alert--error', role: 'alert' },
    h('p', {}, h('strong', { text: U.errTitle })),
    h('ul', {}, ids.map((id) => { const q = QUESTION_BY_ID[id]; return h('li', {}, h('button', { type: 'button', class: 'sv-linkbtn', onclick: () => jumpTo(q) }, `Q${q.num} ${q.short}`), ` — ${errors[id]}`); }))));
  jumpTo(QUESTION_BY_ID[ids[0]]);
}

function jumpTo(q) {
  if (q.flavor) selectTab(q.flavor);
  const fs = $(`#q-${q.id}`);
  if (!fs) return;
  scrollToEl(fs);
  const target = fs.querySelector('input:not([disabled]):checked, input:not([disabled]), select, textarea');
  if (target) target.focus({ preventScroll: true });
}

// ---------- 제출 ----------
function submitErrorBox() {
  return h('div', { class: 'sv-alert sv-alert--error', id: 'sv-submit-error', role: 'alert', tabindex: '-1' },
    h('p', {}, h('strong', { text: U.submitErrTitle })),
    h('p', { text: submitError }),
    h('p', { text: U.submitErrKeep }));
}

function serverMessage(status, data) {
  if (data && data.error === 'version_mismatch') return U.errVersion;
  if (data && (data.error === 'storage_error' || data.error === 'storage_not_configured')) return U.errStorage;
  if (status === 422) return U.errCheck;
  return U.errServer(status);
}

async function submit() {
  const all = validateAll(state.answers, LANG, STEPS);
  if (Object.keys(all).length) {
    const stepIndex = STEPS.findIndex((s) => s.questions.some((q) => all[q.id]));
    go(stepIndex);
    showErrors(STEPS[stepIndex], validateStep(STEPS[stepIndex].id, state.answers, LANG, STEPS));
    return;
  }
  submitting = true;
  submitError = null;
  const old = $('#sv-submit-error');
  if (old) old.remove();
  setNextLabel();
  announce(U.submitting2);
  const done = store.get(DONE_KEY) || { count: 0 };
  const payload = {
    responseId: state.responseId, version: SURVEY_VERSION, lang: LANG, source: state.source || SOURCE,
    startedAt: state.startedAt, answers: state.answers,
    meta: { priorSubmissions: done.count || 0, wtpRevisedAfterPrice: false },
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SUBMIT_TIMEOUT);
  let result = null;
  let message = null;
  try {
    const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) result = data;
    else if (res.status === 422 && data.errors) {
      submitting = false;
      setNextLabel();
      const stepIndex = STEPS.findIndex((s) => s.questions.some((q) => data.errors[q.id]));
      if (stepIndex >= 0) {
        go(stepIndex);
        const local = validateStep(STEPS[stepIndex].id, state.answers, LANG, STEPS);
        const errs = Object.keys(local).length ? local : Object.fromEntries(Object.keys(data.errors).map((k) => [k, U.errCheck]));
        showErrors(STEPS[stepIndex], errs);
        return;
      }
      message = U.errCheck;
    } else message = serverMessage(res.status, data);
  } catch (err) {
    message = err && err.name === 'AbortError' ? U.errTimeout : U.errNetwork;
  } finally {
    clearTimeout(timer);
  }
  submitting = false;
  if (result) {
    clearTimeout(saveTimer);
    store.del(DRAFT_KEY);
    store.set(DONE_KEY, { count: (done.count || 0) + 1, lastAt: result.submittedAt || new Date().toISOString() });
    doneInfo = { id: result.id, submittedAt: result.submittedAt };
    history.replaceState({ sv: 'done' }, '', BASE_URL);
    renderDone();
    window.scrollTo({ top: 0 });
    focusTitle('#sv-done-title');
    announce(U.submitOkAnnounce);
    return;
  }
  submitError = message;
  setNextLabel();
  view.append(submitErrorBox());
  const box = $('#sv-submit-error');
  scrollToEl(box);
  box.focus({ preventScroll: true });
  announce(U.submitFailAnnounce);
}

// ---------- 시작 ----------
history.replaceState({ sv: -1 }, '', BASE_URL);
renderIntro();
