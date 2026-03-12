# Index Normalization — Decisions Log

A living document tracking categorization decisions, conventions, skips, and edge cases encountered during Stage 2 normalization. Useful for maintaining consistency across sessions and as more source texts are scanned.

## Categorization Corrections from Extraction

These entities were recategorized from their extraction placement to match the DESIGN.md taxonomy:

| Entity | Extraction category | Ref category | Reason |
|--------|-------------------|--------------|--------|
| Julian the Apostate | heresiarch | ruler | Apostate emperor, not a heresy founder — DESIGN.md: "Rulers who supported heresy or apostasized go under ruler/" |
| Emperor Valens | heresiarch | ruler | Arian sympathizer, not a heresy founder |
| Gregory of Nyssa | other | saint | Canonized saint in both Eastern and Western traditions |
| John Damascene | other | saint | Canonized saint and Doctor of the Church |
| Mercury the Martyr | other | saint | Venerated as St. Mercurius of Caesarea |
| Emmelia | other | saint | Venerated as a saint (Eastern tradition; mother of Basil, Gregory, Macrina) |
| Cornelius a Lapide | other | cleric | Jesuit priest — DESIGN.md: "Cleric covers non-saint clergy of any rank" |
| Van der Burch | other | cleric | Archbishop of Cambrai |
| Augustinus Crampon | other | cleric | Priest, editor |
| Vitelleschi | other | cleric | Superior General of the Society of Jesus |
| Scribani | other | cleric | Jesuit Provincial Superior |
| Spitholdius | other | cleric | Canon and Parish Priest, Censor of Books |
| Rufinus of Aquileia | other | scholar | Historian/translator — not a saint in Western tradition |
| Theodoret of Cyrrhus | other | scholar | Church historian/bishop — not universally venerated as saint in the West |
| Peter Lombard | other | scholar | Bishop of Paris, theologian — not canonized |
| Alexander of Hales | other | scholar | Franciscan theologian — not canonized |
| Hugh of Saint Victor | other | scholar | Augustinian canon, theologian — not canonized |
| Richard of Saint Victor | other | scholar | Augustinian canon, theologian — not canonized |
| Rupert of Deutz | other | scholar | Benedictine abbot, theologian — not canonized |
| Rabanus Maurus | other | scholar | Archbishop of Mainz — venerated locally, not formally canonized |
| Haymo of Halberstadt | other | scholar | Bishop, exegete — not canonized |
| Hincmar | other | scholar | Archbishop of Reims — not canonized |
| Sophronius | other (classical) | scholar | Late antique scholar/translator — not classical in the pagan sense |
| Philip II | other | ruler | King of Spain |
| Charles V | other | ruler | Holy Roman Emperor |
| Henry VIII | other | ruler | King of England |
| Duke of Alba | other | ruler | Spanish military commander and governor |
| Dagobert | other | ruler | King of the Franks |
| Henry IV (Emperor) | other | ruler | Holy Roman Emperor |
| Archduke Albert | other | ruler | Co-sovereign of the Spanish Netherlands |

## Entities Skipped (no ref file created)

### Canonical-list-only biblical figures
Per DESIGN.md: "biblical names that appear only in an enumeration do not get entries from that reference alone."

Skipped: Hosea, Joel, Amos, Obadiah, Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi, Isaiah, Jeremiah, Baruch, Ezekiel, Matthew, Mark, Luke, Timothy, Titus, Philemon, David, Solomon, Manasseh, Peter the Apostle, James the Apostle, Jude the Apostle.

These will get entries when the commentaries that discuss them substantively are scanned.

### Genealogy-list-only figures
Levi, Kohath, Amram — appear only in Moses's genealogy enumeration ("Abraham begot Isaac, Isaac Jacob, Jacob Levi, Levi Caath, Caath Amram, and Amram Moses"). Will get entries from Genesis commentary.

### Unnamed figures
Per DESIGN.md: "Unnamed figures do not get standalone entries."

Skipped: Van der Burch's grandfather, Van der Burch's father, Van der Burch's mother, unnamed Reverend Father Provincial.

### Very thin entries (name-only, no substantive discussion)
Helladius (only cited as Damascene's source), Antonianus (only as recipient of Cyprian's letter), M. Vestrius Barbianus (only as papal secretary signatory).

## Entities Included Despite Thin Mentions

### Vulgate-users list (collective mention)
Bernard, Anselm, Peter Damian, Bede, Albert, Thomas Aquinas, Bonaventure, Remigius, Rabanus, Haymo, Richard, Hugh, Rupert — all appear in a single collective mention as "most learned men who used Jerome's version." Created entries because:
1. They are major historical figures who will accumulate references from later texts
2. The collective mention is a substantive historical claim about Vulgate reception
3. Skeleton entries serve as placeholders for future enrichment

### Minor Cambrai saints
Landelin, Ghislain, Vincent Madelgarius, Waldetrudis — thin mentions as companions of Authbert. Created entries because they are named historical figures in a narrative context (not just a list) and may reappear in other texts.

## Slug Conventions

- Lowercase, hyphenated, Latin/anglicized form: `augustine` not `aurelius-augustinus-hipponensis`
- Full name and variants go in `also_known_as` field
- Popes: `pope/clement-viii` (by papal name, not birth name)
- Saints: `saint/basil-the-great` (by common English name)
- Biblical: `biblical/moses` (by common English name)
- Rulers: `ruler/philip-ii` (by common regnal name)
- Classical: `classical/homer`

## Place Hierarchy Decisions

- Low Countries cities (Mechlin, Ghent, Louvain, Antwerp, Bocholt, Cambrai) → `europe/low-countries/` since the text is set in the Spanish Netherlands period
- Cambrai alias under `europe/france/` (modern location)
- Caesarea in Cappadocia → `asia-minor/cappadocia/caesarea` (not to be confused with Palestinian Caesarea)

## Organization Categorization

- Ludwig Vives (publisher) → `publisher/` not confused with the Renaissance humanist
- Cramoisy → `publisher/`
- Nutius-Moretus → `publisher/` (combined entry for the Antwerp printing partnership)
- Jesuit Novitiate and College at Mechlin → folded into the Society of Jesus entry as an occurrence rather than standalone entries (too granular for this stage)
- "The East" and "The Wilderness" from places extraction → not given standalone entries (too vague as geographic entities)
- Rue Delambre → not given a standalone entry (publisher's address, not a meaningful place)

## Cross-Reference Conventions

- `related.people` uses slug paths: `saint/augustine`, `pope/clement-viii`
- `related.places` uses full place hierarchy: `europe/low-countries/mechlin`
- `related.works` uses bibliography slugs: `basil/hexaemeron`
- `related.subjects` uses subject hierarchy: `theology/scripture/vulgate`
- `related.years` uses year hierarchy: `ad/17th-century/30s/1637`
