// ===== SUPABASE =====
const { createClient } = supabase;
const sb = createClient(
  'https://thrbpelhcgxckgjtzurn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRocmJwZWxoY2d4Y2tnanR6dXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NTg0NzcsImV4cCI6MjA5MzUzNDQ3N30.KIlUHjcOwLs7-1w1TZiR2ADxE_en-9n9qX7jsC5yZ8g'
);

// ===== CONFIG =====
const KATEGORIJE     = ['Vetroturbine', 'OHL', 'TS', 'Kablovi', 'MM'];
const STATUSI        = ['Nije kontaktirano', 'U pregovorima', 'Dogovoreno', 'Pripremanje ugovora', 'Ugovor pripremljen', 'Potpisano'];
const KAT_COLORS     = { Vetroturbine:'#4f8ef7', OHL:'#f472b6', TS:'#f59e0b', Kablovi:'#22c55e', MM:'#38bdf8' };
const KULTURA_TAGS   = ['Njiva', 'Pašnjak', 'Livada', 'Šuma', 'Voćnjak', 'Vinograd', 'Trstik', 'Neplodno', 'Zgrade'];
const VRSTE_ZEMLJISTA = ['Poljoprivredno zemljište', 'Šumsko zemljište', 'Zemljište u građevinskom području', 'Vodno zemljište', 'Neplodno zemljište', 'Ostalo'];

// ===== STATE =====
let allParcele        = [];
let currentPage       = 'dashboard';
let currentUser       = null;
let deleteTargetId    = null;
let timelineParcelaId = null;
let selectedKultura   = new Set();

// ===== DOM =====
const loginScreen    = document.getElementById('login-screen');
const appDiv         = document.getElementById('app');
const loginEmail     = document.getElementById('login-email');
const loginPassword  = document.getElementById('login-password');
const loginBtn       = document.getElementById('login-btn');
const loginError     = document.getElementById('login-error');
const logoutBtn      = document.getElementById('logout-btn');
const userEmailEl    = document.getElementById('user-email');
const modalOverlay   = document.getElementById('modal-overlay');
const modalTitle     = document.getElementById('modal-title');
const modalClose     = document.getElementById('modal-close');
const modalCancel    = document.getElementById('modal-cancel');
const modalSave      = document.getElementById('modal-save');
const modalError     = document.getElementById('modal-error');
const ohlFields      = document.getElementById('ohl-fields');
const vlasniciList   = document.getElementById('vlasnici-list');
const addVlasnikBtn  = document.getElementById('add-vlasnik-btn');
const deleteOverlay  = document.getElementById('delete-overlay');
const deleteCancel   = document.getElementById('delete-cancel');
const deleteConfirm  = document.getElementById('delete-confirm');
const timelineOverlay  = document.getElementById('timeline-overlay');
const timelineClose    = document.getElementById('timeline-close');
const timelineTitle    = document.getElementById('timeline-title');
const timelineSubtitle = document.getElementById('timeline-subtitle');
const timelineList     = document.getElementById('timeline-list');
const timelineEmpty    = document.getElementById('timeline-empty');
const tlDatum          = document.getElementById('tl-datum');
const tlOpis           = document.getElementById('tl-opis');
const tlAddBtn         = document.getElementById('tl-add-btn');
const tlError          = document.getElementById('tl-error');

const fields = {
  id:             document.getElementById('field-id'),
  broj:           document.getElementById('field-broj'),
  ko:             document.getElementById('field-ko'),
  kategorija:     document.getElementById('field-kategorija'),
  status:         document.getElementById('field-status'),
  vrstaZemljista: document.getElementById('field-vrsta-zemljista'),
  povrsina:       document.getElementById('field-povrsina'),
  planirani:      document.getElementById('field-planirani'),
  suma:           document.getElementById('field-suma'),
  napomena:       document.getElementById('field-napomena'),
  brojStuba:      document.getElementById('field-broj-stuba'),
};

// ===== KULTURA TAG PICKER =====
const KULTURA_SA_KLASOM = ['Njiva', 'Pašnjak', 'Livada', 'Šuma', 'Voćnjak', 'Vinograd'];

function parseKultura(str) {
  const result = new Map();
  if (!str) return result;
  str.split(',').forEach(part => {
    part = part.trim();
    if (!part) return;
    const m = part.match(/^(.+?)\s+(\d+)\.\s*klase?$/i);
    if (m) {
      const rawTag = m[1].trim();
      const klasa  = parseInt(m[2]);
      const tag    = KULTURA_TAGS.find(t => t.toLowerCase() === rawTag.toLowerCase()) || rawTag;
      result.set(tag, klasa);
    } else {
      const tag = KULTURA_TAGS.find(t => t.toLowerCase() === part.toLowerCase()) || part;
      result.set(tag, null);
    }
  });
  return result;
}

function renderKulturaPicker(selected = new Map()) {
  selectedKultura = selected instanceof Map ? selected : new Map();
  const container = document.getElementById('kultura-picker');
  if (!container) return;

  function rebuild() {
    container.innerHTML = '';

    // Dugmad za dodavanje (samo neodabrani tagovi)
    const btnRow = document.createElement('div');
    btnRow.className = 'tag-picker-btns';
    KULTURA_TAGS.forEach(tag => {
      if (selectedKultura.has(tag)) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-btn';
      btn.textContent = '+ ' + tag;
      btn.addEventListener('click', () => { selectedKultura.set(tag, null); rebuild(); });
      btnRow.appendChild(btn);
    });
    container.appendChild(btnRow);

    // Odabrani tagovi sa selektorom klase
    if (selectedKultura.size > 0) {
      const selRow = document.createElement('div');
      selRow.className = 'tag-selected-row';
      selectedKultura.forEach((klasa, tag) => {
        const hasKlasa = KULTURA_SA_KLASOM.includes(tag);
        const chip = document.createElement('div');
        chip.className = 'tag-selected-chip';
        chip.innerHTML = `
          <span class="tag-chip-name">${esc(tag)}</span>
          ${hasKlasa ? `<select class="tag-klasa-select">
            <option value="">kl. —</option>
            ${[1,2,3,4,5,6,7,8].map(k => `<option value="${k}"${klasa === k ? ' selected' : ''}>${k}. klase</option>`).join('')}
          </select>` : ''}
          <button type="button" class="btn-remove tag-chip-remove">&times;</button>`;
        if (hasKlasa) {
          chip.querySelector('.tag-klasa-select').addEventListener('change', e => {
            selectedKultura.set(tag, e.target.value ? parseInt(e.target.value) : null);
          });
        }
        chip.querySelector('.tag-chip-remove').addEventListener('click', () => { selectedKultura.delete(tag); rebuild(); });
        selRow.appendChild(chip);
      });
      container.appendChild(selRow);
    }
  }
  rebuild();
}

function getKultura() {
  const parts = [];
  selectedKultura.forEach((klasa, tag) => {
    parts.push(klasa != null ? `${tag} ${klasa}. klase` : tag);
  });
  return parts.join(', ') || null;
}

function kulturaBadges(val) {
  if (!val) return '—';
  return val.split(',').map(k => `<span class="kultura-chip">${esc(k.trim())}</span>`).join('');
}

// ===== AUTH =====
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) { currentUser = session.user; showApp(session.user); }
  else showLogin();
}

function showLogin() { loginScreen.classList.remove('hidden'); appDiv.classList.add('hidden'); }

async function showApp(user) {
  currentUser = user;
  loginScreen.classList.add('hidden');
  appDiv.classList.remove('hidden');
  userEmailEl.textContent = user.email;
  await loadParcele();
  navigateTo('dashboard');
}

loginBtn.addEventListener('click', async () => {
  loginError.classList.add('hidden');
  loginBtn.textContent = 'Prijava...';
  loginBtn.disabled = true;
  const { data, error } = await sb.auth.signInWithPassword({
    email: loginEmail.value.trim(), password: loginPassword.value,
  });
  loginBtn.textContent = 'Prijavi se';
  loginBtn.disabled = false;
  if (error) { loginError.textContent = 'Pogrešan email ili lozinka.'; loginError.classList.remove('hidden'); }
  else showApp(data.user);
});

loginPassword.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });
logoutBtn.addEventListener('click', async () => { await sb.auth.signOut(); showLogin(); });

// ===== NAVIGATION =====
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
});

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.remove('hidden');
  if (page === 'dashboard') renderDashboard();
  else renderKatPage(page);
}

// ===== LOAD DATA =====
async function loadParcele() {
  const { data, error } = await sb
    .from('parcele')
    .select('*, vlasnici(*)')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  allParcele = data || [];
  updateBadges();
}

function updateBadges() {
  KATEGORIJE.forEach(k => {
    const el = document.getElementById('badge-' + k);
    if (el) el.textContent = allParcele.filter(p => p.kategorija === k).length;
  });
}

// ===== DASHBOARD =====
function renderDashboard() {
  const total = allParcele.length;
  const pot   = allParcele.filter(p => p.status === 'Potpisano').length;
  const suma  = allParcele.reduce((s, p) => s + (p.dogovorena_suma_eur || 0), 0);

  document.getElementById('stat-ukupno').textContent    = total;
  document.getElementById('stat-potpisano').textContent = `${pot} / ${total}`;
  document.getElementById('stat-suma').textContent      = formatEUR(suma);

  const sc = {}; STATUSI.forEach(s => sc[s] = 0);
  allParcele.forEach(p => { if (sc[p.status] !== undefined) sc[p.status]++; });
  renderBars('status-bars', STATUSI, sc, total);

  const kc = {}; KATEGORIJE.forEach(k => kc[k] = 0);
  allParcele.forEach(p => { if (kc[p.kategorija] !== undefined) kc[p.kategorija]++; });
  renderBars('kategorija-bars', KATEGORIJE, kc, total);

  const grid = document.getElementById('kat-summary-grid');
  grid.innerHTML = '';
  KATEGORIJE.forEach(kat => {
    const p     = allParcele.filter(x => x.kategorija === kat);
    const s     = p.reduce((a, x) => a + (x.dogovorena_suma_eur || 0), 0);
    const color = KAT_COLORS[kat];
    const card  = document.createElement('div');
    card.className = 'kat-card';
    card.style.borderTopColor = color;
    card.innerHTML = `
      <div class="kat-card-name" style="color:${color}">${kat}</div>
      <div class="kat-card-row"><span>Parcela</span><span>${p.length}</span></div>
      <div class="kat-card-row"><span>Potpisano</span><span>${p.filter(x=>x.status==='Potpisano').length} / ${p.length}</span></div>
      <div class="kat-card-row"><span>Suma</span><span>${s > 0 ? formatEUR(s) : '—'}</span></div>`;
    card.addEventListener('click', () => navigateTo(kat));
    grid.appendChild(card);
  });
}

function renderBars(containerId, labels, counts, total) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  labels.forEach(label => {
    const count = counts[label] || 0;
    const pct   = total > 0 ? (count / total * 100).toFixed(1) : 0;
    const slug  = label.replace(/\s+/g, '-');
    container.innerHTML += `
      <div class="bar-row">
        <span class="bar-label" title="${label}">${label}</span>
        <div class="bar-track"><div class="bar-fill bar-${slug}" style="width:${pct}%"></div></div>
        <span class="bar-count">${count}</span>
      </div>`;
  });
}

// ===== CATEGORY PAGE =====
let katTimelineParcelaId = null;

function renderKatPage(kat) {
  katTimelineParcelaId = null;
  const container = document.getElementById('page-' + kat);
  if (!container) return;
  const color = KAT_COLORS[kat];
  const isOHL = kat === 'OHL';

  container.innerHTML = `
    <div class="kat-page-layout">
      <div class="kat-main">
        <div class="page-header">
          <div class="page-header-left">
            <div class="kat-dot" style="background:${color}"></div>
            <h1>${kat}</h1>
          </div>
          <button class="btn btn-primary" id="add-btn-${kat}">+ Dodaj parcelu</button>
        </div>
        <div class="kat-stats-grid" style="margin-bottom:14px">
          <div class="stat-card">
            <div class="stat-label">Ukupno parcela</div>
            <div class="stat-value" id="ks-ukupno-${kat}">—</div>
          </div>
          <div class="stat-card accent-green">
            <div class="stat-label">Potpisano</div>
            <div class="stat-value" id="ks-potpisano-${kat}">—</div>
          </div>
          <div class="stat-card" style="border-left-color:#a78bfa">
            <div class="stat-label">Planirani iznos</div>
            <div class="stat-value" id="ks-planirani-${kat}">—</div>
          </div>
          <div class="stat-card accent-blue">
            <div class="stat-label">Dogovoreni iznos</div>
            <div class="stat-value" id="ks-suma-${kat}">—</div>
          </div>
        </div>
        <div class="breakdown-card" style="margin-bottom:20px">
          <h3>Status</h3>
          <div id="ks-bars-${kat}"></div>
        </div>
        <div class="filters">
          <input type="text" class="filter-input" id="fs-${kat}" placeholder="Pretraži (parcela, KO, vlasnik...)" />
          <select class="filter-select" id="fstat-${kat}">
            <option value="">Svi statusi</option>
            ${STATUSI.map(s => `<option>${s}</option>`).join('')}
          </select>
          <select class="filter-select" id="fvrsta-${kat}">
            <option value="">Sve vrste zemljišta</option>
            ${VRSTE_ZEMLJISTA.map(v => `<option>${v}</option>`).join('')}
          </select>
          <select class="filter-select" id="fkultura-${kat}">
            <option value="">Sve kulture</option>
            ${KULTURA_TAGS.map(k => `<option>${k}</option>`).join('')}
          </select>
          ${isOHL ? `<select class="filter-select" id="ftip-${kat}">
            <option value="">Svi tipovi stuba</option>
            <option value="Noseći">Noseći</option>
            <option value="Ugaoni">Ugaoni</option>
          </select>` : ''}
          <select class="filter-select" id="fvrsta-prava-${kat}">
            <option value="">Sve vrste prava</option>
            <option value="Pravo svojine">Pravo svojine</option>
            <option value="Pravo korišćenja">Pravo korišćenja</option>
          </select>
          <select class="filter-select" id="foblik-${kat}">
            <option value="">Svi oblici svojine</option>
            <option value="Privatna">Privatna</option>
            <option value="Državina">Državina</option>
            <option value="Javna">Javna</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                ${isOHL ? '<th>Br. stuba</th>' : ''}
                <th>Parcela</th>
                <th>KO</th>
                <th>Vlasnici</th>
                <th>Oblik svojine</th>
                <th>Vrsta zem.</th>
                <th>Kultura</th>
                ${isOHL ? '<th>Tip stuba</th>' : ''}
                <th>Planirani iznos</th>
                <th>Dogovoreni iznos</th>
                <th>Status</th>
                <th>Napomena</th>
                <th>Dinamika</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="tbody-${kat}"></tbody>
          </table>
          <div id="nores-${kat}" class="no-results hidden">Nema parcela za prikaz.</div>
        </div>
      </div>

      <!-- TIMELINE SIDE PANEL -->
      <aside class="kat-timeline-panel" id="ktp-${kat}">
        <div class="ktp-empty" id="ktp-empty-${kat}">
          <div class="ktp-empty-icon">⏱</div>
          <p>Istorija parcele</p>
          <span class="ktp-empty-hint">Odaberi "Istorija" iz menija u tabeli</span>
        </div>
        <div class="hidden" id="ktp-content-${kat}">
          <div class="ktp-header">
            <div class="ktp-title" id="ktp-title-${kat}"></div>
            <button class="ktp-close-btn" onclick="closeKatTimeline('${kat}')">×</button>
          </div>
          <div class="ktp-add">
            <div class="form-row">
              <div class="form-group" style="max-width:130px">
                <label>Datum</label>
                <input type="date" id="ktp-datum-${kat}" />
              </div>
              <div class="form-group">
                <label>Događaj</label>
                <input type="text" id="ktp-opis-${kat}" placeholder="Opis..." />
              </div>
            </div>
            <button class="btn btn-primary btn-sm" style="width:100%;margin-top:2px" id="ktp-add-btn-${kat}">+ Dodaj unos</button>
            <p id="ktp-error-${kat}" class="error-msg hidden"></p>
          </div>
          <div class="ktp-list" id="ktp-list-${kat}"></div>
          <div class="ktp-list-empty hidden" id="ktp-list-empty-${kat}">Nema unosa — dodaj prvi iznad.</div>
        </div>
      </aside>
    </div>`;

  document.getElementById(`add-btn-${kat}`).addEventListener('click', () => openAdd(kat));
  document.getElementById(`fs-${kat}`).addEventListener('input', () => renderKatTable(kat));
  document.getElementById(`fstat-${kat}`).addEventListener('change', () => renderKatTable(kat));
  document.getElementById(`fvrsta-${kat}`).addEventListener('change', () => renderKatTable(kat));
  document.getElementById(`fkultura-${kat}`).addEventListener('change', () => renderKatTable(kat));
  if (isOHL) document.getElementById(`ftip-${kat}`).addEventListener('change', () => renderKatTable(kat));
  document.getElementById(`fvrsta-prava-${kat}`).addEventListener('change', () => renderKatTable(kat));
  document.getElementById(`foblik-${kat}`).addEventListener('change', () => renderKatTable(kat));
  document.getElementById(`ktp-add-btn-${kat}`).addEventListener('click', () => addKatTimelineEntry(kat));
  document.getElementById(`ktp-opis-${kat}`).addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById(`ktp-add-btn-${kat}`).click();
  });

  renderKatStats(kat);
  renderKatTable(kat);
}

function renderKatStats(kat) {
  const parcele   = allParcele.filter(p => p.kategorija === kat);
  const total     = parcele.length;
  const pot       = parcele.filter(p => p.status === 'Potpisano').length;
  const suma      = parcele.reduce((s, p) => s + (p.dogovorena_suma_eur || 0), 0);
  const planirani = parcele.reduce((s, p) => s + (p.planirani_iznos_eur || 0), 0);
  const el = id => document.getElementById(id);

  if (el(`ks-ukupno-${kat}`))    el(`ks-ukupno-${kat}`).textContent    = total;
  if (el(`ks-planirani-${kat}`)) el(`ks-planirani-${kat}`).textContent = planirani > 0 ? formatEUR(planirani) : '—';
  if (el(`ks-suma-${kat}`))      el(`ks-suma-${kat}`).textContent      = suma > 0 ? formatEUR(suma) : '—';

  if (kat === 'OHL') {
    // Group by stub, status per stub = least advanced parcel in that stub
    const stubMap = {};
    parcele.forEach(p => {
      const key = p.broj_stuba || '—';
      if (!stubMap[key]) stubMap[key] = [];
      stubMap[key].push(p);
    });
    const stubKeys   = Object.keys(stubMap);
    const stubTotal  = stubKeys.length;
    const stubPot    = Object.values(stubMap).filter(items => items.every(p => p.status === 'Potpisano')).length;

    if (el(`ks-potpisano-${kat}`)) el(`ks-potpisano-${kat}`).textContent = `${stubPot} / ${stubTotal} stubova`;

    const sc = {}; STATUSI.forEach(s => sc[s] = 0);
    Object.values(stubMap).forEach(items => {
      const minIdx = Math.min(...items.map(p => STATUSI.indexOf(p.status)).filter(i => i >= 0));
      const status = STATUSI[isFinite(minIdx) ? minIdx : 0];
      if (sc[status] !== undefined) sc[status]++;
    });
    renderBars(`ks-bars-${kat}`, STATUSI, sc, stubTotal);
  } else {
    if (el(`ks-potpisano-${kat}`)) el(`ks-potpisano-${kat}`).textContent = `${pot} / ${total}`;
    const sc = {}; STATUSI.forEach(s => sc[s] = 0);
    parcele.forEach(p => { if (sc[p.status] !== undefined) sc[p.status]++; });
    renderBars(`ks-bars-${kat}`, STATUSI, sc, total);
  }
}

function renderKatTable(kat) {
  const search        = (document.getElementById(`fs-${kat}`)?.value || '').toLowerCase();
  const statFilt      = document.getElementById(`fstat-${kat}`)?.value || '';
  const vrstaFilt     = document.getElementById(`fvrsta-${kat}`)?.value || '';
  const kulturaFilt   = document.getElementById(`fkultura-${kat}`)?.value || '';
  const tipFilt       = document.getElementById(`ftip-${kat}`)?.value || '';
  const vrstaPravaFilt = document.getElementById(`fvrsta-prava-${kat}`)?.value || '';
  const oblikFilt     = document.getElementById(`foblik-${kat}`)?.value || '';
  const isOHL       = kat === 'OHL';

  const filtered = allParcele
    .filter(p => p.kategorija === kat)
    .filter(p => {
      const vlasnikIme = (p.vlasnici || []).map(v => v.ime).join(' ');
      const matchSearch  = !search || [p.broj_parcele, p.ko, vlasnikIme, p.napomena, p.vrsta_zemljista, p.kultura, p.broj_stuba]
        .some(v => v && v.toLowerCase().includes(search));
      const matchStat    = !statFilt    || p.status === statFilt;
      const matchVrsta   = !vrstaFilt   || p.vrsta_zemljista === vrstaFilt;
      const matchKultura = !kulturaFilt || (p.kultura && p.kultura.toLowerCase().includes(kulturaFilt.toLowerCase()));
      const matchTip        = !tipFilt        || p.tip_stuba === tipFilt;
      const matchVrstaPrava = !vrstaPravaFilt || (p.vlasnici || []).some(v => v.vrsta_prava === vrstaPravaFilt);
      const matchOblik      = !oblikFilt      || (p.vlasnici || []).some(v => v.oblik_svojine === oblikFilt);
      return matchSearch && matchStat && matchVrsta && matchKultura && matchTip && matchVrstaPrava && matchOblik;
    })
    .sort((a, b) => isOHL
      ? (a.broj_stuba || '').localeCompare(b.broj_stuba || '', undefined, { numeric: true, sensitivity: 'base' })
      : 0
    );

  const tbody = document.getElementById(`tbody-${kat}`);
  const nores = document.getElementById(`nores-${kat}`);
  if (!tbody) return;

  tbody.innerHTML = '';
  if (filtered.length === 0) { nores.classList.remove('hidden'); return; }
  nores.classList.add('hidden');

  // For OHL: group consecutive rows by broj_stuba so stubs with multiple parcels use rowspan
  const groups = isOHL ? [] : null;
  if (isOHL) {
    filtered.forEach(p => {
      const last = groups[groups.length - 1];
      if (last && last.stub === p.broj_stuba) last.items.push(p);
      else groups.push({ stub: p.broj_stuba, items: [p] });
    });
  }

  const renderRow = (p, { stubTd = null, isGroupChild = false, isGroupStart = false, planTd = null, sumaTd = null, statusTd = null, skipPlan = false, skipSuma = false, skipStatus = false } = {}) => {
    const vlasnikHtml = (p.vlasnici || []).length
      ? p.vlasnici.map(v => `<span class="owner-tag" title="${esc(v.kontakt || '')}">${esc(v.ime)}</span>`).join('')
      : '—';

    const tr = document.createElement('tr');
    tr.dataset.id = p.id;
    if (p.id === katTimelineParcelaId) tr.classList.add('tr-selected');
    if (isGroupStart) tr.classList.add('stub-group-start');
    if (isGroupChild) tr.classList.add('stub-group-child');
    if ((p.vlasnici || []).some(v => v.oblik_svojine === 'Državina' || v.oblik_svojine === 'Javna')) tr.classList.add('tr-drzalac');

    const mkTd = (content, cls = '') => {
      const td = document.createElement('td');
      if (cls) td.className = cls;
      td.innerHTML = content;
      return td;
    };

    // Stub number cell — either the rowspan cell passed in, or a normal cell for non-OHL
    if (isOHL) {
      if (stubTd) tr.appendChild(stubTd);
      // child rows skip this cell (rowspan covers them)
    }

    const tdBroj = mkTd(esc(p.broj_parcele));
    setupInlineEdit(tdBroj, p.id, 'broj_parcele', p.broj_parcele, 'text');
    tr.appendChild(tdBroj);

    const tdKo = mkTd(esc(p.ko));
    setupInlineEdit(tdKo, p.id, 'ko', p.ko, 'text');
    tr.appendChild(tdKo);

    tr.appendChild(mkTd(vlasnikHtml, 'td-vlasnici'));

    const obliciHtml = (p.vlasnici || []).length
      ? [...new Set((p.vlasnici).map(v => v.oblik_svojine).filter(Boolean))]
          .map(o => `<span class="owner-tag">${esc(o)}</span>`).join('') || '—'
      : '—';
    tr.appendChild(mkTd(obliciHtml));

    const tdVrsta = mkTd(esc(p.vrsta_zemljista || '—'));
    setupInlineEdit(tdVrsta, p.id, 'vrsta_zemljista', p.vrsta_zemljista, 'select-vrsta');
    tr.appendChild(tdVrsta);

    tr.appendChild(mkTd(kulturaBadges(p.kultura)));

    if (isOHL) {
      const tdTip = mkTd(tipStubaBadge(p.tip_stuba));
      setupInlineEdit(tdTip, p.id, 'tip_stuba', p.tip_stuba, 'select-stub');
      tr.appendChild(tdTip);
    }

    if (!skipPlan) {
      if (planTd) {
        tr.appendChild(planTd);
      } else {
        const td = mkTd(p.planirani_iznos_eur != null ? formatEUR(p.planirani_iznos_eur) : '—');
        setupInlineEdit(td, p.id, 'planirani_iznos_eur', p.planirani_iznos_eur, 'number');
        tr.appendChild(td);
      }
    }

    if (!skipSuma) {
      if (sumaTd) {
        tr.appendChild(sumaTd);
      } else {
        const td = mkTd(p.dogovorena_suma_eur != null ? formatEUR(p.dogovorena_suma_eur) : '—');
        setupInlineEdit(td, p.id, 'dogovorena_suma_eur', p.dogovorena_suma_eur, 'number');
        tr.appendChild(td);
      }
    }

    if (!skipStatus) {
      if (statusTd) {
        tr.appendChild(statusTd);
      } else {
        const tdStatus = mkTd(statusBadge(p.status));
        setupInlineEdit(tdStatus, p.id, 'status', p.status, 'select-status');
        tr.appendChild(tdStatus);
      }
    }

    const tdNap = mkTd(esc(p.napomena || ''));
    setupInlineEdit(tdNap, p.id, 'napomena', p.napomena, 'text');
    tr.appendChild(tdNap);

    const tdDinamika = mkTd(`
      <button class="btn btn-ghost btn-sm btn-icon" onclick="showKatTimeline('${p.id}')">Dinamika</button>`);
    tr.appendChild(tdDinamika);

    const tdAct = mkTd(`
      <div class="action-menu">
        <button class="action-trigger" onclick="event.stopPropagation();toggleActionMenu(this)">&#8943;</button>
        <div class="action-dropdown">
          <button onclick="openEdit('${p.id}')">&#9998; Uredi</button>
          <hr class="act-divider"/>
          <button class="act-danger" onclick="openDelete('${p.id}')">&#10005; Obriši</button>
        </div>
      </div>`);
    tr.appendChild(tdAct);

    tbody.appendChild(tr);
  };

  if (isOHL) {
    const getOwnerKey = p => (p.vlasnici || []).map(v => v.ime).sort().join('|');

    groups.forEach((group, gi) => {
      const stubTd = document.createElement('td');
      stubTd.rowSpan = group.items.length;
      stubTd.className = 'stub-cell' + (group.items.length > 1 ? ' stub-cell-multi' : '');
      const firstP = group.items[0];
      const mailLink = firstP.link_mejla;
      stubTd.innerHTML = `
        <strong>${esc(group.stub || '—')}</strong>
        <div class="stub-mail-row">
          ${mailLink
            ? `<a class="stub-mail-link" href="${esc(mailLink)}" target="_blank" rel="noopener" title="Otvori Outlook thread">✉</a>
               <button class="stub-mail-edit" onclick="event.stopPropagation();editStubMailLink(this,'${firstP.id}')" title="Izmeni link">✎</button>`
            : `<button class="stub-mail-add" onclick="event.stopPropagation();editStubMailLink(this,'${firstP.id}')" title="Dodaj link ka mejlu">+ ✉</button>`
          }
        </div>`;

      // Check if all parcels in this group have the same owners
      const sameOwners = group.items.length > 1 &&
        group.items.every(p => getOwnerKey(p) === getOwnerKey(group.items[0]));

      let sharedPlanTd = null, sharedSumaTd = null, sharedStatusTd = null;
      if (sameOwners) {
        const totalPlan = group.items.reduce((s, p) => s + (p.planirani_iznos_eur || 0), 0);
        const totalSuma = group.items.reduce((s, p) => s + (p.dogovorena_suma_eur || 0), 0);

        sharedPlanTd = document.createElement('td');
        sharedPlanTd.rowSpan = group.items.length;
        sharedPlanTd.className = 'shared-amount-cell';
        sharedPlanTd.innerHTML = totalPlan > 0 ? formatEUR(totalPlan) : '—';
        setupSharedAmountEdit(sharedPlanTd, group.items, 'planirani_iznos_eur', totalPlan);

        sharedSumaTd = document.createElement('td');
        sharedSumaTd.rowSpan = group.items.length;
        sharedSumaTd.className = 'shared-amount-cell';
        sharedSumaTd.innerHTML = totalSuma > 0 ? formatEUR(totalSuma) : '—';
        setupSharedAmountEdit(sharedSumaTd, group.items, 'dogovorena_suma_eur', totalSuma);

        // Shared status — use the least advanced status in the group
        const minIdx = Math.min(...group.items.map(p => STATUSI.indexOf(p.status)).filter(i => i >= 0));
        const groupStatus = STATUSI[isFinite(minIdx) ? minIdx : 0];
        sharedStatusTd = document.createElement('td');
        sharedStatusTd.rowSpan = group.items.length;
        sharedStatusTd.innerHTML = statusBadge(groupStatus);
        setupSharedStatusEdit(sharedStatusTd, group.items, groupStatus);
      }

      group.items.forEach((p, idx) => {
        renderRow(p, {
          stubTd:      idx === 0 ? stubTd : null,
          isGroupChild: idx > 0,
          isGroupStart: gi > 0 && idx === 0,
          planTd:      sameOwners && idx === 0 ? sharedPlanTd : null,
          sumaTd:      sameOwners && idx === 0 ? sharedSumaTd : null,
          statusTd:    sameOwners && idx === 0 ? sharedStatusTd : null,
          skipPlan:    sameOwners && idx > 0,
          skipSuma:    sameOwners && idx > 0,
          skipStatus:  sameOwners && idx > 0,
        });
      });
    });
  } else {
    filtered.forEach(p => renderRow(p));
  }
}

function setupInlineEdit(td, parcelaId, field, value, type) {
  td.classList.add('editable-cell');
  td.addEventListener('click', e => {
    if (td.querySelector('.inline-edit-el')) return;
    e.stopPropagation();
    const origHtml = td.innerHTML;
    let el;

    if (type === 'select-status') {
      el = document.createElement('select');
      el.className = 'inline-edit-el';
      STATUSI.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s;
        if (s === value) opt.selected = true;
        el.appendChild(opt);
      });
    } else if (type === 'select-vrsta') {
      el = document.createElement('select');
      el.className = 'inline-edit-el';
      const empty = document.createElement('option');
      empty.value = ''; empty.textContent = '— izaberi —';
      el.appendChild(empty);
      VRSTE_ZEMLJISTA.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s;
        if (s === value) opt.selected = true;
        el.appendChild(opt);
      });
    } else if (type === 'select-stub') {
      el = document.createElement('select');
      el.className = 'inline-edit-el';
      [['', 'Nije određeno'], ['Noseći', 'Noseći'], ['Ugaoni', 'Ugaoni']].forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val; opt.textContent = label;
        if (val === (value || '')) opt.selected = true;
        el.appendChild(opt);
      });
    } else if (type === 'number') {
      el = document.createElement('input');
      el.type = 'number'; el.min = '0'; el.step = '0.01';
      el.className = 'inline-edit-el';
      el.value = value != null ? value : '';
    } else {
      el = document.createElement('input');
      el.type = 'text';
      el.className = 'inline-edit-el';
      el.value = value != null ? value : '';
    }

    td.innerHTML = '';
    td.appendChild(el);
    el.focus();
    if (el.tagName === 'INPUT' && el.select) el.select();

    async function save() {
      let newVal;
      if (type === 'number') {
        newVal = el.value !== '' ? parseFloat(el.value) : null;
      } else if (type.startsWith('select-')) {
        newVal = el.value || null;
      } else {
        newVal = el.value.trim() || null;
      }
      const unchanged = (newVal === value) || (newVal === null && value == null) || (newVal === null && value === '');
      if (unchanged) { td.innerHTML = origHtml; return; }
      const { error } = await sb.from('parcele').update({ [field]: newVal }).eq('id', parcelaId);
      if (error) { console.error(error); td.innerHTML = origHtml; return; }
      await loadParcele();
      renderKatStats(currentPage);
      renderKatTable(currentPage);
    }

    function cancel() { td.innerHTML = origHtml; }

    if (type.startsWith('select-')) {
      let acted = false;
      el.addEventListener('change', () => { acted = true; save(); });
      el.addEventListener('keydown', e => { if (e.key === 'Escape') { acted = true; cancel(); } });
      el.addEventListener('blur', () => { if (!acted) cancel(); });
    } else {
      el.addEventListener('blur', save);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') el.blur();
        if (e.key === 'Escape') { el.removeEventListener('blur', save); cancel(); }
      });
    }
  });
}

// ===== KAT TIMELINE SIDE PANEL =====
async function showKatTimeline(parcelaId) {
  const kat = currentPage;
  katTimelineParcelaId = parcelaId;

  const parcela = allParcele.find(p => p.id === parcelaId);
  if (!parcela) return;

  // Swap empty ↔ content
  document.getElementById(`ktp-empty-${kat}`)?.classList.add('hidden');
  const content = document.getElementById(`ktp-content-${kat}`);
  content?.classList.remove('hidden');

  // Header
  const titleEl = document.getElementById(`ktp-title-${kat}`);
  if (titleEl) titleEl.innerHTML = `
    <strong>${esc(parcela.broj_parcele)}</strong>
    <span class="ktp-subtitle">${esc(parcela.ko)} — ${esc(parcela.kategorija)}</span>`;

  // Default date, clear opis
  const datumEl = document.getElementById(`ktp-datum-${kat}`);
  if (datumEl && !datumEl.value) datumEl.value = new Date().toISOString().split('T')[0];
  const opisEl = document.getElementById(`ktp-opis-${kat}`);
  if (opisEl) opisEl.value = '';

  // Highlight row
  document.querySelectorAll(`#tbody-${kat} tr`).forEach(tr => tr.classList.remove('tr-selected'));
  document.querySelector(`#tbody-${kat} tr[data-id="${parcelaId}"]`)?.classList.add('tr-selected');

  await renderKatTimelineList(kat, parcelaId);
}

async function renderKatTimelineList(kat, parcelaId) {
  const { data, error } = await sb
    .from('parcela_timeline')
    .select('*')
    .eq('parcela_id', parcelaId)
    .order('datum', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return; }

  const list  = document.getElementById(`ktp-list-${kat}`);
  const empty = document.getElementById(`ktp-list-empty-${kat}`);
  if (!list) return;

  list.innerHTML = '';

  if (!data || data.length === 0) {
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  data.forEach(item => {
    const div = document.createElement('div');
    div.className = 'tl-item';
    div.innerHTML = `
      <div class="tl-line">
        <div class="tl-dot"></div>
        <div class="tl-connector"></div>
      </div>
      <div class="tl-content">
        <div class="tl-date">${formatDate(item.datum)}</div>
        <div class="tl-opis">${esc(item.opis)}</div>
        ${item.kreirao ? `<div class="tl-meta">${esc(item.kreirao)}</div>` : ''}
      </div>
      <button class="tl-delete" onclick="deleteKatTimelineItem('${item.id}')" title="Obriši">&times;</button>`;
    list.appendChild(div);
  });
}

async function addKatTimelineEntry(kat) {
  const errorEl = document.getElementById(`ktp-error-${kat}`);
  errorEl.classList.add('hidden');

  const datum = document.getElementById(`ktp-datum-${kat}`).value;
  const opis  = document.getElementById(`ktp-opis-${kat}`).value.trim();

  if (!datum || !opis) {
    errorEl.textContent = 'Datum i opis su obavezni.';
    errorEl.classList.remove('hidden');
    return;
  }

  const addBtn = document.getElementById(`ktp-add-btn-${kat}`);
  addBtn.disabled = true;
  addBtn.textContent = 'Dodajem...';

  const { error } = await sb.from('parcela_timeline').insert({
    parcela_id: katTimelineParcelaId,
    datum,
    opis,
    kreirao: currentUser?.email || null,
  });

  addBtn.disabled = false;
  addBtn.textContent = '+ Dodaj unos';

  if (error) {
    errorEl.textContent = 'Greška: ' + error.message;
    errorEl.classList.remove('hidden');
    return;
  }

  document.getElementById(`ktp-opis-${kat}`).value = '';
  await renderKatTimelineList(kat, katTimelineParcelaId);
}

async function deleteKatTimelineItem(id) {
  await sb.from('parcela_timeline').delete().eq('id', id);
  await renderKatTimelineList(currentPage, katTimelineParcelaId);
}

function closeKatTimeline(kat) {
  katTimelineParcelaId = null;
  document.getElementById(`ktp-empty-${kat}`)?.classList.remove('hidden');
  document.getElementById(`ktp-content-${kat}`)?.classList.add('hidden');
  document.querySelectorAll(`#tbody-${kat} tr`).forEach(tr => tr.classList.remove('tr-selected'));
}

function editStubMailLink(btn, parcelaId) {
  const row = btn.closest('.stub-mail-row');
  const origHtml = row.innerHTML;
  const parcela = allParcele.find(p => p.id === parcelaId);
  const current = parcela?.link_mejla || '';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-edit-el stub-mail-input';
  input.placeholder = 'https://outlook.office.com/mail/...';
  input.value = current;

  row.innerHTML = '';
  row.appendChild(input);
  input.focus();

  async function save() {
    const val = input.value.trim() || null;
    const { error } = await sb.from('parcele').update({ link_mejla: val }).eq('id', parcelaId);
    if (error) { console.error(error); row.innerHTML = origHtml; return; }
    await loadParcele();
    renderKatStats(currentPage);
    renderKatTable(currentPage);
  }

  function cancel() { row.innerHTML = origHtml; }

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.removeEventListener('blur', save); cancel(); }
  });
}

function setupSharedAmountEdit(td, groupItems, field, currentTotal) {
  td.classList.add('editable-cell');
  td.addEventListener('click', e => {
    if (td.querySelector('.inline-edit-el')) return;
    e.stopPropagation();
    const origHtml = td.innerHTML;

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.className = 'inline-edit-el';
    input.value = currentTotal > 0 ? currentTotal : '';

    td.innerHTML = '';
    td.appendChild(input);
    input.focus();
    input.select();

    async function save() {
      const newTotal = input.value !== '' ? parseFloat(input.value) : null;
      // Store full amount on first parcel, null on the rest
      for (let i = 0; i < groupItems.length; i++) {
        await sb.from('parcele')
          .update({ [field]: i === 0 ? newTotal : null })
          .eq('id', groupItems[i].id);
      }
      await loadParcele();
      renderKatStats(currentPage);
      renderKatTable(currentPage);
    }

    function cancel() { td.innerHTML = origHtml; }

    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.removeEventListener('blur', save); cancel(); }
    });
  });
}

function setupSharedStatusEdit(td, groupItems, currentStatus) {
  td.classList.add('editable-cell');
  td.addEventListener('click', e => {
    if (td.querySelector('.inline-edit-el')) return;
    e.stopPropagation();
    const origHtml = td.innerHTML;

    const el = document.createElement('select');
    el.className = 'inline-edit-el';
    STATUSI.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      if (s === currentStatus) opt.selected = true;
      el.appendChild(opt);
    });

    td.innerHTML = '';
    td.appendChild(el);
    el.focus();

    async function save() {
      const newStatus = el.value;
      for (const p of groupItems) {
        await sb.from('parcele').update({ status: newStatus }).eq('id', p.id);
      }
      await loadParcele();
      renderKatStats(currentPage);
      renderKatTable(currentPage);
    }

    function cancel() { td.innerHTML = origHtml; }

    let acted = false;
    el.addEventListener('change', () => { acted = true; save(); });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') { acted = true; cancel(); } });
    el.addEventListener('blur', () => { if (!acted) cancel(); });
  });
}

// ===== OHL TOGGLE =====
fields.kategorija.addEventListener('change', () => {
  ohlFields.classList.toggle('hidden', fields.kategorija.value !== 'OHL');
});

function getTipStuba() {
  const checked = document.querySelector('input[name="tip_stuba"]:checked');
  return checked ? checked.value || null : null;
}

function setTipStuba(val) {
  const target = document.querySelector(`input[name="tip_stuba"][value="${val || ''}"]`);
  if (target) target.checked = true;
  else document.querySelector('input[name="tip_stuba"][value=""]').checked = true;
}

// ===== VLASNICI UI =====
function getVlasnici() {
  return Array.from(vlasniciList.querySelectorAll('.vlasnik-row')).map(row => ({
    ime:           row.querySelector('.v-ime').value.trim(),
    kontakt:       row.querySelector('.v-kontakt').value.trim() || null,
    vrsta_prava:   row.querySelector('.v-vrsta-prava').value || null,
    oblik_svojine: row.querySelector('.v-oblik-svojine').value || null,
    udeo:          row.querySelector('.v-udeo').value.trim() || null,
  })).filter(v => v.ime !== '');
}

function addVlasnikRow(ime = '', kontakt = '', vrsta_prava = '', oblik_svojine = '', udeo = '') {
  const row = document.createElement('div');
  row.className = 'vlasnik-row';
  row.innerHTML = `
    <div class="vlasnik-row-top">
      <input type="text" class="v-ime" placeholder="Ime i prezime" value="${esc(ime)}" />
      <input type="text" class="v-kontakt" placeholder="Telefon / email" value="${esc(kontakt)}" />
      <input type="text" class="v-udeo" placeholder="Udeo (npr. 1/2)" value="${esc(udeo)}" style="max-width:110px" />
      <button type="button" class="btn-remove" title="Ukloni">&times;</button>
    </div>
    <div class="vlasnik-row-bot">
      <select class="v-vrsta-prava">
        <option value="">— Vrsta prava —</option>
        <option ${vrsta_prava === 'Pravo svojine' ? 'selected' : ''}>Pravo svojine</option>
        <option ${vrsta_prava === 'Pravo korišćenja' ? 'selected' : ''}>Pravo korišćenja</option>
      </select>
      <select class="v-oblik-svojine">
        <option value="">— Oblik svojine —</option>
        <option ${oblik_svojine === 'Privatna' ? 'selected' : ''}>Privatna</option>
        <option ${oblik_svojine === 'Državina' ? 'selected' : ''}>Državina</option>
        <option ${oblik_svojine === 'Javna' ? 'selected' : ''}>Javna</option>
      </select>
    </div>`;
  row.querySelector('.btn-remove').addEventListener('click', () => {
    row.remove();
    updateVlasnikPlaceholder();
  });
  vlasniciList.appendChild(row);
  updateVlasnikPlaceholder();
}

function updateVlasnikPlaceholder() {
  const empty  = vlasniciList.querySelector('.vlasnici-empty');
  const hasRows = vlasniciList.querySelectorAll('.vlasnik-row').length > 0;
  if (hasRows && empty) empty.remove();
  if (!hasRows && !empty) {
    const p = document.createElement('p');
    p.className = 'vlasnici-empty';
    p.textContent = 'Nema vlasnika — klikni "+ Dodaj vlasnika"';
    vlasniciList.appendChild(p);
  }
}

addVlasnikBtn.addEventListener('click', () => addVlasnikRow());

// ===== MODAL: ADD =====
function openAdd(kat) {
  modalTitle.textContent = 'Dodaj parcelu';
  clearForm();
  if (kat) {
    fields.kategorija.value = kat;
    ohlFields.classList.toggle('hidden', kat !== 'OHL');
  }
  modalError.classList.add('hidden');
  modalOverlay.classList.remove('hidden');
}

// ===== MODAL: EDIT =====
function openEdit(id) {
  const p = allParcele.find(x => x.id === id);
  if (!p) return;
  modalTitle.textContent       = 'Uredi parcelu';
  fields.id.value              = p.id;
  fields.broj.value            = p.broj_parcele || '';
  fields.ko.value              = p.ko || '';
  fields.kategorija.value      = p.kategorija || '';
  fields.status.value          = p.status || 'Nije kontaktirano';
  fields.vrstaZemljista.value  = p.vrsta_zemljista || '';
  fields.povrsina.value        = p.povrsina_m2 != null ? p.povrsina_m2 : '';
  fields.planirani.value       = p.planirani_iznos_eur != null ? p.planirani_iznos_eur : '';
  fields.suma.value            = p.dogovorena_suma_eur != null ? p.dogovorena_suma_eur : '';
  fields.napomena.value        = p.napomena || '';
  fields.brojStuba.value       = p.broj_stuba || '';
  setTipStuba(p.tip_stuba || '');
  renderKulturaPicker(parseKultura(p.kultura));
  ohlFields.classList.toggle('hidden', p.kategorija !== 'OHL');
  vlasniciList.innerHTML = '';
  (p.vlasnici || []).forEach(v => addVlasnikRow(v.ime, v.kontakt || '', v.vrsta_prava || '', v.oblik_svojine || '', v.udeo || ''));
  updateVlasnikPlaceholder();
  modalError.classList.add('hidden');
  modalOverlay.classList.remove('hidden');
}

// ===== MODAL: CLOSE =====
modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

function closeModal() { modalOverlay.classList.add('hidden'); clearForm(); }

function clearForm() {
  Object.values(fields).forEach(f => { if (f) f.value = ''; });
  fields.status.value = 'Nije kontaktirano';
  fields.kategorija.value = '';
  fields.vrstaZemljista.value = '';
  fields.planirani.value = '';
  fields.brojStuba.value = '';
  setTipStuba('');
  ohlFields.classList.add('hidden');
  renderKulturaPicker(new Map());
  vlasniciList.innerHTML = '';
  updateVlasnikPlaceholder();
}

// ===== SAVE =====
modalSave.addEventListener('click', async () => {
  modalError.classList.add('hidden');
  const broj = fields.broj.value.trim();
  const ko   = fields.ko.value.trim();
  const kat  = fields.kategorija.value;

  if (!broj || !ko || !kat) {
    modalError.textContent = 'Broj parcele, KO i kategorija su obavezni.';
    modalError.classList.remove('hidden');
    return;
  }

  const isOHL = kat === 'OHL';
  const payload = {
    broj_parcele:        broj,
    ko,
    kategorija:          kat,
    status:              fields.status.value,
    vrsta_zemljista:     fields.vrstaZemljista.value.trim() || null,
    kultura:             getKultura(),
    povrsina_m2:         fields.povrsina.value !== '' ? parseFloat(fields.povrsina.value) : null,
    planirani_iznos_eur: fields.planirani.value !== '' ? parseFloat(fields.planirani.value) : null,
    dogovorena_suma_eur: fields.suma.value !== '' ? parseFloat(fields.suma.value) : null,
    napomena:            fields.napomena.value.trim() || null,
    tip_stuba:           isOHL ? getTipStuba() : null,
    broj_stuba:          isOHL ? (fields.brojStuba.value.trim() || null) : null,
  };

  modalSave.disabled = true;
  modalSave.textContent = 'Čuvam...';

  const id = fields.id.value;
  let parcelaId = id;
  let error;

  if (id) {
    ({ error } = await sb.from('parcele').update(payload).eq('id', id));
  } else {
    const { data, error: e } = await sb.from('parcele').insert(payload).select('id').single();
    error = e;
    if (data) parcelaId = data.id;
  }

  if (error) {
    modalSave.disabled = false;
    modalSave.textContent = 'Sačuvaj';
    modalError.textContent = 'Greška pri čuvanju: ' + error.message;
    modalError.classList.remove('hidden');
    return;
  }

  await sb.from('vlasnici').delete().eq('parcela_id', parcelaId);
  const vlasnici = getVlasnici();
  if (vlasnici.length > 0) {
    await sb.from('vlasnici').insert(vlasnici.map(v => ({ ...v, parcela_id: parcelaId })));
  }

  modalSave.disabled = false;
  modalSave.textContent = 'Sačuvaj';
  closeModal();
  await loadParcele();

  // OHL: if same owners already exist in this stub, merge amounts
  if (isOHL && payload.broj_stuba) {
    const merged = await mergeStubOwnerAmounts(payload.broj_stuba);
    if (merged) {
      await loadParcele();
      showToast(`Iznosi su spojeni za iste vlasnike u stubu ${payload.broj_stuba}.`);
    }
  }

  if (currentPage === 'dashboard') renderDashboard();
  else renderKatPage(currentPage);
});

// ===== DELETE =====
function openDelete(id) { deleteTargetId = id; deleteOverlay.classList.remove('hidden'); }

deleteCancel.addEventListener('click', () => { deleteOverlay.classList.add('hidden'); deleteTargetId = null; });
deleteOverlay.addEventListener('click', e => {
  if (e.target === deleteOverlay) { deleteOverlay.classList.add('hidden'); deleteTargetId = null; }
});

deleteConfirm.addEventListener('click', async () => {
  if (!deleteTargetId) return;
  deleteConfirm.disabled = true;
  await sb.from('parcele').delete().eq('id', deleteTargetId);
  deleteConfirm.disabled = false;
  deleteOverlay.classList.add('hidden');
  deleteTargetId = null;
  await loadParcele();
  if (currentPage === 'dashboard') renderDashboard();
  else renderKatPage(currentPage);
});

// ===== TIMELINE =====
async function openTimeline(parcelaId) {
  const parcela = allParcele.find(p => p.id === parcelaId);
  if (!parcela) return;

  timelineParcelaId = parcelaId;
  timelineTitle.textContent    = `Parcela ${parcela.broj_parcele}`;
  timelineSubtitle.textContent = `${parcela.ko} — ${parcela.kategorija}`;

  // Set today's date as default
  tlDatum.value = new Date().toISOString().split('T')[0];
  tlOpis.value  = '';
  tlError.classList.add('hidden');

  timelineOverlay.classList.remove('hidden');
  await renderTimelineList(parcelaId);
}

async function renderTimelineList(parcelaId) {
  const { data, error } = await sb
    .from('parcela_timeline')
    .select('*')
    .eq('parcela_id', parcelaId)
    .order('datum', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return; }

  timelineList.innerHTML = '';

  if (!data || data.length === 0) {
    timelineEmpty.classList.remove('hidden');
    return;
  }
  timelineEmpty.classList.add('hidden');

  data.forEach(item => {
    const div = document.createElement('div');
    div.className = 'tl-item';
    div.innerHTML = `
      <div class="tl-line">
        <div class="tl-dot"></div>
        <div class="tl-connector"></div>
      </div>
      <div class="tl-content">
        <div class="tl-date">${formatDate(item.datum)}</div>
        <div class="tl-opis">${esc(item.opis)}</div>
        ${item.kreirao ? `<div class="tl-meta">${esc(item.kreirao)}</div>` : ''}
      </div>
      <button class="tl-delete" onclick="deleteTimelineItem('${item.id}')" title="Obriši">&times;</button>`;
    timelineList.appendChild(div);
  });
}

tlAddBtn.addEventListener('click', async () => {
  tlError.classList.add('hidden');
  const datum = tlDatum.value;
  const opis  = tlOpis.value.trim();

  if (!datum || !opis) {
    tlError.textContent = 'Datum i opis su obavezni.';
    tlError.classList.remove('hidden');
    return;
  }

  tlAddBtn.disabled = true;
  tlAddBtn.textContent = 'Dodajem...';

  const { error } = await sb.from('parcela_timeline').insert({
    parcela_id: timelineParcelaId,
    datum,
    opis,
    kreirao: currentUser?.email || null,
  });

  tlAddBtn.disabled = false;
  tlAddBtn.textContent = '+ Dodaj unos';

  if (error) {
    tlError.textContent = 'Greška: ' + error.message;
    tlError.classList.remove('hidden');
    return;
  }

  tlOpis.value = '';
  await renderTimelineList(timelineParcelaId);
});

async function deleteTimelineItem(id) {
  await sb.from('parcela_timeline').delete().eq('id', id);
  await renderTimelineList(timelineParcelaId);
}

timelineClose.addEventListener('click', closeTimeline);
timelineOverlay.addEventListener('click', e => { if (e.target === timelineOverlay) closeTimeline(); });

function closeTimeline() {
  timelineOverlay.classList.add('hidden');
  timelineParcelaId = null;
}

// ===== HELPERS =====
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatEUR(val) {
  if (val == null || val === '') return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusBadge(status) {
  const map = {
    'Nije kontaktirano':   'badge badge-nije',
    'U pregovorima':       'badge badge-pregovori',
    'Dogovoreno':          'badge badge-dogovoreno',
    'Pripremanje ugovora': 'badge badge-priprema',
    'Ugovor pripremljen':  'badge badge-ugovor',
    'Potpisano':           'badge badge-potpisano',
  };
  return `<span class="${map[status] || 'badge'}">${esc(status)}</span>`;
}

function tipStubaBadge(val) {
  if (!val) return '—';
  const cls = val === 'Noseći' ? 'badge badge-noseci' : 'badge badge-ugaoni';
  return `<span class="${cls}">${esc(val)}</span>`;
}

// ===== DRAG-TO-SCROLL TABLES =====
document.addEventListener('mousedown', e => {
  const wrap = e.target.closest('.table-wrap');
  if (!wrap) return;
  // don't interfere with buttons/inputs/selects inside the table
  if (e.target.closest('button, input, select, a, .action-menu')) return;

  let startX  = e.pageX;
  let startScroll = wrap.scrollLeft;
  wrap.classList.add('is-dragging');

  function onMove(e) {
    const dx = e.pageX - startX;
    wrap.scrollLeft = startScroll - dx;
  }

  function onUp() {
    wrap.classList.remove('is-dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

// ===== ACTION MENU =====
function toggleActionMenu(btn) {
  const dropdown = btn.nextElementSibling;
  const isOpen = dropdown.classList.contains('open');
  document.querySelectorAll('.action-dropdown.open').forEach(d => d.classList.remove('open'));
  if (!isOpen) dropdown.classList.add('open');
}

document.addEventListener('click', () => {
  document.querySelectorAll('.action-dropdown.open').forEach(d => d.classList.remove('open'));
});

// ===== TOAST =====
function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

// ===== OHL STUB OWNER MERGE =====
// After saving an OHL parcel: for each group of parcels in the same stub
// that share the exact same owner set, sum their amounts and store the
// total on the first parcel (null on the rest) — matching the display format.
async function mergeStubOwnerAmounts(brojStuba) {
  const stubParcele = allParcele.filter(p => p.kategorija === 'OHL' && p.broj_stuba === brojStuba);
  if (stubParcele.length < 2) return false;

  const getOwnerKey = p => (p.vlasnici || []).map(v => v.ime).sort().join('|');

  const ownerGroups = new Map();
  stubParcele.forEach(p => {
    const key = getOwnerKey(p);
    if (!key) return; // skip parcels with no owners
    if (!ownerGroups.has(key)) ownerGroups.set(key, []);
    ownerGroups.get(key).push(p);
  });

  let merged = false;
  for (const [, parcele] of ownerGroups) {
    if (parcele.length < 2) continue;

    const totalPlan = parcele.reduce((s, p) => s + (p.planirani_iznos_eur || 0), 0);
    const totalSuma = parcele.reduce((s, p) => s + (p.dogovorena_suma_eur || 0), 0);

    for (let i = 0; i < parcele.length; i++) {
      await sb.from('parcele').update({
        planirani_iznos_eur: i === 0 ? (totalPlan > 0 ? totalPlan : null) : null,
        dogovorena_suma_eur: i === 0 ? (totalSuma > 0 ? totalSuma : null) : null,
      }).eq('id', parcele[i].id);
    }
    merged = true;
  }
  return merged;
}

// ===== SIDEBAR TOGGLE =====
document.getElementById('sidebar-collapse-btn').addEventListener('click', () => {
  appDiv.classList.add('sidebar-hidden');
});
document.getElementById('sidebar-open-btn').addEventListener('click', () => {
  appDiv.classList.remove('sidebar-hidden');
});

// ===== START =====
renderKulturaPicker(new Map());
initAuth();
