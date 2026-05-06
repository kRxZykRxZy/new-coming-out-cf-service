import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

async function apiFetch(path, options = {}) {
  const csrfToken = getCookie('csrfToken');
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': decodeURIComponent(csrfToken) } : {}),
      ...(options.headers || {})
    },
    ...options
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Request failed');
  }
  return response.json().catch(() => ({}));
}

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('cloudcast-theme') || 'system');

  useEffect(() => {
    localStorage.setItem('cloudcast-theme', theme);
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const enableDark = theme === 'dark' || (theme === 'system' && prefersDark);
    root.classList.toggle('dark', enableDark);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') {
      return undefined;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event) => {
      document.documentElement.classList.toggle('dark', event.matches);
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme };
}

function Layout({ children, theme, setTheme, onLogout, user }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200/60 bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="text-xl font-semibold tracking-tight">
            CloudCast
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              Dashboard
            </Link>
            <Link to="/login" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              Login
            </Link>
            <Link to="/register" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              Register
            </Link>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            {user ? (
              <button
                type="button"
                onClick={onLogout}
                className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200"
              >
                Logout
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      await onLogin();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Access your CloudCast dashboard.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button type="submit" className="w-full rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
          Sign in
        </button>
      </form>
    </section>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      navigate('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold">Register</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Create your CloudCast account.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">Username</label>
          <input
            type="text"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <button type="submit" className="w-full rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
          Create account
        </button>
      </form>
    </section>
  );
}

function DashboardPage({ user }) {
  const navigate = useNavigate();
  const [cloudcasts, setCloudcasts] = useState([]);
  const [options, setOptions] = useState({ baseDomain: 'cloudcast.dev', domains: [] });
  const [form, setForm] = useState({ targetUrl: '', subdomain: '', domainId: '' });
  const [error, setError] = useState('');

  const refreshCloudcasts = async () => {
    const data = await apiFetch('/api/cloudcasts');
    setCloudcasts(data.cloudcasts || []);
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    apiFetch('/api/cloudcasts/options')
      .then((data) => setOptions(data))
      .catch(() => null);
    refreshCloudcasts().catch(() => null);
  }, [user, navigate]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const payload = {
        targetUrl: form.targetUrl,
        subdomain: form.subdomain || null,
        domainId: form.domainId || null
      };
      await apiFetch('/api/cloudcasts', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setForm({ targetUrl: '', subdomain: '', domainId: '' });
      await refreshCloudcasts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold">Your CloudCasts</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Manage your active tunnels and domains.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {cloudcasts.map((cloudcast) => (
            <div key={cloudcast.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{cloudcast.publicUrl}</p>
                  <p className="text-xs text-slate-500">{cloudcast.targetUrl}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${cloudcast.status === 'online' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {cloudcast.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Create a CloudCast</h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Target URL</label>
            <input
              type="url"
              value={form.targetUrl}
              onChange={(event) => setForm({ ...form, targetUrl: event.target.value })}
              className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder="http://localhost:3000"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Domain</label>
            <select
              value={form.domainId}
              onChange={(event) => setForm({ ...form, domainId: event.target.value })}
              className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Base domain ({options.baseDomain})</option>
              {(options.domains || []).map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="text-sm font-medium">Subdomain (optional)</label>
            <input
              type="text"
              value={form.subdomain}
              onChange={(event) => setForm({ ...form, subdomain: event.target.value })}
              className="mt-2 w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder="my-app"
            />
          </div>
          {error ? <p className="md:col-span-3 text-sm text-red-500">{error}</p> : null}
          <div className="md:col-span-3">
            <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
              Create CloudCast
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CliAuthPage({ user }) {
  const location = useLocation();
  const token = useMemo(() => new URLSearchParams(location.search).get('token'), [location.search]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setError('');
    try {
      await apiFetch('/api/cli/auth/confirm', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      setStatus('CLI linked. You can return to your terminal.');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token) {
    return <p className="text-sm text-slate-500">Missing CLI token.</p>;
  }

  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold">Authorize CLI</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Approve the CloudCast CLI to access your account.
      </p>
      {user ? (
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-6 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          Authorize CLI
        </button>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Please login first.</p>
      )}
      {status ? <p className="mt-4 text-sm text-emerald-500">{status}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
    </section>
  );
}

function HomePage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-3xl font-semibold">Expose local apps with confidence.</h1>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        CloudCast creates secure tunnels to your local services without sharing your real IP.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/register" className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Get started
        </Link>
        <Link to="/login" className="rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-200">
          Login
        </Link>
      </div>
    </section>
  );
}

function AppShell() {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState(null);

  const fetchUser = async () => {
    try {
      const data = await apiFetch('/api/auth/session');
      setUser(data.user || null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <Layout theme={theme} setTheme={setTheme} onLogout={handleLogout} user={user}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage onLogin={fetchUser} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage user={user} />} />
        <Route path="/cli-auth" element={<CliAuthPage user={user} />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
