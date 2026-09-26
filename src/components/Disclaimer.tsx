/**
 * Permanently visible and not dismissible. The challenge brief requires that the
 * solution assists rather than replaces professional advice, so the boundary is
 * stated in the interface as well as enforced in the model's instructions.
 */
export function Disclaimer() {
  return (
    <aside className="notice" role="note" aria-label="Scope of this tool">
      <strong>This is not legal advice.</strong> ClauseLens explains what a document says and
      flags points worth questioning. It cannot tell you whether to sign, predict how a court
      would rule, or replace a qualified lawyer.
    </aside>
  );
}
