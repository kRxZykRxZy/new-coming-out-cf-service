import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const BASELINE_HOURLY_TRAFFIC_PERCENTAGES = [22, 35, 45, 30, 58, 67, 44, 62, 71, 63, 54, 78];
const TRAFFIC_BOOST_MULTIPLIER = 2;
const MAX_TRAFFIC_BOOST = 18;
const MAX_TRAFFIC_VISUAL_PERCENTAGE = 92;

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

function Icon({ path, className = 'h-5 w-5', viewBox = '0 0 24 24', label }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {path}
    </svg>
  );
}

const icons = {
  cloud: <><path d="M6 19h11a4 4 0 1 0-.8-7.93A5 5 0 0 0 6.2 9.1 4 4 0 0 0 6 19Z" /></>,
  dashboard: <><path d="M3 12h8V3H3zM13 21h8v-8h-8zM13 10h8V3h-8zM3 21h8v-7H3z" /></>,
  analytics: <><path d="M4 19h16" /><path d="M7 16v-5" /><path d="M12 16V7" /><path d="M17 16v-3" /></>,
  tunnel: <><path d="M4 8h16" /><path d="M4 16h16" /><path d="M8 8a4 4 0 0 0 0 8" /><path d="M16 8a4 4 0 1 1 0 8" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  user: <><path d="M20 21a8 8 0 1 0-16 0" /><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /></>,
  mail: <><path d="m4 6 8 6 8-6" /><rect x="3" y="5" width="18" height="14" rx="2" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 1 1 8 0v3" /></>,
  login: <><path d="M10 17 15 12 10 7" /><path d="M15 12H3" /><path d="M21 21V3" /></>,
  logout: <><path d="M14 17 9 12l5-5" /><path d="M9 12h12" /><path d="M3 21V3" /></>,
  check: <><path d="m20 6-11 11-5-5" /></>,
  alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="M12 15h9" /><path d="M18 12v6" /></>,
  external: <><path d="M14 5h7v7" /><path d="M21 5 10 16" /><path d="M19 13v6H5V5h6" /></>,
  spark: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" /></>,
  route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h4a4 4 0 0 0 4-4V8" /></>,
  chevron: <><path d="m9 6 6 6-6 6" /></>
};

function SidebarLink({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-sky-100 text-sky-800 shadow-sm' : 'text-slate-600 hover:bg-white hover:text-sky-700'
        }`
      }
    >
      <Icon path={icon} className="h-4 w-4" />
      {label}
      <Icon path={icons.chevron} className="ml-auto h-3.5 w-3.5 text-slate-400 group-hover:text-sky-500" />
    </NavLink>
  );
}

function Layout({ children, onLogout, user }) {
  const location = useLocation();
  const pageTitles = {
    '/': 'Secure Edge Operations',
    '/dashboard': 'Tunnels & Analytics Workspace',
    '/login': 'Secure Edge Operations',
    '/register': 'Secure Edge Operations',
    '/cli-auth': 'Secure Edge Operations'
  };
  const pageTitle = pageTitles[location.pathname] || 'Secure Edge Operations';

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-white text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-64 rounded-2xl border border-sky-200/70 bg-white/90 p-4 shadow-xl shadow-sky-100/60 backdrop-blur lg:block">
          <Link to="/" className="mb-6 flex items-center gap-3 rounded-xl bg-sky-600 px-4 py-3 text-white">
            <Icon path={icons.cloud} className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold leading-none">CloudCast</p>
              <p className="mt-1 text-xs text-sky-100">Tunnel Control Plane</p>
            </div>
          </Link>

          <nav className="space-y-1">
            <SidebarLink to="/" label="Overview" icon={icons.dashboard} />
            <SidebarLink to="/dashboard" label="Tunnels & Analytics" icon={icons.tunnel} />
            <SidebarLink to="/cli-auth" label="CLI Access" icon={icons.key} />
          </nav>

          <div className="mt-8 rounded-xl border border-sky-200 bg-sky-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-sky-800">
              <Icon path={icons.spark} className="h-4 w-4" />
              Platform Status
            </div>
            <p className="mt-2 text-xs text-slate-600">Edge healthy. Route propagation under 60 seconds.</p>
          </div>
        </aside>

        <div className="flex-1 rounded-2xl border border-sky-200/60 bg-white/80 p-4 shadow-xl shadow-sky-100/60 backdrop-blur md:p-6">
          <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-sky-100 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">CloudCast Dashboard</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">{pageTitle}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {user ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">
                  <Icon path={icons.user} className="h-3.5 w-3.5" />
                  {user.username || user.email || 'Authenticated'}
                </span>
              ) : null}
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg border border-sky-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700">
                <Icon path={icons.login} className="h-3.5 w-3.5" />
                Login
              </Link>
              <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700">
                <Icon path={icons.plus} className="h-3.5 w-3.5" />
                Register
              </Link>
              {user ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Icon path={icons.logout} className="h-3.5 w-3.5" />
                  Logout
                </button>
              ) : null}
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone = 'sky', icon }) {
  const tones = {
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700'
  };

  return (
    <article className={`rounded-2xl border p-4 ${tones[tone] || tones.sky}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.15em]">{label}</p>
        <Icon path={icon} className="h-4 w-4" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function FormInput({ label, icon, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        <Icon path={icon} className="h-3.5 w-3.5 text-sky-600" />
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
      />
    </label>
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
    <section className="mx-auto max-w-lg rounded-2xl border border-sky-200 bg-white p-6 shadow-lg shadow-sky-100 sm:p-8">
      <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <Icon path={icons.login} className="h-6 w-6 text-sky-600" />
        Welcome back
      </h2>
      <p className="mt-2 text-sm text-slate-500">Sign in to manage your tunnels, analytics, and CLI sessions.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormInput label="Email" icon={icons.mail} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <FormInput label="Password" icon={icons.lock} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />

        {error ? (
          <p className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            <Icon path={icons.alert} className="h-4 w-4" />
            {error}
          </p>
        ) : null}

        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
          <Icon path={icons.check} className="h-4 w-4" />
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
    <section className="mx-auto max-w-lg rounded-2xl border border-sky-200 bg-white p-6 shadow-lg shadow-sky-100 sm:p-8">
      <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <Icon path={icons.plus} className="h-6 w-6 text-sky-600" />
        Create your account
      </h2>
      <p className="mt-2 text-sm text-slate-500">Start exposing local services from a production-style dashboard.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormInput
          label="Username"
          icon={icons.user}
          type="text"
          value={form.username}
          onChange={(event) => setForm({ ...form, username: event.target.value })}
          required
        />
        <FormInput
          label="Email"
          icon={icons.mail}
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />
        <FormInput
          label="Password"
          icon={icons.lock}
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          required
        />

        {error ? (
          <p className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            <Icon path={icons.alert} className="h-4 w-4" />
            {error}
          </p>
        ) : null}

        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
          <Icon path={icons.check} className="h-4 w-4" />
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

  const refreshCloudcasts = useCallback(async () => {
    const data = await apiFetch('/api/cloudcasts');
    setCloudcasts(data.cloudcasts || []);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    apiFetch('/api/cloudcasts/options')
      .then((data) => setOptions(data))
      .catch(() => null);

    refreshCloudcasts().catch(() => null);
  }, [navigate, refreshCloudcasts, user]);

  const stats = useMemo(() => {
    const total = cloudcasts.length;
    const online = cloudcasts.filter((item) => item.status === 'online').length;
    const offline = total - online;
    const activeDomains = new Set(cloudcasts.map((item) => item.publicUrl?.split('/')[2]).filter(Boolean)).size;
    return { total, online, offline, activeDomains };
  }, [cloudcasts]);

  const analyticsBars = useMemo(() => {
    const trafficBoost = Math.min(cloudcasts.length * TRAFFIC_BOOST_MULTIPLIER, MAX_TRAFFIC_BOOST);
    return BASELINE_HOURLY_TRAFFIC_PERCENTAGES.map((value, index) => ({
      hour: `${index * 2}:00`,
      value: Math.min(MAX_TRAFFIC_VISUAL_PERCENTAGE, value + trafficBoost)
    }));
  }, [cloudcasts.length]);

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
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Total Tunnels" value={stats.total} icon={icons.tunnel} />
        <MetricCard label="Online" value={stats.online} tone="emerald" icon={icons.check} />
        <MetricCard label="Offline" value={stats.offline} tone="amber" icon={icons.alert} />
        <MetricCard label="Active Domains" value={stats.activeDomains} icon={icons.route} />
      </section>

      <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Icon path={icons.analytics} className="h-5 w-5 text-sky-600" />
            Traffic Analytics
          </h2>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">Last 24h</span>
        </div>

        <figure className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
          <figcaption className="sr-only">Traffic chart for the last 24 hours in 2-hour intervals.</figcaption>
          <div className="grid grid-cols-12 items-end gap-2">
            {analyticsBars.map((item) => (
              <div key={item.hour} className="flex flex-col items-center gap-2">
                <div className="h-32 w-3 rounded-full bg-sky-100">
                  <div className="w-full rounded-full bg-gradient-to-t from-sky-500 to-sky-300" style={{ height: `${item.value}%`, marginTop: `${100 - item.value}%` }} />
                </div>
                <span className="text-[10px] font-medium text-slate-500">{item.hour}</span>
              </div>
            ))}
          </div>
        </figure>
      </section>

      <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Icon path={icons.tunnel} className="h-5 w-5 text-sky-600" />
            Tunnel Inventory
          </h2>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{cloudcasts.length} Routes</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-sky-100">
          {cloudcasts.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
              <Icon path={icons.alert} className="h-4 w-4" />
              No tunnels yet. Create one below.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <caption className="sr-only">List of active CloudCast tunnels and their connection status.</caption>
                <thead className="bg-sky-50 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-2">Public URL</th>
                    <th scope="col" className="px-4 py-2">Target</th>
                    <th scope="col" className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cloudcasts.map((cloudcast) => (
                    <tr key={cloudcast.id} className="border-t border-sky-100">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          <Icon path={icons.external} className="h-4 w-4 text-sky-600" />
                          {cloudcast.publicUrl}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <Icon path={icons.route} className="h-4 w-4 text-sky-500" />
                          {cloudcast.targetUrl}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                          cloudcast.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          <Icon path={cloudcast.status === 'online' ? icons.check : icons.alert} className="h-3 w-3" />
                          {cloudcast.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Icon path={icons.plus} className="h-5 w-5 text-sky-600" />
          Create Tunnel
        </h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <FormInput
              label="Target URL"
              icon={icons.route}
              type="url"
              value={form.targetUrl}
              onChange={(event) => setForm({ ...form, targetUrl: event.target.value })}
              placeholder="http://localhost:3000"
              required
            />
          </div>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              <Icon path={icons.cloud} className="h-3.5 w-3.5 text-sky-600" />
              Domain
            </span>
            <select
              value={form.domainId}
              onChange={(event) => setForm({ ...form, domainId: event.target.value })}
              className="w-full rounded-xl border border-sky-100 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Base domain ({options.baseDomain})</option>
              {(options.domains || []).map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-3">
            <FormInput
              label="Subdomain (optional)"
              icon={icons.route}
              type="text"
              value={form.subdomain}
              onChange={(event) => setForm({ ...form, subdomain: event.target.value })}
              placeholder="my-app"
            />
          </div>

          {error ? (
            <p className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 md:col-span-3">
              <Icon path={icons.alert} className="h-4 w-4" />
              {error}
            </p>
          ) : null}

          <div className="md:col-span-3">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700">
              <Icon path={icons.plus} className="h-4 w-4" />
              Create CloudCast Tunnel
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
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <p className="inline-flex items-center gap-2 text-sm font-medium">
          <Icon path={icons.alert} className="h-4 w-4" />
          Missing CLI token in URL.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-sky-200 bg-white p-8 shadow-lg shadow-sky-100">
      <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <Icon path={icons.key} className="h-6 w-6 text-sky-600" />
        Authorize CloudCast CLI
      </h2>
      <p className="mt-2 text-sm text-slate-500">Approve this device token to let the CLI create and manage tunnels in your account.</p>

      {user ? (
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          <Icon path={icons.check} className="h-4 w-4" />
          Authorize CLI Session
        </button>
      ) : (
        <p className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <Icon path={icons.login} className="h-4 w-4" />
          Please login first.
        </p>
      )}

      {status ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <Icon path={icons.check} className="h-4 w-4" />
          {status}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          <Icon path={icons.alert} className="h-4 w-4" />
          {error}
        </p>
      ) : null}
    </section>
  );
}

function HomePage() {
  const highlights = [
    {
      title: 'Edge Analytics',
      desc: 'Track request patterns and online health in one clean panel.',
      icon: icons.analytics
    },
    {
      title: 'Tunnel Operations',
      desc: 'Create, inspect, and manage all CloudCast routes from a single UI.',
      icon: icons.tunnel
    },
    {
      title: 'CLI Authorization',
      desc: 'Pair terminal workflows with controlled, auditable access tokens.',
      icon: icons.key
    }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-8 shadow-sm">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">
            <Icon path={icons.cloud} className="h-3.5 w-3.5" />
            CloudCast Platform
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight text-slate-900">Production-ready dashboard for tunnels, traffic, and CLI workflows.</h2>
          <p className="mt-4 text-sm text-slate-600">A polished Cloudflare-inspired interface with iconic light-blue design language and end-to-end tunnel controls.</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700">
              <Icon path={icons.dashboard} className="h-4 w-4" />
              Open dashboard
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-700">
              <Icon path={icons.plus} className="h-4 w-4" />
              Create account
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <article key={item.title} className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="inline-flex rounded-xl bg-sky-100 p-2 text-sky-700">
              <Icon path={item.icon} className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function AppShell() {
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
    <Layout onLogout={handleLogout} user={user}>
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
