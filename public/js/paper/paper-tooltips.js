export function handlePaperTooltipOver(event) {
  const target = event.target.closest("[data-paper-tooltip]");
  if (!target) return;
  showPaperHoverToast(target.dataset.paperTooltip, event.clientX, event.clientY);
}

export function handlePaperTooltipMove(event) {
  const target = event.target.closest("[data-paper-tooltip]");
  if (!target) {
    hidePaperHoverToast();
    return;
  }
  showPaperHoverToast(target.dataset.paperTooltip, event.clientX, event.clientY);
}

export function handlePaperTooltipOut(event) {
  const nextTarget = event.relatedTarget?.closest?.("[data-paper-tooltip]");
  if (!nextTarget) {
    hidePaperHoverToast();
  }
}

export function handlePaperTooltipFocus(event) {
  const target = event.target.closest("[data-paper-tooltip]");
  if (!target) return;
  const rect = target.getBoundingClientRect();
  showPaperHoverToast(target.dataset.paperTooltip, rect.left + rect.width / 2, rect.top);
}

export function showPaperHoverToast(text, x, y) {
  if (!text || text.trim() === "") {
    hidePaperHoverToast();
    return;
  }
  const toast = getPaperHoverToast();
  toast.textContent = text;
  toast.style.display = "block";
  toast.hidden = false;
  movePaperHoverToast(x, y);
}

export function movePaperHoverToast(x, y) {
  const toast = getPaperHoverToast();
  if (toast.hidden || toast.style.display === "none") return;
  const padding = 16;
  const rect = toast.getBoundingClientRect();
  const width = rect.width || 240;
  const height = rect.height || 90;
  
  let left = x + 16;
  let top = y + 16;
  
  if (left + width > window.innerWidth - padding) {
    left = x - width - 16;
  }
  if (top + height > window.innerHeight - padding) {
    top = y - height - 16;
  }
  
  left = Math.max(padding, left);
  top = Math.max(padding, top);
  
  toast.style.left = `${left}px`;
  toast.style.top = `${top}px`;
}

export function hidePaperHoverToast() {
  const toast = document.getElementById("paperHoverToast");
  if (toast) {
    toast.hidden = true;
    toast.style.display = "none";
  }
}

export function getPaperHoverToast() {
  let toast = document.getElementById("paperHoverToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "paperHoverToast";
    toast.className = "paper-hover-toast";
    toast.hidden = true;
    toast.style.display = "none";
    document.body.appendChild(toast);
  }
  return toast;
}
