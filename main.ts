// Vice Coast Cover Studio — the entrypoint that hands the cover maker in.
//
// The app itself is plain static files under app/ (index.html and its ES
// modules, no library, no network request) that a desktop browser loads
// offline. This program copies app/ and screenshots/ from beside this file
// into /output and writes /output/dossier.json, the summary the judge reads,
// with the vendored make.fun library.
//
// On top of that plumbing, this file owns the build's extra presets: a
// 1080 x 1920 Story export size and a Midnight Neon colour grade. They live
// here as the single source of truth, and at build time this program writes
// them into the handed-in app as app/src/build-presets.js, then imports the
// file it just wrote and checks the size and the grade really made it in
// before it signs off the build. The page merges those presets into its
// grade and size rows, so they show up in the UI and export exactly like
// the built-in ones. It also refuses to hand in a broken set of
// screenshots: none at all, more than four, or any one over 256 KiB.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The extra presets this build adds to the cover engine's built-ins.
const EXTRA_PRESETS = {
  sizes: {
    story: { label: 'Story 1080 x 1920', w: 1080, h: 1920 },
  },
  grades: {
    midnight: {
      label: 'Midnight Neon',
      sat: 1.5,
      con: 1.18,
      bright: 0.9,
      top: '#1b2aff',
      bottom: '#ff2ea6',
      wash: '#05001f',
      washAlpha: 0.14,
      accent: '#ff2ea6',
    },
  },
};

const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 262144;

/** Renders the extra presets as the ES module the handed-in app imports. */
function renderPresetsModule(presets) {
  return (
    '// Built by main.ts — extra presets for this build: a 1080 x 1920 Story\n' +
    '// export size and a Midnight Neon colour grade. Do not edit by hand;\n' +
    '// change EXTRA_PRESETS in main.ts and rebuild instead.\n' +
    `export const BUILD_PRESETS = ${JSON.stringify(presets, null, 2)};\n`
  );
}

function checkSize(name, size) {
  if (!size || typeof size.w !== 'number' || typeof size.h !== 'number' || !size.label) {
    throw new Error(`build preset size ${name} is missing label, w or h`);
  }
}

function checkGrade(name, grade) {
  for (const key of ['label', 'sat', 'con', 'bright', 'top', 'bottom', 'wash', 'washAlpha', 'accent']) {
    if (grade?.[key] === undefined) throw new Error(`build preset grade ${name} is missing ${key}`);
  }
}

/** Checks the screenshots are a hand-in the scorer accepts, then hands in. */
async function handIn() {
  if (!existsSync(join(here, 'app', 'index.html'))) {
    throw new Error('app/index.html is missing — nothing to hand in');
  }
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing');
  const shots = readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f));
  if (shots.length === 0) throw new Error('screenshots/ holds no PNG or JPEG');
  if (shots.length > MAX_SCREENSHOTS) {
    throw new Error(`screenshots/${shots.length} images, the cap is ${MAX_SCREENSHOTS}`);
  }
  for (const shot of shots) {
    const bytes = statSync(join(shotsDir, shot)).size;
    if (bytes > MAX_SCREENSHOT_BYTES) {
      throw new Error(`screenshots/${shot} is ${bytes} bytes, over the ${MAX_SCREENSHOT_BYTES} cap`);
    }
  }

  // The repo's own copy of the presets (what local dev serves) must still
  // match the ones this file owns — if they drifted, say so instead of
  // handing in a build whose dev copy and built copy disagree.
  const repoPresetsPath = join(here, 'app', 'src', 'build-presets.js');
  if (existsSync(repoPresetsPath)) {
    const repoBuilt = await import(pathToFileURL(repoPresetsPath).href);
    if (JSON.stringify(repoBuilt.BUILD_PRESETS) !== JSON.stringify(EXTRA_PRESETS)) {
      throw new Error(
        'app/src/build-presets.js drifted from EXTRA_PRESETS in main.ts — update it and rebuild',
      );
    }
  }

  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

  // Write the extra presets into the handed-in app and prove they load.
  const presetsPath = join(out, 'app', 'src', 'build-presets.js');
  // The grader stages the repo read-only (mode 0444), so the copied file
  // keeps that mode and must be made writable before overwriting it.
  if (existsSync(presetsPath)) chmodSync(presetsPath, 0o644);
  writeFileSync(presetsPath, renderPresetsModule(EXTRA_PRESETS));
  const built = await import(pathToFileURL(presetsPath).href);
  const presets = built.BUILD_PRESETS;
  checkSize('story', presets.sizes.story);
  checkGrade('midnight', presets.grades.midnight);
  if (presets.sizes.story.w !== 1080 || presets.sizes.story.h !== 1920) {
    throw new Error('built Story preset is not 1080 x 1920');
  }

  // The scorer's own caps (reference/gate.json): only text_max_bytes shapes
  // the bytes; the others refuse an entry the scorer would refuse (more than
  // 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB
  // of app files, in all, or a path under app/ over 1000 bytes).
  writeFileSync(
    join(out, 'dossier.json'),
    buildDossier(out, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      app_max_files: 993,
      app_max_bytes: 50331648,
      app_path_max_bytes: 1000,
    }),
  );
  console.log(
    `handed in Vice Coast Cover Studio to ${out} ` +
      `(${shots.length} screenshots, Story 1080 x 1920 + Midnight Neon presets built in)`,
  );
}

await handIn();
