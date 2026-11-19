// Vice Coast Cover Studio — extra presets for this build, kept in step with
// main.ts: a 1080 x 1920 Story export size and a Midnight Neon colour grade.
// main.ts regenerates this file into the handed-in app from its own copy of
// these presets at build time. main.js merges them into the engine's grade
// and size tables, so they appear in the UI and export like the built-ins.
export const BUILD_PRESETS = {
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
