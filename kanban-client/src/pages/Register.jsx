import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password });
      login(res.data);
      navigate('/boards');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass-card rounded-2xl p-8">
        <h1 className="font-[var(--font-display)] text-2xl mb-1">Create account</h1>
        <p className="text-[var(--color-text-secondary)] text-sm mb-6">Start collaborating</p>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-[var(--color-text-secondary)] block mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full bg-white/5 border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-violet)]" />
          </div>
          <div>
            <label className="text-sm text-[var(--color-text-secondary)] block mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-white/5 border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-violet)]" />
          </div>
          <div>
            <label className="text-sm text-[var(--color-text-secondary)] block mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-white/5 border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-violet)]" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[var(--color-violet)] hover:bg-[var(--color-violet-light)] text-white text-sm font-medium rounded-lg py-2 transition-colors">
            {loading ? 'Creating...' : 'Sign up'}
          </button>
        </form>
        <p className="text-sm text-[var(--color-text-secondary)] mt-6 text-center">
          Have an account? <Link to="/login" className="text-[var(--color-violet-light)]">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;