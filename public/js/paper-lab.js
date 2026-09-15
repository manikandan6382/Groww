import { toggleSlippageSimulation, copyBrokerPayload } from "./paper/paper-order-actions.js";
import {
  trailTradeStopLoss,
  promptEditStopLoss,
  promptEditTargetPrice,
  quickBumpTargetPrice,
  instantExitTrade,
} from "./paper/paper-sl-tp-actions.js";
import {
  handleManualLtpInput,
  stepManualLtp,
  syncManualLtp,
  deletePaperTradeFromUi,
} from "./paper/paper-manual-ltp.js";
import { exportPracticeTradeToJournal, squareOffAllTrades } from "./paper/paper-open-trades.js";
import { triggerVictoryConfetti } from "./paper/paper-audio-fx.js";
import { createPaperPosition } from "./paper/paper-position-deploy.js";
import {
  loadCopilotSetupIntoForm,
  loadCopilotSetupIntoJournal,
  syncLiveDeskFromForm,
} from "./paper/paper-copilot-deploy.js";
import { toggleSpreadMode } from "./paper/paper-desk-presets.js";
import { toggleFeedMode, toggleTradeFeedMode } from "./paper/paper-feed-mode.js";
import { exportClosedTradesToCsv } from "./paper/paper-closed-trades.js";
import { deskChannel, loadPaperLab } from "./paper/paper-loader.js";
import { initPaperLab } from "./paper/paper-init.js";

// Global window exposure for inline HTML onclick and script tags
window.toggleSlippageSimulation = toggleSlippageSimulation;
window.copyBrokerPayload = copyBrokerPayload;
window.trailTradeStopLoss = trailTradeStopLoss;
window.promptEditStopLoss = promptEditStopLoss;
window.promptEditTargetPrice = promptEditTargetPrice;
window.quickBumpTargetPrice = quickBumpTargetPrice;
window.instantExitTrade = instantExitTrade;
window.handleManualLtpInput = handleManualLtpInput;
window.stepManualLtp = stepManualLtp;
window.syncManualLtp = syncManualLtp;
window.deletePaperTradeFromUi = deletePaperTradeFromUi;
window.exportPracticeTradeToJournal = exportPracticeTradeToJournal;
window.triggerVictoryConfetti = triggerVictoryConfetti;
window.executeDeployPracticeTrade = createPaperPosition;
window.executeFastDeploySignal = loadCopilotSetupIntoForm;
window.fastDeployLiveSignal = loadCopilotSetupIntoForm;
window.loadCopilotSetupIntoForm = loadCopilotSetupIntoForm;
window.loadCopilotSetupIntoJournal = loadCopilotSetupIntoJournal;
window.toggleSpreadMode = toggleSpreadMode;
window.toggleFeedMode = toggleFeedMode;
window.toggleTradeFeedMode = toggleTradeFeedMode;
window.exportClosedTradesToCsv = exportClosedTradesToCsv;
window.squareOffAllTrades = squareOffAllTrades;
window.loadPaperLab = loadPaperLab;
window.deskChannel = deskChannel;

initPaperLab();

export {
  initPaperLab,
  loadPaperLab,
  createPaperPosition,
  loadCopilotSetupIntoForm,
  loadCopilotSetupIntoJournal,
  syncLiveDeskFromForm,
};
