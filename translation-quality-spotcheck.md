# Translation Quality Spotcheck Log

Files that have undergone manual translation quality review (content accuracy, structural parity, formatting).

## Chinese (zh)

| File | Date | Verdict | Issues Found |
|------|------|---------|-------------|
| `guigo_i/Meditationes_zh.html` | 2026-03-14 | Fixed | Nurse/sparrow passage (Ch. IV) was truncated with invented detail ("eye-pecking"); restored full passage from Latin |
| `01_Preliminares_zh.html` | 2026-03-14 | Fixed | All 27 `<em>` tags missing; added to match Latin |
| `02_Clemens_Hieronymi_Du_Culte_zh.html` | 2026-03-14 | Clean | No issues found |
| `12_Proemium_Et_Encomium_Sacrae_Scripturae_zh.html` | 2026-03-14 | Clean | No issues found |

## Italian (it)

| File | Date | Verdict | Issues Found |
|------|------|---------|-------------|
| `guigo_i/Meditationes_it.html` | 2026-03-14 | Clean | Nurse/sparrow passage complete; "periture" grammar correct |
| `01_Preliminares_it.html` | 2026-03-14 | Fixed | 23 of 27 `<em>` tags missing; added to match Latin |

## Structural comparison method

Tag counts (`<p>`, `<hr>`, `<em>`, `<b>`) compared against Latin (`_lt`) source files. Discrepancies of 1-2 in `<p>` or `<b>` are normal (header formatting differences). `<em>` discrepancies indicate missing scripture/emphasis formatting. `<hr>` discrepancies indicate missing or extra section breaks.
