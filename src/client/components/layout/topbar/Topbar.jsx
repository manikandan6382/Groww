import React, { useState } from "react";
import { TopbarBrand } from "./TopbarBrand";
import { TopbarControls } from "./TopbarControls";
import { BrokerSessionModal } from "./BrokerSessionModal";

export function Topbar() {
  const [showBrokerModal, setShowBrokerModal] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[var(--sidebar)] backdrop-blur-3xl border-b border-[var(--line)] px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all">
      {/* 🌟 Zone 1: Apple Luxury Hologram Brand Emblem (Left) */}
      <TopbarBrand onOpenBrokerModal={() => setShowBrokerModal(true)} />

      {/* 🚀 Zone 2: Unified Apple Vision Pro Control Deck (Right) */}
      <TopbarControls onOpenBrokerModal={() => setShowBrokerModal(true)} />

      {/* 🚀 Broker Connection & Daily Token Manager Modal */}
      <BrokerSessionModal 
        isOpen={showBrokerModal} 
        onClose={() => setShowBrokerModal(false)} 
      />
    </header>
  );
}

export default Topbar;
