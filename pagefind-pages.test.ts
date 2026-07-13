import { test, expect } from "bun:test";
import { isEnglishLapidePage, setBodyMarker, setHighlightScript, setNavIgnore } from "./pagefind-pages";

test("canonical English Lapide pages are included", () => {
  expect(isEnglishLapidePage("01_genesis_01.html")).toBe(true);
  expect(isEnglishLapidePage("81_apocalypsis_22.html")).toBe(true);
  expect(isEnglishLapidePage("77_i_joannis_argumentum.html")).toBe(true);
  expect(isEnglishLapidePage("27_Isaias_Preliminares.html")).toBe(true);
});

test("non-English root pages are excluded", () => {
  expect(isEnglishLapidePage("01_genesis_01_lt.html")).toBe(false);
  expect(isEnglishLapidePage("01_genesis_01_fr.html")).toBe(false);
  expect(isEnglishLapidePage("01_genesis_01_he.html")).toBe(false);
});

test("index, related works, subdirs, tmp are excluded", () => {
  expect(isEnglishLapidePage("index.html")).toBe(false);
  expect(isEnglishLapidePage("index_es.html")).toBe(false);
  expect(isEnglishLapidePage("02_Clemens_Hieronymi_Du_Culte.html")).toBe(false);
  expect(isEnglishLapidePage("guigo_i/Meditationes.html")).toBe(false);
  expect(isEnglishLapidePage("tmp_gen19_ar_part1.html")).toBe(false);
  expect(isEnglishLapidePage("search.html")).toBe(false);
});

test("setBodyMarker adds/removes idempotently", () => {
  const on = setBodyMarker("<body>\nx", true);
  expect(on).toBe("<body data-pagefind-body>\nx");
  expect(setBodyMarker(on, true)).toBe(on);                 // idempotent add
  expect(setBodyMarker(on, false)).toBe("<body>\nx");        // remove
  expect(setBodyMarker('<body class="a">\nx', true)).toBe('<body class="a" data-pagefind-body>\nx');
});

test("setHighlightScript injects before </body> and removes cleanly", () => {
  const base = "<body>\nhi\n</body></html>";
  const on = setHighlightScript(base, true);
  expect(on).toContain("pagefind-highlight.js");
  expect(on).toContain("mark.pagefind-highlight");
  expect(on.indexOf("pagefind-highlight:start")).toBeLessThan(on.indexOf("</body>"));
  expect(setHighlightScript(on, true)).toBe(on);            // idempotent
  expect(setHighlightScript(on, false)).toBe(base);         // full removal
});

test("setNavIgnore adds/removes on nav divs, idempotent", () => {
  const src = '<div class="nav">\n<a>prev</a>\n</div>';
  const on = setNavIgnore(src, true);
  expect(on).toBe('<div class="nav" data-pagefind-ignore>\n<a>prev</a>\n</div>');
  expect(setNavIgnore(on, true)).toBe(on);
  expect(setNavIgnore(on, false)).toBe(src);
  const two = '<div class="nav">a</div>x<div class="nav">b</div>';
  expect(setNavIgnore(two, true)).toBe('<div class="nav" data-pagefind-ignore>a</div>x<div class="nav" data-pagefind-ignore>b</div>');
});

test("highlight script is gated behind the highlight param", () => {
  const on = setHighlightScript("<body>\n</body>", true);
  expect(on).toContain("URLSearchParams");
  expect(on).toContain("mark.pagefind-highlight");
});

import { sortKeyFor, setSortKey } from "./pagefind-pages";

test("sortKeyFor gives biblical order: book*1000 + chapter", () => {
  expect(sortKeyFor("01_genesis_01.html")).toBe(1001);
  expect(sortKeyFor("01_genesis_50.html")).toBe(1050);
  expect(sortKeyFor("02_exodus_01.html")).toBe(2001);
  expect(sortKeyFor("52_lucas_15.html")).toBe(52015);
  expect(sortKeyFor("81_apocalypsis_22.html")).toBe(81022);
  // front matter has no trailing chapter -> chapter 0, sorts ahead of chapter 1
  expect(sortKeyFor("27_Isaias_Argumentum.html")).toBe(27000);
  expect(sortKeyFor("27_Isaias_Argumentum.html")!).toBeLessThan(sortKeyFor("27_isaias_01.html")!);
  // ordering across books holds
  expect(sortKeyFor("01_genesis_50.html")!).toBeLessThan(sortKeyFor("02_exodus_01.html")!);
  expect(sortKeyFor("52_lucas_15.html")!).toBeLessThan(sortKeyFor("81_apocalypsis_22.html")!);
  // non-canonical pages get no key
  expect(sortKeyFor("01_genesis_01_lt.html")).toBeNull();
  expect(sortKeyFor("index.html")).toBeNull();
  expect(sortKeyFor("guigo_i/Meditationes.html")).toBeNull();
});

test("setSortKey stamps/removes on <body>, idempotent, preserves other attrs", () => {
  const on = setSortKey("<body data-pagefind-body>\nx", 52015);
  expect(on).toBe('<body data-pagefind-body data-pagefind-sort="order:52015">\nx');
  expect(setSortKey(on, 52015)).toBe(on);                      // idempotent
  expect(setSortKey(on, 1001)).toBe('<body data-pagefind-body data-pagefind-sort="order:1001">\nx'); // re-key
  expect(setSortKey(on, null)).toBe("<body data-pagefind-body>\nx");  // removed, marker preserved
});
