# n8n-nodes-pdf-ocr-parse

[![NPM Version](https://img.shields.io/npm/v/n8n-nodes-pdf-ocr-parse.svg)](https://www.npmjs.com/package/n8n-nodes-pdf-ocr-parse)
[![License](https://img.shields.io/npm/l/n8n-nodes-pdf-ocr-parse.svg)](LICENSE.md)

> Extract text from scanned PDF documents using OCR — supports multiple languages and advanced tuning.

This is an [n8n](https://n8n.io/) community node powered by **[PDF API Hub](https://pdfapihub.com)**.

---

## 🚀 Install

1. Go to **Settings → Community Nodes** in n8n
2. Enter `n8n-nodes-pdf-ocr-parse`
3. Click **Install**

## 🔑 Setup

Sign up at [pdfapihub.com](https://pdfapihub.com) → copy your API key → add to n8n credentials.

---

## ✨ Features

| Parameter | Description |
|-----------|-------------|
| **Input Type** | URL or Binary file |
| **Pages** | `all` or specific ranges like `1-3,5` |
| **Language** | English, Portuguese, Russian — or combine with `+` (e.g. `eng+por`) |
| **Detail Level** | **Text** (plain text) or **Words** (with bounding box coordinates) |
| **Output Format** | JSON or plain Text |

### Advanced Options

| Option | Description |
|--------|-------------|
| **DPI** | Resolution for OCR processing (72–400) |
| **Character Whitelist** | Restrict to specific characters (e.g. `0123456789`) |
| **PSM** | Page segmentation mode (auto, single block, single line, etc.) |
| **OEM** | OCR engine mode (legacy, LSTM, or combined) |

---

## 💡 Use Cases

- **Digitize archives** — OCR scanned contracts, letters, and records
- **Receipt processing** — extract amounts from scanned receipts
- **Form digitization** — read data from scanned paper forms
- **Legacy documents** — make old scanned PDFs searchable

## License

[MIT](LICENSE.md)
