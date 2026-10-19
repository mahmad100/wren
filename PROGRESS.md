# Wren: Progress

My own Speechify replacement: a Chrome extension that reads pages, PDFs and Word documents aloud with sentence and word highlighting.

## Status (2026-10-19)

| Version | Feature | Status |
| --- | --- | --- |
| v0.1 | Reads pages with built-in voices, word highlighting, player bar, shortcuts | ✅ Confirmed working in Chrome |
| v0.2 | Natural AI voices (Kokoro, runs on the laptop's GPU) | ✅ Confirmed working in Chrome (Heart, 1× and 2×) |
| v0.3 | Page map: list of sections to tick, untick, and jump to | ✅ Tested in Chrome |
| v0.4 | Math read aloud (equations, Greek letters, symbols), with a box over equations | ✅ Tested in Chrome on "Mass–energy equivalence" |
| v0.5 | Click to read, read just a selection, paragraph play buttons, Options panel (line focus, wider spacing, highlight colors, follow along) | ✅ Tested in Chrome; follow along and Back to reading checked again on 2026-10-18. ⚠️ 4 last fixes not yet tried, see below |
| v0.6 | Renamed Wren. Animated logo. Apple-style glass player you can drag and dock (vertical on the sides). Appearance panel: logo, color, position lock, glass | ✅ Used in Chrome by the user (appearance panel, glass, panels). ⚠️ Last 3 fixes not yet tried, see below |
| v0.7 | True pause and resume (carries on mid-word), shrink when not in use (with an on/off button on the bar), position picker fix | ✅ Shrink and picker used in Chrome by the user. ⚠️ Pause/resume not yet tried with real voices |
| v0.7+ | AI voice starts faster after a click (short first piece, clips prepared before the click), × to close panels | ✅ The user tried it in Chrome: "it works". ⚠️ Not measured with the prepare-ahead, see Session 5 |
| v0.8 | Library: a page for reading PDF and Word documents, with your place remembered. The toolbar icon on a PDF tab opens it there | ⚠️ Unchecked: not yet used by the user, or heard with an AI voice. Only the automatic checks in a hidden Chrome pass (`node test/library.mjs`) |
| v0.9 | Library shows documents as their real pages (PDF pages drawn, Word laid out in pages), highlight on the words; Pages / Text switch | ⚠️ Unchecked by the user. 32 automatic checks pass, and screenshots of a two-column PDF and a styled Word file look right |
| v0.9+ | Reads pages whose text is in an iframe (e.g. a course in an LMS), and text that fades in as it's scrolled to | ✅ Iframe: the user tried it on a Tufts Absorb course, "it works". ⚠️ Fade-in fix (skipped list items) not yet tried by the user |

## Session 1 (2026-10-05)

**Built v0.1**
- Finds the article text and skips menus, sidebars, Wikipedia fact boxes, data tables, and reference lists. Stops at "References", "External links", etc.
- Splits text into sentences without breaking at initials ("W. Pringle Morgan") or "Dr.", "e.g.".
- Highlights the current sentence and word without changing the page (CSS Custom Highlight API).
- Speech goes through `chrome.tts` in the background script, so it needs no click on the page first.
- Tested on the Wikipedia "Dyslexia" article: 225 sentences of article text. Before the fixes it was 1,065, mostly citations.

**Built v0.2: AI voices**
- Kokoro-82M runs in a hidden extension page (`offscreen/`), using WebGPU.
- Speed measured on this laptop (Intel Arc / Xe2 graphics):
  - Processor only (CPU, smaller q8 model): **0.2× real time**, too slow to use.
  - Graphics chip (WebGPU, full-precision fp32 model): **~3.5× real time**. This is what the extension uses.
- Prepares the next 3 sentences while the current one plays. The gap between sentences was ~20 ms in testing.
- One-time ~330 MB model download, cached afterwards. About 5 s from first press to speech, including warm-up.
- 10 AI voices (US and UK English). Heart is the default.
- Falls back to a built-in voice on computers without WebGPU.

**Tested v0.2 AI voices:** reads on its own with Heart at 1× and 2×, no stalls. Sounded good to the user.

**Put the project on GitHub:** https://github.com/mahmad100/wren (public, branch `main`).

**Built v0.3: page map** (button on the bar, or Alt+Shift+M)
- Sections come from the article's headings. "References" onwards starts unticked, so the default reading is unchanged (still 225 sentences on "Dyslexia").
- Tested on "Dyslexia": jump to a section, untick the section being read (moves on), jump into an unticked section, Alt+click into an unticked section.

**Built v0.4: math and Greek letters**
- `math-speech.js` turns MathML into English, and names Greek letters and symbols in ordinary text.
- Checked how Kokoro pronounces things (with `phonemizer` in the build folder): "xi" came out as "Roman eleven" and "mu" as "moo", so they're respelled "zye" and "mew". A lone "a" is sent as "A", or it's read as "uh".
- Tested the converter on 8 representative real equations from Wikipedia "Mass–energy equivalence" (of its 34), and read the page in Chrome. Covers Wikipedia's quirks: the power on the closing bracket in `(pc)^2`, aligned equations split into table cells, and subscripts spelled out letter by letter (`E_rel`).
- Equations get a yellow box over them, since they're images. The word box follows the voice: "E equals m c squared" lights up the equation for its ~2 s.
- Fixed: the box first hid the equation, because the blend only worked inside the overlay. Now the overlay layer itself blends with the page.

**Fixed:** the page map popped up on every page, because "map open" was remembered from testing. It now always starts closed.

**Researched Speechify and NaturalReader:**
- Speechify: click to listen, a play button on selected text, "Read Selection", skip-content switches.
- NaturalReader: Click to Read with a hover highlight, Highlight to Read with a minimum length, a separate switch for each.
- Nielsen Norman Group timing for anything shown on hover: show after 0.3–0.5 s at rest, hide 0.5 s after leaving.
- For dyslexia: wider letter spacing has the best evidence (Zorzi et al., PNAS 2012: ~20% faster, half the errors). Line focus comes from Immersive Reader. OpenDyslexic showed no benefit (Wery & Diliberto 2017), so no special font.

**Built v0.5: starting where you point, and reading options**
- Click to read from the exact word, with a dotted underline preview. Text outside the article gets a temporary "Clicked text" section instead of replacing the map.
- Selection play button, in the highlight color: reads just the selection, then "Finished selection".
- Paragraph play buttons (off by default), using the NN/g timings.
- ⚙ Options panel on the bar: a switch for each of these, plus follow along with "Back to reading", line focus, wider spacing (WCAG values), and highlight color and style.
- Right-click menu: added *Read selected text* next to *Read aloud from here*.
- The user asked for no extra shortcuts. Alt+Shift+M/O/X were removed: they clash with Wikipedia's own Alt+Shift shortcuts (O opened "Log in", X opens a random article).
- Tested in Chrome on "Mass–energy equivalence": the click preview and click-to-read, clicking text outside the article, selection reading, the paragraph button appearing after 0.45 s, line focus, spacing, green highlight, and "Back to reading".

## Session 2 (2026-10-07)

**Renamed to Wren** (was "Voice Reader"): extension name, page titles, log tags and docs. The folder and GitHub repo were still `voice-reader` then; see Session 4.

**Logo:** picked "Soundtail" (in orange) from three ideas: a wren whose cocked tail is a fan of three sound-level bars. `wren-mark.js` draws it. It's on the player bar, and while reading its tail sways slowly. It eases in and out instead of starting or stopping suddenly. The toolbar icon sways too. The PNG icons are made from the same drawing (`node icons/build.mjs`). The tail went through a few shapes: side-by-side bars looked like a hand, and a fan from one point reads as a tail.

**Redesigned the player** (Apple style): frosted glass in light and dark mode, Wren orange, and a progress ring around the play button.
- Drag it anywhere. Near the top or bottom edge it docks there; once either end of the bar reaches the left or right side it turns vertical there, wherever it's held; anywhere else it floats. It glides into place, and its position is remembered (`dock` setting). 
- Click the logo (now in a circle, like the buttons) for **Appearance**: three logos (Soundtail, Songbird, Wave), five colors (Ember, Rose, Dusk, Moss, Ink), a position picker (tap an edge of a small screen) with **Lock position** (lock badge on the logo, a shake if dragged), and glass settings (clear to frosted, pill or rounded, tint). The color themes the whole player, the play buttons on the page, and the toolbar icon. The glass settings apply to the bar, panels and message bubbles alike. Saved as the `logo`, `color`, `lockDock`, `glassClarity`, `glassTint` and `barShape` settings.
- The voice menu is now a panel with a list of voices, opened from a button that shows the voice's name. Options use on/off switches, and the highlight style is a segmented control.
- Panels open on the side facing the page and stay inside the window. Esc closes them.
- Checked with screenshots of a test page (Chrome's extension features stubbed): bottom, top, left and right docks, floating, dark mode, each panel, dragging, and a locked drag. The user then used it in Chrome.

**Fixed after the user tried it in Chrome:**
- Clicking the logo did nothing: the bar holds the pointer during a possible drag, so the click went to the bar. A press and release on the logo without moving now opens Appearance.
- The bar only turned vertical when the pointer itself reached the side. It now turns vertical when either end of the bar does, wherever it's held.
- Scrolling a panel sometimes scrolled the page behind it (and turned off follow along). Panels now keep the scroll.
- The highlight style switch wrapped "Sentence and word" onto two lines and looked heavy in dark mode. Now "Both · Sentence · Word" on one line, iPhone-style.
- **Reading a selected paragraph stopped after the first word.** A triple-click selection ends on Wikipedia's citation "[1]", which isn't spoken, so its position fell back to the start of the paragraph. Text that isn't spoken now maps to the nearest spoken text. Checked on the test page: all three sentences read, then it stopped.
- The version is now 0.6.0 (Chrome still said 0.5).

## Session 3 (2026-10-07): v0.7

**True pause and resume** (was: resuming restarted the sentence).
- Pause holds the voice mid-word: `chrome.tts.pause()`/`resume()` for built-in voices, and pausing the `<audio>` clip in `offscreen.js` for AI voices. The word highlight stays on the paused word, and its timing skips the pause.
- Fallback: if the voice doesn't confirm the pause within 0.3 s, or can't resume (e.g. the AI voice unloaded after 10 minutes), it's stopped, and resume starts from the paused word. Speed and voice changes also carry on from the current word now, instead of restarting the sentence.
- Skipping to another sentence while paused lets go of the held one. A speed or voice change while paused lets go too (the held audio is at the old setting); play then carries on from the word.
- Tested on a test page with a fake voice that speaks a word every 100 ms: a voice that can pause (pause, resume, next sentence, nothing repeated), one that can't (stopped, resumed from "their loud songs"), skip while paused, and faster while paused (resumed from "small"). Not yet tried with real voices.

**Shrink when not in use** (Appearance → Position, off by default): the player slims down to the logo and play button, like the iPhone's Dynamic Island, and opens into the full bar when pointed at (after 80 ms, so passing over it doesn't). It shrinks 0.5 s after the pointer leaves, and stays open while a panel is open or it has keyboard focus (a mouse click doesn't count). The hidden controls slide out along the bar, which is placed by the size it's heading to, so it stays anchored to its edge. Works vertical too. Checked on the test page: shrunk at the bottom (stays centered), expanded on hover (same spot as the normal bar), and shrunk on the left. Reduced-motion users get it without the slide. A button on the bar (inward arrows, next to ×) turns it on or off too.

**Fixed:** with shrinking on, tapping an edge in the position picker (or dragging) from a side to the top or bottom left the bar parked high above the edge: the hidden controls kept their vertical-bar heights while the bar was measured. Also, opening a panel while shrunk now always expands the bar.

## Session 4 (2026-10-07): renamed everything to Wren

- **GitHub repo** renamed `voice-reader` → `wren` (https://github.com/mahmad100/wren). Old links redirect.
- **Commit history cleaned:** the `Co-Authored-By: Claude` line was removed from every commit and the history force-pushed. All commits are by Mohammad Ahmadi only, and the contributor list shows only mahmad100. From now on, commits carry no Claude attribution.
- **AI voice build folder** renamed `voice-reader-build` → `wren-build`. `build.mjs` now writes into `Projects/wren`, and the package is named `wren-build`.
- **Project folder:** not renamed yet. Windows said it was "in use" (Claude Code was running inside it, and VS Code and Chrome may hold it too). The user is renaming it by hand.
- **License:** GPL-3.0-or-later (`LICENSE`), chosen by the user because the AI voice bundle includes eSpeak NG (GPL-3.0, via `phonemizer`). Credits and licenses for the bundled code (kokoro-js, Transformers.js, phonemizer, eSpeak NG: Apache-2.0/GPL-3.0; onnxruntime-web: MIT) are in `THIRD_PARTY_NOTICES.md`, with the Apache text in `licenses/Apache-2.0.txt`. Update the versions there when the bundle is rebuilt.
- Left alone on purpose: the internal `voice-reader-…` IDs in `content.js` (page element and highlight names nobody sees).

## Session 5 (2026-10-07): faster start after a click, × on panels

**× on panels:** Page map, Voice, Options and Appearance each have a × in the top-right corner that closes them (`panelHead` in `content.js`).

**AI voice starting somewhere new (click, paragraph button, jump) took a few seconds.** The v0.5 fix (what you're waiting for goes to the front of the line) was still in place; the rest was the time to make the clip.
- Measured in Chrome with temporary timing code (Bella/Fable, Dyslexia article): a clip costs about **0.75–0.9 s however short, plus ~14 ms per character**. 16 chars: 0.96 s, 30: 0.98 s, 51: 1.3 s, 115: 2.3 s, 126: 2.5 s. Kokoro already keeps the voice data in memory, so the fixed cost is the model run on the GPU. A click landed 1.9 s before sound: 0.3 s double-click wait (stretched by a hidden tab), ~1 s making the clip, plus the trip there and back.
- **Short first piece:** a sentence that wasn't prepared ahead has its first words, up to a comma, semicolon, colon or dash leaving at least 4 words on each side (`firstPieceEnd`), spoken as their own clip. The rest is made while they play, and the whole sentence stays highlighted. Sentences with equations aren't split.
- **Prepared before the click:** the word under a pointer resting 0.2 s, a paragraph whose play button appears, and the spot of a mouse press are sent as `prepare` (content → background → offscreen). The offscreen page makes that clip first and keeps only the latest guess waiting. The clip is exactly the one `speakCurrent` asks for on the click, so the click finds it ready.
- The user tried it and said it works. Not measured after the prepare-ahead, because the test tab was covered by another window: Chrome then stops animation frames (the hover preview runs on them) and stretches a 0.3 s timer to 1 s.

**Testing notes:** content-script `console.log` doesn't reach my console reader; write to `document.documentElement.dataset` instead and read it from the page. The Chrome window must be uncovered (side by side with the terminal), or `document.visibilityState` is `hidden` and timings are wrong. The test tab is opened in the Claude tab group; the user has to reload Wren and click the icon *in that tab*.

## Session 6 (2026-10-11): open problems, and the library (v0.8)

**Bugs found by reading the code, and fixed**
- **Endless loop after an extension reload:** closing the player messaged the extension again whenever reading was *paused*, which failed, which closed the player again. Once the extension can't be reached, nothing more is sent to it (`orphan` in `content.js`). A newly loaded reader also tells the old one left on the page to take its player away, so there aren't two.
- **Paragraph play button** stayed if the pointer left the window from the paragraph. It now goes after 0.5 s.
- **Math:** |x| was silent. Now "the absolute value of x", ‖v‖ "the norm of v", a single bar "given" (P(A|B)) or "such that" (in set brackets). Checked on 8 small equations in Node.
- The reader answered every message it saw, which would have confused two open library tabs. It now answers only its own.

**Checked in a hidden Chrome** (new: Chrome driven by a script, with Wren loaded, a Microsoft voice, sound off)
- Pause and resume with a real built-in voice: "Microsoft David" confirms both (`pause` and `resume` events), and reading held its place and carried on to the end. Google and AI voices can't be tried this way (no Google voices or graphics chip in a hidden Chrome).
- The toolbar icon on a web page starts the reader.

**Built v0.8: the library** (`library/`), for PDF and Word documents
- A page of the extension with a shelf of documents and a reading view. Add by dropping files or **Add documents**. Kept in IndexedDB on this computer: the file, its text, and the sentence you stopped at.
- The reading view loads `content.js` itself, so the player, voices, page map, click to read and Options are the same as on a web page. Speech events do reach an extension page through `chrome.tabs.sendMessage` (this was the open risk; tested).
- **PDF** (PDF.js): lines are rebuilt from text positions, then paragraphs (gaps, indents, short last lines) and headings (bigger text, or a short bold line at the margin; "3.2" is one level below "3"). Page numbers and repeated headers and footers are dropped, hyphenated line ends joined, sentences carried across pages and columns.
- **Word** (Mammoth): headings, lists, tables and pictures kept; footnote marks shown but not read.
- **PDF in a Chrome tab:** Chrome now lets the reader into a PDF tab, where it found no text. It now notices the PDF and asks the service worker to fetch it into the library (`readPdf`). The icon on a new tab opens the library. A pages button on the player bar opens it too.
- Tried on two real papers: "Attention Is All You Need" (191 blocks in 0.4 s, all 22 numbered headings found at the right level) and the two-column BERT paper (read in column order, 30 headings).
- Tests live in `wren-build/test/`: `node test/library.mjs` (25 checks) and `node test/try.mjs <file>` to see what a file becomes.

**Decided:** Δ is still read "delta", like δ. "Capital delta E" is clumsier than what people say. Change `GREEK` in `math-speech.js` if it turns out to matter.

## Session 7 (2026-10-18): follow along checked, real pages in the library (v0.9), iPhone ideas

**Follow along tested in Chrome** (Dyslexia article, built-in voice): the page came back to the reading after being moved 3000 px away; scrolling with the wheel stopped following for 15 s and showed Back to reading; the button scrolled back and followed again; scrolling back by hand picked following up again at the next sentence; scrolling the page map didn't stop following. Not tried: scrolling away while paused (by design, play then jumps back to the sentence).

**Built v0.9: documents as their real pages** (the user wanted them read over in their original form, not converted)
- The original file was already kept; now it's shown. A **Pages / Text** switch in the library's top bar (remembered in `chrome.storage.local` as `libraryView`), Pages by default.
- **PDF** (`library/pages.js`): pages drawn with PDF.js, only those on or near the screen, and redrawn sharp when the window changes size (`--k` zoom fits the width, up to 1.75×). The text is laid over the pages, invisible, from the same blocks `convert.js` makes for the text view, so both views have the same sentences (checked: 12 and 12, 32 and 32). Each run of text is placed where it's drawn and stretched to its width (as PDF.js's own text layer does). A hyphen splitting a word at a line end is shown but not read. The layer multiplies with the page, so the highlight shows the words through it. Wider spacing is switched off on PDF pages.
- **Word:** docx-preview 0.4.1 (Apache-2.0, plus JSZip 3.10.2, MIT) lays it out in pages with its fonts, colors, lists and tables. Paragraphs in heading styles get `role="heading"` for the page map; page headers are shown but not read; only web links are kept.
- `content.js`: headings can be `role="heading" aria-level`, and `data-wren-run` pieces read as one line. `WrenReader.open(idx, of)` moves the place to the same distance through when a view splits the document differently (Word).
- Fixed: a Word file's Title style was ignored by Mammoth, so its title came from the first Heading 1. `VERSION` is 2, so stored texts are remade once.
- Tried on a two-column, justified PDF that Chrome printed and a styled .docx made with python-docx, in a hidden Chrome: layout, highlight, page map, narrow window. Not yet tried on a real LaTeX paper or a long PDF (hundreds of pages), or by the user.

**iPhone:** no app can draw over other apps on iOS. Options discussed: iOS Speak Screen (free, today); a Wren app with a Share → "Read with Wren" extension, background audio, a Live Activity in the Dynamic Island and a Shortcut for the Action Button or Back Tap (Expo, built in the cloud with EAS, so no Mac needed, but a $99/year Apple Developer account); later a Safari extension made from this one. Waiting on the user: Apple Developer account, and whether it's mainly for Safari or for anything.

**Committed and pushed** Sessions 6 and 7 together (v0.8 library and v0.9 pages) as d768bf2. Build-folder changes (docx-preview and JSZip added to `package.json`, `build.mjs`, `test/library.mjs`, `test/try.mjs`) live in `wren-build`, which isn't in git.

## Session 8 (2026-10-19): pages with their text in an iframe

**Wren didn't read a course in Tufts Learning Center** (Absorb LMS, an Articulate Rise course). The reader only ever went into the tab's top frame, and there the text is just the course title and "Exit course" (118 characters). The lesson (~7,700 characters) is two iframes down, inside the SCORM wrapper, all on the same site.
- **Fixed** in `background.js`: `sendToTab` now looks into every frame (`probeFrame`, run with `allFrames`) and `pickFrame` chooses where the reader goes: the frame with selected text, then one already showing the player with at least 200 characters to read, then the frame with the most text among those at least 40% of the tab's size (so hidden 0×0 SCORM frames are skipped). Right-click menu items go to the frame that was right-clicked (`info.frameId`).
- New check in `wren-build/test/library.mjs`: a page with a menu bar, a hidden iframe and the lesson in an iframe; the reader lands in the lesson. 33 of 33 pass.
- The user tried it on the course in Chrome: it works.
- **Then it skipped numbered list items** ("1", "2" in Rise's numbered lists). Rise keeps each `li` at `opacity: 0` until it's scrolled into view, then fades it in, and `isVisible` in `content.js` counted see-through text as hidden (`checkOpacity`, there since v0.2 for no particular reason). Opacity is no longer checked; `display`, `visibility` and `aria-hidden` still are. New check: a see-through list item in the test lesson is read (34 of 34 pass). ⚠️ Not yet tried by the user on the course.
- Limit: a frame from a different site than the page isn't covered by `activeTab`, so a course served from another domain still can't be read. That would need host permissions.

## Next session: start here

0. **Reload Wren in `chrome://extensions`** (it's now 0.9.0), then try the library by hand: right-click the Wren icon → *Open the Wren library*, drop in a real PDF and a .docx, and listen with an AI voice. Check the highlight sits on the words in Pages view, and try the Pages / Text switch. Try a long PDF (100+ pages) for speed. Click the icon on a PDF open in a tab. Tell me where the text comes out wrong; `node test/try.mjs <file>` shows me the same thing.
1. **Measure the faster start** (window side by side, tab visible): click with and without resting first, while reading and while stopped. Listen for a gap where a sentence is split. If a resting pointer still waits, the guess may be waiting behind a clip already being made.
2. **Listen to pause and resume:** it works with a Microsoft voice in the test, but nobody has heard it. Try Google US English and an AI voice (Heart) too. Pause mid-sentence, wait, resume: it should carry on mid-word. Also pause for over 10 minutes with an AI voice (should resume from the word).
3. **Check the last v0.6 fixes in Chrome:** the Both/Sentence/Word switch, and triple-clicking a paragraph then pressing its play button (should read the whole paragraph). Also try the glass slider and a locked drag by hand.
4. **Check the v0.5 fixes by hand:** the paragraph play button going away, line focus stepping aside when scrolled away, and reloading the extension with a reader open and paused (the player should just close).
5. My tests in earlier sessions switched on line focus, wider spacing and a green highlight in the user's settings. Switch them back in Options if not wanted.
6. **Listen to math on a few more pages** and tune the wording: Wikipedia "Normal distribution", "Schrödinger equation", "Quadratic formula", "Absolute value".
7. Library ideas: leave out the words inside figures, show scanned PDFs as pages even with no text, OCR for scans, zoom buttons for Pages view, EPUB and plain text.
8. Frames from another site (a course served from a different domain): would need optional host permissions, asked for when needed.
9. Other ideas: skip-content switches (citations, brackets, URLs), a size setting for the player, tables read row by row, Google Docs.
10. **iPhone:** waiting on the user (Apple Developer account? mainly Safari, or anything?). See Session 7 for the options; the recommended one is an Expo app with a Share extension.

**Testing note:** my Chrome tool can't press browser-level shortcuts or the toolbar icon in the user's Chrome, and Alt+Shift+letter keys hit the page's own shortcuts. The user has to reload the extension and click the icon; after that I can drive the player bar. The scripted Chrome in `wren-build/test/` can click the icon, but has no graphics chip, so no AI voices.

## Where things live

- Extension (load this folder in Chrome): `Projects/wren/`
- GitHub (public): https://github.com/mahmad100/wren. The GitHub CLI is at `%LOCALAPPDATA%\Microsoft\WinGet\Packages\GitHub.cli_*\bin\gh.exe`, logged in as mahmad100.
- Build tooling and tests (kept outside OneDrive): `C:\Users\mahmad10\wren-build` → `node build.mjs`, `node test/library.mjs`
- Details on using it and how it works: `README.md`
