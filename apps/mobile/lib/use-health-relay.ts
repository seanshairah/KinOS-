import { useCallback, useState } from "react";
import { useSession } from "./session";
import { relayHealth, type HealthMetric, type RelayResult } from "./health";

/**
 * A screen-friendly wrapper around relayHealth: one `sync()` call, plus the
 * status a button needs. Reads the bearer token from the session, so a screen
 * only has to know the subject.
 */
export function useHealthRelay(subjectId: string, metrics?: HealthMetric[]) {
  const { token } = useSession();
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [result, setResult] = useState<RelayResult | null>(null);

  const sync = useCallback(async () => {
    if (!token) {
      setStatus("error");
      return;
    }
    setStatus("syncing");
    const r = await relayHealth(token, subjectId, metrics);
    setResult(r);
    setStatus(r.ok ? "done" : "error");
    return r;
  }, [token, subjectId, metrics]);

  return { status, result, sync };
}
