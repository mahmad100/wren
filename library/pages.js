// Shows a document as its real pages, for the reader (content.js) to read over.
//  - PDF: each page is drawn by PDF.js, and its text is laid over it, invisible, in the reading
//    order and paragraphs found by convert.js. The reader highlights that text, so the highlight
//    lands on the words on the page.
//  - Word: docx-preview (vendor/) lays the document out in pages, with its own fonts and styles.
// Sizes are in PDF points times --k, the zoom that fits the pages to the window.
import { pdfPages } from './convert.js';

const GAP = 16;        // points between pages
const MAX_ZOOM = 1.75;

const h = (tag, className) => Object.assign(document.createElement(tag), { className });
const pt = (n) => `calc(var(--k) * ${Math.round(n * 100) / 100}px)`;

// Shows a PDF in `box`. Returns { close }.
export async function showPdf(box, blob) {
  const { task, pdf, sizes, blocks } = await pdfPages(blob);
  const width = Math.max(...sizes.map((s) => s.width));
  let y = 0;
  const places = sizes.map((s) => {
    const at = { left: (width - s.width) / 2, top: y, ...s };
    y += s.height + GAP;
    return at;
  });
  const height = y - GAP;

  box.classList.add('pages', 'pdf');
  box.style.width = pt(width);
  box.style.height = pt(height);
  const pages = places.map((p, i) => {
    const el = h('div', 'page');
    el.dataset.n = i + 1;
    Object.assign(el.style, { left: pt(p.left), top: pt(p.top), width: pt(p.width), height: pt(p.height) });
    el.append(h('canvas'));
    return el;
  });
  const text = h('div', 'text');
  text.append(...blocks.map((b) => textBlock(b, places)));
  box.replaceChildren(...pages, text);

  // Fit the pages to the window, and draw only the ones on or near the screen.
  let zoom = 0;
  const drawn = new Map(); // page element -> { zoom, task }
  const fit = () => {
    const room = box.parentElement.clientWidth - 32;
    const next = Math.min(MAX_ZOOM, Math.max(0.3, room / width));
    if (Math.abs(next - zoom) < 0.01) return false;
    zoom = next;
    box.style.setProperty('--k', zoom);
    return true;
  };
  const draw = async (el) => {
    const was = drawn.get(el);
    if (was?.zoom === zoom) return;
    was?.task?.cancel();
    const job = { zoom, task: null };
    drawn.set(el, job);
    const page = await pdf.getPage(+el.dataset.n);
    if (drawn.get(el) !== job) return;
    const view = page.getViewport({ scale: zoom * devicePixelRatio });
    // Drawn off screen, then swapped in, so the old drawing stays until the new one is ready.
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(view.width);
    canvas.height = Math.ceil(view.height);
    job.task = page.render({ canvas, viewport: view });
    try {
      await job.task.promise;
      if (drawn.get(el) === job) el.replaceChildren(canvas);
    } catch { /* cancelled: a newer drawing is on its way */ }
  };
  const forget = (el) => {
    drawn.get(el)?.task?.cancel();
    drawn.delete(el);
    el.replaceChildren(h('canvas')); // frees the drawing's memory
  };
  const near = new Set();
  const watch = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        near.add(e.target);
        draw(e.target);
      } else {
        near.delete(e.target);
        forget(e.target);
      }
    }
  }, { rootMargin: '150% 0px' });
  fit();
  for (const el of pages) watch.observe(el);
  let resizeTimer = 0;
  const resized = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (fit()) for (const el of near) draw(el); }, 150);
  });
  resized.observe(box.parentElement);

  return {
    close() {
      watch.disconnect();
      resized.disconnect();
      clearTimeout(resizeTimer);
      for (const job of drawn.values()) job.task?.cancel();
      task.destroy();
    },
  };
}

const measure = document.createElement('canvas').getContext('2d');

// One paragraph or heading: an element as big as its text on the page, holding each run of text
// where it's shown, stretched to the run's width there. The spaces between runs and lines are
// plain text, so the reader hears the words as convert.js joined them.
function textBlock(block, places) {
  const runs = [];
  block.lines.forEach((line, i) => {
    const next = block.lines[i + 1];
    line.runs.forEach((r, j) => {
      const place = places[line.page - 1];
      const top = place.top + r.y - r.ascent * r.size;
      runs.push({ ...r, left: place.left + r.x, top, before: j > 0 && r.space ? ' ' : '',
        // A word split with a hyphen at the end of the line: the hyphen is shown but not read.
        hyphen: next?.joined && j === line.runs.length - 1 && /-$/.test(r.str) });
    });
    if (next && !next.joined) runs.push({ gap: true });
  });
  const shown = runs.filter((r) => !r.gap);
  const left = Math.min(...shown.map((r) => r.left));
  const top = Math.min(...shown.map((r) => r.top));
  const right = Math.max(...shown.map((r) => r.left + r.width));
  const bottom = Math.max(...shown.map((r) => r.top + r.size));

  const el = document.createElement(block.tag);
  Object.assign(el.style, { left: pt(left), top: pt(top), width: pt(right - left), height: pt(bottom - top) });
  for (const r of runs) {
    if (r.gap) {
      el.append(' ');
      continue;
    }
    if (r.before) el.append(r.before);
    const span = document.createElement('span');
    span.setAttribute('data-wren-run', '');
    const str = r.hyphen ? r.str.slice(0, -1) : r.str;
    span.append(str);
    if (r.hyphen) {
      const mark = document.createElement('span');
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = '-';
      span.append(mark);
    }
    measure.font = `100px ${r.family}`;
    const natural = measure.measureText(r.str).width / 100 * r.size;
    span.style.cssText = `left:${pt(r.left - left)};top:${pt(r.top - top)};font-size:${pt(r.size)};font-family:${r.family};` +
      (natural > 0 && r.width > 0 ? `transform:scaleX(${(r.width / natural).toFixed(4)});` : '');
    el.append(span);
  }
  return el;
}

// Shows a Word document in `box`, laid out in pages. Returns { close }.
export async function showDocx(box, blob) {
  if (typeof docx === 'undefined') throw new Error('The Word page view didn\'t load.');
  box.classList.add('pages', 'word');
  box.style.removeProperty('width');
  box.style.removeProperty('height');
  box.replaceChildren();
  await docx.renderAsync(blob, box, box, {
    inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: false, experimental: false,
    renderHeaders: true, renderFooters: true, renderFootnotes: true, renderEndnotes: true,
    renderComments: false, renderChanges: false, useBase64URL: true,
  });
  // Headings are paragraphs in a heading style: mark them, for the page map.
  for (const p of box.querySelectorAll('p[class*="_heading"], p[class*="_title"]')) {
    const name = [...p.classList].find((c) => /_(heading\d?|title)$/i.test(c));
    if (!name) continue;
    p.setAttribute('role', 'heading');
    p.setAttribute('aria-level', /title$/i.test(name) ? 1 : Math.min(6, +/(\d)$/.exec(name)?.[1] || 2));
  }
  // A page's header repeats on every page: shown, but not read (footers already aren't).
  for (const el of box.querySelectorAll('header')) el.setAttribute('aria-hidden', 'true');
  // Only links to the web, opened in a new tab.
  for (const a of box.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (href.startsWith('#')) continue;
    if (/^(https?:|mailto:)/i.test(href)) Object.assign(a, { target: '_blank', rel: 'noopener noreferrer' });
    else a.removeAttribute('href');
  }
  return { close() {} };
}
