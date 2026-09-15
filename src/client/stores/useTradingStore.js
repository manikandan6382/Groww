import { create } from "zustand";
import { createNavigationSlice } from "./slices/createNavigationSlice";
import { createWatchlistSlice } from "./slices/createWatchlistSlice";
import { createPreferencesSlice } from "./slices/createPreferencesSlice";
import { createCoolingVaultSlice } from "./slices/createCoolingVaultSlice";
import { createOrderExecutionSlice } from "./slices/createOrderExecutionSlice";
import { createOrderSquareOffSlice } from "./slices/createOrderSquareOffSlice";
import { createSlManagementSlice } from "./slices/createSlManagementSlice";
import { createTpManagementSlice } from "./slices/createTpManagementSlice";
import { createPayMyselfSlice } from "./slices/createPayMyselfSlice";
import { createJournalSlice } from "./slices/createJournalSlice";
import { createTradeUndoSlice } from "./slices/createTradeUndoSlice";
import { createTradeSyncSlice } from "./slices/createTradeSyncSlice";
import { createTelemetrySlice } from "./slices/createTelemetrySlice";
import { initStoreSyncListeners } from "./slices/storeSyncListeners";

export { INDIAN_STOCK_META, getStockMeta } from "./slices/stockMetadata";
export {
  resolveIndexLotSize,
  calculateStatutoryCharges,
  CANONICAL_STRATEGY_TAGS,
  canonicalizeStrategyTag,
  isMarketWeekend,
  isMarketOpenHours,
} from "./slices/tradeHelpers";
export {
  INITIAL_OPEN_ALERTS,
  MASTER_INITIAL_TRADES,
  INITIAL_CLOSED_ALERTS,
  INITIAL_JOURNAL_TRADES,
} from "./slices/initialData";

export const useTradingStore = create((set, get) => ({
  ...createNavigationSlice(set, get),
  ...createWatchlistSlice(set, get),
  ...createPreferencesSlice(set, get),
  ...createCoolingVaultSlice(set, get),
  ...createOrderExecutionSlice(set, get),
  ...createOrderSquareOffSlice(set, get),
  ...createSlManagementSlice(set, get),
  ...createTpManagementSlice(set, get),
  ...createPayMyselfSlice(set, get),
  ...createJournalSlice(set, get),
  ...createTradeUndoSlice(set, get),
  ...createTradeSyncSlice(set, get),
  ...createTelemetrySlice(set, get),
}));

initStoreSyncListeners(useTradingStore);
