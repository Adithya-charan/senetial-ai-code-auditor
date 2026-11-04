import { lazy, StrictMode, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";
import { useLoad } from "./hooks";
import { MotionRoot } from "./motionui";
import Findings from "./pages/Findings";
import History from "./pages/History";
import Landing from "./pages/Landing";
import NewScan from "./pages/NewScan";
import Overview from "./pages/Overview";
import ScanProgress from "./pages/ScanProgress";
import Settings from "./pages/Settings";
import Shell from "./Shell";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./tailwind.css";
import "./styles.css";
import "./app.css";

const Investigation = lazy(() => import("./investigation/Investigation"));

/** Old /findings/:id links: resolve the finding's scan, then open it in the investigation. */
function FindingRedirect() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data, error } = useLoad(() => api.finding(id), [id]);
  useEffect(() => { if (data) nav(`/scans/${data.scan_id}/investigate?f=${data.id}`, { replace: true }); }, [data, nav]);
  return error ? <p className="err" role="alert">Could not open finding: {error}</p> : <p className="muted" role="status">Opening finding…</p>;
}

function App() {
  return (
    <Routes>
      {/* Public entry page: its own chrome, no app sidebar. */}
      <Route path="/" element={<Landing />} />
      {/* The investigation is full-screen and brings its own chrome. */}
      <Route path="/scans/:id/investigate" element={<Suspense fallback={<div className="skel" style={{ margin: 24, height: 200 }} role="status" aria-label="Loading investigation" />}><Investigation /></Suspense>} />
      <Route path="*" element={
        <Shell>
          <Routes>
            <Route path="/overview" element={<Overview />} />
            <Route path="/new" element={<NewScan />} />
            <Route path="/findings" element={<Findings />} />
            <Route path="/findings/:id" element={<FindingRedirect />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/scans/:id" element={<ScanProgress />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </Shell>} />
    </Routes>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode><MotionRoot><BrowserRouter><App /></BrowserRouter></MotionRoot></StrictMode>);
