import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/tasks" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/tasks', { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout eyebrow="Welcome back" title="Make room for focused work." subtitle="Your day, in a calmer shape.">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        <button className="button button-primary button-wide" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
    </AuthLayout>
  );
}

function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-brand"><span className="brand-mark">D</span><span>daymark</span></div>
      <div className="auth-card">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
      </div>
      <p className="auth-footer">A small system for meaningful progress.</p>
    </div>
  );
}

export { AuthLayout };
