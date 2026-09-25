// ============================================================
// TADASHI Router — Client-side SPA navigation
// ============================================================

const Router = (() => {
  let currentPage = 'home';
  const pages = {};

  function register(name, renderFn) {
    pages[name] = renderFn;
  }

  function navigate(page) {
    currentPage = page;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Update topbar title
    const labels = {
      home: 'Home', tadashi: 'TADASHI', calendar: 'Calendar', tasks: 'Tasks',
      goals: 'Goals', study: 'Study', fitness: 'Fitness', nutrition: 'Nutrition',
      finance: 'Finance', shopping: 'Shopping', relationships: 'Relationships',
      'home-module': 'Home', vehicle: 'Vehicle', travel: 'Travel', documents: 'Documents',
      knowledge: 'Knowledge', routines: 'Routines', wellbeing: 'Wellbeing',
      'digital-life': 'Digital Life', entertainment: 'Entertainment', analytics: 'Analytics',
      settings: 'Settings'
    };
    const titleEl = document.getElementById('topbar-page-title');
    if (titleEl) titleEl.textContent = labels[page] || page;

    // Render page
    const content = document.getElementById('page-content');
    if (content && pages[page]) {
      content.innerHTML = '';
      const pageEl = pages[page]();
      if (pageEl) {
        pageEl.classList.add('page-enter');
        content.appendChild(pageEl);
      }
    } else if (content) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🚧</div><div class="empty-state-title">Coming soon</div><div class="empty-state-desc">This module is being built.</div></div>`;
    }
  }

  function getCurrent() { return currentPage; }

  return { register, navigate, getCurrent };
})();
