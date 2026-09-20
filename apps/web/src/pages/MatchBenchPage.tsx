/**
 * Hidden Chromium harness: /#/__match-bench
 * Runs matchInk with no UI/gestures/Skia/session.
 */
import { useEffect, useState } from "react";
import { runMatchInkBench, type BenchReport } from "@jpa/handwriting/bench";

export default function MatchBenchPage() {
  const [report, setReport] = useState<BenchReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const result = runMatchInkBench({
        warmup: 1,
        rounds: 5,
        naive: true,
        naiveRounds: 1,
        profile: true,
      });
      setReport(result);
      console.log("[JPA_MATCH_BENCH]", JSON.stringify(result));
    } catch (err) {
      setError(String(err));
    }
  }, []);

  return (
    <main>
      <h1>matchInk bench</h1>
      {error ? <pre id="match-bench-error">{error}</pre> : null}
      <pre id="match-bench-json">{report ? JSON.stringify(report, null, 2) : "running"}</pre>
    </main>
  );
}
