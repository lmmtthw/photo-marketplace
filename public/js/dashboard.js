function el(id){ return document.getElementById(id); }

async function loadMine() {
  try {
    const { items } = await api('/api/photos/mine');
    const mine = el('mine');
    if (!mine) return;
    mine.innerHTML = items.map(p => `
      <div class="card">
        <img src="${p.thumbUrl}" alt="${p.title}"/>
        <h3>${p.title}</h3>
        <div><strong>$${(p.priceCents/100).toFixed(2)}</strong></div>
        <button class="button secondary" onclick="delPhoto('${p._id}')">Delete</button>
      </div>
    `).join('');
  } catch {
    alert('Please login as a photographer');
    location.href = '/login.html';
  }
}

async function uploadPhoto() {
  const fileInput = el('file');
  const msg = el('msg');
  const titleInput = el('title');
  const priceInput = el('price');

  if (!fileInput) { alert('File input not found on page'); return; }
  if (!msg) { console.warn('msg element missing'); }

  const files = fileInput.files;
  const title = (titleInput?.value || '').trim();
  const price = (priceInput?.value || '').trim();

  if (msg) { msg.style.display = 'block'; msg.textContent = 'Preparing upload…'; }

  if (!files || files.length === 0) { if (msg) msg.textContent = 'Pick at least one image'; return; }
  if (!price) { if (msg) msg.textContent = 'Price is required (e.g. 4.99)'; return; }

  // 30s per-file timeout
  async function uploadOne(file, idx, total) {
    const fd = new FormData();
    // Use typed title or fall back to filename (without extension)
    const fallbackTitle = file.name.replace(/\.[^.]+$/, '');
    fd.append('file', file);
    fd.append('title', title || fallbackTitle);
    fd.append('price', price);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (${res.status})`);
      }
      if (msg) msg.textContent = `Uploaded ${idx + 1}/${total}`;
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  }

  // Upload sequentially for simpler progress & lower memory
  try {
    for (let i = 0; i < files.length; i++) {
      if (msg) msg.textContent = `Uploading ${i + 1}/${files.length}…`;
      await uploadOne(files[i], i, files.length);
    }
    if (msg) msg.textContent = 'All files uploaded!';
    fileInput.value = '';
    if (titleInput) titleInput.value = '';
    if (priceInput) priceInput.value = '';
    await loadMine();
  } catch (e) {
    if (msg) msg.textContent = e.message || 'Upload failed';
  }
}

async function delPhoto(id) {
  if (!confirm('Delete this photo?')) return;
  await api('/api/photos/' + id, { method: 'DELETE' });
  loadMine();
}

document.addEventListener('DOMContentLoaded', () => {
  el('uploadBtn')?.addEventListener('click', uploadPhoto);
  loadMine();
});
