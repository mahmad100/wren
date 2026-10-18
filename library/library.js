// The Wren library page: a shelf of added PDF and Word documents, and a reading view that shows
// one, as its real pages (pages.js) or as plain text, for the reader (content.js, loaded by
// library.html) to read aloud.
// "#doc=<id>" in the address shows a document; anything else shows the shelf.
import { VERSION, KINDS, kindOf, convert, clean } from './convert.js';
import { showPdf, showDocx } from './pages.js';

const $ = (id) => document.getElementById(id);
const shelf = $('shelf');
const cards = $('cards');
const reading = $('reading');
const article = $('doc');
const notice = $('notice');

let openId = null;        // the document on show
let view = 'pages';       // 'pages' (as the file looks) or 'text' (plain text); remembered
let shown = null;         // { close } for the pages on show
let place = null;         // { id, idx, total }: where reading has got to, waiting to be saved
let saveTimer = 0;
const converting = new Map(); // id -> { fraction, done }: documents whose text is being got out
const cardParts = new Map();  // id -> { meta, bar }, to update a card without redrawing the shelf

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  Object.assign(el, props);
  el.append(...children);
  return el;
}

function say(text, bad = false) {
  notice.textContent = text;
  notice.classList.toggle('bad', bad);
  notice.hidden = !text;
}

// ---------- Look: the logo and color chosen on the player ----------

async function applyLook() {
  const look = await chrome.storage.sync.get({ logo: 'soundtail', color: 'ember' }).catch(() => ({ logo: 'soundtail', color: 'ember' }));
  const pal = WREN_MARK.palettes[look.color] || WREN_MARK.palettes.ember;
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const style = document.documentElement.style;
  style.setProperty('--g1', pal.g[0]);
  style.setProperty('--g2', pal.g[1]);
  style.setProperty('--accent', pal.accent[dark ? 1 : 0]);
  style.setProperty('--accent-text', pal.text[dark ? 1 : 0]);
  const mark = $('mark');
  WREN_MARK.draw(mark.getContext('2d'), mark.width, { shape: look.logo, color: look.color, round: true });
}

// ---------- Adding documents ----------

async function addFiles(files) {
  say('');
  const skipped = [];
  const added = [];
  for (const file of files) {
    const kind = kindOf(file);
    if (!kind) {
      skipped.push(file.name);
      continue;
    }
    added.push(await WrenStore.add({ name: file.name, kind, blob: file }));
  }
  if (skipped.length) say(`Wren reads PDF and Word (.docx) files. Skipped: ${skipped.join(', ')}`, true);
  if (!added.length) return;
  if (openId) location.hash = ''; // back to the shelf to watch them arrive
  else await drawShelf();
  const results = await Promise.all(added.map(prepare));
  // One document added: open it straight away.
  if (added.length === 1 && results[0] && !openId) location.hash = `doc=${added[0].id}`;
}

// Get a document's text out of its file and keep it. True if that worked.
function prepare(doc) {
  const running = converting.get(doc.id);
  if (running) return running.done;
  const job = { fraction: 0 };
  converting.set(doc.id, job);
  job.done = (async () => {
    try {
      const blob = await WrenStore.file(doc.id);
      const { html, title } = await convert(doc.kind, blob, (fraction) => {
        job.fraction = fraction;
        const parts = cardParts.get(doc.id);
        if (parts) parts.meta.textContent = progressText(job);
      });
      await WrenStore.setPage(doc.id, html, VERSION);
      await WrenStore.update(doc.id, { title: title || doc.title, error: '' });
      return true;
    } catch (err) {
      console.warn('[Wren] could not convert', doc.name, err);
      await WrenStore.update(doc.id, { error: err?.message || 'This file couldn\'t be read.' });
      return false;
    } finally {
      converting.delete(doc.id);
      if (!openId) drawShelf();
    }
  })();
  return job.done;
}

const progressText = (job) => `Getting the text… ${Math.round(job.fraction * 100)}%`;

// ---------- The shelf ----------

function metaText(doc) {
  if (doc.error) return doc.error;
  const job = converting.get(doc.id);
  if (job) return progressText(job);
  if (!doc.total || !doc.idx) return 'Not started';
  return doc.idx >= doc.total ? 'Finished' : `${Math.round((doc.idx / doc.total) * 100)}% read`;
}

function card(doc) {
  const ready = !doc.error && !converting.has(doc.id);
  const meta = h('div', { className: 'meta', textContent: metaText(doc) });
  const bar = h('div', { className: 'bar' }, h('i'));
  bar.style.setProperty('--p', doc.total ? Math.min(1, doc.idx / doc.total) : 0);
  const remove = h('button', { className: 'remove', type: 'button', title: 'Remove from the library', textContent: '×' });
  remove.setAttribute('aria-label', `Remove ${doc.title}`);
  const el = h(ready ? 'a' : 'div', { className: 'card' + (doc.error ? ' failed' : '') },
    h('span', { className: 'kind', textContent: KINDS[doc.kind] || doc.kind }),
    h('h2', { textContent: doc.title, title: doc.name }),
    meta, bar, remove);
  if (ready) el.href = `#doc=${doc.id}`;
  remove.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const no = h('button', { type: 'button', textContent: 'Keep' });
    const yes = h('button', { type: 'button', className: 'yes', textContent: 'Remove' });
    const ask = h('div', { className: 'confirm' }, 'Remove this document from the library?', h('div', {}, no, yes));
    ask.addEventListener('click', (ev) => ev.preventDefault());
    no.addEventListener('click', () => ask.remove());
    yes.addEventListener('click', async () => {
      await WrenStore.remove(doc.id);
      drawShelf();
    });
    el.append(ask);
    no.focus();
  });
  cardParts.set(doc.id, { meta, bar });
  return el;
}

async function drawShelf() {
  const docs = await WrenStore.list();
  cardParts.clear();
  cards.replaceChildren(...docs.map(card));
  $('empty').hidden = docs.length > 0;
}

// ---------- Reading a document ----------

function savePlace() {
  clearTimeout(saveTimer);
  if (!place) return;
  const { id, idx, total } = place;
  place = null;
  return WrenStore.update(id, { idx, total });
}

WrenReader.onProgress = (idx, total) => {
  if (!openId || !total) return;
  place = { id: openId, idx, total };
  clearTimeout(saveTimer);
  saveTimer = setTimeout(savePlace, 400);
};

function clearArticle() {
  shown?.close();
  shown = null;
  article.replaceChildren();
  article.className = '';
  article.removeAttribute('style');
}

async function showShelf() {
  WrenReader.close();
  await savePlace();
  openId = null;
  reading.hidden = true;
  clearArticle();
  $('doc-title').textContent = '';
  $('listen').hidden = true;
  $('views').hidden = true;
  $('add').hidden = false;
  document.title = 'Wren Library';
  await drawShelf();
  shelf.hidden = false;
}

async function showDoc(id) {
  WrenReader.close();
  await savePlace();
  let doc = await WrenStore.get(id);
  if (!doc) {
    say('That document is no longer in the library.', true);
    location.hash = '';
    return;
  }
  say('');
  openId = id;
  shelf.hidden = true;
  reading.hidden = false;
  $('add').hidden = true;
  $('doc-title').textContent = doc.title;
  document.title = `${doc.title} · Wren`;
  let page = await WrenStore.page(id);
  if (!page || page.version !== VERSION) {
    article.replaceChildren(h('p', { textContent: 'Getting the text out of this document…' }));
    const ok = await prepare(doc);
    if (openId !== id) return;
    doc = await WrenStore.get(id);
    if (!ok) {
      location.hash = '';
      say(`${doc.name}: ${doc.error}`, true);
      return;
    }
    page = await WrenStore.page(id);
    $('doc-title').textContent = doc.title;
    document.title = `${doc.title} · Wren`;
  }
  if (openId !== id) return;
  clearArticle();
  if (view === 'pages') {
    article.replaceChildren(h('p', { textContent: 'Opening the pages…' }));
    try {
      const blob = await WrenStore.file(id);
      const opened = await (doc.kind === 'pdf' ? showPdf : showDocx)(article, blob);
      if (openId !== id) return opened.close();
      shown = opened;
    } catch (err) {
      if (openId !== id) return;
      console.warn('[Wren] could not show the pages of', doc.name, err);
      clearArticle();
      say('The pages of this document couldn\'t be shown, so here is its text.', true);
    }
  }
  if (!shown) article.replaceChildren(clean(page.html));
  showViews();
  scrollTo(0, 0);
  $('listen').hidden = false;
  WrenStore.update(id, { opened: Date.now() });
  // The player opens at the sentence where reading stopped last time.
  await WrenReader.open(doc.idx < doc.total ? doc.idx : 0, doc.total);
}

// ---------- Pages or text ----------

function showViews() {
  $('views').hidden = false;
  for (const b of $('views').querySelectorAll('button')) b.setAttribute('aria-pressed', b.dataset.view === view);
}

$('views').addEventListener('click', async (e) => {
  const to = e.target.closest('button')?.dataset.view;
  if (!to || to === view) return;
  view = to;
  chrome.storage.local.set({ libraryView: view }).catch(() => {});
  showViews();
  if (openId) await showDoc(openId);
});

function route() {
  const id = /^#doc=(.+)$/.exec(location.hash)?.[1];
  if (location.hash === '#blocked') {
    say('Wren couldn\'t get that PDF from the page. Download it, then drop the file here.', true);
    history.replaceState(null, '', location.pathname);
  }
  return id ? showDoc(id) : showShelf();
}

// ---------- Input ----------

$('add').addEventListener('click', () => $('picker').click());
$('picker').addEventListener('change', (e) => {
  addFiles([...e.target.files]);
  e.target.value = '';
});
$('listen').addEventListener('click', async () => {
  const doc = await WrenStore.get(openId);
  if (doc) WrenReader.play(place?.idx ?? (doc.idx < doc.total ? doc.idx : 0));
});

const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
addEventListener('dragover', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  $('drop').hidden = false;
});
addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) $('drop').hidden = true;
});
addEventListener('drop', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  $('drop').hidden = true;
  addFiles([...e.dataTransfer.files]);
});

addEventListener('hashchange', route);
addEventListener('pagehide', () => { savePlace(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.logo || changes.color)) applyLook();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyLook);

applyLook();
chrome.storage.local.get({ libraryView: 'pages' }).catch(() => ({ libraryView: 'pages' })).then((got) => {
  view = got.libraryView === 'text' ? 'text' : 'pages';
  route();
});
