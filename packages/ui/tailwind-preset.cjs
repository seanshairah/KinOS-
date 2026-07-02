/** Tailwind preset mapping the Dusk tokens (tokens.css) into utilities. */
module.exports = {
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "var(--ink)", soft: "var(--ink-soft)", faint: "var(--ink-faint)" },
        paper: { DEFAULT: "var(--paper)", 2: "var(--paper-2)", 3: "var(--paper-3)" },
        line: { DEFAULT: "var(--line)", 2: "var(--line-2)" },
        dusk: {
          DEFAULT: "var(--dusk)",
          2: "var(--dusk-2)",
          3: "var(--dusk-3)",
          ink: "var(--dusk-ink)",
        },
        halo: "var(--halo)",
        ember: { DEFAULT: "var(--ember)", soft: "var(--ember-soft)", text: "var(--ember-text)" },
        calm: { DEFAULT: "var(--calm)", soft: "var(--calm-soft)", text: "var(--calm-text)" },
        urgent: { DEFAULT: "var(--urgent)", bg: "var(--urgent-bg)" },
        attn: { bg: "var(--attn-bg)" },
      },
      borderRadius: {
        sm: "var(--r-sm)",
        DEFAULT: "var(--r)",
        card: "var(--r)",
        lg: "var(--r-lg)",
        orbit: "var(--r-lg)",
        pill: "var(--r-pill)",
      },
      boxShadow: {
        DEFAULT: "var(--shadow)",
        card: "var(--shadow)",
        float: "var(--shadow-lg)",
      },
      fontFamily: {
        serif: ["var(--serif)"],
        sans: ["var(--sans)"],
        mono: ["var(--mono)"],
      },
    },
  },
};
