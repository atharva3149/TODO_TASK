import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/tasks" aria-label="Daymark home">
          <span className="brand-mark">D</span>
          <span>daymark</span>
        </Link>
        <div className="account-chip">
          <div>
            <strong>{user.email}</strong>
            <span>{user.role === 'admin' ? 'Workspace admin' : 'Personal workspace'}</span>
          </div>
          <button className="button button-ghost" type="button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>
      <main className="page-content"><Outlet /></main>
    </div>
  );
}
