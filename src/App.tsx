import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles/globals.css';
import Sidebar from './components/Sidebar.tsx';
import Workbench from './components/Workbench.tsx';
import Emulator from './components/Emulator.tsx';
import type { RPiModel, UIState } from './types/index.ts';

function App() {
  const [activeModel, setActiveModel] = useState<RPiModel>('RPi4B');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [uiState, setUiState] = useState<UIState>({
    showEmulator: true,
    showToolbar: true,
  });

  return (
    <div className="app-container" style={{ position: 'relative' }}>
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 250, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{ overflow: 'hidden', height: '100%', borderRight: '1px solid var(--border-color)' }}
          >
            <Sidebar
              activeModel={activeModel}
              onModelChange={setActiveModel}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            position: 'absolute',
            top: '24px',
            left: sidebarCollapsed ? '24px' : '12px',
            zIndex: 1000,
            padding: '8px',
            backgroundColor: 'var(--bg-primary)',
            fontSize: '0.6rem',
            fontWeight: 900
          }}
        >
          {sidebarCollapsed ? '>> EXPAND' : '<< COLLAPSE'}
        </button>

        <Workbench activeModel={activeModel} />

        {uiState.showEmulator && (
          <Emulator
            isOpen={uiState.showEmulator}
            onToggle={() => setUiState(prev => ({ ...prev, showEmulator: !prev.showEmulator }))}
          />
        )}
      </main>
    </div>
  );
}

export default App;
