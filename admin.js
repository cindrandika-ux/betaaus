let allData = [];
let adminLoggedIn = false;
let sbClient = null;

function getClient() {
  const cfg = window.BETA_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
    if (!sbClient) sbClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return sbClient;
  }
  return null;
}

function localData() {
  try { return JSON.parse(localStorage.getItem('beta_aus_feedbacks') || '[]'); }
  catch { return []; }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
function fmtDate(iso) {
  try { return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso || '-'; }
}

async function loadData() {
  const sb = getClient();
  const status = document.getElementById('data-status');
  if (sb) {
    try {
      status.textContent = 'Mengambil dari Supabase...';
      const { data, error } = await sb.from('feedbacks').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      allData = (data || []).map((r) => ({
        id: r.id, rating: r.rating, categories: r.categories || [],
        message: r.message || '', contact: r.contact || '',
        created_at: r.created_at, source: 'supabase',
      }));
      status.textContent = `Sumber: Supabase — ulasan dari semua HP (${allData.length})`;
    } catch (e) {
      console.warn(e);
      allData = [];
      status.textContent = 'Gagal baca Supabase: ' + (e.message || e);
    }
  } else {
    allData = localData();
    status.textContent = `Supabase belum diisi — sumber lokal perangkat ini (${allData.length})`;
  }
  render();
}

function filtered() {
  const rf = document.getElementById('filter-rating').value;
  const cf = document.getElementById('filter-cat').value;
  const q = document.getElementById('filter-q').value.trim().toLowerCase();
  return allData.filter((r) => {
    if (rf !== 'all' && r.rating !== parseInt(rf, 10)) return false;
    if (cf !== 'all' && !(r.categories || []).includes(cf)) return false;
    if (q && !((r.message || '').toLowerCase().includes(q) || (r.contact || '').toLowerCase().includes(q))) return false;
    return true;
  });
}

function render() {
  const total = allData.length;
  const avg = total ? allData.reduce((a, b) => a + b.rating, 0) / total : 0;
  const puas = total ? allData.filter((r) => r.rating >= 4).length / total * 100 : 0;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-avg').textContent = avg.toFixed(1);
  document.getElementById('stat-puas').textContent = Math.round(puas) + '%';

  const dist = document.getElementById('dist');
  dist.innerHTML = '';
  for (let s = 5; s >= 1; s--) {
    const c = allData.filter((r) => r.rating === s).length;
    const pct = total ? c / total * 100 : 0;
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3';
    row.innerHTML = `<span class="w-8 text-[13px] font-bold text-[#F28C28]">★${s}</span>
      <div class="flex-1 h-3 rounded-full bar-track overflow-hidden"><div class="h-full bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
      <span class="w-24 text-right text-[12px] text-[#D5C7B8]">${c} (${pct.toFixed(0)}%)</span>`;
    dist.appendChild(row);
  }

  const cats = ['Rasa', 'Pelayanan', 'Kebersihan', 'Harga', 'Suasana'];
  const cb = document.getElementById('cat-breakdown');
  cb.innerHTML = cats.map((c) => {
    const n = allData.filter((r) => (r.categories || []).includes(c)).length;
    return `<span class="px-3 py-1.5 text-[12px] rounded-full bg-[#0A0A0A] border border-[#4A3426]">${esc(c)}: <b>${n}</b></span>`;
  }).join('');

  const list = filtered();
  const box = document.getElementById('reviews');
  box.innerHTML = list.length ? '' : `<p class="text-[13px] text-[#8C7F72] text-center py-6">Belum ada ulasan sesuai filter.</p>`;
  list.slice(0, 200).forEach((r) => {
    const idx = allData.indexOf(r);
    const el = document.createElement('div');
    el.className = 'p-4 rounded-2xl bg-[#18110D] border border-[#4A3426]';
    el.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="text-[#F28C28] font-bold text-[14px]">${stars(r.rating)} <span class="text-white">(${r.rating})</span></span>
        <span class="text-[11px] text-[#8C7F72]">${fmtDate(r.created_at)} · ${esc(r.source || '')}</span>
      </div>
      <div class="flex flex-wrap gap-1.5 my-2">${(r.categories || []).map((c) => `<span class="px-2.5 py-1 text-[11px] rounded-full bg-[#2A1A10] border border-[#F28C28] text-white">${esc(c)}</span>`).join('') || '<span class="text-[11px] text-[#8C7F72]">Tanpa kategori</span>'}</div>
      <p class="text-[13.5px] leading-relaxed">${esc(r.message) || '<i class="text-[#8C7F72]">Tanpa komentar</i>'}</p>
      ${r.contact ? `<p class="text-[12px] text-[#A89C90] mt-2">📞 ${esc(r.contact)}</p>` : ''}
      <div class="mt-3 text-right"><button data-del="${idx}" class="text-[12px] text-red-400 underline underline-offset-2">Hapus ulasan ini</button></div>`;
    box.appendChild(el);
  });
  box.querySelectorAll('[data-del]').forEach((b) => {
    b.addEventListener('click', async () => {
      if (await askDelete('ulasan ini')) {
        const r = allData[parseInt(b.dataset.del, 10)];
        const sb = getClient();
        if (sb && r && r.id) {
          const { error } = await sb.from('feedbacks').delete().eq('id', r.id);
          if (error) { alert('Gagal hapus: ' + error.message); return; }
        } else {
          allData.splice(parseInt(b.dataset.del, 10), 1);
          localStorage.setItem('beta_aus_feedbacks', JSON.stringify(allData));
        }
        loadData();
      }
    });
  });
}

function toCSV(rows) {
  const head = ['created_at', 'rating', 'categories', 'message', 'contact', 'source'];
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  return [head.join(',')].concat(rows.map((r) => [r.created_at, r.rating, (r.categories || []).join('|'), r.message, r.contact, r.source].map(q).join(','))).join('\n');
}

function isLoggedIn() {
  return adminLoggedIn === true;
}

function checkAuth() {
  const st = document.getElementById('auth-status');
  const btnOut = document.getElementById('btn-logout');
  const dash = document.getElementById('dashboard');
  if (isLoggedIn()) {
    st.textContent = 'Login sebagai admin.';
    btnOut.classList.remove('hidden');
    dash.classList.remove('hidden');
    return true;
  }
  st.textContent = 'Belum login — dashboard terkunci.';
  btnOut.classList.add('hidden');
  dash.classList.add('hidden');
  return false;
}

document.getElementById('btn-login').addEventListener('click', () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-pass').value;
  const cfg = window.BETA_CONFIG || {};
  if (email === (cfg.ADMIN_EMAIL || 'admin@beta.aus') && password === (cfg.ADMIN_PASSWORD || 'beta123')) {
    adminLoggedIn = true;
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-pass').value = '';
    if (checkAuth()) loadData();
  } else {
    alert('Login gagal: email/password salah.');
  }
});
document.getElementById('btn-logout').addEventListener('click', async () => {
  const v = await modalShow({ title: 'Keluar dari admin?', desc: 'Masukkan email + password admin untuk konfirmasi logout.', verify: true, okLabel: 'Verifikasi & keluar' });
  if (!v.ok) {
    document.getElementById('auth-status').textContent = 'Verifikasi gagal — logout dibatalkan, Anda tetap login.';
    return;
  }
  adminLoggedIn = false;
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-pass').value = '';
  allData = []; render();
  checkAuth();
  document.getElementById('data-status').textContent = 'Logout — dashboard terkunci.';
});
function modalShow({ title, desc, verify, okLabel }) {
  return new Promise((resolve) => {
    const bd = document.getElementById('modal-backdrop');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-desc').textContent = desc;
    const vf = document.getElementById('modal-verify-fields');
    const em = document.getElementById('modal-email');
    const pw = document.getElementById('modal-pass');
    const btnOk = document.getElementById('modal-ok');
    const btnCancel = document.getElementById('modal-cancel');
    vf.classList.toggle('hidden', !verify);
    vf.classList.toggle('flex', !!verify);
    em.value = ''; pw.value = '';
    btnOk.textContent = okLabel || 'Ya, hapus';
    bd.classList.remove('hidden');
    const done = (v) => {
      bd.classList.add('hidden');
      btnOk.onclick = null; btnCancel.onclick = null;
      resolve(v);
    };
    btnCancel.onclick = () => done(verify ? { ok: false } : false);
    btnOk.onclick = () => {
      if (!verify) return done(true);
      const cfg = window.BETA_CONFIG || {};
      const good = em.value.trim() === (cfg.ADMIN_EMAIL || 'admin@beta.aus') && pw.value === (cfg.ADMIN_PASSWORD || 'beta123');
      done({ ok: good });
    };
    if (verify) setTimeout(() => em.focus(), 50);
  });
}

async function askDelete(label) {
  const sure = await modalShow({ title: 'Hapus ' + label + '?', desc: 'Tindakan ini permanen dan tidak bisa dibatalkan.', verify: false });
  if (!sure) return false;
  const v = await modalShow({ title: 'Verifikasi admin', desc: 'Masukkan email + password admin untuk melanjutkan penghapusan.', verify: true, okLabel: 'Verifikasi & hapus' });
  if (!v.ok) {
    document.getElementById('data-status').textContent = 'Verifikasi gagal — penghapusan dibatalkan. Anda tetap login.';
  }
  return v.ok === true;
}

document.getElementById('btn-refresh').addEventListener('click', loadData);
document.getElementById('btn-wipe').addEventListener('click', async () => {
  if (await askDelete('SEMUA rating')) {
    const sb = getClient();
    if (sb) {
      const { error } = await sb.from('feedbacks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) { alert('Gagal hapus: ' + error.message); return; }
    } else {
      localStorage.removeItem('beta_aus_feedbacks');
    }
    loadData();
  }
});
['filter-rating', 'filter-cat'].forEach((id) => document.getElementById(id).addEventListener('change', render));
document.getElementById('filter-q').addEventListener('input', render);
document.getElementById('btn-csv').addEventListener('click', () => {
  const blob = new Blob([toCSV(filtered())], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'beta-aus-feedback.csv'; a.click();
});

(function init() {
  if (checkAuth()) loadData();
})();
