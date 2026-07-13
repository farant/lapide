import { test, expect } from "bun:test";
import { isEnglishLapidePage } from "./pagefind-pages";

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
