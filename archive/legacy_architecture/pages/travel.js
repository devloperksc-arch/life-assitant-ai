// Travel Page
Router.register('travel', () => {
  const el = document.createElement('div');
  const trip = DATA.travel.trips[0];
  el.innerHTML = `
    <div class="page-header"><div><div class="page-title">✈️ Travel</div><div class="page-subtitle">Trips, itineraries, packing and budgets</div></div><button class="btn btn-primary btn-sm">+ Plan Trip</button></div>
    <div class="card" style="margin-bottom:20px;overflow:hidden">
      <div class="trip-header" style="background:linear-gradient(135deg,rgba(0,212,255,0.08),rgba(124,58,237,0.08))">
        <span style="font-size:32px">${trip.emoji}</span>
        <div>
          <div class="trip-dest">${trip.dest}</div>
          <div class="trip-dates">${Utils.formatDate(trip.start)} — ${Utils.formatDate(trip.end)}</div>
          <span class="badge badge-violet">${trip.status}</span>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:20px;font-weight:800;color:var(--accent-cyan)">₹${Utils.fmt(trip.budget)}</div>
          <div style="font-size:11px;color:var(--text-muted)">Budget · Spent: ₹${Utils.fmt(trip.spent)}</div>
          <div class="progress-track" style="margin-top:6px;width:120px"><div class="progress-fill green" style="width:${Utils.pct(trip.spent,trip.budget)}%"></div></div>
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-icon" style="background:rgba(0,212,255,0.1)">🗺️</div><div class="card-title">Itinerary</div></div>
        <div style="padding:0">
          ${trip.itinerary.map(day => `
            <div class="itinerary-day">
              <div class="itinerary-day-label">${day.day}</div>
              ${day.items.map(item => `
                <div class="itinerary-item">
                  <span class="itinerary-time">${item.time}</span>
                  <span style="flex:1;font-size:12px">${item.event}</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><div class="card-icon" style="background:rgba(124,58,237,0.15)">🎒</div><div class="card-title">Packing List</div></div>
          <div class="card-body">
            ${trip.packing.map(item => `
              <div class="routine-item">
                <div class="routine-check" onclick="this.classList.toggle('checked');this.textContent=this.classList.contains('checked')?'✓':''"></div>
                <span class="routine-label">${item}</span>
              </div>
            `).join('')}
            <button class="btn btn-secondary" style="width:100%;margin-top:8px">+ Add item</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Budget Breakdown</div></div>
          <div class="card-body">
            ${[
              {cat:'Transport', planned:4000, spent:2500, icon:'🚌'},
              {cat:'Hotel', planned:6000, spent:0, icon:'🏨'},
              {cat:'Food', planned:3000, spent:0, icon:'🍽️'},
              {cat:'Activities', planned:2000, spent:0, icon:'🎡'},
            ].map(b => `
              <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
                <span>${b.icon}</span>
                <span style="flex:1;font-size:12px;font-weight:500">${b.cat}</span>
                <span style="font-size:12px;font-weight:700">₹${Utils.fmt(b.planned)}</span>
                ${b.spent?`<span style="font-size:10px;color:var(--accent-amber)">₹${Utils.fmt(b.spent)} spent</span>`:''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  return el;
});
