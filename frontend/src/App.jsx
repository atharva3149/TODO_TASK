import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TaskPage from './pages/TaskPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/tasks" element={<TaskPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
}
