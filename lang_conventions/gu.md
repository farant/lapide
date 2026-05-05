# Gujarati (ગુજરાતી)

Use formal/literary શિષ્ટ ગુજરાતી (modern standard Gujarati). File suffix `_gu`. Gujarati script (ગુજરાતી લિપિ), LTR (no `dir` attribute needed).

## Biblical proper names

Follow standard Gujarati Bible tradition: મૂસા (Moses), ઇબ્રાહિમ (Abraham), ઇસહાક (Isaac), યાકૂબ (Jacob), હારુન (Aaron), દાઉદ (David), યહોશુઆ (Joshua), યશાયા (Isaiah), યર્મિયા (Jeremiah), નૂહ (Noah), આદમ (Adam), હવા (Eve), ઈસુ (Jesus), પિતર (Peter), યોહાન (John), **શલોમન** (Solomon — NOT સુલેમાન, which is the Persian/Urdu-derived form common in vernacular Gujarati but inappropriate for the project's Catholic/Latinized register).

For Paul, use the Latinized form **પૌલુસ** (matching Lapide's Latin scholarly prose, which always uses Paulus). This avoids the inconsistency of having two forms for the same person; modern Gujarati Bibles use પાઉલ but Lapide's preface and commentary contexts always reference Paul in Latin, so પૌલુસ is preferred here.

For Mary, use the Latinized form **મારિયા** (matching the project's Catholic-Latin register). Avoid the BSI/vernacular **મરિયમ**. Locked from quote-93 mismatch in `01_genesis_03_gu.html` where the body used મારિયા but quote used મરિયમ.

## Saint names

Use સંત (Sant) prefix. **Church Father names use Latinized forms** (not anglicized), preserving the Latin scholarly texture of Lapide's original.

Key mappings: સંત આગસ્તીનુસ (Augustine), સંત હિએરોનિમુસ (Jerome), સંત બાસિલિયુસ (Basil), સંત આમ્બ્રોસિયુસ (Ambrose), સંત ક્રિસોસ્તોમુસ (Chrysostom), સંત ગ્રેગોરિયુસ (Gregory), સંત બેર્નાર્દુસ (Bernard), સંત હિલારિયુસ (Hilary), સંત સિપ્રિયાનુસ (Cyprian), સંત યુસ્તિનુસ (Justin), સંત ક્લેમેન્સ (Clement), સંત આથાનાસિયુસ (Athanasius), સંત એપિફાનિયુસ (Epiphanius), સંત ઇગ્નાતિયુસ (Ignatius), દમાસ્કસના યોહાન (John of Damascus), સંત બોનાવેન્તુરા (Bonaventure), સંત ફ્રાન્સિસ્કુસ (Francis), સંત દોમિનિકુસ (Dominic).

Names already close to Latin are kept as-is: થોમસ, લિયો, પૌલુસ, એફ્રેમ.

For epithets, append the translated honorific after the Latinized name: "Basil the Great" → સંત બાસિલિયુસ મહાન; "Gregory the Great" → સંત ગ્રેગોરિયુસ મહાન; "Leo the Great" → સંત લિયો મહાન. (Do not invert: NOT મહાન બાસિલિયુસ.)

## Quotation marks

Use standard double quotation marks "..." for quotations.

## Bible references and psalm numbering

Modern Gujarati Bibles use Hebrew/modern psalm numbering (not Vulgate). Convert Vulgate numbers accordingly (e.g., Vulgate Psalm 89 → Psalm 90).

Gospel references use the standard Gujarati Bible name યોહાન (e.g., "યોહાન ૮:૧૨").

## Theological terminology

- Scripture / Holy Scripture = પવિત્ર શાસ્ત્ર
- Church Fathers = ધર્મપિતાઓ
- **God** (the Christian/biblical God) = **ઈશ્વર** or પરમેશ્વર. NOT દેવ when referring to the Christian God. દેવ is acceptable only for: (a) plural pagan gods (દેવો, e.g. Roman/Greek), (b) classical work titles like *De Natura Deorum* → દેવોના સ્વભાવ વિશે, (c) compound forms like દેવદૂત (angel). Mixed usage of દેવ for "God" alongside ઈશ્વર is a recurring agent stitching seam — locked from review of `01_genesis_01_gu.html` Day 4 verse 16 + Day 5 sections.
- Apostle = પ્રેરિત (NOT પ્રેષિત — the latter is a Sanskritic "sent one" but BSI/standard Gujarati uses પ્રેરિત).
- Homily / homilia (patristic genre) = પ્રવચન (preferred) or વ્યાખ્યાન. Avoid સંભાષણ ("conversation") and Anglicized હોમિલી. Pick one term per file and use consistently.
- **Paradise** (the Genesis garden, Latin *paradisus* / Greek *παράδεισος*) = **પારાદીસ**. Avoid the variants **પારાદૈસો** (a closer Latin-stem form) and **પેરેડાઇઝ** (anglicized). Multi-agent stitching commonly produces all three; lock to પારાદીસ.
- **Trinity** = **ત્રિએકતા** (preferred prose form). The variants ત્રૈક્ય and ત્રિયેક are also attested but should not be mixed within a single file.
- **Satan / Devil / diabolus** = **શેતાન**. Avoid all of: શયતાન (Arabicized, Quranic-tradition), દિયાબલ (Latin transliteration of *diabolus*), દુષ્ટાત્મા ("evil spirit" — only as occasional descriptor, not standard term), રાક્ષસ (Hindu mythological "rakshasa"). NOTE: દાનવ remains valid for Latin *daemon* specifically (not for *diabolus*). Multi-agent splits cause stitching seams across all 4 forms — locked to શેતાન from review of `01_genesis_03_gu.html` (Genesis 3 had દિયાબલ in agent A1 zone, શેતાન in middle, દુષ્ટાત્મા in B2 zone, રાક્ષસ in 1 stray spot).
- **City of God** (*De Civitate Dei*) = **ઈશ્વરના નગર વિશે** (with possessive marker). NOT compound ઈશ્વરનગર.
- Grace = કૃપા
- Sacrament = સંસ્કાર
- Doctrine / dogma = શિક્ષણ or સિદ્ધાંત (NOT શિક્ષા, which can mean "punishment")
- Holy Spirit = પવિત્ર આત્મા
- Church = મંડળી (assembly/congregation) or દેવળ (building/institution)
- Gospel = સુવાર્તા
- Theology = ધર્મશાસ્ત્ર
- Faith = વિશ્વાસ
- Sin = પાપ
- Salvation = તારણ / મુક્તિ
- Prophet = પ્રબોધક / સંદેષ્ટા
- Apostle = પ્રેરિત
- Bishop = બિશપ
- Priest = યાજક
- Pope = પોપ
- Pontiff = પોન્ટિફેક્સ / મહાયાજક
- Diocese = ધર્મપ્રાંત
- Parish priest = પલ્લી-યાજક
- Novitiate = નવદીક્ષાગૃહ
- Decalogue / Ten Commandments = દશ આજ્ઞાઓ (matches BSI Gujarati Bible; preferred over દશાજ્ઞા/દશાજ્ઞાન)
- Ark of the Covenant = કરારકોશ (NOT વાસનીય ભંડાર, which means "fragrant treasury")
- Tabernacle = પવિત્રમંડપ (holy pavilion) or મુલાકાતમંડપ (tent of meeting); plain મંડપ alone is ambiguous
- Choir (cathedral chapter / Divine Office singers) = ગાયકવૃંદ (NOT વાદ્યમંડળી, which means "instrumental band/orchestra")
- Scandal / scandalum (theological "stumbling block") = ઠોકરરૂપ બાબત or પાપપ્રસંગ (NOT કૌભાંડ, which carries modern political-corruption sense)
- Eloquent = વાક્પટુ (standard form; NOT વાગ્ભટુ, which is a typo/conflation with the Sanskrit medical author Vāgbhaṭa); also acceptable: વાગ્મી, સુવક્તા
- Lamb (Christological / *Agnus Dei*; Paschal Lamb; Lamb of Revelation; Isa 16:1 messianic lamb) = **હલવાન** (BSI Gujarati Bible standard). NOT મેંઢું, which means "ordinary sheep/ram" in colloquial agricultural sense and reduces "worshipping the Lamb" to "worshipping a sheep." Reserve મેંઢું for genuine ordinary-sheep contexts (parable of the lost sheep where the animal is the figure, agricultural similes, etc.).
- Presbytery (Greek *πρεσβυτέριον*, Latin *presbyterium* — the corporate body of elders, e.g. 1 Tim 4:14 "the laying on of hands of the presbytery") = **વડીલ-મંડળ** (matches BSI). NOT a singular પ્રેસ્બીટર, which loses the corporate sense central to apostolic-college ordination theology.

## Authority figures and historical persons

Locked transliterations (avoid factual misidentification by sound-alike):

- **યોહાન મોરેતુસ** (Jan / Johannes Moretus, 1543–1610) — Christophe Plantin's son-in-law and successor at the Plantin-Moretus printing house in Antwerp; printer of many Lapide volumes. **NOT મેઉરસિઉસ** (which would be Johannes Meursius, 1579–1639, the Dutch classical scholar — a different person entirely). The Plantin-Moretus name will recur across the corpus; agents may sound-substitute. Always verify against the Latin (*Joannes Moretus* / *Joanni Moreto*) for printer-imprint contexts.
- **માર્ટિન નુતિયુસ** (Martinus Nutius / Maarten van der Schurre, Antwerp printer, predecessor partner to the Plantin house).
- **મુતિયુસ વિતેલ્લેસ્કુસ** (Mutius Vitelleschus, Jesuit Father General 1615–1645).
- **મારો** (Publius Vergilius Maro = Virgil; Jerome and Lapide refer to him by the cognomen *Maro*). NOT માવો, which is a વ/ર slip producing a non-name. Form may also appear in Latin accusative (*Maronem* → મારોને).
- **વર્જિલિયુસ** (full Latinized name = Vergilius/Virgil) — used when the source text uses *Vergilius/Virgilius* rather than the cognomen *Maro*. NOT the anglicized વર્જિલ (without -ius ending). Both forms (મારો, વર્જિલિયુસ) refer to the same person; preserve whichever the source uses.
- **બેદા** (Venerable Bede, c. 673–735) — house style uses dental દ for intervocalic Latin -d-, NOT retroflex ડ (NOT બેડા). Title prefix: આદરણીય બેદા (matching *Beda Venerabilis*; not a canonized saint, so no સંત prefix).
- **કાયેતાનુસ** (Cardinal Cajetan / Tommaso de Vio, OP, 1469–1534). NOT કાજેતાનુસ or કેજેતાનુસ — first vowel must be આ-, second must be -યે-.
- **કાથારિનુસ** (Ambrogio Catarino Politi, OP, 1484–1553). NOT કેથેરિનુસ.
- **આબુલેન્સિસ** (Alphonsus Tostatus of Avila, 1410–1455). First vowel must be આ-, not એ- or અ-.

## Place names

Established transliterations (from Preliminares — use these consistently to avoid drift in future translations):

- બોખોલ્ત (Bocholt) — Lapide's birthplace
- મેખ્લેન (Mechelen / Malines)
- ગ્હેન્ટ (Ghent)
- કામ્બ્રે (Cambrai)
- મોન્સ (Mons)
- વેલ્સિએન્ન (Valenciennes)
- લુવેન (Louvain / Leuven)
- એન્ત્વેર્પેન (Antwerp / Anvers)
- પૅરિસ (Paris)
- આમિયેન (Amiens)
- રૉફેસ્ટર (Rochester)
- હાનો (Hainaut — region)
- ફ્લાંડ્રો (Flanders — region)
- રોમ (Rome)
- જેરુસલેમ (Jerusalem)
- કૈસરિયા (Caesarea); નિયોકૈસરિયા (Neocaesarea)
- કિર (Cyrrhus, Syria) — used in author/place form કિરના થિઓદોરેતુસ (Theodoret of Cyrrhus). Avoid the misreading "કિરસ થિઓદોરસ" which conflates the place into the personal name.
- આસ્પ્રિકોલ્લિસ (Aspricollis, Latin nominative) / સ્કેરપેનહોવેલ (modern Dutch: Scherpenheuvel-Zichem) / મોન્તેગ્યુ (French: Montaigu) — Marian pilgrimage shrine ~50 km east of Louvain, famous since the late 1500s. House style: keep the Latin form and add the modern Dutch parenthetical, e.g. "આસ્પ્રિકોલ્લિસ (આધુનિક સ્કેરપેનહોવેલ)". Do NOT use the Latin adjective form *Aspricollensis* (આસ્પ્રિકોલ્લેન્સ) as a noun.

## Scripture book names

Standard Gujarati Bible book names. Use these in canonical lists, citations, and references:

**Old Testament**: ઉત્પત્તિ (Genesis), નિર્ગમન (Exodus), લેવીય (Leviticus), ગણના (Numbers), દ્વિતીય બિવરણ (Deuteronomy), યહોશુઆ (Joshua), ન્યાયાધીશો (Judges), રૂથ (Ruth), રાજાઓ (1–4 Kings, i.e. 1–2 Samuel + 1–2 Kings in Vulgate), ઇતિહાસ-પુસ્તકો (Chronicles), એઝ્રા (Ezra), નહેમ્યાહ (Nehemiah), તોબિયા (Tobit), યહૂદિતા (Judith), એસ્તેર (Esther), અયૂબ (Job), ગીતસંહિતા (Psalms), નીતિવચનો (Proverbs), સભાશિક્ષક (Ecclesiastes), ગીતરત્ન (Song of Songs), પ્રજ્ઞા-પુસ્તક (Wisdom), બેન સિરાખ (Sirach / Ecclesiasticus), યશાયા (Isaiah), યર્મિયા (Jeremiah), વિલાપગીત (Lamentations), બારૂખ (Baruch), એઝેકિએલ (Ezekiel), દાનિયેલ (Daniel), બાર નાના ભાવિવાણીકારો (the twelve minor prophets), માકાબી પુસ્તકો (Maccabees).

**New Testament**: મથ્થી (Matthew), માર્ક (Mark), લૂક (Luke), યોહાન (John), પ્રેરિતોનાં કૃત્યો (Acts of the Apostles), પૌલુસના પત્રો (Pauline Epistles: રોમન, કરિન્થી, ગાલાતી, એફેસી, ફિલિપ્પી, કોલોસ્સી, થેસ્સાલોનીકી, તિમોથી, તિતસ, ફિલેમોન, હિબ્રૂ), સામાન્ય પત્રો (Catholic Epistles: પ્રેરિત યાકૂબ, પ્રેરિત પિતર, પ્રેરિત યોહાન, પ્રેરિત યહૂદા), પ્રકટીકરણ (Revelation / Apocalypse).

## Latin retention

Some terms in Lapide's framework should be retained in Latin even when surrounding text is translated, matching the practice of sibling languages (Hindi, Bengali):

- The page title `Preliminares` is kept in Latin in `og:title` and the body heading.
- Standalone work titles like `Commentaria in Scripturam Sacram` may be kept in Latin in `og:description` for scholarly fidelity.
- These Latin retentions are intentional, not translation gaps — do not "fix" them in review.

## Scripture-echo alignment

When Lapide quotes or echoes Scripture (Vulgate or paraphrasing), the Gujarati translation should mirror standard BSI / wordproject.org Gujarati Bible phrasing where possible. This improves recognition for Gujarati Catholic readers familiar with the standard Bible. Examples to verify case-by-case: Ex 4:10 ("I am not eloquent"), Num 12:3 ("meekest of all mortals"), Acts 7:22 ("learned in all the wisdom of the Egyptians"), Dan 12:3.

## Register

Gujarati script uses conjuncts (જોડાક્ષર) that must be correctly formed. Proper use of matras (vowel signs), anusvara (ં), chandrabindu (ઁ), and visarga (ઃ) is critical. Agents must produce proper Gujarati — watch for missing matras, incorrect conjuncts, or confusion with Devanagari (Hindi) or Bengali characters.

## Quote-file consistency

Quote files (`quotes_gu/N.html`) cite into translated content pages with a section label like `પ્રારંભિક સામગ્રી — સમર્પણપત્ર`. The label MUST match the on-page TOC entry character-for-character (including hyphenation choices). When changing a section label on a content page, audit any quote files that reference it; when adding a new quote, copy the label verbatim from the destination page's TOC.

## HTML structure pitfalls

- **Verse heading word = શ્લોક (locked)**. Use **શ્લોક** uniformly for "verse N" headings (matching `padyāśloka` = scriptural verse). Agents drift to **પદ** ("line/foot"), **કલમ** ("article/clause"), or **વચન** ("promise/utterance") — all inappropriate for Bible verses. A single chapter (`01_genesis_01_gu.html`) initially had 4 different words across 22 verse headings before normalization.
- **Verse-incipit triple-parity**: When a verse-heading incipit appears in three places — (a) the Vulgate text block (e.g., `chapter-two-vulgate`), (b) the TOC entry, (c) the body `<p id="verse-N"><b>` heading — all three MUST use the identical Gujarati translation of the incipit. Multi-agent stitching commonly produces three different translations of the same Latin incipit. Lock to the body heading and propagate that exact wording to the TOC and Vulgate text. When the body heading and the TOC diverge (a known stitching artifact), quote-file cite labels should follow the body heading, not the TOC, since the body heading is what the reader sees after clicking the anchor.
- **Markdown asterisks rendering as literal text**: Agents may produce raw markdown `*Title*` instead of `<em>Title</em>` for Latin work titles, especially when summarizing reference material from English sources. The browser renders these as literal asterisks. Always run `grep -nE '\*[A-Za-z][A-Za-z ]*\*' file_gu.html` after stitching — count should be 0. Locked from `01_genesis_03_gu.html` agent A2 zone (19 instances).
- **Parenthetical scholarly terms**: For section-heading parentheticals like `(Protoevangelium)`, prefer the **transliterated form** (પ્રોટોઈવાન્જેલિયમ) rather than a descriptive translation (પ્રથમ સુવાર્તા). Transliteration is part of the Lapide Latin/Greek retention principle; descriptive translation loses the scholarly term.
- **Never nest `<em>` inside `<em>`**. When a Latin source has the structure `<em>«quote part 1,</em> ait, lib. X, <em>quote part 2.»</em>` (split italic with non-italic narration in the middle), preserve that split — do NOT collapse into one outer `<em>` and then add an inner `<em>` for a work title. If a quote already inside `<em>` mentions a work title (Confessions, Timaeus, etc.), keep the title in plain (non-italic) text. Nested `<em>` produces invalid HTML and often unbalances closing tags.
- **TOC ↔ body heading parity**: every TOC entry must match its corresponding section heading character-for-character (same wording, same punctuation, same conjugation). If you reword one, reword the other.
- **Anchor verification**: every anchor used in a quote-file `<cite>` link MUST exist on the destination page. Before writing a quote that cites `#some-anchor`, grep the destination page to confirm `id="some-anchor"` is present. Pseudo-anchors like `#chapter-v-continued` (when the page only has `#chapter-v`) silently break the link.

## Agent pitfalls

- **Script confusion**: Gujarati, Devanagari, and Bengali scripts are visually distinct but share a common Brahmi origin. Agents may mix characters from sibling scripts. Every character must be from the Gujarati Unicode block (U+0A80–U+0AFF).
- **Anglicized Church Father names**: Agents default to anglicized forms like જેરોમ, ઓગસ્ટિન instead of the required Latinized forms (હિએરોનિમુસ, આગસ્તીનુસ). Must be explicitly instructed.
- **Sanskrit-heavy register**: Agents may drift toward overly Sanskritized vocabulary that sounds stilted. Aim for શિષ્ટ but accessible literary Gujarati, not artificially elevated tatsama-heavy prose.
- **Missing conjuncts**: Agents may break conjunct consonants into separate characters with visible halant (્) instead of proper ligatures. The underlying Unicode must be correct.
- **Number script**: Use Gujarati numerals (૦, ૧, ૨, ૩, ૪, ૫, ૬, ૭, ૮, ૯) in translated text, not Arabic/Western numerals, except in HTML attributes and URLs.
- **False-cognate translation traps** (locked from review of `01_Preliminares_gu.html`):
  - "Ark" (of the Covenant) → use કરારકોશ; agents may produce વાસનીય ભંડાર ("fragrant treasury") which is wrong.
  - "Choir" (cathedral / Divine Office context) → use ગાયકવૃંદ; agents may produce વાદ્યમંડળી ("instrumental band/orchestra") which inverts the meaning.
  - "Scandal" (theological *scandalum* / stumbling block) → use ઠોકરરૂપ બાબત; agents may produce કૌભાંડ which means modern political-corruption scandal.
  - "Barbarica/barbara" (literary "uncultured/unpolished" sense, e.g. Basil's *barbarica lingua* of Scripture, or Demosthenes-the-cook's *barbara ratione*) → use **અસંસ્કૃત** for language ("unpolished tongue") and **અસંસ્કારી** for behavior ("ill-mannered"). The Gujarati બર્બર carries modern "savage/barbaric" connotation that is too pejorative in either case — avoid it for any classical *barbarus/barbara/barbarica* in Lapide's text.
  - "Eloquent" → use વાક્પટુ; agents may produce વાગ્ભટુ which is a typo conflating with the Sanskrit author Vāgbhaṭa.
  - "Theodoret of Cyrrhus" → use કિરના થિઓદોરેતુસ; agents may produce કિરસ થિઓદોરસ which conflates the place into a personal name.
  - "Lamb" (the Christological *Agnus Dei*, the Paschal Lamb, the Lamb of Revelation, the messianic lamb of Isa 16:1) → use **હલવાન** (BSI standard). Agents may produce મેંઢું ("ordinary sheep/ram"), which trivializes one of the central images of Christian worship. **Edge case — Latin *Ovis*** (sheep, not lamb): when a passage explicitly uses *Ovis* (e.g., "sicut oves in medio luporum" = Matt 10:16), prefer **ઘેટું/ઘેટા** (matching BSI) over હલવાન, except where the Christological *Agnus Dei* resonance is explicit. Strict mapping: *Agnus* → હલવાન, *Ovis* → ઘેટું.
  - "Presbytery" (the corporate body of elders, *presbyterium*) → use **વડીલ-મંડળ**. Agents may produce singular પ્રેસ્બીટરના ("of the [single] presbyter"), losing the corporate-ordination sense.
  - "Maro" (Virgil's cognomen) → use **મારો**; agents may produce માવો from a વ/ર slip — not a recognizable name.
- **Pre-publication Devanagari/Bengali sweep**: Run `python3 -c "import re; t = open(PATH).read(); print(set(re.findall(r'[ऀ-ॿ]', t)) | set(re.findall(r'[ঀ-৿]', t)))"` on every gu file before declaring it done. The set should be empty. The pipeline can occasionally substitute a visually-similar Devanagari codepoint (e.g., Devanagari ट U+091F for Gujarati ટ U+0A9F, or मु for મુ).
- **Latin litotes (`non raro`, `non semper`, `non parum`, `non leviter`, etc.)**: These double-negative idioms mean "frequently / often / considerably" — NOT their literal English calque. Agents may render `non raro` as `વારંવાર નથી` ("not frequent"), inverting the meaning. Translate as `વારંવાર છે` ("is frequent") or, to preserve the litotes, as `ભાગ્યે જ નહીં` ("not rarely"). Caught in Canon 41 of `14_Commentaria_In_Pentateuchum_Mosis_Canones_gu.html`, where the inversion produced a self-contradictory opening to a paragraph that then listed multiple examples of the supposedly-rare figure.
