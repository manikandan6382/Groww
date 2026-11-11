export const createCopilotSlice = (set, get) => ({
  copilotSignal: null,
  copilotSignalStatus: "IDLE", // 'IDLE' | 'NEW' | 'APPLIED' | 'CUSTOMIZED'

  setCopilotSignal: (signal) => {
    if (!signal || signal.cleared) {
      set({ copilotSignal: null, copilotSignalStatus: "IDLE" });
      return;
    }
    set({ copilotSignal: signal, copilotSignalStatus: "NEW" });
  },

  setCopilotSignalStatus: (status) => set({ copilotSignalStatus: status }),

  clearCopilotSignal: () => set({ copilotSignal: null, copilotSignalStatus: "IDLE" })
});
