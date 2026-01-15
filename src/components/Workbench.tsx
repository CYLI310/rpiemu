import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RPiModel, CircuitComponent, Position, ComponentType, Wire } from '../types/index.ts';
import { Trash2, Share2, Info, Settings2, X } from 'lucide-react';
import { gpioSimulator } from '../utils/gpioSimulator.ts';

interface WorkbenchProps {
    activeModel: RPiModel;
}

const MODEL_CONFIGS = {
    'RPi5': {
        width: 450,
        height: 320,
        color: '#1a4d2e',
        ports: [
            { type: 'USB-C', x: 20, y: 260, w: 40, h: 25 },
            { type: 'MicroHDMI', x: 100, y: 285, w: 30, h: 20 },
            { type: 'MicroHDMI', x: 150, y: 285, w: 30, h: 20 },
            { type: 'USB3', x: 420, y: 50, w: 45, h: 60 },
            { type: 'USB2', x: 420, y: 130, w: 45, h: 60 },
            { type: 'Ethernet', x: 420, y: 220, w: 45, h: 60 },
        ],
        chipPos: { x: 150, y: 130, w: 90, h: 90 },
        headerPos: { x: 30, y: 35, w: 370, h: 45 },
        label: 'RPi 5'
    },
    'RPi4B': {
        width: 440,
        height: 310,
        color: '#0a4d29',
        ports: [
            { type: 'USB-C', x: 20, y: 250, w: 40, h: 25 },
            { type: 'MicroHDMI', x: 90, y: 280, w: 30, h: 20 },
            { type: 'MicroHDMI', x: 140, y: 280, w: 30, h: 20 },
            { type: 'USB3', x: 410, y: 50, w: 45, h: 60 },
            { type: 'USB2', x: 410, y: 130, w: 45, h: 60 },
            { type: 'Ethernet', x: 410, y: 210, w: 45, h: 60 },
        ],
        chipPos: { x: 160, y: 140, w: 80, h: 80 },
        headerPos: { x: 25, y: 30, w: 365, h: 40 },
        label: 'RPi 4B'
    },
    'RPi3B+': {
        width: 440,
        height: 310,
        color: '#064020',
        ports: [
            { type: 'MicroUSB', x: 20, y: 250, w: 35, h: 20 },
            { type: 'HDMI', x: 120, y: 275, w: 50, h: 30 },
            { type: 'USB2', x: 410, y: 50, w: 45, h: 55 },
            { type: 'USB2', x: 410, y: 120, w: 45, h: 55 },
            { type: 'Ethernet', x: 410, y: 200, w: 45, h: 65 },
        ],
        chipPos: { x: 170, y: 150, w: 70, h: 70 },
        headerPos: { x: 25, y: 30, w: 365, h: 40 },
        label: 'RPi 3B+'
    },
    'RPiZeroW': {
        width: 380,
        height: 180,
        color: '#1a422a',
        ports: [
            { type: 'MicroUSB', x: 150, y: 165, w: 30, h: 18 },
            { type: 'USB-OTG', x: 220, y: 165, w: 30, h: 18 },
            { type: 'MiniHDMI', x: 50, y: 165, w: 40, h: 20 },
        ],
        chipPos: { x: 130, y: 50, w: 60, h: 60 },
        headerPos: { x: 20, y: 15, w: 340, h: 30 },
        label: 'Pi Zero W'
    }
};

const Workbench: React.FC<WorkbenchProps> = ({ activeModel }) => {
    const config = MODEL_CONFIGS[activeModel];
    const [components, setComponents] = useState<CircuitComponent[]>([]);
    const [wires, setWires] = useState<Wire[]>([]);
    const [boardPosition, setBoardPosition] = useState<Position>({ x: 100, y: 100 });
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
    const [activeWire, setActiveWire] = useState<{ fromId: string; fromPin: string; mouseX: number; mouseY: number } | null>(null);
    const [gpioPinStates, setGpioPinStates] = useState<Map<number, number>>(new Map());
    const workbenchRef = useRef<HTMLDivElement>(null);

    // Setup GPIO listeners
    React.useEffect(() => {
        // Listen to all GPIO pins
        for (let pin = 0; pin <= 27; pin++) {
            gpioSimulator.onPinChange(pin, (value) => {
                setGpioPinStates(prev => new Map(prev).set(pin, value));
            });
        }
    }, []);

    // Get LED brightness based on connected GPIO pin
    const getLEDBrightness = (compId: string): number => {
        // Find wires connected to this component
        const connectedWires = wires.filter(w => w.toId === compId || w.fromId === compId);

        for (const wire of connectedWires) {
            // Check if connected to RPi GPIO
            if (wire.fromId === 'rpi') {
                const gpioPin = parseInt(wire.fromPin);
                const pinState = gpioSimulator.getPinState(gpioPin);
                if (pinState && pinState.mode === 'OUT') {
                    return pinState.value;
                } else if (pinState && pinState.mode === 'PWM' && pinState.pwmDutyCycle !== undefined) {
                    return pinState.pwmDutyCycle / 100;
                }
            } else if (wire.toId === 'rpi') {
                const gpioPin = parseInt(wire.toPin);
                const pinState = gpioSimulator.getPinState(gpioPin);
                if (pinState && pinState.mode === 'OUT') {
                    return pinState.value;
                } else if (pinState && pinState.mode === 'PWM' && pinState.pwmDutyCycle !== undefined) {
                    return pinState.pwmDutyCycle / 100;
                }
            }
        }
        return 0;
    };
    const getButtonState = (compId: string): number => {
        const connectedWires = wires.filter(w => w.toId === compId || w.fromId === compId);
        for (const wire of connectedWires) {
            if (wire.fromId === 'rpi') {
                return gpioSimulator.digitalRead(parseInt(wire.fromPin));
            } else if (wire.toId === 'rpi') {
                return gpioSimulator.digitalRead(parseInt(wire.toPin));
            }
        }
        return 0;
    };

    const handleButtonPress = (compId: string, pressed: boolean) => {
        const connectedWires = wires.filter(w => w.toId === compId || w.fromId === compId);
        connectedWires.forEach(wire => {
            if (wire.fromId === 'rpi') {
                const pin = parseInt(wire.fromPin);
                if (gpioSimulator.getPinState(pin)?.mode === 'IN') {
                    gpioSimulator.digitalWrite(pin, pressed ? 1 : 0);
                }
            } else if (wire.toId === 'rpi') {
                const pin = parseInt(wire.toPin);
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
        const x = e.clientX - rect.left - 30;
        const y = e.clientY - rect.top - 30;

        const newComponent: CircuitComponent = {
            id: `comp-${Math.random().toString(36).substr(2, 9)}`,
            type: componentType,
            position: { x, y },
            props: componentType === 'LED' ? { color: '#ff4444' } : componentType === 'Resistor' ? { value: '220Ω' } : {},
        };

        setComponents([...components, newComponent]);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
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
                color: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)],
            };
            setWires([...wires, newWire]);
            setActiveWire(null);
        }
    };

    const updateMousePos = (e: React.MouseEvent) => {
        if (activeWire && workbenchRef.current) {
            const rect = workbenchRef.current.getBoundingClientRect();
            setActiveWire({
                ...activeWire,
                mouseX: e.clientX - rect.left,
                mouseY: e.clientY - rect.top,
            });
        }
    };

    const getPinPos = (compId: string, pinId: string): Position => {
        if (compId === 'rpi') {
            const pinIndex = parseInt(pinId);
            const row = Math.floor(pinIndex / 2);
            const col = pinIndex % 2;
            return {
                x: boardPosition.x + config.headerPos.x + row * (activeModel === 'RPiZeroW' ? 16.5 : 18) + (activeModel === 'RPiZeroW' ? 5 : 9),
                y: boardPosition.y + config.headerPos.y + col * (activeModel === 'RPiZeroW' ? 16.5 : 18) + (activeModel === 'RPiZeroW' ? 5 : 9)
            };
        }

        const comp = components.find(c => c.id === compId);
        if (!comp) return { x: 0, y: 0 };

        if (comp.type === 'LED') {
            const pinOffset = pinId === 'p1' ? 12 : 36;
            return { x: comp.position.x + pinOffset + 6, y: comp.position.y + 45 + 6 };
        }
        if (comp.type === 'Resistor') {
            const pinOffset = pinId === 'p1' ? 5 : 55;
            return { x: comp.position.x + pinOffset + 6, y: comp.position.y + 15 + 6 };
        }
        return { x: comp.position.x + 30, y: comp.position.y + 30 };
    };

    return (
        <div
            ref={workbenchRef}
            className="workbench"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onMouseMove={updateMousePos}
            onClick={() => { setActiveWire(null); setSelectedComponent(null); }}
            style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                background: 'radial-gradient(circle at center, #1a1a1f 0.5px, transparent 0.5px)',
                backgroundSize: '30px 30px',
                backgroundColor: '#0a0a0c'
            }}
        >
            {/* Workbench Tools */}
            <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '8px', zIndex: 50 }}>
                <button className="glass-panel" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-main)' }}>
                    <Share2 size={16} /> Export
                </button>
                <button onClick={() => { setComponents([]); setWires([]); }} className="glass-panel" style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 500, color: '#ef4444' }}>
                    <Trash2 size={16} /> Reset
                </button>
            </div>

            {/* SVG Wire Layer */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                {wires.map(wire => {
                    const from = getPinPos(wire.fromId, wire.fromPin);
                    const to = getPinPos(wire.toId, wire.toPin);
                    const cp1x = from.x;
                    const cp1y = from.y + (to.y > from.y ? 50 : -50);
                    const cp2x = to.x;
                    const cp2y = to.y + (to.y > from.y ? -50 : 50);

                    return (
                        <g key={wire.id}>
                            <path
                                d={`M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`}
                                stroke="rgba(0,0,0,0.3)"
                                strokeWidth="6"
                                fill="none"
                                strokeLinecap="round"
                            />
                            <path
                                d={`M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`}
                                stroke={wire.color}
                                strokeWidth="3"
                                fill="none"
                                strokeLinecap="round"
                                style={{ filter: 'url(#glow)' }}
                            />
                        </g>
                    );
                })}
                {activeWire && (
                    <path
                        d={`M ${getPinPos(activeWire.fromId, activeWire.fromPin).x} ${getPinPos(activeWire.fromId, activeWire.fromPin).y} L ${activeWire.mouseX} ${activeWire.mouseY}`}
                        stroke="var(--accent-primary)"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        fill="none"
                        opacity="0.6"
                    />
                )}
            </svg>

            <motion.div
                layoutId="rpi-board"
                drag
                dragMomentum={false}
                onDrag={(_, info) => {
                    setBoardPosition(prev => ({
                        x: prev.x + info.delta.x,
                        y: prev.y + info.delta.y
                    }));
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                whileHover={{ cursor: 'grab' }}
                whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
                style={{
                    position: 'absolute',
                    top: boardPosition.y,
                    left: boardPosition.x,
                    width: `${config.width}px`,
                    height: `${config.height}px`,
                    backgroundColor: config.color,
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '12px 12px',
                    borderRadius: '16px',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
                    padding: '20px',
                    border: '3px solid rgba(0,0,0,0.2)',
                    zIndex: 1,
                    touchAction: 'none'
                }}
            >
                {/* Drag Handle Overlay (Subtle) */}
                <div style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)', width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />
                <div style={{ color: 'white', fontWeight: 800, opacity: 0.05, position: 'absolute', bottom: '20px', right: '25px', fontSize: '3.5rem', fontStyle: 'italic', letterSpacing: '-0.05em' }}>
                    {config.label}
                </div>

                {/* GPIO Header */}
                <div style={{
                    position: 'absolute',
                    top: `${config.headerPos.y}px`,
                    left: `${config.headerPos.x}px`,
                    width: `${config.headerPos.w}px`,
                    height: `${config.headerPos.h}px`,
                    background: '#1a1a1f',
                    borderRadius: '4px',
                    border: '2px solid #2a2a2f',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
                }} />

                <div style={{
                    position: 'absolute',
                    top: `${config.headerPos.y + 4}px`,
                    left: `${config.headerPos.x + 5}px`,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${activeModel === 'RPiZeroW' ? 20 : 20}, ${activeModel === 'RPiZeroW' ? '16.5px' : '18px'})`,
                    gap: activeModel === 'RPiZeroW' ? '0.5px' : '1px',
                }}>
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div
                                onClick={(e) => handlePinClick('rpi', i.toString(), e)}
                                style={{
                                    width: activeModel === 'RPiZeroW' ? '10px' : '12px',
                                    height: activeModel === 'RPiZeroW' ? '10px' : '12px',
                                    backgroundColor: '#ffd700',
                                    borderRadius: '50%',
                                    border: '1px solid #b8860b',
                                    cursor: 'pointer',
                                    transition: 'all 0.1s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                }}
                                className="gpio-pin"
                                title={`Pin ${i + 1}`}
                            />
                        </div>
                    ))}
                </div>

                {/* Ports */}
                {config.ports.map((port, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            left: `${port.x}px`,
                            top: `${port.y}px`,
                            width: `${port.w}px`,
                            height: `${port.h}px`,
                            background: port.type.includes('USB3') ? '#0066cc' : '#222',
                            borderRadius: '4px',
                            border: '1px solid #444',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.5rem',
                            color: '#666',
                            overflow: 'hidden'
                        }}
                        title={port.type}
                    >
                        {port.type}
                    </div>
                ))}

                {/* Chip */}
                <div
                    className="board-chip"
                    style={{
                        position: 'absolute',
                        left: `${config.chipPos.x}px`,
                        top: `${config.chipPos.y}px`,
                        width: `${config.chipPos.w}px`,
                        height: `${config.chipPos.h}px`,
                        background: 'linear-gradient(135deg, #2a2a2f, #111)',
                        borderRadius: '8px',
                        border: '1px solid #333',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6rem',
                        color: '#888',
                        fontWeight: 700,
                        boxShadow: '0 10px 20px rgba(0,0,0,0.5)'
                    }}
                >
                    <div style={{ opacity: 0.5 }}>BROADCOM</div>
                    <div style={{ fontSize: '0.5rem', opacity: 0.3 }}>BCM2712</div>
                </div>
            </motion.div>

            {/* Components */}
            <AnimatePresence>
                {components.map((comp) => (
                    <motion.div
                        key={comp.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        drag
                        dragMomentum={false}
                        onDrag={(_, info) => {
                            const newPos = {
                                x: comp.position.x + info.delta.x,
                                y: comp.position.y + info.delta.y
                            };
                            setComponents(prev => prev.map(c => c.id === comp.id ? { ...c, position: newPos } : c));
                        }}
                        onClick={(e) => { e.stopPropagation(); setSelectedComponent(comp.id); }}
                        style={{
                            position: 'absolute',
                            left: comp.position.x,
                            top: comp.position.y,
                            zIndex: 5,
                            cursor: 'grab',
                        }}
                    >
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'rgba(23, 23, 26, 0.95)',
                            backdropFilter: 'blur(12px)',
                            border: selectedComponent === comp.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: '0 12px 24px rgba(0,0,0,0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            minWidth: '100px',
                        }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                {comp.type === 'LED' && (
                                    <>
                                        <div onClick={(e) => handlePinClick(comp.id, 'p1', e)} style={{ width: '14px', height: '14px', backgroundColor: '#333', borderRadius: '2px', cursor: 'pointer', border: '1px solid #555' }} />
                                        <div
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                backgroundColor: comp.props?.color || '#ff4444',
                                                filter: `brightness(${0.3 + (getLEDBrightness(comp.id) * 1.5)})`,
                                                boxShadow: getLEDBrightness(comp.id) > 0
                                                    ? `0 0 ${10 + getLEDBrightness(comp.id) * 20}px ${comp.props?.color || '#ff4444'}`
                                                    : 'none',
                                                border: '2px solid rgba(255,255,255,0.2)',
                                                transition: 'all 0.1s ease-out'
                                            }}
                                        />
                                        <div onClick={(e) => handlePinClick(comp.id, 'p2', e)} style={{ width: '14px', height: '14px', backgroundColor: '#333', borderRadius: '2px', cursor: 'pointer', border: '1px solid #555' }} />
                                    </>
                                )}
                                {comp.type === 'Resistor' && (
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <div onClick={(e) => handlePinClick(comp.id, 'p1', e)} style={{ width: '10px', height: '10px', backgroundColor: '#333', borderRadius: '2px', cursor: 'pointer' }} />
                                        <div style={{ width: '60px', height: '18px', background: '#d2b48c', borderRadius: '8px', border: '1px solid #8b4513', display: 'flex', justifyContent: 'space-around', padding: '0 10px', alignItems: 'center' }}>
                                            <div style={{ height: '100%', width: '4px', backgroundColor: '#8b4513' }} />
                                            <div style={{ height: '100%', width: '4px', backgroundColor: '#ff0000' }} />
                                            <div style={{ height: '100%', width: '4px', backgroundColor: '#000000' }} />
                                        </div>
                                        <div onClick={(e) => handlePinClick(comp.id, 'p2', e)} style={{ width: '10px', height: '10px', backgroundColor: '#333', borderRadius: '2px', cursor: 'pointer' }} />
                                    </div>
                                )}
                                {comp.type === 'Button' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                                        <div
                                            onMouseDown={() => handleButtonPress(comp.id, true)}
                                            onMouseUp={() => handleButtonPress(comp.id, false)}
                                            onMouseLeave={() => handleButtonPress(comp.id, false)}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                backgroundColor: '#111',
                                                borderRadius: '4px',
                                                border: '2px solid #333',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transform: gpioPinStates.size > 0 ? 'none' : 'none' // forcing dependency on state for rerender
                                            }}>
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                backgroundColor: '#cc0000',
                                                borderRadius: '50%',
                                                border: '1px solid #800',
                                                transform: getButtonState(comp.id) ? 'scale(0.9) translateY(1px)' : 'none',
                                                boxShadow: getButtonState(comp.id) ? 'inset 0 2px 4px rgba(0,0,0,0.5)' : '0 2px 0 #800',
                                                transition: 'all 0.05s'
                                            }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <div onClick={(e) => handlePinClick(comp.id, 'p1', e)} style={{ width: '10px', height: '10px', backgroundColor: '#333', borderRadius: '2px', cursor: 'pointer', border: '1px solid #555' }} />
                                            <div onClick={(e) => handlePinClick(comp.id, 'p2', e)} style={{ width: '10px', height: '10px', backgroundColor: '#333', borderRadius: '2px', cursor: 'pointer', border: '1px solid #555' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{comp.type}</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedComponent(comp.id); }} style={{ background: 'transparent', color: 'var(--text-muted)' }}><Settings2 size={12} /></button>
                                    <button
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={() => setComponents(prev => prev.filter(c => c.id !== comp.id))}
                                        style={{ background: 'transparent', color: '#ef4444', opacity: 0.6 }}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Component Details Panel */}
            <AnimatePresence>
                {selectedComponent && (
                    <motion.div
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className="glass-panel"
                        style={{
                            position: 'absolute',
                            right: '20px',
                            top: '80px',
                            width: '240px',
                            padding: '20px',
                            borderRadius: 'var(--radius-lg)',
                            zIndex: 100,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Component Settings</h4>
                            <button onClick={() => setSelectedComponent(null)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={16} /></button>
                        </div>
                        {components.find(c => c.id === selectedComponent)?.type === 'LED' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LED Color</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['#ff4444', '#44ff44', '#4444ff', '#ffff44'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setComponents(prev => prev.map(c => c.id === selectedComponent ? { ...c, props: { ...c.props, color } } : c))}
                                            style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: color, border: components.find(c => c.id === selectedComponent)?.props?.color === color ? '2px solid white' : 'none' }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        {components.find(c => c.id === selectedComponent)?.type === 'Resistor' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resistance</span>
                                <select
                                    style={{ background: '#111', color: 'white', border: '1px solid #333', padding: '4px', borderRadius: '4px' }}
                                    value={components.find(c => c.id === selectedComponent)?.props?.value}
                                    onChange={(e) => setComponents(prev => prev.map(c => c.id === selectedComponent ? { ...c, props: { ...c.props, value: e.target.value } } : c))}
                                >
                                    <option>220Ω</option>
                                    <option>330Ω</option>
                                    <option>1kΩ</option>
                                    <option>10kΩ</option>
                                </select>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ position: 'absolute', bottom: '24px', left: '24px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '30px', border: '1px solid var(--border-color)', backdropFilter: 'blur(4px)' }}>
                <Info size={14} style={{ color: 'var(--accent-primary)' }} />
                <p style={{ opacity: 0.7, fontSize: '0.75rem', fontWeight: 500 }}>Click two pins to connect them with a cable. Drag components to move.</p>
            </div>
        </div>
    );
};

export default Workbench;
