import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { StoriesPage } from "./pages/StoriesPage";
import { StoryDetailPage } from "./pages/StoryDetailPage";
import { SourcesPage } from "./pages/SourcesPage";
import { ConfigPage } from "./pages/ConfigPage";

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
        </Route>
      </Routes>
    </AuthProvider>
  );
}
