async function loadOrders() {
try {
const { orders } = await api('/api/orders');
const container = document.getElementById('orders');
if (!orders.length) { container.innerHTML = '<p>You have no orders yet.</p>'; return; }
container.innerHTML = orders.map(o => `
<div class="card">
<div><strong>Order #${o._id}</strong> — ${new Date(o.createdAt).toLocaleString()}</div>
<hr/>
${o.items.map(it => `<div style=\"display:flex;justify-content:space-between;align-items:center;margin:6px 0\">
<span>${it.title}</span>
<a class=\"button\" href=\"${it.downloadUrl}\">Download</a>
</div>`).join('')}
</div>
`).join('');
} catch (e) {
alert('Please login');
location.href = '/login.html';
}
}


document.addEventListener('DOMContentLoaded', loadOrders);