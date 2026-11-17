import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { Badge, Button } from "./components/ui";
import { StudioProvider, useStudio } from "./hooks/useStudio";
import { AnimationStudio } from "./pages/AnimationStudio";
import { AssetManager } from "./pages/AssetManager";
import { CharacterLibrary } from "./pages/CharacterLibrary";
import { Dashboard } from "./pages/Dashboard";
import { EnvironmentLibrary } from "./pages/EnvironmentLibrary";
import { ExportPage } from "./pages/Export";
import { Login } from "./pages/Login";
import { QualityControl } from "./pages/QualityControl";
import { RenderManager } from "./pages/RenderManager";
import { StoryStudio } from "./pages/StoryStudio";
import { Storyboard } from "./pages/Storyboard";
import { TimelineEditor } from "./pages/TimelineEditor";
import { VoiceStudio } from "./pages/VoiceStudio";
import { auth } from "./services/api";

const NAV: [string, string][] = [
  ["/", "Dashboard"],
  ["/story", "Story Studio"],
  ["/storyboard", "Storyboard"],
  ["/characters", "Character Library"],
  ["/environments", "Environment Library"],
  ["/assets", "Asset Manager"],
  ["/animation", "Animation Studio"],
  ["/voice", "Voice Studio"],
  ["/timeline", "Timeline Editor"],
  ["/render", "Render Manager"],
  ["/quality", "Quality Control"],
  ["/export", "Export"],
];

export function App() {
  const [signedIn, setSignedIn] = useState(!!auth.token());
  useEffect(() => {
    const out = () => setSignedIn(false);
    window.addEventListener("csae:signed-out", out);
    return () => window.removeEventListener("csae:signed-out", out);
  }, []);
  if (!signedIn) return <Login onSignedIn={() => setSignedIn(true)} />;
  return (
    <StudioProvider>
      <Shell />
    </StudioProvider>
  );
}

function Shell() {
  const { user, stories, storyId, story, selectStory, signOut } = useStudio();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-line bg-card md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-4 py-3 text-lg font-bold text-brand">Chibi Story Studio</div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-2 pb-2 md:block md:space-y-0.5">
          {NAV.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${isActive ? "bg-brand text-white" : "hover:bg-paper"}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-4 py-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Story</span>
            <select
              aria-label="Current story"
              className="max-w-xs rounded-lg border border-line bg-white px-2 py-1"
              value={storyId ?? ""}
              onChange={(e) => selectStory(e.target.value || null)}
            >
              {stories.length === 0 && <option value="">No stories yet</option>}
              {stories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          {story && <Badge>{story.status}</Badge>}
          {story && story.current_version > 0 && <span className="text-xs text-stone-500">version {story.current_version}</span>}
          <span className="ml-auto text-sm text-stone-600">
            {user?.email} <Badge>{user?.role}</Badge>
          </span>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </header>
        <main className="mx-auto max-w-6xl space-y-4 p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/story" element={<StoryStudio />} />
            <Route path="/storyboard" element={<Storyboard />} />
            <Route path="/characters" element={<CharacterLibrary />} />
            <Route path="/environments" element={<EnvironmentLibrary />} />
            <Route path="/assets" element={<AssetManager />} />
            <Route path="/animation" element={<AnimationStudio />} />
            <Route path="/voice" element={<VoiceStudio />} />
            <Route path="/timeline" element={<TimelineEditor />} />
            <Route path="/render" element={<RenderManager />} />
            <Route path="/quality" element={<QualityControl />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
