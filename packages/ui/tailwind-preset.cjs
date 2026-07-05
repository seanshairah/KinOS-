/** Tailwind preset mapping the Dusk tokens (tokens.css) into utilities. */
module.exports = {
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "rgb(var(--ink-rgb) / <alpha-value>)",
          soft: "var(--ink-soft)",
          faint: "var(--ink-faint)",
        },
        paper: { DEFAULT: "var(--paper)", 2: "var(--paper-2)", 3: "var(--paper-3)" },
        line: { DEFAULT: "var(--line)", 2: "var(--line-2)" },
        dusk: {
          DEFAULT: "var(--dusk)",
          2: "rgb(var(--dusk-2-rgb) / <alpha-value>)",
          3: "rgb(var(--dusk-3-rgb) / <alpha-value>)",
          ink: "var(--dusk-ink)",
        },
        halo: "rgb(var(--halo-rgb) / <alpha-value>)",
        ember: {
          DEFAULT: "rgb(var(--ember-rgb) / <alpha-value>)",
          soft: "var(--ember-soft)",
          text: "var(--ember-text)",
        },
        calm: {
          DEFAULT: "rgb(var(--calm-rgb) / <alpha-value>)",
          soft: "var(--calm-soft)",
          text: "var(--calm-text)",
        },
        urgent: { DEFAULT: "rgb(var(--urgent-rgb) / <alpha-value>)", bg: "var(--urgent-bg)" },
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
