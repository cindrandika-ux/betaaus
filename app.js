let rating = 0;
const starsEl = document.getElementById('stars');
const starBtns = [...starsEl.querySelectorAll('.star-btn')];
const ratingError = document.getElementById('rating-error');
const form = document.getElementById('feedback-form');
const submitBtn = document.getElementById('submit-btn');
const statusEl = document.getElementById('form-status');

function paintStars(v) {
  starBtns.forEach((b) => {
    const n = parseInt(b.dataset.value, 10);
    const svg = b.querySelector('svg');
    const active = n <= v;
    b.setAttribute('aria-checked', n === rating ? 'true' : 'false');
    if (active) {
      svg.setAttribute('fill', 'currentColor');
      svg.setAttribute('stroke', 'none');
      svg.classList.add('fill-current');
    } else {
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.classList.remove('fill-current');
    }
  });
}

starBtns.forEach((b) => {
  const v = parseInt(b.dataset.value, 10);
  b.addEventListener('click', () => { rating = v; ratingError.classList.add('hidden'); paintStars(rating); });
  b.addEventListener('mouseenter', () => paintStars(v));
});
starsEl.addEventListener('mouseleave', () => paintStars(rating));

document.querySelectorAll('.chip').forEach((c) => {
  c.addEventListener('click', () => {
    const on = c.getAttribute('aria-pressed') === 'true';
    c.setAttribute('aria-pressed', String(!on));
  });
});

function getSupabase() {
  const cfg = window.BETA_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
    if (!getSupabase._c) getSupabase._c = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return getSupabase._c;
  }
  return null;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (rating < 1) { ratingError.classList.remove('hidden'); starsEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  const categories = [...document.querySelectorAll('.chip[aria-pressed="true"]')].map((c) => c.dataset.cat);
  const message = document.getElementById('feedback-text').value.trim();
  const contact = document.getElementById('contact-info').value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = 'Mengirim...';
  statusEl.textContent = 'Mengirim masukan...';

  try {
    const sb = getSupabase();
    if (sb) {
      const { error } = await sb.from('feedbacks').insert({
        rating, categories, message: message || null, contact: contact || null, store: 'BETA.AUS',
      });
      if (error) throw error;
    } else {
      const key = 'beta_aus_feedbacks';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.push({ rating, categories, message: message || null, contact: contact || null, store: 'BETA.AUS', created_at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(arr));
    }
    window.location.href = './terima-kasih.html?rating=' + rating;
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Gagal mengirim. Cek koneksi internet, lalu coba lagi.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Kirim Masukan';
  }
});

paintStars(0);
