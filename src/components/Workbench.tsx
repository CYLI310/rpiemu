import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { motion } from 'framer-motion';
import type { RPiModel, CircuitComponent, Position, ComponentType, Wire, InteractionMode } from '../types/index.ts';
import { gpioSimulator } from '../utils/gpioSimulator.ts';

interface WorkbenchProps {
    activeModel: RPiModel;
    interactionMode: InteractionMode;
}

export interface WorkbenchHandle {
    addComponent: (type: ComponentType) => void;
}

interface PortConfig {
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    label?: string;
}

interface DetailConfig {
    type: 'RECT' | 'TEXT' | 'CIRCLE';
    x: number;
    y: number;
    w?: number;
    h?: number;
    r?: number;
    label?: string;
    text?: string;
}

interface ModelConfig {
    width: number;
    height: number;
    ports: PortConfig[];
    details: DetailConfig[];
    headerPos: { x: number; y: number; w: number; h: number };
    label: string;
}

const MODEL_CONFIGS: Record<RPiModel, ModelConfig> = {
    'RPi5': {
        width: 480, height: 320,
        ports: [
            { type: 'USB-C', x: 0, y: 220, w: 35, h: 25, label: 'POWER' },
            { type: 'HDMI', x: 90, y: 260, w: 45, h: 35, label: 'MICRO_A' },
            { type: 'HDMI', x: 160, y: 260, w: 45, h: 35, label: 'MICRO_B' },
            { type: 'USB3', x: 450, y: 50, w: 30, h: 60 },
            { type: 'USB2', x: 450, y: 130, w: 30, h: 60 },
            { type: 'ETH', x: 450, y: 220, w: 30, h: 70 },
        ],
        details: [
            { type: 'RECT', x: 180, y: 110, w: 90, h: 90, label: 'BCM2712' },
            { type: 'RECT', x: 80, y: 50, w: 40, h: 40, label: 'PMIC' },
            { type: 'RECT', x: 320, y: 210, w: 50, h: 50, label: 'RP1' },
            { type: 'TEXT', x: 20, y: 290, text: 'RASPBERRY PI 5 // MODEL v1.0' },
            { type: 'CIRCLE', x: 30, y: 30, r: 10 },
            { type: 'CIRCLE', x: 450, y: 30, r: 10 },
            { type: 'CIRCLE', x: 30, y: 290, r: 10 },
        ],
        headerPos: { x: 50, y: 20, w: 340, h: 30 },
        label: 'PI 5'
    },
    'RPi4B': {
        width: 480, height: 320,
        ports: [
            { type: 'USB-C', x: 0, y: 220, w: 35, h: 25 },
            { type: 'HDMI', x: 80, y: 260, w: 40, h: 35 },
            { type: 'HDMI', x: 140, y: 260, w: 40, h: 35 },
            { type: 'USB3', x: 450, y: 50, w: 30, h: 60 },
            { type: 'USB2', x: 450, y: 130, w: 30, h: 60 },
            { type: 'ETH', x: 450, y: 220, w: 30, h: 70 },
        ],
        details: [
            { type: 'RECT', x: 200, y: 140, w: 80, h: 80, label: 'BCM2711' },
            { type: 'RECT', x: 200, y: 50, w: 60, h: 60, label: 'RAM' },
            { type: 'TEXT', x: 20, y: 290, text: 'RASPBERRY PI 4B // MODEL v1.5' },
        ],
        headerPos: { x: 50, y: 20, w: 340, h: 30 },
        label: 'PI 4B'
    },
    'RPi3B+': {
        width: 480, height: 320,
        ports: [
            { type: 'PWR', x: 0, y: 220, w: 35, h: 25 },
            { type: 'HDMI', x: 120, y: 260, w: 60, h: 35 },
            { type: 'USB2', x: 450, y: 50, w: 30, h: 60 },
            { type: 'ETH', x: 450, y: 180, w: 30, h: 70 },
        ],
        details: [
            { type: 'RECT', x: 210, y: 150, w: 70, h: 70, label: 'BCM2837B0' },
            { type: 'RECT', x: 80, y: 100, w: 50, h: 50, label: 'WIFI' },
            { type: 'TEXT', x: 20, y: 290, text: 'RASPBERRY PI 3B+ // MODEL v1.2' },
        ],
        headerPos: { x: 50, y: 20, w: 340, h: 30 },
        label: 'PI 3B+'
    },
    'RPiZeroW': {
        width: 380, height: 180,
        ports: [
            { type: 'PWR', x: 180, y: 155, w: 35, h: 25 },
            { type: 'DATA', x: 260, y: 155, w: 35, h: 25 },
            { type: 'HDMI', x: 50, y: 155, w: 50, h: 25 },
        ],
        details: [
            { type: 'RECT', x: 140, y: 60, w: 70, h: 70, label: 'BCM2835' },
            { type: 'RECT', x: 40, y: 60, w: 40, h: 40, label: 'WIFI' },
            { type: 'TEXT', x: 20, y: 155, text: 'PI ZERO W // v1.1' },
        ],
        headerPos: { x: 30, y: 20, w: 320, h: 30 },
        label: 'ZERO W'
    }
};

const Workbench = forwardRef<WorkbenchHandle, WorkbenchProps>(({ activeModel, interactionMode }, ref) => {
    const config = MODEL_CONFIGS[activeModel];
    const [components, setComponents] = useState<CircuitComponent[]>([]);
    const [wires, setWires] = useState<Wire[]>([]);
    const [boardPosition, setBoardPosition] = useState<Position>({ x: 300, y: 150 });
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [activeWire, setActiveWire] = useState<{ fromId: string; fromPin: string; mouseX: number; mouseY: number } | null>(null);
    const [, setUpdateTrigger] = useState(0);
    const workbenchRef = useRef<HTMLDivElement>(null);
    const idCounter = useRef(0);

    useImperativeHandle(ref, () => ({
        addComponent: (type: ComponentType) => {
            const newComponent: CircuitComponent = {
                id: `comp-${idCounter.current++}`,
                type,
                position: { x: 150 + Math.random() * 50, y: 150 + Math.random() * 50 },
                props: {},
            };
            setComponents(prev => [...prev, newComponent]);
        }
    }));

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

    const handlePinClick = (compId: string, pinId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (interactionMode !== 'WIRE') return;

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
                id: `wire-${idCounter.current++}`,
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

    const handleRemoveComponent = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setComponents(prev => prev.filter(c => c.id !== id));
        setWires(prev => prev.filter(w => w.fromId !== id && w.toId !== id));
    };

    const handleRemoveWire = (id: string) => {
        if (interactionMode === 'ERASE') {
            setWires(prev => prev.filter(w => w.id !== id));
        }
    };

    const getPinPos = (compId: string, pinId: string): Position => {
        if (compId === 'rpi') {
            const pinIndex = parseInt(pinId);
            const row = Math.floor(pinIndex / 2);
            const col = pinIndex % 2;
            const pinStep = activeModel === 'RPiZeroW' ? 15.5 : 16.8;
            return {
                x: boardPosition.x + config.headerPos.x + row * pinStep + 8,
                y: boardPosition.y + config.headerPos.y + col * pinStep + 8
            };
        }
        const comp = components.find(c => c.id === compId);
        if (!comp) return { x: 0, y: 0 };

        const offsets: Record<string, Position[]> = {
            'LED': [{ x: 5, y: 15 }, { x: 45, y: 15 }],
            'Resistor': [{ x: 5, y: 10 }, { x: 55, y: 10 }],
            'Button': [{ x: 5, y: 35 }, { x: 35, y: 35 }],
            'Breadboard': Array.from({ length: 75 }).map((_, i) => ({ x: 5 + (i % 15) * 8, y: 5 + Math.floor(i / 15) * 8 }))
        };

        const compOffs = offsets[comp.type] || [{ x: 10, y: 40 }, { x: 30, y: 40 }, { x: 50, y: 40 }];
        const idx = pinId.match(/^\d+$/) ? parseInt(pinId) : parseInt(pinId.slice(1)) - 1;
        const off = compOffs[idx % compOffs.length];
        return { x: comp.position.x + off.x + 12, y: comp.position.y + off.y + 12 };
    };

    const renderComponentContent = (comp: CircuitComponent) => {
        switch (comp.type) {
            case 'LED':
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div onClick={e => handlePinClick(comp.id, 'p1', e)} style={{ width: 12, height: 12, border: '1px solid #fff', cursor: interactionMode === 'WIRE' ? 'crosshair' : 'default' }} />
                        <div style={{ width: 24, height: 24, border: '1px solid #fff', background: getLEDBrightness(comp.id) > 0 ? '#fff' : '#000' }} />
                        <div onClick={e => handlePinClick(comp.id, 'p2', e)} style={{ width: 12, height: 12, border: '1px solid #fff', cursor: interactionMode === 'WIRE' ? 'crosshair' : 'default' }} />
                    </div>
                );
            case 'Button':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div onMouseDown={() => handleButtonPress(comp.id, true)} onMouseUp={() => handleButtonPress(comp.id, false)}
                            style={{ width: 32, height: 32, border: '1px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 16, height: 16, border: '1px solid #fff' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div onClick={e => handlePinClick(comp.id, 'p1', e)} style={{ width: 10, height: 10, border: '1px solid #fff', cursor: interactionMode === 'WIRE' ? 'crosshair' : 'default' }} />
                            <div onClick={e => handlePinClick(comp.id, 'p2', e)} style={{ width: 10, height: 10, border: '1px solid #fff', cursor: interactionMode === 'WIRE' ? 'crosshair' : 'default' }} />
                        </div>
                    </div>
                );
            case 'Resistor':
                return (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div onClick={e => handlePinClick(comp.id, 'p1', e)} style={{ width: 10, height: 10, border: '1px solid #fff', cursor: interactionMode === 'WIRE' ? 'crosshair' : 'default' }} />
                        <div style={{ width: 50, height: 4, background: '#fff' }} />
                        <div onClick={e => handlePinClick(comp.id, 'p2', e)} style={{ width: 10, height: 10, border: '1px solid #fff', cursor: interactionMode === 'WIRE' ? 'crosshair' : 'default' }} />
                    </div>
                );
            case 'Breadboard':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {Array.from({ length: 5 }).map((_, r) => (
                            <div key={r} style={{ display: 'flex', gap: '4px' }}>
                                {Array.from({ length: 15 }).map((_, c) => (
                                    <div key={c} onClick={e => handlePinClick(comp.id, `${r * 15 + c}`, e)}
                                        style={{ width: 8, height: 8, border: '1px solid #333', cursor: interactionMode === 'WIRE' ? 'crosshair' : 'default' }} />
                                ))}
                            </div>
                        ))}
                    </div>
                );
            default:
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 70, height: 40, border: '1px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', fontWeight: 900, textAlign: 'center', padding: '4px' }}>
                            {comp.type}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} onClick={e => handlePinClick(comp.id, `p${i}`, e)} style={{ width: 10, height: 10, border: '1px solid #fff', cursor: interactionMode === 'WIRE' ? 'crosshair' : 'default' }} />
                            ))}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div ref={workbenchRef} className="workbench" style={{ width: '100%', height: '100%', cursor: interactionMode === 'WIRE' ? 'crosshair' : 'default' }}
            onMouseMove={e => {
                if (activeWire && workbenchRef.current) {
                    const rect = workbenchRef.current.getBoundingClientRect();
                    setActiveWire({ ...activeWire, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top });
                }
            }}
            onClick={() => { setActiveWire(null); setSelectedComponent(null); }}>

            <div style={{ position: 'absolute', top: '24px', right: '110px', display: 'flex', gap: '8px', zIndex: 100 }}>
                <button onClick={(e) => { e.stopPropagation(); setComponents([]); setWires([]); }} style={{ padding: '8px 16px', fontWeight: 900, fontSize: '0.6rem', border: '1px solid #fff' }}>CLEAR_BOARD</button>
            </div>

            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                {wires.map(wire => {
                    const from = getPinPos(wire.fromId, wire.fromPin);
                    const to = getPinPos(wire.toId, wire.toPin);
                    return (
                        <g key={wire.id} style={{ pointerEvents: interactionMode === 'ERASE' ? 'auto' : 'none', cursor: 'pointer' }} onClick={() => handleRemoveWire(wire.id)}>
                            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#fff" strokeWidth={interactionMode === 'ERASE' ? "4" : "1.5"} opacity={interactionMode === 'ERASE' ? 0.3 : 1} />
                            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#fff" strokeWidth="1.5" />
                            <circle cx={from.x} cy={from.y} r="3" fill="#fff" />
                            <circle cx={to.x} cy={to.y} r="3" fill="#fff" />
                        </g>
                    );
                })}
                {activeWire && (
                    <line x1={getPinPos(activeWire.fromId, activeWire.fromPin).x} y1={getPinPos(activeWire.fromId, activeWire.fromPin).y} x2={activeWire.mouseX} y2={activeWire.mouseY} stroke="#fff" strokeWidth="1.5" strokeDasharray="6,4" />
                )}
            </svg>

            <motion.div
                drag={interactionMode === 'DRAG'}
                dragMomentum={false}
                onDrag={(_, info) => setBoardPosition(p => ({ x: p.x + info.delta.x, y: p.y + info.delta.y }))}
                style={{
                    position: 'absolute', top: boardPosition.y, left: boardPosition.x, width: config.width, height: config.height,
                    backgroundColor: '#000', border: '2px solid #fff', cursor: interactionMode === 'DRAG' ? 'grab' : 'default', zIndex: 5, x: 0, y: 0
                }}
            >
                {config.details.map((d, i) => (
                    <div key={i} style={{ position: 'absolute', left: d.x, top: d.y, pointerEvents: 'none' }}>
                        {d.type === 'RECT' && (
                            <div style={{ width: d.w || 0, height: d.h || 0, border: '1px solid #333', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 900, color: '#333' }}>
                                {d.label}
                            </div>
                        )}
                        {d.type === 'TEXT' && (
                            <div style={{ fontSize: '0.5rem', fontWeight: 900, color: '#222', letterSpacing: '0.1em' }}>{d.text}</div>
                        )}
                        {d.type === 'CIRCLE' && (
                            <div style={{ width: (d.r ?? 0) * 2, height: (d.r ?? 0) * 2, borderRadius: '50%', border: '1px solid #222' }} />
                        )}
                    </div>
                ))}

                {config.ports.map((p, i) => (
                    <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.w, height: p.h, background: '#000', border: '1px solid #444', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: '0.4rem', color: '#222', fontWeight: 900 }}>{p.type}</div>
                        {p.label && <div style={{ fontSize: '0.3rem', color: '#111' }}>{p.label}</div>}
                    </div>
                ))}

                <div style={{ position: 'absolute', bottom: 15, right: 20, fontSize: '2rem', fontWeight: 900, color: '#111', userSelect: 'none' }}>{config.label}</div>

                <div style={{ position: 'absolute', top: config.headerPos.y, left: config.headerPos.x, width: config.headerPos.w, height: config.headerPos.h, background: '#0a0a0a', border: '1px solid #444' }} />
                <div style={{ position: 'absolute', top: config.headerPos.y + 4, left: config.headerPos.x + 4, display: 'grid', gridTemplateColumns: `repeat(20, ${activeModel === 'RPiZeroW' ? '15.5px' : '16.8px'})`, gap: '1px' }}>
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} onClick={(e) => handlePinClick('rpi', i.toString(), e)}
                            style={{ width: 12, height: 12, backgroundColor: '#000', border: '1px solid #fff', cursor: interactionMode === 'WIRE' ? 'crosshair' : 'default' }}
                            title={`PIN_${i}`} />
                    ))}
                </div>
            </motion.div>

            {components.map((comp) => (
                <motion.div key={comp.id}
                    drag={interactionMode === 'DRAG'}
                    dragMomentum={false}
                    onDrag={(_, info) => setComponents(prev => prev.map(c => c.id === comp.id ? { ...c, position: { x: c.position.x + info.delta.x, y: c.position.y + info.delta.y } } : c))}
                    onClick={e => { e.stopPropagation(); setSelectedComponent(comp.id); }}
                    style={{ position: 'absolute', left: comp.position.x, top: comp.position.y, zIndex: 20, cursor: interactionMode === 'DRAG' ? 'grab' : 'default', x: 0, y: 0 }}>

                    <div style={{ background: '#000', border: selectedComponent === comp.id ? '2px solid #fff' : '1.5px solid #444', padding: '16px', position: 'relative' }}>
                        {interactionMode === 'ERASE' && (
                            <button
                                onClick={(e) => handleRemoveComponent(comp.id, e)}
                                style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', background: '#fff', color: '#000', border: 'none', borderRadius: '50%', fontSize: '0.6rem', fontWeight: 900, zIndex: 30 }}
                            >
                                X
                            </button>
                        )}
                        {renderComponentContent(comp)}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '12px' }}>
                            <span style={{ fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.05em' }}>{comp.type}</span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
});

export default Workbench;
