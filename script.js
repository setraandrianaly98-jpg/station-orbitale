const PROTOCOLS = {
  'AL SIMPLE': { rate: 10, color: '#3dd6ff' },
  'AL COMPLEXE': { rate: 4.29, color: '#7de7ff' },
  'FR SIMPLE': { rate: 15, color: '#31e0b1' },
  'FR COMPLEXE': { rate: 6.29, color: '#8fe5c7' }
};

const STORAGE_KEY = 'station-orbitale-productions';

const renderClock = () => {
  const now = new Date();
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  document.title = `Station Orbitale - ${time}`;
};

const formatDurationMinutes = (minutes) => {
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${String(m).padStart(2, '0')}`;
};

const padTime = (value) => {
  if (value === '' || value === null || value === undefined) return '00:00';
  return value;
};

const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const toTimeString = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = Math.round(totalMinutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const calculateProduction = () => {
  const saleName = document.getElementById('saleName').value.trim() || 'Nouvelle vente';
  const protocol = document.getElementById('protocolType').value;
  const totalRefs = Number(document.getElementById('totalRefs').value || 0);
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const pauseEnabled = document.getElementById('pauseToggle').checked;

  const protocolRate = PROTOCOLS[protocol].rate;

  const rawMinutes = Math.max(1, toMinutes(endTime) - toMinutes(startTime));
  const effectiveMinutes = rawMinutes - (pauseEnabled ? 30 : 0);
  const refsDone = Math.min(totalRefs, Math.max(0, Math.round((effectiveMinutes / 60) * protocolRate)));
  const remaining = Math.max(0, totalRefs - refsDone);

  const theoreticalMinutes = (totalRefs / protocolRate) * 60;
  const performance = totalRefs > 0 ? (refsDone / totalRefs) * 100 : 0;

  document.getElementById('remainingRefs').textContent = remaining;
  document.getElementById('remainingSummary').textContent = `${remaining} réf`;
  document.getElementById('theoreticalTime').textContent = formatDurationMinutes(theoreticalMinutes);
  document.getElementById('realTime').textContent = formatDurationMinutes(effectiveMinutes);
  document.getElementById('performanceValue').textContent = `${performance.toFixed(2)}%`;

  const plannedEnd = document.getElementById('plannedEnd');
  if (plannedEnd && plannedEnd.value) {
    const plannedMinutes = toMinutes(plannedEnd.value) - toMinutes(startTime);
    if (plannedMinutes >= 0) {
      const forecast = Math.max(0, totalRefs - Math.round((plannedMinutes / 60) * protocolRate));
      document.getElementById('remainingSummary').textContent = `${forecast} réf`;
    }
  }

  return {
    saleName,
    protocol,
    totalRefs,
    refsDone,
    remaining,
    startTime,
    endTime,
    effectiveMinutes,
    performance,
    pauseEnabled,
    theoreticalMinutes
  };
};

const getSales = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return [
      { id: 1, name: 'Cool Club', protocol: 'FR SIMPLE', refs: 25, treated: 25, start: '09:00', end: '10:00', status: 'Terminé', performance: 98.04 },
      { id: 2, name: 'Liu Jo', protocol: 'AL SIMPLE', refs: 24, treated: 24, start: '10:00', end: '11:30', status: 'Terminé', performance: 100 },
      { id: 3, name: 'Tamaris', protocol: 'FR SIMPLE', refs: 30, treated: 30, start: '08:00', end: '09:30', status: 'Terminé', performance: 100 }
    ];
  }
  try { return JSON.parse(saved); } catch { return []; }
};

const saveSales = (sales) => localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));

const renderUpcomingSales = () => {
  const sales = getSales();
  const upcomingContainer = document.getElementById('upcomingSales');

  if (!upcomingContainer) return;

  if (!sales.length) {
    upcomingContainer.innerHTML = '<div class="sale-item"><span class="sale-name">Aucune vente</span></div>';
    return;
  }

  upcomingContainer.innerHTML = sales
    .slice(0, 5)
    .map((sale) => `
      <div class="sale-item">
        <div class="name-wrap">
          <div class="sale-left">
            <span class="sale-name">${sale.name}</span>
            <span class="sale-code">${sale.protocol}</span>
          </div>
          <div class="sale-qty">${sale.refs} Réf.</div>
        </div>
        <div class="sale-actions">
          <button class="action-treat">traitement</button>
          <button class="action-edit">modifier</button>
          <button class="action-delete">supprimer</button>
        </div>
      </div>
    `)
    .join('');
};

const renderHistory = () => {
  const tableBody = document.getElementById('historyTableBody');
  if (!tableBody) return;

  const sales = getSales();
  const filter = document.getElementById('historyFilter')?.value?.toLowerCase() || '';

  const filtered = sales.filter((sale) =>
    sale.name.toLowerCase().includes(filter) ||
    sale.protocol.toLowerCase().includes(filter)
  );

  if (!filtered.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align:center; color: var(--muted); padding: 22px;">
          Aucune production trouvée
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map((sale) => {
    const percent = Number(sale.performance ?? 0).toFixed(2);
    const status = sale.status === 'Terminé' ? 'success' : 'warning';
    const statusText = sale.status || 'En cours';

    return `
      <tr>
        <td>${sale.name}</td>
        <td>${sale.protocol}</td>
        <td>${sale.refs}</td>
        <td>${sale.treated ?? sale.refs}</td>
        <td>${sale.start || '—'}</td>
        <td>${sale.end || '—'}</td>
        <td>${sale.duration || '—'}</td>
        <td>${Math.max(0, (sale.refs ?? 0) - (sale.treated ?? 0))}</td>
        <td>${percent}%</td>
        <td><span class="status-pill ${status}">${statusText}</span></td>
        <td class="action-cell">
          <button class="action-mini primary">traiter</button>
          <button class="action-mini danger">supprimer</button>
        </td>
      </tr>
    `;
  }).join('');
};

const saveProduction = () => {
  const data = calculateProduction();
  const sales = getSales();

  const record = {
    id: Date.now(),
    name: data.saleName,
    protocol: data.protocol,
    refs: data.totalRefs,
    treated: data.refsDone,
    start: data.startTime,
    end: data.endTime,
    duration: formatDurationMinutes(data.effectiveMinutes),
    performance: Number(data.performance.toFixed(2)),
    status: data.remaining === 0 ? 'Terminé' : 'En cours'
  };

  sales.unshift(record);
  saveSales(sales);
  renderUpcomingSales();
  renderHistory();
};

const resetForm = () => {
  document.getElementById('saleName').value = 'Cool Club';
  document.getElementById('protocolType').value = 'FR SIMPLE';
  document.getElementById('totalRefs').value = 25;
  document.getElementById('startTime').value = '11:39';
  document.getElementById('endTime').value = '13:19';
  document.getElementById('pauseToggle').checked = true;
  document.getElementById('plannedEnd').value = '13:19';
  calculateProduction();
};

const updateSimulation = () => {
  const simStart = document.getElementById('simStart').value || '08:00';
  const simEnd = document.getElementById('simEnd').value || '11:30';
  const simProtocol = document.getElementById('simProtocol').value || 'AL SIMPLE';
  const hasPause = document.getElementById('simPause').checked;

  const startMinutes = toMinutes(simStart);
  const endMinutes = toMinutes(simEnd);
  const rawMinutes = Math.max(0, endMinutes - startMinutes);
  const effectiveMinutes = rawMinutes - (hasPause ? 30 : 0);
  const refs = ((effectiveMinutes / 60) * PROTOCOLS[simProtocol].rate);

  document.getElementById('simResult').textContent = `${Math.round(refs)} réf`;
};

const bindEvents = () => {
  ['saleName', 'protocolType', 'totalRefs', 'startTime', 'endTime', 'pauseToggle', 'plannedEnd', 'productionDate'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calculateProduction);
    if (el) el.addEventListener('change', calculateProduction);
  });

  document.getElementById('calculateBtn')?.addEventListener('click', calculateProduction);
  document.getElementById('saveProductionBtn')?.addEventListener('click', saveProduction);
  document.getElementById('resetBtn')?.addEventListener('click', resetForm);
  document.getElementById('historyFilter')?.addEventListener('input', renderHistory);
  document.getElementById('closeDayBtn')?.addEventListener('click', () => {
    if (confirm('Clôturer la journée ?')) {
      localStorage.removeItem(STORAGE_KEY);
      renderUpcomingSales();
      renderHistory();
    }
  });

  ['simStart', 'simEnd', 'simProtocol', 'simPause'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateSimulation);
      el.addEventListener('change', updateSimulation);
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  renderClock();
  setInterval(renderClock, 1000);
  resetForm();
  renderUpcomingSales();
  renderHistory();
  updateSimulation();
  bindEvents();
});
