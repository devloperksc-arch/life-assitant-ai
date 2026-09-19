// Vehicle Page
Router.register('vehicle', () => {
  const el = document.createElement('div');
  const v = DATA.vehicle;
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">🏍️ Vehicle</div><div class="page-subtitle">Fuel, service, insurance and maintenance</div></div><button class="btn btn-primary btn-sm">+ Log Fuel</button></div>
    <div class="grid-2" style="margin-bottom:20px">
      <div class="card">
        <div class="card-body vehicle-card">
          <div class="vehicle-header"><span class="vehicle-icon">🏍️</span><div><div class="vehicle-name">${v.make} ${v.model} ${v.year}</div><div class="vehicle-plate">${v.plate}</div></div></div>
          <div class="vehicle-stats">
            <div class="vehicle-stat"><div class="vehicle-stat-val" style="color:var(--accent-cyan)">${v.odometer.toLocaleString()}</div><div class="vehicle-stat-lbl">km</div></div>
            <div class="vehicle-stat"><div class="vehicle-stat-val" style="color:var(--accent-green)">${v.fuel}%</div><div class="vehicle-stat-lbl">Fuel</div></div>
            <div class="vehicle-stat"><div class="vehicle-stat-val" style="font-size:13px;color:var(--accent-amber)">${Utils.daysUntil(v.nextService)}d</div><div class="vehicle-stat-lbl">Next service</div></div>
          </div>
          <div class="progress-track" style="margin-top:12px;height:8px"><div class="progress-fill green" style="width:${v.fuel}%"></div></div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:4px">Fuel: ${v.fuel}% full</div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Documents & Reminders</div></div>
        <div class="card-body">
          ${[
            {name:'Insurance', expiry:v.insurance.expiry, provider:v.insurance.provider, icon:'🛡️'},
            {name:'PUC Certificate', expiry:v.puc.expiry, provider:'Pollution Control', icon:'📄'},
            {name:'Next Service', expiry:v.nextService, provider:'Periodic maintenance', icon:'🔧'},
          ].map(d => `
            <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
              <span style="font-size:18px">${d.icon}</span>
              <div style="flex:1"><div style="font-size:13px;font-weight:500">${d.name}</div><div style="font-size:10px;color:var(--text-muted)">${d.provider}</div></div>
              <div style="text-align:right">
                <div class="doc-expiry ${Utils.daysUntil(d.expiry)<=30?'warn':'ok'}" style="font-size:12px">Expires ${Utils.formatDateShort(d.expiry)}</div>
                <div style="font-size:10px;color:var(--text-muted)">${Utils.daysUntil(d.expiry)} days left</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Fuel Log</div></div>
      <div class="card-body">
        <table class="data-table">
          <thead><tr><th>Date</th><th>Liters</th><th>Amount</th><th>Odometer</th><th>Mileage</th></tr></thead>
          <tbody>
            ${v.fuelLogs.map((l,i,arr) => {
              const mileage = i<arr.length-1 ? ((l.odometer-arr[i+1].odometer)/l.liters).toFixed(1) : '—';
              return `<tr><td>${Utils.formatDateShort(l.date)}</td><td>${l.liters}L</td><td>${Utils.fmtCurrency(l.amount)}</td><td>${l.odometer.toLocaleString()} km</td><td>${mileage !== '—' ? mileage+' km/L' : '—'}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  return el;
});
