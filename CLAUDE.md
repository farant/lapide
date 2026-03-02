# Lapide — Project Guide

Catholic theological texts site at lapide.org. Primarily Cornelius a Lapide's biblical commentaries and related patristic/medieval works, with translations.

## Site Structure

- **English** (default): `filename.html` with `lang="en"`
- **Latin**: `filename_lt.html` with `lang="la"`
- **Spanish**: `filename_es.html` with `lang="es"`
- Future languages follow the same pattern: `filename_XX.html` with the appropriate ISO 639-1 code.

Index pages: `index.html`, `index_lt.html`, `index_es.html`

Quotes directories: `quotes/` (English), `quotes_lt/` (Latin), `quotes_es/` (Spanish)

All pages use `style.css`. No build system — plain static HTML.

## Adding a New Language Translation

### 1. Translate the content page

- Read both the English (`filename.html`) and Latin (`filename_lt.html`) versions as sources.
- The Latin is the original source text for patristic works (Jerome, etc.). The English is itself a translation. For later authors like Lacordaire, the original may be French (preserved in the `_lt` file), with the English as the primary translation reference.
- Use both sources: English for clear meaning, Latin to check against the original.
- For large files, split into sections and translate in parallel using multiple agents, then stitch together.

### 2. HTML head conventions for the new file

```html
<html lang="XX">  <!-- ISO 639-1 code -->
```

Required meta/link tags in `<head>`:
```html
<meta name="description" content="...translated description...">
<link rel="canonical" href="https://lapide.org/filename_XX.html">
<link rel="alternate" hreflang="en" href="https://lapide.org/filename.html">
<link rel="alternate" hreflang="la" href="https://lapide.org/filename_lt.html">
<link rel="alternate" hreflang="XX" href="https://lapide.org/filename_XX.html">
<!-- add hreflang for any other existing language versions -->
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:type" content="article">
<meta property="og:url" content="https://lapide.org/filename_XX.html">
```

### 3. Update existing language versions

Add `<link rel="alternate" hreflang="XX" href="...">` to the `<head>` of every existing language version of that page (English, Latin, and any others).

### 4. Anchor IDs

Keep the same `id` attributes across all language versions (e.g., `id="helmeted-prologue"`, `id="jerome-to-paulinus"`, `id="du-culte"`). These are language-neutral identifiers used for cross-linking and quotes.

### 5. Create the index page

- Create `index_XX.html` modeled on the existing index pages.
- Language switcher: plain text for the current language, `<a>` links for others. Example: `<a href="index.html">English</a> · <a href="index_lt.html">Latina</a> · Español`
- Add the new language to the switcher on all existing index pages.
- Add hreflang links to all existing index pages.
- Link to all translated content pages from the new index.

### 6. Translate quotes

- Quotes live in `quotes_XX/1.html`, `quotes_XX/2.html`, etc.
- Each quote is a `<blockquote>` with a `<cite>` linking to the relevant `_XX.html` content page and anchor.
- Match the count in `quotes_lt/` — translate all of them.
- Update `QUOTE_COUNT` in `index_XX.html` to match.
- The index page JavaScript fetches from `quotes_XX/N.html`.

### 7. Translation register

- Use formal scholarly/theological register appropriate to the target language.
- Use the target language's standard forms for biblical proper names (e.g., Spanish: Moisés, Josué, Isaías, Jeremías; not Moses, Joshua, Isaiah, Jeremiah).
- Use traditional liturgical phrasing for well-known Scripture quotations where such a tradition exists in the target language.
- Preserve all HTML structure exactly: `<p>`, `<em>`, `<b>`, `<hr />`, anchor IDs. The translated file should have the same number of `<p>` tags as the source.

## Content Notes

- All site content is CC0 1.0 / public domain.
- The site is an experiment using AI (Claude) for translation. Errors from OCR or translation are possible.
- Issues are tracked at https://github.com/farant/lapide
