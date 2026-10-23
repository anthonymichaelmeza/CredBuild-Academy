# Practice selection and objective evidence

Practice availability and session selection use the same `eligibleQuestions`
predicate after choosing the latest eligible revision of each logical question.
The filters combine certification, domain, official objective ID, topic,
difficulty, answered/unanswered history, missed questions and bookmarks. A narrow
selection reports its actual count; the engine never repeats a question to fill
a requested size. Missed means at least one recorded miss, not a guaranteed
current weakness.

History belongs to the current authenticated learner or the current browser
demonstration. Active exam-rehearsal answers do not contribute to selection,
accuracy or recommendations until submission. Connected mode does not fall back
to browser history. The server rechecks all filters and ownership when starting.
Managed production starts accept only the published instructional bank. Local
development and explicitly enabled browser demonstrations retain their labeled
draft practice; older connected demonstration attempts remain reviewable.

Adaptive practice uses a transparent heuristic: unseen questions score 4;
previously attempted questions score 5 for a latest miss, up to 3 for historical
misses, 2 for latest low confidence, up to 3 for elapsed weeks, and 1 for an
incorrect response taking at least 60 browser-reported seconds. Slow correct
answers receive no penalty. The explicit "prioritize missed" option takes
precedence, and random ties rotate the selected sample. Difficulty is a learner
filter, not an estimate of personal ability. These constants are study aids,
not calibrated psychometric parameters.

Objective analytics resolve each attempt's pinned question revision. They show
answer accuracy, low-confidence count, average reported response time and links
to the exact blueprint objective and contributing session. "Needs review" means
accuracy below 75% or at least half of answers low confidence. Other samples
with fewer than five answers are "Limited sample"; larger samples are
"Consistent sample". These labels describe observed practice only. They are not
validated mastery, retention measurements, pass predictions or BCSP thresholds.
Unattempted objectives have no accuracy assigned.

The original 12-question demonstration remains available with its existing
storage format. The separate `curriculum_drafts` bank explicitly exposes only
unreviewed original AI drafts in browser-demo mode. Its IDs and bank tag are
validated on reload; it cannot enter connected practice. Published instruction
uses the separately reviewed server bank. A 200-question request still requires
200 distinct eligible questions; 100 draft items do not become a full exam.

Technical references appear with feedback, including their classification,
edition/locator when known and actual verification evidence. The attachment
bibliography alone does not verify an answer. Active exam rehearsals withhold
references, explanations and answer keys until submission. Dedicated flashcard
retention outcomes and a validated full-exam duration remain separate future
work.

Full 200-question exam starts are also guarded at the generic practice API,
not only on the Exam page. They require a trusted verified blueprint and duration,
the exact configured duration, and 200 distinct eligible published identities in
Hamilton proportions (73/40/45/42 for the supplied weights). Every domain must
have enough questions after the learner's filters. Test-only fictional policies
exercise this allocation; no real official duration is configured. Short
rehearsals keep the existing user-selected duration and clear rehearsal labels.
