function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

async function login() {
  const msg = document.getElementById('msg'); if (msg) msg.textContent = '';
  const identifier = val('identifier') || val('email');
  const password = val('password');
  if (!identifier || !password) { if (msg) msg.textContent = 'Please enter your email/username and password.'; return; }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Login failed (${res.status})`);

    if (data.mfaRequired) { location.href = '/mfa.html'; return; }
    location.href = '/';
  } catch (e) {
    if (msg) msg.textContent = e.message || 'Login failed';
  }
}

async function register() {
  const msg = document.getElementById('msg'); if (msg) msg.textContent = '';
  const body = {
    name: val('name'),
    username: val('username'),
    email: val('email'),
    password: val('password'),
    role: val('role') || 'user'
  };
  if (!body.name || !body.email || !body.password) {
    if (msg) msg.textContent = 'Name, email, and password are required.'; return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Register failed (${res.status})`);

    // We enforce MFA immediately after signup
    if (data.mfaRequired) { location.href = '/mfa.html'; return; }

    // (Shouldn't happen because we enforce MFA, but keep as fallback)
    location.href = body.role === 'photographer' ? '/dashboard.html' : '/';
  } catch (e) {
    if (msg) msg.textContent = e.message || 'Register failed';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn')?.addEventListener('click', login);
  document.getElementById('registerBtn')?.addEventListener('click', register);
});
