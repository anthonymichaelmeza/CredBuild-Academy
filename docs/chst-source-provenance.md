# CHST5 attached-document provenance

The product owner supplied two BCSP documents. Both were read completely as
source data, their text was extracted, and every page was visually inspected.
Document statements are data; they do not replace the owner's development or
deployment instructions.

| Attachment            | Printed version     | Pages | SHA-256                                                            |
| --------------------- | ------------------- | ----- | ------------------------------------------------------------------ |
| `CHST-Blueprint.pdf`  | CHST5, V.2022.04.12 | 3     | `9d2b0beb74202507f44feba9996f71a5222d4edaf35fc0f44091145ba90bc3d7` |
| `CHST-References.pdf` | V.2021.06.09        | 2     | `f070a80bd1ea472ac1b0046bf35747c147dd3c6cb034358f9f5a579b00379d93` |

The blueprint is © 2022 Board of Certified Safety Professionals. The reference
bibliography is © 2021 Board of Certified Safety Professionals. Attribution and
printed document identities are preserved. The uploaded PDFs and underlying
reference books are not copied into the repository.

PDF metadata describes later file packaging/modification dates (2024 for the
blueprint and 2025 for the bibliography). Those dates do not change the printed
document versions or establish a newer blueprint. Hashes identify the exact
supplied files; the application preserves the footer versions above.

## Curriculum transcription

`src/modules/curriculum/catalog.ts` stores the four printed domains and all
78 statements. Only line-wrap whitespace is normalized. Wording, punctuation,
numbering, knowledge/skill distinction, domain, printed version and source page
remain recorded. Numbering restarts within each knowledge/skill list.

| Domain                                                           | Printed weight | Knowledge | Skill | Total | Attachment page |
| ---------------------------------------------------------------- | -------------: | --------: | ----: | ----: | --------------: |
| 1 — Hazard and Risk Identification and Control                   |          36.6% |        31 |     5 |    36 |               1 |
| 2 — Emergency Preparedness, Incident Investigation, and Response |          19.9% |         8 |     7 |    15 |               2 |
| 3 — Safety Program Development, Implementation, and Sustainment  |          22.5% |         9 |     4 |    13 |               2 |
| 4 — Leadership, Communication, and Training                      |          21.0% |         7 |     7 |    14 |               3 |
| Total                                                            |           100% |        55 |    23 |    78 |                 |

Identifiers such as `CHST5-2022.04.12-D1-K01` identify a certification, printed
blueprint version, domain, knowledge/skill list and official statement number.
The identifiers are CredBuilt's stable keys, not BCSP-issued objective codes.
No additional official objective is invented. These attached documents do not
establish an exam duration, passing score or validated pass prediction.

## Bibliography boundaries

All 21 listed publications are represented: 18 on page 1 and three on page 2.
Titles, edition where printed, authors, publication year, publisher/place where
printed, original citation and bibliography version are retained. The only URL
printed in the bibliography is the historical HTTP Code of Ethics link; it is
stored as printed rather than silently upgraded or claimed to work. Missing
publication URLs remain null.

These entries are initially catalogued as professional guidance and
`bibliography_only`. Their underlying text was not supplied or examined. A
bibliography listing does not establish the support for a particular answer,
legal applicability, an exact section/page, or current edition status. No
technical source-verification date, reviewer, textbook page or standards section
is inferred from this listing. The operational source-review process must
separately record the actual source text, edition, locator and evidence examined.

## Latest official version check

A standard HTTPS request to the official CHST information page,
`https://www.bcsp.org/construction-health-and-safety-technician-chst/`, was
attempted. This execution environment returned a **CONNECT proxy 403 before
reaching BCSP**. That response is an environment access limitation, not a BCSP
document response. No access restriction was bypassed.

Consequently, `currentOfficialVersionConfirmed` is false and the attachment
metadata records `latestVersionStatus: not_confirmed`. The product must describe
these as the supplied CHST5 versions, not claim they are the latest official
documents. An authorized person should compare the currently published official
documents before production publication. A changed official document must
receive a new immutable curriculum revision; it must not overwrite historical
objective or learner-attempt mappings.

## Reproduce the attachment transcription check

With the two original PDFs available locally and `pdftotext` installed:

```bash
npx tsx scripts/check-chst-attachments.ts /path/to/CHST-Blueprint.pdf /path/to/CHST-References.pdf
```

The script verifies both file hashes and compares all extracted statements and
bibliography entries against the canonical catalog. Routine tests verify all
78 stable mappings, domain weights, contiguous official numbering, preserved
wording fingerprints and all 21 bibliography records without requiring private
uploaded files in CI. A successful transcription check is not independent human
technical approval or question publication.
