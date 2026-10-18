// The Wren library's storage (IndexedDB, on this computer only). Shared by the library page and
// the service worker, which adds a PDF when the toolbar icon is clicked on one.
// A document is kept in three parts, so listing the library doesn't load the big ones:
//   docs:  { id, name, title, kind, size, added, opened, idx, total, source }
//   files: { id, blob }           the file as it was added
//   pages: { id, html, version }  its text as a web page, made by library/convert.js
var WrenStore = (() => {
  let opening = null;

  function open() {
    opening ??= new Promise((resolve, reject) => {
      const req = indexedDB.open('wren-library', 1);
      req.onupgradeneeded = () => {
        for (const name of ['docs', 'files', 'pages']) req.result.createObjectStore(name, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return opening;
  }

  // Run `work` on the named stores in one transaction, and give back what it returned.
  async function run(names, mode, work) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(names, mode);
      const got = work(...names.map((n) => tx.objectStore(n)));
      tx.oncomplete = () => resolve(got?.result ?? got);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  }

  const read = (name, id) => run([name], 'readonly', (s) => s.get(id));

  return {
    // Newest first.
    async list() {
      const docs = await run(['docs'], 'readonly', (s) => s.getAll());
      return docs.sort((a, b) => (b.opened || b.added) - (a.opened || a.added));
    },
    get: (id) => read('docs', id),
    file: async (id) => (await read('files', id))?.blob,
    page: (id) => read('pages', id),

    async add({ name, kind, blob, source = '' }) {
      const id = crypto.randomUUID();
      const doc = { id, name, title: name.replace(/\.[a-z0-9]+$/i, ''), kind, size: blob.size, added: Date.now(), opened: 0, idx: 0, total: 0, source };
      await run(['docs', 'files'], 'readwrite', (docs, files) => {
        docs.put(doc);
        files.put({ id, blob });
      });
      return doc;
    },

    async update(id, patch) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['docs'], 'readwrite');
        const docs = tx.objectStore('docs');
        const req = docs.get(id);
        req.onsuccess = () => { if (req.result) docs.put({ ...req.result, ...patch }); };
        tx.oncomplete = () => resolve();
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    },

    setPage: (id, html, version) => run(['pages'], 'readwrite', (s) => { s.put({ id, html, version }); }),

    remove: (id) => run(['docs', 'files', 'pages'], 'readwrite', (...stores) => { for (const s of stores) s.delete(id); }),
  };
})();
