// ============================================
// Modal Component
// ============================================

let modalRoot = null;

function ensureModalRoot() {
  if (!modalRoot) {
    modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'modal-root';
      document.body.appendChild(modalRoot);
    }
  }
  return modalRoot;
}

export function showModal({ title, content, size = '', footer = '', onClose }) {
  const root = ensureModalRoot();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${size === 'lg' ? 'modal-lg' : ''}">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="btn btn-ghost btn-icon modal-close-btn">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="modal-body">${content}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal(overlay);
      if (onClose) onClose();
    }
  });

  // Close on X button
  overlay.querySelector('.modal-close-btn').addEventListener('click', () => {
    closeModal(overlay);
    if (onClose) onClose();
  });

  root.appendChild(overlay);
  if (window.lucide) lucide.createIcons({ nodes: [overlay] });

  return overlay;
}

export function closeModal(overlay) {
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 200);
  }
}

export function closeAllModals() {
  const root = ensureModalRoot();
  root.innerHTML = '';
}

/**
 * 確認ダイアログ
 */
export function showConfirm({ title, message, subMessage = '', type = 'warning', confirmText = '確認', cancelText = 'キャンセル' }) {
  return new Promise((resolve) => {
    const iconName = type === 'danger' ? 'alert-triangle' : 'alert-circle';
    
    const content = `
      <div class="confirm-content">
        <div class="confirm-icon ${type}">
          <i data-lucide="${iconName}" style="width:28px;height:28px"></i>
        </div>
        <div class="confirm-message">${message}</div>
        ${subMessage ? `<div class="confirm-sub">${subMessage}</div>` : ''}
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary confirm-cancel">${cancelText}</button>
      <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'} confirm-ok">${confirmText}</button>
    `;

    const overlay = showModal({ title, content, footer });

    overlay.querySelector('.confirm-ok').addEventListener('click', () => {
      closeModal(overlay);
      resolve(true);
    });

    overlay.querySelector('.confirm-cancel').addEventListener('click', () => {
      closeModal(overlay);
      resolve(false);
    });
  });
}
