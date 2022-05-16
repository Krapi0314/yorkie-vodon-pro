import createStore from 'zustand';
import { persist } from 'zustand/middleware';

const CURRENT_PERSIST_VERSION = 0;

interface StateData {
  arrowKeyJumpDistance: string;
  clearDrawingsOnPlay: boolean;
  showSetupInstructions: boolean;
  slowCPUMode: boolean;
}

interface State extends StateData {
  setArrowKeyJumpDistance: (seconds: string) => void;
  setShowSetupInstructions: (value: boolean) => void;
  toggleClearDrawingsOnPlay: () => void;
  toggleSlowCPUMode: () => void;
}

const emptyState: StateData = {
  arrowKeyJumpDistance: '10.00',
  clearDrawingsOnPlay: true,
  showSetupInstructions: true,
  slowCPUMode: false,
};

const serialize = (state: object) => {
  return JSON.stringify(state);
};

const deserialize = (str: string) => {
  return JSON.parse(str);
};

const useStore = createStore<State>(
  persist(
    (set) => ({
      setArrowKeyJumpDistance: (seconds) =>
        set(() => ({ arrowKeyJumpDistance: seconds })),
      setShowSetupInstructions: (value) =>
        set(() => ({ showSetupInstructions: value })),
      toggleClearDrawingsOnPlay: () =>
        set((state) => ({ clearDrawingsOnPlay: !state.clearDrawingsOnPlay })),
      toggleSlowCPUMode: () =>
        set((state) => ({ slowCPUMode: !state.slowCPUMode })),

      ...emptyState,
    }),
    {
      name: 'vodon-store-settings-v3',
      version: CURRENT_PERSIST_VERSION,
      serialize,
      deserialize,
    }
  )
);

export default useStore;
