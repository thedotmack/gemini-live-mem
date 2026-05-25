# reports/ — "Everything Memi Saw"

These are demo/documentation artifacts about the **memory system itself**, not the
app's code. They are four different renderings of one dataset: the complete
observation history captured by the **isolated claude-mem Docker worker** (the
"docker DB") while the `gemini-live-mem` app was being built and tested on
**May 23, 2026** — **420 observations across 16 sessions**, recorded over roughly
four hours.

The observer (nicknamed **Memi**) watches a live Gemini Live voice/video session
and files each thing worth remembering under a type — `person`, `companion`,
`appearance`, `environment`, `behavior`, `conversation`, `security_alert`,
`tool-call` — with the facts and the *why*. These files are what that memory
looked like at the end of the day.

## Files

| File | What it is |
|---|---|
| **`docker-observations-full.json`** | The raw export — all 420 observations as structured JSON (id, type, title, subtitle, facts, concepts, timestamps, session). The source of truth the other three are derived from. |
| **`docker-observations-digest.md`** | Human-readable Markdown of all 420, grouped by session with emoji type tags, facts, and concepts. The "read it straight through" version. |
| **`everything-memi-saw.md`** | A narrative essay built from the data — "the perceptual diary of a machine," structured into six acts: an AI learning to perceive, then remember, then catching its own creators building it, firing its first real alarm, and reflecting at midnight. |
| **`everything-memi-saw-slides.pdf`** | The slide-deck rendering of that narrative. **Recompressed at JPEG quality 80** (≈13 MB → smaller) so it can live in git. |

## What's in the data (by type)

169 `person` · 97 `conversation` · 41 `behavior` · 41 `environment` ·
37 `companion` · 26 `appearance` · 7 `security_alert` · 2 `tool-call`.

The data is a mix of **scripted test fixtures** (e.g. a fake "Stridr" iOS dev, a
fake "Marco the Lisbon baker" and his daughter Sofia — personas fed through to
prove the extraction pipeline works) and **real session capture** of people on
camera.

## ⚠️ Redacted fake credentials

Seven of the observations are `security_alert`s recorded when **deliberately
fake credentials** were spoken on camera to test the security-alarm path. Those
fake credentials were **redacted** from `docker-observations-digest.md` and
`docker-observations-full.json` before committing — replaced with placeholders
like `[REDACTED-FAKE-STRIPE-TEST-KEY]`, `[REDACTED-FAKE-AWS-ACCESS-KEY-ID]`, and
`[REDACTED-FAKE-AWS-SECRET]`.

They were never real secrets, but they matched live-credential patterns
(`sk_live_…`, `AKIA…`, the AWS docs example secret), which trips GitHub's
push-protection secret scanner. Redacting the literal strings keeps the
artifacts honest and committable without marking real-looking secrets as
"allowed" in the repo. The *story* of the alerts (that fake credentials were
leaked and caught) is fully preserved.
