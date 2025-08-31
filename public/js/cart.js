async function loadCart() {
try {
const { items, totalCents } = await api('/api/cart');
const itemsDiv = document.getElementById('items');
itemsDiv.innerHTML = items.map(i => `
<div class="card" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
<div><strong>${i.title}</strong></div>
<div>$${(i.priceCents/100).toFixed(2)}</div>
<button class="button secondary" onclick="removeItem('${i._id}')">Remove</button>
</div>
`).join('');
document.getElementById('total').textContent = (totalCents/100).toFixed(2);
} catch (e) {
alert('Please login first');
location.href = '/login.html';
}
}


async function removeItem(id) { await api('/api/cart/remove/' + id, { method: 'DELETE' }); loadCart(); }


async function checkout() {
try {
const { url } = await api('/api/checkout/create', { method: 'POST' });
location.href = url; // go to Stripe
} catch (e) {
document.getElementById('msg').textContent = 'Checkout failed: ' + e.message;
}
}


document.getElementById('checkoutBtn')?.addEventListener('click', checkout);


document.addEventListener('DOMContentLoaded', loadCart);