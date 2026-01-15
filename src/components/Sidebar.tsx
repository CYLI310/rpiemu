import React from 'react';
import {
    Cpu,
    Lightbulb,
    Zap,
    Square,
    Grid3X3,
    RotateCw,
    Volume1,
    Activity,
    Monitor
} from 'lucide-react';
import type { RPiModel, ComponentType } from '../types/index.ts';

interface SidebarProps {
    activeModel: RPiModel;
    onModelChange: (model: RPiModel) => void;
}

const MODELS: { id: RPiModel; name: string }[] = [
    { id: 'RPi5', name: 'PI 5' },
    { id: 'RPi4B', name: 'PI 4B' },
    { id: 'RPi3B+', name: 'PI 3B+' },
    { id: 'RPiZeroW', name: 'PI ZERO' },
];

const COMPONENTS: { type: ComponentType; icon: React.ReactNode; label: string }[] = [
    { type: 'LED', icon: <Lightbulb size={20} />, label: 'LED' },
    { type: 'Resistor', icon: <Zap size={20} />, label: 'RESISTOR' },
    { type: 'Button', icon: <Square size={20} />, label: 'BUTTON' },
    { type: 'Breadboard', icon: <Grid3X3 size={20} />, label: 'BREAD' },
    { type: 'Servo', icon: <RotateCw size={20} />, label: 'SERVO' },
    { type: 'Buzzer', icon: <Volume1 size={20} />, label: 'BUZZER' },
    { type: 'Potentiometer', icon: <Activity size={20} />, label: 'POT' },
    { type: 'OLED', icon: <Monitor size={20} />, label: 'OLED' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeModel, onModelChange }) => {
    return (
        <div className="sidebar">
            <div style={{
                padding: '24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <Cpu size={24} />
                <h1 style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.05em' }}>PI<span style={{ color: 'var(--text-muted)' }}>FORGE</span></h1>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>HARDWARE</h2>
                    <div style={{ display: 'grid', gap: '4px' }}>
                        {MODELS.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => onModelChange(model.id)}
                                style={{
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    backgroundColor: activeModel === model.id ? 'var(--text-main)' : 'transparent',
                                    color: activeModel === model.id ? 'var(--bg-primary)' : 'var(--text-main)',
                                    border: '1px solid var(--border-color)',
                                }}
                            >
                                {model.name}
                            </button>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>COMPONENTS</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        {COMPONENTS.map((comp) => (
                            <div
                                key={comp.type}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('componentType', comp.type);
                                }}
                                style={{
                                    padding: '12px 8px',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'grab',
                                    background: 'var(--bg-secondary)'
                                }}
                            >
                                {comp.icon}
                                <span style={{ fontSize: '0.55rem', fontWeight: 800 }}>{comp.label}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    SYSTEM_READY // 2026.01.15
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
