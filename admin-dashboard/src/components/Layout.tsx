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
