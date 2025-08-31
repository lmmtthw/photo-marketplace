async function api(path, options = {}) {
const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ...options });
if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
return res.json();
}


async function whoAmI() {
try {
const data = await api('/api/auth/me');
const u = data.user;
const who = document.getElementById('whoami');
const loginLink = document.getElementById('loginLink');
const registerLink = document.getElementById('registerLink');
const dashLink = document.getElementById('dashLink');
const logoutBtn = document.getElementById('logoutBtn');
if (u) {
who && (who.textContent = `${u.name} (${u.role})`);
loginLink && (loginLink.style.display = 'none');
registerLink && (registerLink.style.display = 'none');
if (dashLink) dashLink.style.display = (u.role === 'photographer') ? 'inline-block' : 'none';
if (logoutBtn) {
logoutBtn.style.display = 'inline-block';
logoutBtn.onclick = async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/'; };
}
} else {
who && (who.textContent = 'Guest');
}
} catch {}
}


document.addEventListener('DOMContentLoaded', whoAmI);