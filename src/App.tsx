import { useState } from 'react';
import './styles/globals.css';
import Sidebar from './components/Sidebar.tsx';
import Workbench from './components/Workbench.tsx';
import Emulator from './components/Emulator.tsx';
import type { RPiModel, UIState } from './types/index.ts';

function App() {
  const [activeModel, setActiveModel] = useState<RPiModel>('RPi4B');
  const [uiState, setUiState] = useState<UIState>({
    showEmulator: true,
    showToolbar: true,
  });

  return (
    <div className="app-container">
      <Sidebar
        activeModel={activeModel}
        onModelChange={setActiveModel}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
