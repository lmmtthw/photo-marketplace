async function verify() {
  const codeEl = document.getElementById('code');
  const msg = document.getElementById('msg');
  const code = codeEl ? codeEl.value.trim() : '';
  if (!code) { msg.textContent = 'Enter the 6-digit code.'; return; }

  try {
    const res = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ code })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Verification failed');

    // MFA complete → go home or dashboard
    location.href = '/';
  } catch (e) {
    msg.textContent = e.message || 'Verification failed';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('verifyBtn')?.addEventListener('click', verify);
});
