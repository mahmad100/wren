# Third-party notices

Wren is licensed under the GNU General Public License v3.0 or later (see [LICENSE](LICENSE)). It includes the open-source software below. Each part keeps its own license; all of them can be used in a GPL-3.0 project.

The first five are the AI voice engine in `offscreen/`: `kokoro.bundle.js` is built from the npm packages below with `build.mjs` (see README, *Rebuilding the AI voice bundle*), and `ort/` holds files copied unchanged from onnxruntime-web. The last four are the library's PDF and Word readers in `library/vendor/`, copied unchanged from their npm packages by the same build.

| Component | Version | License | Source |
| --- | --- | --- | --- |
| kokoro-js | 1.2.1 | Apache-2.0 | https://github.com/hexgrad/kokoro |
| Transformers.js (@huggingface/transformers) | 3.8.1 | Apache-2.0 | https://github.com/huggingface/transformers.js |
| phonemizer | 1.2.1 | Apache-2.0 | https://github.com/xenova/phonemizer |
| eSpeak NG (compiled into phonemizer) | | GPL-3.0-or-later | https://github.com/espeak-ng/espeak-ng |
| ONNX Runtime Web (onnxruntime-web) | 1.22.0-dev.20250409 | MIT | https://github.com/microsoft/onnxruntime |
| PDF.js (pdfjs-dist) | 6.4.299 | Apache-2.0 | https://github.com/mozilla/pdf.js |
| Mammoth (mammoth) | 1.13.0 | BSD-2-Clause | https://github.com/mwilliamson/mammoth.js |
| docx-preview | 0.4.1 | Apache-2.0 | https://github.com/VolodymyrBaydalka/docxjs |
| JSZip (jszip) | 3.10.2 | MIT or GPL-3.0-or-later (used under MIT) | https://github.com/Stuk/jszip |

Not included in this repository, but used: the **Kokoro-82M** speech model (Apache-2.0, https://huggingface.co/hexgrad/Kokoro-82M), which is downloaded from Hugging Face the first time an AI voice is used.

## kokoro-js

Copyright hexgrad. Licensed under the Apache License, Version 2.0 ([licenses/Apache-2.0.txt](licenses/Apache-2.0.txt)).

## Transformers.js

Copyright Hugging Face. Licensed under the Apache License, Version 2.0 ([licenses/Apache-2.0.txt](licenses/Apache-2.0.txt)).

## phonemizer

Copyright Xenova. Licensed under the Apache License, Version 2.0 ([licenses/Apache-2.0.txt](licenses/Apache-2.0.txt)).

## eSpeak NG

Copyright Jonathan Duddington, Reece H. Dunn, and the eSpeak NG contributors. Licensed under the GNU General Public License v3.0 or later ([LICENSE](LICENSE)). It is included in phonemizer as a WebAssembly build; its source code is at https://github.com/espeak-ng/espeak-ng.

## PDF.js

Copyright Mozilla Foundation. Licensed under the Apache License, Version 2.0 ([licenses/Apache-2.0.txt](licenses/Apache-2.0.txt)).

## Mammoth

`mammoth.browser.min.js` also contains the packages Mammoth is built from: @xmldom/xmldom, argparse, base64-js, underscore and xmlbuilder (MIT), dingbat-to-unicode and lop (BSD-2-Clause), and JSZip (MIT or GPL-3.0-or-later, at your choice).

```
Copyright (c) 2013, Michael Williamson
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## docx-preview

Copyright Volodymyr Baydalka. Licensed under the Apache License, Version 2.0 ([licenses/Apache-2.0.txt](licenses/Apache-2.0.txt)).

## JSZip

Dual licensed under the MIT license or GPL-3.0; Wren uses it under the MIT license. `jszip.min.js` also contains pako (MIT, https://github.com/nodeca/pako).

```
Copyright (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## ONNX Runtime Web

```
MIT License

Copyright (c) Microsoft Corporation. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
