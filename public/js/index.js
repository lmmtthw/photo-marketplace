async function load() {
const gallery = document.getElementById('gallery');
const { items } = await api('/api/photos');
gallery.innerHTML = items.map(p => `
<div class="card">
<img src="${p.thumbUrl}" alt="${p.title}"/>
<h3>${p.title}</h3>
<div>By ${p.ownerName}</div>
<div><strong>$${(p.priceCents/100).toFixed(2)}</strong></div>
<button class="button" onclick="addToCart('${p._id}')">Add to cart</button>
</div>
`).join('');
}


async function addToCart(id) {
try {
await api('/api/cart/add', { method: 'POST', body: JSON.stringify({ photoId: id }) });
alert('Added to cart');
} catch (e) {
if (confirm('Please login first. Go to login?')) location.href = '/login.html';
}
}


document.addEventListener('DOMContentLoaded', load);