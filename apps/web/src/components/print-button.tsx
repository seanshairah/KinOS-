"use client";

/** One honest button: print the page. Hidden on the printed sheet itself. */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="shrink-0 rounded-full bg-black px-5 py-2.5 text-[13px] font-semibold text-white"
    >
      Print the card
    </button>
  );
}
