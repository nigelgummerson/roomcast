# Ward 14 — Spinal Surgery Handover

**FICTIONAL DEMO DATA ONLY — no real patient, staff, or NHS number appears in this
file.** This is the sample input used to demonstrate roomcast's presenter → reader
pipeline (parse → mobilise → broadcast → scan). See `docs/DPIA-draft.md` for the
information-governance position on real patient data.

A matching `.docx` version of this table (for exercising the `.docx` upload path) is
produced by the fixture generator added in Task 15; this `.md` file is the
hand-authored source of truth for its content.

**Handover date:** 2026-07-01 · **Shift:** Day → Night · **Consultant on-call:** Mr A.
Fairweather

| Bed | Name | NHS number | Age | Consultant | Diagnosis | Plan / jobs | Obs / alerts |
|---|---|---|---|---|---|---|---|
| 1 | Margaret Hollowell | 999 001 2345 | 78 | Mr A. Fairweather | L4/5 spinal stenosis, day 2 post decompression | Mobilise with physio bd; review wound dressing tomorrow AM | Stable; mild hypotension overnight, lying/standing BP charted |
| 2 | Desmond Okafor-Bright | 999 002 6781 | 64 | Ms C. Vantwist | T12 burst fracture, day 5 post fixation | Chase CT reformats; catheter TWOC 08:00 | Afebrile; pain well controlled on current regimen |
| 3 | Priya Nettleford | 999 003 9024 | 45 | Mr A. Fairweather | Cervical myelopathy, awaiting MRI | Nil by mouth from midnight for MRI at 07:30; consent form in notes | Neuro obs 4-hourly; new left hand paraesthesia — flag to on-call reg if progresses |
| 4 | Harold Quennell | 999 004 3312 | 82 | Dr S. Okonjo-Reyes | Lumbar discectomy, day 1 | Encourage oral fluids; first mobilisation attempt this evening | Drowsy post-anaesthetic; sats 94% on air, low-flow O2 in place |
| 5 | Beatrice Umukoro | 999 005 5567 | 57 | Ms C. Vantwist | Scoliosis correction, day 3 | Wean PCA to oral analgesia; physio referral pending | Wound clean/dry; temp 37.8°C at midday obs, repeat 6-hourly |
| 6 | *(bed closed — deep clean)* | — | — | — | — | Reopening expected 08:00 tomorrow | — |
| 7 | Terrence Ashworth-Pyke | 999 007 8843 | 71 | Dr S. Okonjo-Reyes | Vertebral compression fracture, conservative management | Bloods due 06:00; TTAs to be written for planned discharge tomorrow | Independently mobile with frame; no red flags |
| 8 | Jasmine Delacroix-Webb | 999 008 1129 | 39 | Mr A. Fairweather | Cauda equina — post-op day 0 (emergency decompression) | Hourly neuro obs overnight; urinary catheter in situ, monitor output | For urgent review if any new saddle anaesthesia or bladder symptoms |

**Outstanding jobs for night team:**

- Bed 3 (Nettleford): confirm MRI slot with radiology on-call before 22:00.
- Bed 4 (Quennell): repeat sats check after mobilisation attempt.
- Bed 7 (Ashworth-Pyke): TTA prescription needs consultant countersign before discharge.
- Bed 8 (Delacroix-Webb): hourly neuro obs chart on wall — do not miss a slot.

**Escalation:** on-call registrar bleep 3142 · on-call consultant via switchboard.
