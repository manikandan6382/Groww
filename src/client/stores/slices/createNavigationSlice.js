import { getViewFromUrl, syncUrlWithView } from "../../utils/urlRouter";

export const createNavigationSlice = (set, get) => ({
  activeView: getViewFromUrl(),
  setActiveView: (view, shouldSyncUrl = true) => {
    set({ activeView: view });
    if (shouldSyncUrl) {
      syncUrlWithView(view);
    }
  },

  isRosettaOpen: false,
  rosettaActiveTopic: null,
  setRosettaOpen: (open) => set({ isRosettaOpen: open }),
  openRosettaWithTopic: (topicId) => set({ isRosettaOpen: true, rosettaActiveTopic: topicId }),
  
  isShortcutsOpen: false,
  setShortcutsOpen: (open) => set({ isShortcutsOpen: open }),
  
  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  
  isSafetyGuardModalOpen: false,
  setSafetyGuardModalOpen: (open) => set({ isSafetyGuardModalOpen: open }),
  
  isCustomTradeModalOpen: false,
  setCustomTradeModalOpen: (open) => set({ isCustomTradeModalOpen: open })
});
