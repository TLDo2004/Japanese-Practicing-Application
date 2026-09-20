import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { PwaUpdateBanner } from "./components/PwaUpdateBanner";
import { SessionProvider } from "./lib/session";
import { ShellMetaProvider } from "./lib/shell-meta";
import { PlatformProvider } from "./platform/PlatformContext";
import { CharacterPage } from "./pages/CharacterPage";
import { ChartPage } from "./pages/ChartPage";
import { DictionaryPage } from "./pages/DictionaryPage";
import { LearnPage } from "./pages/LearnPage";
import { PracticePage } from "./pages/PracticePage";
import { QuizPage } from "./pages/QuizPage";
import { SetsPage } from "./pages/SetsPage";
import { SummaryPage } from "./pages/SummaryPage";
import { WritingPage } from "./pages/WritingPage";

export function App() {
  return (
    <PlatformProvider>
      <SessionProvider>
        <ShellMetaProvider>
          <PwaUpdateBanner />
          <HashRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/learn" replace />} />
                <Route path="/learn" element={<LearnPage />} />
                <Route path="/learn/chart/:script" element={<ChartPage />} />
                <Route path="/learn/chart/:script/:ro" element={<CharacterPage />} />
                <Route path="/practice" element={<PracticePage />} />
                <Route path="/practice/sets/:kind/:mode" element={<SetsPage />} />
                <Route path="/practice/write" element={<WritingPage />} />
                <Route path="/practice/quiz" element={<QuizPage />} />
                <Route path="/practice/summary" element={<SummaryPage />} />
                <Route path="/dictionary" element={<DictionaryPage />} />
                <Route path="/dict" element={<Navigate to="/dictionary" replace />} />
                {import.meta.env.DEV ? <Route path="/__match-bench" element={<DevMatchBench />} /> : null}
                <Route path="*" element={<Navigate to="/learn" replace />} />
              </Route>
            </Routes>
          </HashRouter>
        </ShellMetaProvider>
      </SessionProvider>
    </PlatformProvider>
  );
}

/** Dev-only — separate chunk never referenced from production builds. */
function DevMatchBench() {
  const MatchBenchPage = lazy(() => import("./pages/MatchBenchPage"));
  return (
    <Suspense fallback={<p>loading matchInk bench…</p>}>
      <MatchBenchPage />
    </Suspense>
  );
}
