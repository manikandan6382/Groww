export function initTooltips() {
  document.addEventListener("click", (e) => {
    const badge = e.target.closest(".info-tooltip-badge");
    const existingPopover = document.getElementById("appleActiveTooltipPopover");
    if (existingPopover) {
      existingPopover.remove();
    }
    if (!badge) return;
    
    const text = badge.getAttribute("title") || badge.getAttribute("data-tooltip") || badge.textContent;
    if (!text || text === "ℹ️") return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const popover = document.createElement("div");
    popover.id = "appleActiveTooltipPopover";
    popover.className = "apple-tooltip-popover";
    popover.textContent = text;
    document.body.appendChild(popover);
    
    const rect = badge.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - popoverRect.width / 2;
    
    if (left < 10) left = 10;
    if (left + popoverRect.width > window.innerWidth - 10) {
      left = window.innerWidth - popoverRect.width - 10;
    }
    if (top + popoverRect.height > window.innerHeight - 10) {
      top = rect.top - popoverRect.height - 8;
    }
    
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    
    const closeHandler = () => {
      popover.remove();
      document.removeEventListener("click", closeHandler);
      document.removeEventListener("keydown", keyHandler);
    };
    const keyHandler = (ev) => {
      if (ev.key === "Escape") closeHandler();
    };
    setTimeout(() => {
      document.addEventListener("click", closeHandler);
      document.addEventListener("keydown", keyHandler);
    }, 10);
  });
}
