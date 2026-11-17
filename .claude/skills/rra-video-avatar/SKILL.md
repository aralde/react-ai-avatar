---
name: rra-video-avatar
description: >-
  Build a photoreal or stylised video avatar for react-ai-avatar (`<VideoAvatar />`):
  from a character brief, write the Google Flow prompts (one hub portrait, five state
  clips, two idle variations), then turn the downloaded folder into looping clips,
  `clips.ts` and a poster with seam checks. Use whenever someone wants a talking-head
  video avatar, a "receptionist / barista / mascot as video", a face made with
  Flow, Veo or any text-to-video model, or asks to make `VideoClips`. Does NOT cover
  the SVG faces (see rra-character-avatar) or the paid Veo API.
---

# Building a video avatar for react-ai-avatar

`VideoAvatar` plays one short muted clip per state (idle, listening, thinking, working,
speaking) and crossfades between them. It looks seamless only if **every clip starts and
ends on the same neutral pose, the hub frame**, shot from a locked camera. The job has two
halves: write prompts that produce such clips, then run the folder through the script.

## 1. Write the prompts from the brief

Ask for what the brief lacks: who the character is (look, clothes, setting), what they do
for a living, and whether it is a real person or generated. Then write **seven prompts**:

1. **Hub portrait** (image prompt): the character, neutral expression, mouth closed, centred
   bust in a square-safe frame, soft even light, plain setting. Every clip starts from it.
2. **Five state clips** (video prompts, image-to-video from the hub):
   - `idle`: breathes, blinks, a slight head settle.
   - `listening`: attentive, small nod, eyes on the viewer.
   - `thinking`: looks aside or up, a small gesture of thought.
   - `working`: doing the character's job with their hands (see below).
   - `speaking`: talks to camera, natural small head and hand movement.
3. **Two idle variations** (`idle-<name>`): short, characteristic moments, such as a stretch
   or a sip of something, that play now and then while idle.

### Rules every video prompt must follow

- **Static tripod camera.** Say "locked-off static camera on a tripod, no zoom, no pan".
- **Same framing** as the hub: same distance, angle, lighting and background.
- **Starts and ends in the starting pose.** Say "begins and ends in exactly the same neutral
  pose as the reference image, mouth closed". This is what makes the seam invisible.
- Silent, no cuts, no text or captions, background still, 5 to 8 seconds.
- Only the person moves; props stay inside the frame.

### Adapt `working` and the variations to the character

`working` means "busy with a task", shown through the character's own work, not a laptop by
default: a barista steams milk, a receptionist types at the desk and checks a screen, a
mechanic wipes a part, a teacher writes on a board, a robot mascot flips through status
lights. Idle variations come from the same world (the barista wipes the counter, the
receptionist straightens papers). Keep hands and props near the hub framing so the clip can
return to it.

### Output format

Give the seven prompts as a numbered list the user can paste into Flow, each tagged with the
file name to save it as: `hub.png`, `idle.mp4`, `listening.mp4`, `thinking.mp4`,
`working.mp4`, `speaking.mp4`, `idle-<name>.mp4` (twice, with different names). Keep each
prompt self-contained: Flow does not remember the others.

## 2. Build the clips

After the user downloads everything into one folder (file names as above; the script is
tolerant of case and Flow's numbering, but each state may appear once):

```bash
node --experimental-strip-types scripts/build-video-avatar.ts raw/ --out public/clips --base /clips
```

It needs `ffmpeg` and `ffprobe`. For each clip it measures the SSIM of every frame against
the hub, keeps the stretch whose two ends are closest to it, picks `xfade` when the end
matches the start and boomerang otherwise (idle variations play `once`), encodes through
`prepare-video-clips.ts`, and writes `clips.ts`, `idle.jpg` (the poster) and `report.json`.

The report looks like:

```
✓ speaking: seam 0.97, xfade (0.00s–5.88s)
✓ thinking: seam 0.81, boomerang (0.50s–5.20s)
⚠ working: does not return to the hub (seam 0.62), regenerate (1.00s–4.50s)
```

- **seam** is the SSIM (1 = identical) between the hub and the weaker end of the kept stretch.
- `--threshold` (default **0.9**): seam at or above it uses `xfade`, below it a boomerang. The
  right value depends on the character, so tune it by eye in the preview: lower it if xfade
  dissolves look fine at 0.85, raise it if you see a ghosting dissolve.
- `--regenerate-below` (default **0.75**): below it the clip never comes back to the hub and
  should be regenerated, not trimmed. Re-run Flow with a stronger "ends in the starting pose".
- `--dry-run` only measures; `--x` sets the crop's left edge when the face is off-centre.

## 3. Preview it

Copy `assets/preview.html` next to the output, serve the folder (`npx serve public/clips`)
and open `preview.html?dir=.`. It cycles the five states with the real `VideoAvatar` and
shows the first and last frame of each clip, its loop (click it to jump to the seam), the
seam score and the mode. Regenerate anything whose first and last frames visibly differ.

Then wire it up:

```tsx
import { VideoAvatar } from 'react-ai-avatar';
import { CLIPS, IDLE_VARIATIONS, POSTER } from './clips';

<VideoAvatar clips={CLIPS} idleVariations={IDLE_VARIATIONS} poster={POSTER} state={state} />
```

## 4. Responsible-use checklist

Go through it with the user before they ship:

- [ ] **Say it's an AI.** Label the assistant as AI-generated wherever the face appears.
      Several jurisdictions require it for synthetic content that resembles a real person
      (the EU AI Act's transparency rules, for one).
- [ ] **Rights to the face.** A real person needs to have consented to this use; a generated
      person must not imitate a real one. Never prompt for a celebrity or a named individual.
- [ ] **Model terms.** Check the terms of the video model that generated the clips.
- [ ] **Honest states.** Show `thinking` and `working` truthfully; keep errors visible.
- [ ] **Motion preferences.** `VideoAvatar` honours `prefers-reduced-motion`; don't override it.
