// Turns an added file into a plain web page of headings and paragraphs, which the reader then
// reads like any article. PDFs go through PDF.js and Word files through Mammoth (both in vendor/,
// copied there by the build; see README).

// Bump when the conversion gets better: documents converted by an older version are redone
// from their stored file the next time they're opened.
export const VERSION = 2;

export const KINDS = { pdf: 'PDF', docx: 'Word' };

export function kindOf(file) {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  return null;
}

// { html, title } for a file. `onProgress` gets a fraction from 0 to 1. Throws an Error whose
// message can be shown to the reader.
export async function convert(kind, blob, onProgress = () => {}) {
  const data = await blob.arrayBuffer();
  const made = kind === 'pdf' ? await pdfToHtml(data, onProgress) : await docxToHtml(data);
  const page = clean(made.html);
  if (!page.textContent.trim()) {
    throw new Error(kind === 'pdf'
      ? 'This PDF has no text in it. It is probably a scan (pictures of pages), which Wren can\'t read yet.'
      : 'No text was found in this document.');
  }
  const box = document.createElement('div');
  box.append(page);
  const heading = box.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim();
  return { html: box.innerHTML, title: made.title || (heading && heading.length < 200 ? heading : '') };
}

// ---------- Cleaning: only plain document markup is kept ----------

const TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'BR', 'HR',
  'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SUP', 'SUB', 'A', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'FIGURE', 'FIGCAPTION']);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'LINK', 'META']);

// A stored or freshly made page as a DocumentFragment with nothing in it but text markup,
// pictures held in the page itself, and links to the web.
export function clean(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (from, to) => {
    for (const node of from.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        to.append(node.data);
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || DROP.has(node.tagName)) continue;
      if (!TAGS.has(node.tagName)) {
        walk(node, to); // keep what's inside
        continue;
      }
      const el = document.createElement(node.tagName);
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') || '';
        if (/^(https?:|mailto:)/i.test(href)) {
          el.href = href;
          el.target = '_blank';
          el.rel = 'noopener noreferrer';
        }
      } else if (node.tagName === 'IMG') {
        const src = node.getAttribute('src') || '';
        if (!/^data:image\/(png|jpe?g|gif|webp|bmp);/i.test(src)) continue;
        el.src = src;
        el.alt = node.getAttribute('alt') || '';
      } else if (node.tagName === 'TD' || node.tagName === 'TH') {
        for (const span of ['colspan', 'rowspan']) {
          if (/^\d{1,3}$/.test(node.getAttribute(span) || '')) el.setAttribute(span, node.getAttribute(span));
        }
      } else if (node.tagName === 'SUP' && (node.classList.contains('reference') || node.querySelector('a[href^="#"]'))) {
        el.className = 'reference'; // a footnote mark like "[1]": shown, but not read aloud
      }
      walk(node, el);
      to.append(el);
    }
  };
  const out = document.createDocumentFragment();
  walk(doc.body, out);
  return out;
}

const escape = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---------- Word ----------

async function docxToHtml(data) {
  if (typeof mammoth === 'undefined') throw new Error('The Word reader didn\'t load.');
  try {
    // Word's Title style is the document's title (Mammoth leaves it a plain paragraph).
    const { value } = await mammoth.convertToHtml({ arrayBuffer: data },
      { styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => p.subtitle:fresh"] });
    return { html: value, title: '' };
  } catch {
    throw new Error('This file couldn\'t be read as a Word document. Old .doc files need saving as .docx first.');
  }
}

// ---------- PDF ----------
// A PDF only says where each piece of text sits on the page. The pieces are put back into lines,
// the lines into paragraphs, and bigger or differently set lines become headings.

let pdfjsLoading = null;
function loadPdfjs() {
  pdfjsLoading ??= import('./vendor/pdf.min.mjs').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href;
    return pdfjs;
  });
  return pdfjsLoading;
}

async function openPdf(data) {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data, isEvalSupported: false });
  try {
    return { task, pdf: await task.promise };
  } catch (err) {
    throw new Error(err?.name === 'PasswordException' ? 'This PDF is locked with a password.' : 'This file couldn\'t be read as a PDF.');
  }
}

// Every page's lines, and each page's size in points (as shown, at 1x).
async function readPdf(pdf, onProgress) {
  const lines = [];
  const sizes = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const [, y0, , y1] = page.view;
    const view = page.getViewport({ scale: 1 });
    sizes.push({ width: view.width, height: view.height });
    const content = await page.getTextContent();
    lines.push(...pageLines(content, n, y0, y1 - y0, view.transform));
    page.cleanup();
    onProgress(n / pdf.numPages);
  }
  return { lines, sizes, blocks: toBlocks(dropRunningLines(lines, pdf.numPages)) };
}

async function pdfToHtml(data, onProgress) {
  const { task, pdf } = await openPdf(data);
  const { blocks } = await readPdf(pdf, onProgress);
  const info = await pdf.getMetadata().catch(() => null);
  const title = (info?.info?.Title || '').trim();
  await task.destroy();
  return {
    html: blocks.map((b) => `<${b.tag}>${escape(b.text)}</${b.tag}>`).join('\n'),
    // Titles like "Microsoft Word - draft3.docx" are worse than the file's name.
    title: title.length > 3 && !/\.(docx?|pdf|tex|dvi|indd)$|^untitled/i.test(title) ? title : '',
  };
}

// A PDF for showing as its real pages (library/pages.js): the open document to draw them from,
// each page's size, and the same blocks as the text view, with each line's runs of text and
// where they sit. `task.destroy()` closes it.
export async function pdfPages(blob, onProgress = () => {}) {
  const { task, pdf } = await openPdf(await blob.arrayBuffer());
  const { sizes, blocks } = await readPdf(pdf, onProgress);
  return { task, pdf, sizes, blocks };
}

const mostCommon = (counts) => [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
const count = (map, key, by) => map.set(key, (map.get(key) || 0) + by);

// Generic font families only, as PDF.js names them, since they go into CSS.
const family = (style) => /^[\w ,-]+$/.test(style?.fontFamily || '') ? style.fontFamily : 'sans-serif';

// The text pieces of one page as lines: { page, x, y, right, text, size, font, top, runs }.
// y is measured up from the bottom of the page, as in the PDF; top is 0 at the top and 1 at the bottom.
// runs are the pieces as shown on the page (`view` maps PDF points onto it, top-left at 0, 0):
// { str, x, y (the baseline), width, size, family, ascent, space (a space goes before it) }.
function pageLines({ items, styles }, page, bottom, height, view) {
  const lines = [];
  let line = null;
  const close = () => {
    if (!line) return;
    line.text = line.text.replace(/\s+/g, ' ').trim();
    line.size = mostCommon(line.sizes);
    line.font = mostCommon(line.fonts);
    if (line.text) lines.push(line);
    line = null;
  };
  for (const it of items) {
    if (typeof it.str !== 'string') continue;
    const [a, b, c, d, x, y] = it.transform;
    if (Math.abs(b) > Math.abs(a)) continue; // text set sideways, like the stamp down the edge of arXiv papers
    const size = Math.round(Math.hypot(c, d) * 2) / 2 || it.height || 10;
    if (!it.str.trim()) {
      if (line && it.str) line.spaced = true;
      continue;
    }
    // Still the same line: about the same height on the page (small shifts are sub- and
    // superscripts) and not back to the left.
    const big = Math.max(size, line?.size0 || 0);
    let space = false;
    if (!line || Math.abs(y - line.y) > big * 0.6 || x < line.right - big * 2) {
      close();
      line = { page, x, y, right: x, text: '', size0: size, sizes: new Map(), fonts: new Map(), top: 1 - (y - bottom) / height, runs: [] };
    } else if ((line.spaced || x - line.right > size * 0.2) && !/\s$/.test(line.text) && !/^\s/.test(it.str)) {
      line.text += ' ';
      space = true;
    }
    const style = styles[it.fontName];
    line.runs.push({ str: it.str, x: view[0] * x + view[2] * y + view[4], y: view[1] * x + view[3] * y + view[5],
      width: it.width * Math.hypot(view[0], view[1]), size, family: family(style), ascent: style?.ascent > 0 ? style.ascent : 0.8, space });
    line.spaced = false;
    line.text += it.str;
    line.right = Math.max(line.right, x + it.width);
    count(line.sizes, size, it.str.length);
    count(line.fonts, it.fontName, it.str.length);
  }
  close();
  return lines;
}

// Page numbers, and the headers and footers repeated from page to page, aren't part of the text.
function dropRunningLines(lines, pages) {
  const inMargin = (l) => l.top < 0.09 || l.top > 0.91;
  const key = (l) => l.text.toLowerCase().replace(/\d+/g, '#');
  const seen = new Map();
  for (const l of lines) if (inMargin(l)) count(seen, key(l), 1);
  const repeated = Math.max(2, Math.ceil(pages * 0.3));
  return lines.filter((l) => {
    if (!inMargin(l)) return true;
    const k = key(l);
    if (/^[-–—\s]*(page\s*)?#(\s*(of|\/)\s*#)?[-–—\s]*$/.test(k)) return false;
    return pages < 2 || seen.get(k) < repeated;
  });
}

const ENDS_SENTENCE = /[.!?:]["'”’)\]]*$/;

// Lines into blocks: [{ tag: 'h1' to 'h4' or 'p', text, lines }]. A line marked `joined` carries
// on a word split with a hyphen at the end of the line before.
function toBlocks(lines) {
  if (!lines.length) return [];
  const sizes = new Map();
  for (const l of lines) count(sizes, l.size, l.text.length);
  const body = mostCommon(sizes);
  const isBody = (l) => Math.abs(l.size - body) < 0.7;
  const fonts = new Map();
  for (const l of lines) if (isBody(l)) count(fonts, l.font, l.text.length);
  const bodyFont = mostCommon(fonts);
  // The usual distance from one line of a paragraph to the next.
  const steps = [];
  for (let i = 1; i < lines.length; i++) {
    const dy = lines[i - 1].y - lines[i].y;
    if (lines[i].page === lines[i - 1].page && isBody(lines[i]) && isBody(lines[i - 1]) && dy > 0 && dy < body * 3) steps.push(dy);
  }
  steps.sort((p, q) => p - q);
  const leading = steps[Math.floor(steps.length / 2)] || body * 1.2;
  const gapAfter = (prev, l) => !prev || prev.page !== l.page || prev.y - l.y > (isBody(l) ? leading : l.size * 1.2) * 1.35 || prev.y < l.y;

  // Where the lines of the text start (two places in a two-column paper). Section headings
  // start there too; names and labels set in bold elsewhere on the page don't.
  const lefts = new Map();
  for (const l of lines) if (isBody(l)) count(lefts, Math.round(l.x), 1);
  const bodyLines = lines.filter(isBody).length;
  const margins = [...lefts].filter(([, n]) => n >= bodyLines * 0.08).map(([x]) => x);
  const atMargin = (l) => margins.some((x) => Math.abs(l.x - x) < l.size * 1.5);
  const USUAL_HEADING = /^(abstract|summary|introduction|background|methods?|results?|discussion|conclusions?|references|acknowledge?ments?|appendix)\b/i;

  // The same big line over and over is a label in a run of figures, not a heading.
  const repeats = new Map();
  for (const l of lines) if (l.size >= body * 1.15) count(repeats, l.text, 1);

  // A heading is set bigger than the text, or is a short line in another font (bold, usually)
  // standing on its own.
  const headingAt = (i) => {
    const l = lines[i];
    if (l.size >= body * 1.15 && l.text.length < 200) return repeats.get(l.text) > 2 ? null : 'big';
    const next = lines[i + 1];
    if (l.size > body - 0.7 && l.font !== bodyFont && l.text.length < 90 && /^(\d+(\.\d+)*\.?\s+)?\p{Lu}/u.test(l.text) && !/[.,;:]$/.test(l.text) &&
        (atMargin(l) || USUAL_HEADING.test(l.text)) && gapAfter(lines[i - 1], l) && (!next || next.font !== l.font || gapAfter(l, next))) return 'font';
    return null;
  };

  const groups = []; // { head, lines }
  let g = null;
  lines.forEach((l, i) => {
    const head = headingAt(i);
    const prev = g?.lines[g.lines.length - 1];
    let fresh = !g || head !== g.head || Math.abs(l.size - prev.size) > 0.7;
    if (!fresh) {
      const moved = prev.page !== l.page || prev.y < l.y; // onto the next page or column
      if (head) fresh = moved || prev.y - l.y > l.size * 1.8 || head === 'font';
      // A sentence running over to the next page or column stays one paragraph.
      else if (moved) fresh = ENDS_SENTENCE.test(prev.text);
      else if (gapAfter(prev, l)) fresh = true;
      else {
        // No gap: a new paragraph starts with an indented line, or after a last line that stops short.
        const rest = g.lines.slice(1);
        const left = rest.length ? Math.min(...rest.map((r) => r.x)) : null;
        const right = Math.max(...g.lines.map((r) => r.right));
        const indented = left != null ? l.x > left + l.size * 0.9 : l.x > prev.x + l.size * 0.9 && ENDS_SENTENCE.test(prev.text);
        const stoppedShort = rest.length > 0 && prev.right < right - l.size * 3 && ENDS_SENTENCE.test(prev.text);
        fresh = indented || stoppedShort;
      }
    }
    if (fresh) groups.push(g = { head, lines: [] });
    g.lines.push(l);
  });

  // The title is the biggest heading on the first page. A numbered heading's depth comes from
  // its number ("3.2 Attention" is one level below "3 Model").
  const title = groups.filter((x) => x.head === 'big' && x.lines[0].page === 1).sort((p, q) => q.lines[0].size - p.lines[0].size)[0];
  const tagFor = (x, text) => {
    if (!x.head) return 'p';
    if (x === title) return 'h1';
    const number = /^(\d+(?:\.\d+)*)\.?\s/.exec(text)?.[1];
    return number ? `h${Math.min(4, 1 + number.split('.').length)}` : x.head === 'big' ? 'h2' : 'h3';
  };
  return groups.map((x) => {
    let text = x.lines[0].text;
    for (const l of x.lines.slice(1)) {
      // A word split over two lines with a hyphen is joined back up.
      l.joined = /\p{Ll}-$/u.test(text) && /^\p{Ll}/u.test(l.text);
      if (l.joined) text = text.slice(0, -1) + l.text;
      else text += ' ' + l.text;
    }
    return { tag: tagFor(x, text), text, lines: x.lines };
  });
}
