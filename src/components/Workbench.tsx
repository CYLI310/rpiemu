import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { RPiModel, CircuitComponent, Position, ComponentType, Wire } from '../types/index.ts';
import { gpioSimulator } from '../utils/gpioSimulator.ts';

interface WorkbenchProps {
    activeModel: RPiModel;
}

const MODEL_CONFIGS = {
    'RPi5': {
        width: 420,
        height: 280,
        color: '#111',
        ports: [
            { type: 'USBC', x: 0, y: 220, w: 30, h: 20 },
            { type: 'HDMI', x: 80, y: 250, w: 40, h: 30 },
            { type: 'HDMI', x: 140, y: 250, w: 40, h: 30 },
            { type: 'USB3', x: 400, y: 40, w: 20, h: 50 },
            { type: 'USB2', x: 400, y: 110, w: 20, h: 50 },
            { type: 'ETH', x: 400, y: 190, w: 20, h: 60 },
        ],
        chipPos: { x: 160, y: 100, w: 80, h: 80 },
        headerPos: { x: 40, y: 20, w: 340, h: 40 },
        label: 'MODEL 5'
    },
    'RPi4B': {
        width: 420,
        height: 280,
        color: '#111',
        ports: [
            { type: 'USBC', x: 0, y: 210, w: 30, h: 20 },
            { type: 'HDMI', x: 70, y: 250, w: 40, h: 30 },
            { type: 'HDMI', x: 120, y: 250, w: 40, h: 30 },
            { type: 'USB3', x: 400, y: 40, w: 20, h: 50 },
            { type: 'USB2', x: 400, y: 110, w: 20, h: 50 },
            { type: 'ETH', x: 400, y: 190, w: 20, h: 60 },
        ],
        chipPos: { x: 170, y: 120, w: 70, h: 70 },
        headerPos: { x: 40, y: 20, w: 340, h: 40 },
        label: 'MODEL 4B'
    },
    'RPi3B+': {
        width: 420,
        height: 280,
        color: '#111',
        ports: [
            { type: 'PWR', x: 0, y: 210, w: 30, h: 20 },
            { type: 'HDMI', x: 110, y: 250, w: 50, h: 30 },
            { type: 'USB2', x: 400, y: 40, w: 20, h: 50 },
            { type: 'ETH', x: 400, y: 180, w: 20, h: 60 },
        ],
        chipPos: { x: 180, y: 130, w: 60, h: 60 },
        headerPos: { x: 40, y: 20, w: 340, h: 40 },
        label: 'MODEL 3B+'
    },
    'RPiZeroW': {
        width: 340,
        height: 160,
        color: '#111',
        ports: [
            { type: 'PWR', x: 150, y: 140, w: 30, h: 20 },
            { type: 'DATA', x: 220, y: 140, w: 30, h: 20 },
            { type: 'HDMI', x: 40, y: 140, w: 40, h: 20 },
        ],
        chipPos: { x: 120, y: 50, w: 60, h: 60 },
        headerPos: { x: 20, y: 15, w: 300, h: 30 },
        label: 'ZERO W'
    }
};

const Workbench: React.FC<WorkbenchProps> = ({ activeModel }) => {
    const config = MODEL_CONFIGS[activeModel];
    const [components, setComponents] = useState<CircuitComponent[]>([]);
    const [wires, setWires] = useState<Wire[]>([]);
    const [boardPosition, setBoardPosition] = useState<Position>({ x: 150, y: 100 });
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [activeWire, setActiveWire] = useState<{ fromId: string; fromPin: string; mouseX: number; mouseY: number } | null>(null);
    const [, setUpdateTrigger] = useState(0);
    const workbenchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const pins = Array.from({ length: 28 }, (_, i) => i);
        pins.forEach(pin => {
            gpioSimulator.onPinChange(pin, () => {
                setUpdateTrigger(v => v + 1);
            });
        });
    }, []);

    const getLEDBrightness = (compId: string): number => {
        const connectedWires = wires.filter(w => w.toId === compId || w.fromId === compId);
        for (const wire of connectedWires) {
            const isRPi = wire.fromId === 'rpi' || wire.toId === 'rpi';
            if (isRPi) {
                const pin = wire.fromId === 'rpi' ? parseInt(wire.fromPin) : parseInt(wire.toPin);
                const pinState = gpioSimulator.getPinState(pin);
                if (pinState?.mode === 'OUT') return pinState.value;
                if (pinState?.mode === 'PWM' && pinState.pwmDutyCycle !== undefined) return pinState.pwmDutyCycle / 100;
            }
        }
        return 0;
    };

    const handleButtonPress = (compId: string, pressed: boolean) => {
        const connectedWires = wires.filter(w => w.toId === compId || w.fromId === compId);
        connectedWires.forEach(wire => {
            const isRPi = wire.fromId === 'rpi' || wire.toId === 'rpi';
            if (isRPi) {
                const pin = wire.fromId === 'rpi' ? parseInt(wire.fromPin) : parseInt(wire.toPin);
                if (gpioSimulator.getPinState(pin)?.mode === 'IN') {
                    gpioSimulator.digitalWrite(pin, pressed ? 1 : 0);
                }
            }
        });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const componentType = e.dataTransfer.getData('componentType') as ComponentType;
        if (!componentType || !workbenchRef.current) return;
        const rect = workbenchRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - 40;
        const y = e.clientY - rect.top - 20;
        const newComponent: CircuitComponent = {
            id: `comp-${Math.random().toString(36).substr(2, 9)}`,
            type: componentType,
            position: { x, y },
            props: {},
        };
        setComponents([...components, newComponent]);
    };

    const handlePinClick = (compId: string, pinId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeWire) {
            const rect = workbenchRef.current?.getBoundingClientRect();
            if (!rect) return;
            setActiveWire({
                fromId: compId,
                fromPin: pinId,
                mouseX: e.clientX - rect.left,
                mouseY: e.clientY - rect.top,
            });
        } else {
            if (activeWire.fromId === compId && activeWire.fromPin === pinId) {
                setActiveWire(null);
                return;
            }
            const newWire: Wire = {
                id: `wire-${Math.random().toString(36).substr(2, 9)}`,
                fromId: activeWire.fromId,
                fromPin: activeWire.fromPin,
                toId: compId,
                toPin: pinId,
                color: '#fff',
            };
            setWires([...wires, newWire]);
            setActiveWire(null);
        }
    };

    const getPinPos = (compId: string, pinId: string): Position => {
        if (compId === 'rpi') {
            const pinIndex = parseInt(pinId);
            const row = Math.floor(pinIndex / 2);
            const col = pinIndex % 2;
            const pinStep = activeModel === 'RPiZeroW' ? 14.5 : 16.5;
            return {
                x: boardPosition.x + config.headerPos.x + row * pinStep + (activeModel === 'RPiZeroW' ? 5 : 6),
                y: boardPosition.y + config.headerPos.y + col * pinStep + (activeModel === 'RPiZeroW' ? 5 : 6)
            };
        }
        const comp = components.find(c => c.id === compId);
        if (!comp) return { x: 0, y: 0 };
        const offsets: Record<string, Position[]> = {
            'LED': [{ x: 5, y: 15 }, { x: 45, y: 15 }],
            'Resistor': [{ x: 5, y: 10 }, { x: 55, y: 10 }],
            'Button': [{ x: 5, y: 35 }, { x: 35, y: 35 }],
            'Servo': [{ x: 10, y: 55 }, { x: 30, y: 55 }, { x: 50, y: 55 }],
            'Buzzer': [{ x: 10, y: 45 }, { x: 30, y: 45 }],
            'Potentiometer': [{ x: 10, y: 55 }, { x: 30, y: 55 }, { x: 50, y: 55 }],
            'OLED': [{ x: 5, y: 5 }, { x: 25, y: 5 }, { x: 45, y: 5 }, { x: 65, y: 5 }],
            'Breadboard': Array.from({ length: 75 }).map((_, i) => ({ x: 5 + (i % 15) * 6, y: 5 + Math.floor(i / 15) * 6 }))
        };
        const compOffs = offsets[comp.type] || [{ x: 20, y: 20 }];
        const idx = pinId.match(/^\d+$/) ? parseInt(pinId) : parseInt(pinId.slice(1)) - 1;
        const off = compOffs[idx % compOffs.length];
        return { x: comp.position.x + off.x + 5, y: comp.position.y + off.y + 5 };
    };

    return (
        <div ref={workbenchRef} className="workbench" onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            onMouseMove={e => {
                if (activeWire && workbenchRef.current) {
                    const rect = workbenchRef.current.getBoundingClientRect();
                    setActiveWire({ ...activeWire, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top });
                }
            }}
            onClick={() => { setActiveWire(null); setSelectedComponent(null); }}
            style={{ width: '100%', height: '100%', cursor: 'default' }}>

            <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '8px', zIndex: 100 }}>
                <button onClick={(e) => { e.stopPropagation(); setComponents([]); setWires([]); }} style={{ padding: '8px 16px', fontWeight: 900, fontSize: '0.6rem' }}>RESET_PROTOTYPE</button>
            </div>

            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                {wires.map(wire => {
                    const from = getPinPos(wire.fromId, wire.fromPin);
                    const to = getPinPos(wire.toId, wire.toPin);
                    return (
                        <g key={wire.id}>
                            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#fff" strokeWidth="1" />
                            <circle cx={from.x} cy={from.y} r="2" fill="#fff" />
                            <circle cx={to.x} cy={to.y} r="2" fill="#fff" />
                        </g>
                    );
                })}
                {activeWire && (
                    <line x1={getPinPos(activeWire.fromId, activeWire.fromPin).x} y1={getPinPos(activeWire.fromId, activeWire.fromPin).y} x2={activeWire.mouseX} y2={activeWire.mouseY} stroke="#fff" strokeWidth="1" strokeDasharray="4,4" />
                )}
            </svg>

            <motion.div drag dragMomentum={false} onDrag={(_, info) => setBoardPosition(p => ({ x: p.x + info.delta.x, y: p.y + info.delta.y }))}
                style={{
                    position: 'absolute', top: boardPosition.y, left: boardPosition.x, width: config.width, height: config.height,
                    backgroundColor: '#000', border: '1px solid #fff', cursor: 'grab', zIndex: 5, x: 0, y: 0
                }}>
                <div style={{ position: 'absolute', bottom: 10, right: 15, fontSize: '1.5rem', fontWeight: 900, color: '#222', userSelect: 'none' }}>{config.label}</div>

                <div style={{ position: 'absolute', top: config.headerPos.y, left: config.headerPos.x, width: config.headerPos.w, height: config.headerPos.h, background: '#111', border: '1px solid #333' }} />
                <div style={{ position: 'absolute', top: config.headerPos.y + 4, left: config.headerPos.x + 4, display: 'grid', gridTemplateColumns: `repeat(20, ${activeModel === 'RPiZeroW' ? '14.5px' : '16.5px'})`, gap: '1px' }}>
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} onClick={(e) => handlePinClick('rpi', i.toString(), e)}
                            style={{ width: 10, height: 10, backgroundColor: '#000', border: '1px solid #fff', cursor: 'pointer' }} />
                    ))}
                </div>

                <div style={{ position: 'absolute', left: config.chipPos.x, top: config.chipPos.y, width: config.chipPos.w, height: config.chipPos.h, border: '1px solid #333', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, color: '#333' }}>MCU</div>

                {config.ports.map((p, i) => (
                    <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, background: '#000', border: '1px solid #333', fontSize: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#222' }}>{p.type}</div>
                ))}
            </motion.div>

            {components.map((comp) => (
                <motion.div key={comp.id} drag dragMomentum={false}
                    onDrag={(_, info) => setComponents(prev => prev.map(c => c.id === comp.id ? { ...c, position: { x: c.position.x + info.delta.x, y: c.position.y + info.delta.y } } : c))}
                    onClick={e => { e.stopPropagation(); setSelectedComponent(comp.id); }}
                    style={{ position: 'absolute', left: comp.position.x, top: comp.position.y, zIndex: 20, cursor: 'grab', x: 0, y: 0 }}>

                    <div style={{ background: '#000', border: selectedComponent === comp.id ? '1px solid #fff' : '1px solid #444', padding: '12px', minWidth: '80px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                            {comp.type === 'LED' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div onClick={e => handlePinClick(comp.id, 'p1', e)} style={{ width: 10, height: 10, border: '1px solid #fff' }} />
                                    <div style={{ width: 24, height: 24, border: '1px solid #fff', background: getLEDBrightness(comp.id) > 0 ? '#fff' : '#000' }} />
                                    <div onClick={e => handlePinClick(comp.id, 'p2', e)} style={{ width: 10, height: 10, border: '1px solid #fff' }} />
                                </div>
                            )}
                            {comp.type === 'Button' && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div onMouseDown={() => handleButtonPress(comp.id, true)} onMouseUp={() => handleButtonPress(comp.id, false)}
                                        style={{ width: 32, height: 32, border: '1px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: 16, height: 16, border: '1px solid #fff' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div onClick={e => handlePinClick(comp.id, 'p1', e)} style={{ width: 8, height: 8, border: '1px solid #fff' }} />
                                        <div onClick={e => handlePinClick(comp.id, 'p2', e)} style={{ width: 8, height: 8, border: '1px solid #fff' }} />
                                    </div>
                                </div>
                            )}
                            {comp.type === 'Resistor' && (
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div onClick={e => handlePinClick(comp.id, 'p1', e)} style={{ width: 8, height: 8, border: '1px solid #fff' }} />
                                    <div style={{ width: 50, height: 4, background: '#fff' }} />
                                    <div onClick={e => handlePinClick(comp.id, 'p2', e)} style={{ width: 8, height: 8, border: '1px solid #fff' }} />
                                </div>
                            )}
                            {comp.type === 'Servo' && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: 40, height: 40, border: '1px solid #fff', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '30px', height: '4px', background: '#fff', transform: 'translate(-50%, -50%) rotate(45deg)' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[1, 2, 3].map(i => <div key={i} onClick={e => handlePinClick(comp.id, `p${i}`, e)} style={{ width: 8, height: 8, border: '1px solid #fff' }} />)}
                                    </div>
                                </div>
                            )}
                            {comp.type === 'OLED' && (
                                <div style={{ width: 80, height: 40, border: '1px solid #fff', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', gap: '4px', padding: '4px' }}>
                                        {[1, 2, 3, 4].map(i => <div key={i} onClick={e => handlePinClick(comp.id, `p${i}`, e)} style={{ width: 8, height: 8, border: '1px solid #fff' }} />)}
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.4rem' }}>DISP</div>
                                </div>
                            )}
                            {comp.type === 'Breadboard' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {Array.from({ length: 5 }).map((_, r) => (
                                        <div key={r} style={{ display: 'flex', gap: '2px' }}>
                                            {Array.from({ length: 15 }).map((_, c) => (
                                                <div key={c} onClick={e => handlePinClick(comp.id, `${r * 15 + c}`, e)}
                                                    style={{ width: 8, height: 8, border: '1px solid #444' }} />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {['Buzzer', 'Potentiometer'].includes(comp.type) && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: 32, height: 32, border: '1px solid #fff', borderRadius: comp.type === 'Buzzer' ? '50%' : '2px' }} />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[1, 2, 3].slice(0, comp.type === 'Buzzer' ? 2 : 3).map(i => <div key={i} onClick={e => handlePinClick(comp.id, `p${i}`, e)} style={{ width: 8, height: 8, border: '1px solid #fff' }} />)}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.5rem', fontWeight: 900 }}>{comp.type.toUpperCase()}</span>
                            <button onClick={e => { e.stopPropagation(); setComponents(prev => prev.filter(c => c.id !== comp.id)); }} style={{ border: 'none', fontSize: '0.5rem', fontWeight: 900 }}>[X]</button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default Workbench;
