import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from './LoginPage';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  if (user) return <Navigate to="/tasks" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const pwErr = validatePassword(password);
    if (pwErr) return setError(pwErr);
    if (password !== confirmation) return setError('Passwords do not match.');
    setError('');
    setIsSubmitting(true);
    try {
      await register(email, password);
      navigate('/tasks', { replace: true });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function validatePassword(pw) {
    if (typeof pw !== 'string' || pw.length < 7) return 'Password must be at least 7 characters';
    if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter';
    if (!/[a-z]/.test(pw)) return 'Password must include at least one lowercase letter';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must include at least one special character (e.g., @, !, #)';
    return null;
  }

  return (
    <AuthLayout eyebrow="Start simply" title="Build a better working rhythm." subtitle="Capture the next right thing, then get back to it.">
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        <label>Password
          <input
            type="password"
            value={password}
            onChange={(event) => {
              const v = event.target.value;
              setPassword(v);
              setPasswordError(validatePassword(v) || '');
            }}
            autoComplete="new-password"
            aria-describedby="password-help"
            required
          />
        </label>
        <div id="password-help" className="field-help">{passwordError || 'At least 7 chars, including upper/lower and a special character.'}</div>
        <label>Confirm password<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required /></label>
        <button className="button button-primary button-wide" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create account'}</button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </AuthLayout>
  );
}
