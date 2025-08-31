async function finalize() {
const p = new URLSearchParams(location.search);
const sid = p.get('session_id');
const status = document.getElementById('status');
if (!sid) { status.textContent = 'Missing session id'; return; }
try {
await api('/api/checkout/confirm?session_id=' + encodeURIComponent(sid));
status.textContent = 'Order completed! You can download your photos in "My Orders".';
} catch (e) {
status.textContent = 'We could not confirm your payment. If you were charged, contact support.';
}
}


document.addEventListener('DOMContentLoaded', finalize);