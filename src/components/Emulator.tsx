import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { X, Loader2, Maximize2, Minimize2, Terminal as TerminalIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Import v86 as a module
import V86Starter from 'v86';
import { gpioSimulator } from '../utils/gpioSimulator.ts';

interface EmulatorProps {
    isOpen: boolean;
    onToggle: () => void;
}

const Emulator: React.FC<EmulatorProps> = ({ isOpen, onToggle }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const v86Ref = useRef<V86Starter | null>(null);
    const modeRef = useRef<'mock' | 'v86'>('mock');
    const currentLineRef = useRef('');
    const hasBootedRef = useRef(false);

    const [isMaximized, setIsMaximized] = useState(false);
    const [isBooting, setIsBooting] = useState(false);
    const [currentMode, setCurrentMode] = useState<'mock' | 'v86'>('mock');

    const handleMockCommand = useCallback((cmd: string, term: Terminal) => {
        const trimmed = cmd.trim().toLowerCase();
        if (trimmed === 'ls') term.writeln('BIN  ETC  USR  HOME');
        else if (trimmed === 'help') term.writeln('AVAILABLE: LS, HELP, CLEAR, GPIO-HELP');
        else if (trimmed === 'clear') term.clear();
        else if (trimmed !== '') term.writeln(`ERR: CMD NOT FOUND: ${trimmed}`);
    }, []);
    const [isTerminalReady, setIsTerminalReady] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Bounds and size
    const [size, setSize] = useState({ width: 600, height: 350 });

    useEffect(() => {
        if (isOpen && !isMinimized && terminalRef.current && !xtermRef.current) {
            initTerminal();
        }
    }, [isOpen, isMinimized]);

    const handleMockInput = useCallback((data: string, term: Terminal) => {
        const code = data.charCodeAt(0);
        if (code === 13) {
            term.writeln('');
            handleMockCommand(currentLineRef.current, term);
            currentLineRef.current = '';
            if (modeRef.current === 'mock') term.write('> ');
        } else if (code === 127) {
            if (currentLineRef.current.length > 0) {
                currentLineRef.current = currentLineRef.current.slice(0, -1);
                term.write('\b \b');
            }
        } else {
            currentLineRef.current += data;
            term.write(data);
        }
    }, [handleMockCommand]);

    const initTerminal = useCallback(() => {
        if (!terminalRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            theme: {
                background: '#000000',
                foreground: '#ffffff',
                cursor: '#ffffff',
                selectionBackground: 'rgba(255, 255, 255, 0.3)',
            },
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        setTimeout(() => fitAddon.fit(), 100);

        term.writeln('SYSINIT: [OK] PIFORGE CORE');
        term.writeln('SYSINIT: [OK] V86 SUBSYSTEM');
        term.writeln('╔════════════════════════════════════════════════════════╗');
        term.writeln('║ PIFORGE TERMINAL v0.2.0                                ║');
        term.writeln('║ TYPE "gpio-help" FOR HARDWARE COMMANDS                 ║');
        term.writeln('║                                                        ║');
        term.writeln('║ STATUS: SYSTEM_READY                                   ║');
        term.writeln('║ KERNEL: V86_WASM_x86_64                                ║');
        term.writeln('╚════════════════════════════════════════════════════════╝');
        term.writeln('');

        term.onData((data) => {
            if (modeRef.current === 'v86' && v86Ref.current) {
                v86Ref.current.serial0_send(data);
            } else {
                handleMockInput(data, term);
            }
        });

        xtermRef.current = term;
        window.addEventListener('resize', () => fitAddon.fit());
    }, [handleMockInput]);

    const startV86 = useCallback((term: Terminal) => {
        if (isBooting || modeRef.current === 'v86' || !V86Starter) return;

        modeRef.current = 'v86';
        setCurrentMode('v86');
        setIsBooting(true);

        term.writeln('>>> BOOTING PIFORGE OS (v86) <<<');

        try {
            v86Ref.current = new V86Starter({
                wasm_path: '/v86/v86.wasm',
                memory_size: 128 * 1024 * 1024,
                vga_memory_size: 8 * 1024 * 1024,
                screen_container: null,
                bios: { url: '/bios/seabios.bin' },
                vga_bios: { url: '/bios/vgabios.bin' },
                cdrom: { url: '/images/linux4.iso' },
                boot_order: 0x123,
                autostart: true,
            });

            let outputBuffer = '';
            v86Ref.current.add_listener('serial0-output-char', (char: string) => {
                term.write(char);
                outputBuffer += char;
                if (outputBuffer.length > 100) outputBuffer = outputBuffer.slice(-100);

                const matchOut = outputBuffer.match(/\[GPIO_OUT: (\d+) (\d+)\]/);
                if (matchOut) {
                    gpioSimulator.digitalWrite(parseInt(matchOut[1]), parseInt(matchOut[2]));
                    outputBuffer = '';
                }
                const matchMode: RegExpMatchArray | null = outputBuffer.match(/\[GPIO_MODE: (\d+) (\w+)\]/);
                if (matchMode) {
                    gpioSimulator.setMode(parseInt(matchMode[1]), matchMode[2].toUpperCase() as 'IN' | 'OUT' | 'PWM');
                    outputBuffer = '';
                }
            });

            v86Ref.current.add_listener('serial0-output-byte', (byte: number) => {
                term.write(String.fromCharCode(byte));
            });

            v86Ref.current.add_listener('emulator-ready', () => {
                term.writeln('EMULATOR: [OK] READY');

                setTimeout(() => {
                    const injectCmds = [
                        'echo "#!/bin/sh" > /usr/bin/gpio-mode',
                        'echo "echo \\"[GPIO_MODE: \\$1 \\$2]\\"" >> /usr/bin/gpio-mode',
                        'chmod +x /usr/bin/gpio-mode',
                        'echo "#!/bin/sh" > /usr/bin/gpio-write',
                        'echo "echo \\"[GPIO_OUT: \\$1 \\$2]\\"" >> /usr/bin/gpio-write',
                        'chmod +x /usr/bin/gpio-write',
                        'echo "#!/bin/sh" > /usr/bin/gpio-blink',
                        'echo "while [ \\$2 -gt 0 ]; do gpio-write \\$1 1; sleep 0.5; gpio-write \\$1 0; sleep 0.5; num=\\$\\$(( \\$2 - 1 )); set -- \\$1 \\$num; done" >> /usr/bin/gpio-blink',
                        'chmod +x /usr/bin/gpio-blink',
                        'clear'
                    ];
                    injectCmds.forEach(cmd => {
                        for (let i = 0; i < cmd.length; i++) v86Ref.current.serial0_send(cmd[i]);
                        v86Ref.current.serial0_send('\n');
                    });
                }, 5000);
                setIsBooting(false);
            });

        } catch (err) {
            term.writeln(`ERR: V86 INIT FAILED: ${err}`);
            setIsBooting(false);
            modeRef.current = 'mock';
            setCurrentMode('mock');
        }
    }, [isBooting]);

    useEffect(() => {
        if (isOpen && !xtermRef.current) {
            initTerminal();
        }
    }, [isOpen, initTerminal]);

    useEffect(() => {
        if (xtermRef.current && modeRef.current === 'mock' && !isBooting && !hasBootedRef.current) {
            hasBootedRef.current = true;
            const timer = setTimeout(() => {
                if (xtermRef.current) startV86(xtermRef.current);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isBooting, startV86]);

    const handleResize = (e: React.MouseEvent) => {
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = size.width;
        const startHeight = size.height;

        const onMouseMove = (moveEvent: MouseEvent) => {
            setSize({
                width: Math.max(300, startWidth + (moveEvent.clientX - startX)),
                height: Math.max(200, startHeight + (moveEvent.clientY - startY))
            });
            setTimeout(() => {
                const fitAddon = new FitAddon();
                xtermRef.current?.loadAddon(fitAddon);
                fitAddon.fit();
            }, 0);
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    drag={!isMaximized}
                    dragListener={false}
                    dragControls={isMinimized ? undefined : undefined} // Not using controls, using hande
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{
                        y: isMinimized ? 'calc(100% - 50px)' : 0,
                        opacity: 1,
                        width: isMaximized ? 'calc(100% - 32px)' : (isMinimized ? '200px' : `${size.width}px`),
                        height: isMaximized ? 'calc(100% - 32px)' : (isMinimized ? '40px' : `${size.height}px`),
                        bottom: '16px',
                        left: isMinimized ? '16px' : (isMaximized ? '16px' : 'calc(50% - 300px)'),
                    }}
                    exit={{ y: '100%', opacity: 0 }}
                    style={{
                        position: 'absolute',
                        zIndex: 2000,
                        border: '2px solid #fff',
                        backgroundColor: '#000',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        transition: 'width 0.2s, height 0.2s, left 0.2s, bottom 0.2s'
                    }}
                >
                    {/* Toolbar / Drag Handle */}
                    <div
                        onPointerDown={(e) => {
                            // Only drag if not clicking buttons
                            if ((e.target as HTMLElement).tagName !== 'BUTTON' && (e.target as HTMLElement).tagName !== 'SVG') {
                                // drag handle logic
                            }
                        }}
                        style={{
                            padding: '10px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: isMinimized ? 'none' : '2px solid #fff',
                            background: '#000',
                            cursor: 'grab',
                            userSelect: 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TerminalIcon size={14} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>
                                {isMinimized ? 'TERMINAL_IDLE' : `CONSOLE: ${currentMode === 'v86' ? 'OS_KERNEL' : 'READY'}`}
                            </span>
                            {isBooting && <Loader2 size={12} className="animate-spin" />}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {!isMinimized && currentMode === 'mock' && !isBooting && (
                                <button onClick={() => startV86(xtermRef.current!)} style={{ padding: '2px 8px', fontSize: '0.6rem', fontWeight: 900 }}>
                                    BOOT_KERNEL
                                </button>
                            )}
                            <button onClick={() => setIsMinimized(!isMinimized)} style={{ border: 'none' }}>
                                {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {!isMinimized && (
                                <button onClick={() => setIsMaximized(!isMaximized)} style={{ border: 'none' }}>
                                    {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                </button>
                            )}
                            <button onClick={onToggle} style={{ border: 'none' }}>
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            <div ref={terminalRef} style={{ flex: 1, padding: '8px', backgroundColor: '#000' }} />
                            {/* Resize Handle */}
                            {!isMaximized && (
                                <div
                                    onMouseDown={handleResize}
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        bottom: 0,
                                        width: '15px',
                                        height: '15px',
                                        cursor: 'nwse-resize',
                                        background: 'linear-gradient(135deg, transparent 50%, #fff 50%)',
                                        zIndex: 2001
                                    }}
                                />
                            )}
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Emulator;
