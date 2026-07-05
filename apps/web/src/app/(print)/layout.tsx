/**
 * Print surface — no app chrome, no dusk field, no nav. Pages under this
 * group are made to leave the screen: a fridge door, a wallet, a folder
 * handed to a paramedic. Ink-friendly by design.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white text-black">{children}</div>;
}
