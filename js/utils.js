// ============================================================
// TADASHI Utilities
// ============================================================

const Utils = {
  // Date helpers
  now() { return new Date(); },
  today() { return new Date().toISOString().split('T')[0]; },
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  },
  formatDateShort(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  },
  daysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / (1000*60*60*24));
  },
  timeNow() {
    return new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:false });
  },
  dateNow() {
    return new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  },

  // Number helpers
  pct(val, total) { return total ? Math.round(val/total*100) : 0; },
  fmt(n) { return n.toLocaleString('en-IN'); },
  fmtCurrency(n) { return '₹' + Math.abs(n).toLocaleString('en-IN'); },

  // Priority color
  priorityColor(p) {
    const map = { high:'red', medium:'amber', low:'green' };
    return map[p] || 'cyan';
  },

  // Status color
  statusColor(s) {
    const map = { active:'green', done:'green', 'in-progress':'cyan', todo:'amber', 'on-hold':'violet', planned:'violet', overdue:'red', due:'amber', ok:'green', upcoming:'cyan', watching:'cyan', reading:'cyan', 'want-to-watch':'violet', watched:'green' };
    return map[s] || 'cyan';
  },

  // Days until color
  deadlineColor(dateStr) {
    const days = Utils.daysUntil(dateStr);
    if (days === null) return 'text-muted';
    if (days < 0) return 'var(--accent-red)';
    if (days <= 2) return 'var(--accent-red)';
    if (days <= 5) return 'var(--accent-amber)';
    return 'var(--text-muted)';
  },

  // HTML helpers
  el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k,v] of Object.entries(attrs)) {
        if (k === 'class') e.className = v;
        else if (k === 'onclick') e.onclick = v;
        else if (k === 'id') e.id = v;
        else if (k === 'style') e.style.cssText = v;
        else if (k.startsWith('data-')) e.setAttribute(k, v);
        else e.setAttribute(k, v);
      }
    }
    for (const c of children) {
      if (c === null || c === undefined) continue;
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    }
    return e;
  },
  html(str) {
    const d = document.createElement('div');
    d.innerHTML = str;
    return d;
  },
  setHTML(el, str) { el.innerHTML = str; return el; },

  // Progress arc SVG
  arc(pct, size=60, stroke=4, color='var(--accent-cyan)') {
    const r = (size-stroke*2)/2;
    const circ = 2*Math.PI*r;
    const offset = circ - (pct/100)*circ;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${stroke}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
    </svg>`;
  },

  // Parse simple markdown bold
  md(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  },

  // Animate number
  animateNumber(el, from, to, duration=600, suffix='') {
    const start = performance.now();
    const update = (time) => {
      const p = Math.min((time - start) / duration, 1);
      const ease = p < 0.5 ? 2*p*p : -1+(4-2*p)*p;
      el.textContent = Math.round(from + (to-from)*ease) + suffix;
      if (p < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  },

  // Simple chart bars
  miniChart(data, color='var(--accent-cyan)') {
    const max = Math.max(...data);
    return data.map(v => {
      const h = max ? Math.round((v/max)*60) : 4;
      return `<div class="chart-bar" style="height:${h}px;background:${color}"></div>`;
    }).join('');
  }
};
