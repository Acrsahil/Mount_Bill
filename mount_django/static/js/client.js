document.addEventListener('DOMContentLoaded', function () {
  const tabBtn = document.querySelectorAll('.tab-links');
  const tabContent = document.querySelectorAll('.tab-contents');
  const DEFAULT_TAB_ID = 'client-info';

  // helper to activate a tab by its id
  function activateTab(targetId) {
    // switch to active button
    tabBtn.forEach(btn => {
      if (btn.dataset.tab === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // switch to active content
    tabContent.forEach(content => {
      if (content.id === targetId) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }

  // tab click behavior (same as before, using helper)
  tabBtn.forEach(button => {
    button.addEventListener('click', function () {
      const targetId = this.dataset.tab;
      activateTab(targetId);
    });
  });

  // set default tab on first load
  activateTab(DEFAULT_TAB_ID);

  // reset to default tab when modal is closed
  const closeBtn = document.getElementById('closeClientModal');
  const cancelBtn = document.getElementById('cancelClientBtn');

  [closeBtn, cancelBtn].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      activateTab(DEFAULT_TAB_ID);
    });
  });
});