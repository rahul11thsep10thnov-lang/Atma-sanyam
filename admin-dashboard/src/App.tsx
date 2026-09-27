import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { StoriesPage } from "./pages/StoriesPage";
import { StoryDetailPage } from "./pages/StoryDetailPage";
import { SourcesPage } from "./pages/SourcesPage";
import { ConfigPage } from "./pages/ConfigPage";
import { StudioListPage } from "./pages/studio/StudioListPage";
import { NewStudioStoryPage } from "./pages/studio/NewStudioStoryPage";
import { StudioStoryPage } from "./pages/studio/StudioStoryPage";
import { VoicesPage } from "./pages/studio/VoicesPage";
import { ProvidersPage } from "./pages/studio/ProvidersPage";

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/stories/:id" element={<StoryDetailPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/studio" element={<StudioListPage />} />
          <Route path="/studio/new" element={<NewStudioStoryPage />} />
          <Route path="/studio/:id" element={<StudioStoryPage />} />
          <Route path="/voices" element={<VoicesPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
