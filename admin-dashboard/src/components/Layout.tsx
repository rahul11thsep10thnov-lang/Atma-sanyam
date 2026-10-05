import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>Atma Sanyam</h2>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/stories">Stories</NavLink>
          <NavLink to="/sources">Sources</NavLink>
          <NavLink to="/config">Config</NavLink>
          <div className="nav-section">Video Studio</div>
          <NavLink to="/studio">Studio</NavLink>
          <NavLink to="/voices">Voices</NavLink>
          <NavLink to="/providers">Providers</NavLink>
          <div className="nav-section">Cinematic production</div>
          <NavLink to="/production/assets">Asset library</NavLink>
          <NavLink to="/production/models">Model registry</NavLink>
          <NavLink to="/production/ops">Queues &amp; GPUs</NavLink>
        </nav>
        <button className="logout-btn" onClick={logout}>
          Sign out
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
