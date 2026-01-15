import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Move, Link, Scissors } from 'lucide-react';
import './styles/globals.css';
import Sidebar from './components/Sidebar.tsx';
import Workbench from './components/Workbench.tsx';
import type { WorkbenchHandle } from './components/Workbench.tsx';
import Emulator from './components/Emulator.tsx';
import type { RPiModel, UIState, InteractionMode } from './types/index.ts';

const WIRE_COLORS = [
  { name: 'WHITE', hex: '#ffffff' },
  { name: 'RED', hex: '#ff4444' },
  { name: 'BLACK', hex: '#222222' },
  { name: 'GREEN', hex: '#44ff44' },
  { name: 'BLUE', hex: '#4444ff' },
  { name: 'YELLOW', hex: '#ffff44' },
];

function App() {
  const [activeModel, setActiveModel] = useState<RPiModel>('RPi4B');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('DRAG');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const workbenchRef = useRef<WorkbenchHandle>(null);
  const [uiState, setUiState] = useState<UIState>({
    showEmulator: true,
    showToolbar: true,
  });

  return (
    <div className="app-container" style={{ position: 'relative', display: 'flex', overflow: 'hidden' }}>
      {/* LEFT SIDEBAR */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 250, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{ overflow: 'hidden', height: '100%', borderRight: '1px solid var(--border-color)', flexShrink: 0 }}
          >
            <Sidebar
              activeModel={activeModel}
              onModelChange={setActiveModel}
              onAddComponent={(type) => workbenchRef.current?.addComponent(type)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN WORKBENCH AREA */}
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
            fontWeight: 900,
            border: '1px solid var(--border-color)'
          }}
        >
          {sidebarCollapsed ? '>> EXPAND' : '<< COLLAPSE'}
        </button>

        <Workbench ref={workbenchRef} activeModel={activeModel} interactionMode={interactionMode} selectedColor={selectedColor} />

        {/* RIGHT TOOLBAR */}
        <div style={{
          position: 'absolute',
          right: '24px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 1000,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          padding: '12px'
        }}>
          {/* Interaction Modes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.5rem', fontWeight: 900, color: 'var(--text-muted)' }}>INTERACTION</span>
            {[
              { id: 'DRAG', icon: <Move size={20} />, label: 'DRAG_MOV' },
              { id: 'WIRE', icon: <Link size={20} />, label: 'WIRE_CON' },
              { id: 'ERASE', icon: <Scissors size={20} />, label: 'ERA_DEL' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setInteractionMode(mode.id as InteractionMode)}
                style={{
                  width: '60px',
                  height: '60px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  backgroundColor: interactionMode === mode.id ? 'var(--text-main)' : 'transparent',
                  color: interactionMode === mode.id ? 'var(--bg-primary)' : 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.1s'
                }}
              >
                {mode.icon}
                <span style={{ fontSize: '0.45rem', fontWeight: 900 }}>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Color Picker (Only shown in WIRE mode or as a submenu) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <span style={{ fontSize: '0.5rem', fontWeight: 900, color: 'var(--text-muted)' }}>WIRE_COLOR</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
              {WIRE_COLORS.map(color => (
                <button
                  key={color.hex}
                  onClick={() => setSelectedColor(color.hex)}
                  style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: color.hex,
                    border: selectedColor === color.hex ? '2px solid #fff' : '1px solid #444',
                    padding: 0
                  }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>

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
