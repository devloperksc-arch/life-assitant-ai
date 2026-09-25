// Finance Page
Router.register('finance', () => {
  const el = document.createElement('div');
  const f = DATA.finance;

  el.innerHTML = `
    <div class="page-header">
      <div><div class="page-title">💰 Finance</div><div class="page-subtitle">Income, expenses, budgets and savings</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="processTADASHICommand('Adjust my spending for this month')">🧠 TADASHI</button>
        <button class="btn btn-primary btn-sm">+ Add Transaction</button>
      </div>
    </div>

    <!-- Balance cards -->
    <div class="grid-4" style="margin-bottom:20px">
      ${[
        {label:'Balance', val:'₹'+Utils.fmt(f.balance), sub:'Current', color:'cyan', icon:'💳'},
        {label:'This Month Income', val:'₹'+Utils.fmt(f.monthlyIncome), sub:'September', color:'green', icon:'↑'},
        {label:'This Month Expenses', val:'₹'+Utils.fmt(f.monthlyExpenses), sub:'September', color:'red', icon:'↓'},
        {label:'Total Savings', val:'₹'+Utils.fmt(f.savings), sub:`${Utils.pct(f.savings,f.savingsGoal)}% of goal`, color:'amber', icon:'🏦'},
      ].map(c => `
        <div class="card glow-${c.color}">
          <div class="stat-widget">
            <div style="font-size:22px;margin-bottom:4px">${c.icon}</div>
            <div class="stat-value" style="font-size:20px;color:var(--accent-${c.color})">${c.val}</div>
            <div class="stat-label">${c.label}</div>
            <div style="font-size:11px;color:var(--text-muted)">${c.sub}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 320px;gap:20px">
      <!-- Transactions -->
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-icon" style="background:rgba(0,212,255,0.1)">📊</div>
            <div><div class="card-title">Recent Transactions</div></div>
            <button class="btn btn-ghost btn-sm" style="margin-left:auto">View All</button>
          </div>
          <div class="card-body">
            ${f.transactions.map(tx => `
              <div class="tx-row">
                <div class="tx-icon" style="background:${tx.amount>0?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.08)'}">${tx.icon}</div>
                <div class="tx-info">
                  <div class="tx-name">${tx.name}</div>
                  <div class="tx-cat">${tx.category} · ${Utils.formatDateShort(tx.date)}</div>
                </div>
                <div class="tx-amount ${tx.amount>0?'credit':'debit'}">${tx.amount>0?'+':''}${Utils.fmtCurrency(tx.amount)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Budgets + Savings -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- Savings goal -->
        <div class="card">
          <div class="card-header"><div class="card-icon" style="background:rgba(245,158,11,0.15)">🎯</div><div class="card-title">Savings Goal</div></div>
          <div class="card-body">
            <div style="text-align:center;margin-bottom:12px">
              <div style="position:relative;width:90px;height:90px;margin:0 auto">
                ${Utils.arc(Utils.pct(f.savings,f.savingsGoal), 90, 8, 'url(#savingsGrad)')}
                <svg width="0" height="0"><defs><linearGradient id="savingsGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:var(--accent-amber)"/><stop offset="100%" style="stop-color:var(--accent-green)"/></linearGradient></defs></svg>
                <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
                  <span style="font-size:18px;font-weight:900;color:var(--accent-amber)">${Utils.pct(f.savings,f.savingsGoal)}%</span>
                </div>
              </div>
              <div style="font-size:13px;font-weight:700;margin-top:8px">₹${Utils.fmt(f.savings)} saved</div>
              <div style="font-size:11px;color:var(--text-muted)">Goal: ₹${Utils.fmt(f.savingsGoal)}</div>
            </div>
          </div>
        </div>

        <!-- Budgets -->
        <div class="card">
          <div class="card-header"><div class="card-title">Budget Status</div><div style="font-size:10px;color:var(--text-muted);margin-left:4px">Day ${new Date().getDate()}/30</div></div>
          <div class="card-body">
            ${f.budgets.map(b => {
              const pct = Utils.pct(b.spent, b.limit);
              return `
                <div style="margin-bottom:12px">
                  <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
                    <span style="font-weight:600">${b.category}</span>
                    <span style="color:${pct>80?'var(--accent-red)':pct>60?'var(--accent-amber)':'var(--text-muted)'}">${Utils.fmtCurrency(b.spent)} / ${Utils.fmtCurrency(b.limit)}</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill ${pct>80?'red':pct>60?'amber':'green'}" style="width:${Math.min(pct,100)}%"></div></div>
                  <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${pct}% used</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Bills -->
        <div class="card">
          <div class="card-header"><div class="card-title">Upcoming Bills</div></div>
          <div class="card-body">
            ${[
              {name:'Rent', amount:'₹8,000', due:'Oct 1', icon:'🏠'},
              {name:'WiFi', amount:'₹599', due:'Sep 25', icon:'📡'},
              {name:'Electricity', amount:'₹820', due:'Oct 10', icon:'⚡'},
              {name:'Netflix', amount:'₹199', due:'Oct 5', icon:'🎬'},
            ].map(b => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
                <span style="font-size:16px">${b.icon}</span>
                <span style="flex:1;font-size:13px;font-weight:500">${b.name}</span>
                <span style="font-size:12px;font-weight:700">${b.amount}</span>
                <span style="font-size:10px;color:var(--text-muted)">${b.due}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  return el;
});
