import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Maximize2, Minimize2, Terminal as TerminalIcon, X, Zap, Loader2 } from 'lucide-react';
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
    const v86Ref = useRef<any>(null);
    const modeRef = useRef<'mock' | 'v86'>('mock');
    const currentLineRef = useRef('');
    const hasBootedRef = useRef(false);

    const [isMaximized, setIsMaximized] = useState(false);
    const [isBooting, setIsBooting] = useState(false);
    const [currentMode, setCurrentMode] = useState<'mock' | 'v86'>('mock');
    const [isTerminalReady, setIsTerminalReady] = useState(false);

    useEffect(() => {
        if (isOpen && terminalRef.current && !xtermRef.current) {
            initTerminal();
        }
    }, [isOpen]);

    // Auto-boot Linux after terminal is ready (only once)
    useEffect(() => {
        if (isTerminalReady && modeRef.current === 'mock' && !isBooting && !hasBootedRef.current) {
            hasBootedRef.current = true;
            const timer = setTimeout(() => {
                if (xtermRef.current) {
                    startV86(xtermRef.current);
                }
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isTerminalReady, isBooting]);

    const initTerminal = () => {
        if (!terminalRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            theme: {
                background: '#0a0a0c',
                foreground: '#f8fafc',
                cursor: '#3b82f6',
                selectionBackground: 'rgba(59, 130, 246, 0.3)',
            },
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        setTimeout(() => fitAddon.fit(), 100);

        term.writeln('\x1b[32m[  OK  ]\x1b[0m Initializing PiForge Virtual Hardware...');
        term.writeln('\x1b[32m[  OK  ]\x1b[0m Loading v86 WebAssembly Emulator...');
        term.writeln('');

        term.onData((data) => {
            if (modeRef.current === 'v86' && v86Ref.current) {
                v86Ref.current.serial0_send(data);
            } else {
                handleMockInput(data, term);
            }
        });

        xtermRef.current = term;
        setIsTerminalReady(true);
        window.addEventListener('resize', () => fitAddon.fit());
    };

    const handleMockInput = (data: string, term: Terminal) => {
        const code = data.charCodeAt(0);
        if (code === 13) {
            term.writeln('');
            handleMockCommand(currentLineRef.current, term);
            currentLineRef.current = '';
            if (modeRef.current === 'mock') term.write('\x1b[36mpi@piforge\x1b[0m:\x1b[34m~\x1b[0m$ ');
        } else if (code === 127) {
            if (currentLineRef.current.length > 0) {
                currentLineRef.current = currentLineRef.current.slice(0, -1);
                term.write('\b \b');
            }
        } else {
            currentLineRef.current += data;
            term.write(data);
        }
    };

    const handleMockCommand = (cmd: string, term: Terminal) => {
        const trimmed = cmd.trim();
        const parts = trimmed.split(' ');
        const command = parts[0].toLowerCase();

        // Handle GPIO commands
        if (command === 'gpio-mode' && parts.length === 3) {
            const pin = parseInt(parts[1]);
            const mode = parts[2].toUpperCase();
            if (!isNaN(pin) && ['IN', 'OUT', 'PWM'].includes(mode)) {
                gpioSimulator.setMode(pin, mode as any);
                term.writeln(`GPIO${pin} mode set to ${mode}`);
                return;
            }
        } else if (command === 'gpio-write' && parts.length === 3) {
            const pin = parseInt(parts[1]);
            const value = parseInt(parts[2]);
            if (!isNaN(pin) && (value === 0 || value === 1)) {
                gpioSimulator.digitalWrite(pin, value);
                term.writeln(`GPIO${pin} = ${value}`);
                return;
            }
        } else if (command === 'gpio-read' && parts.length === 2) {
            const pin = parseInt(parts[1]);
            if (!isNaN(pin)) {
                const value = gpioSimulator.digitalRead(pin);
                term.writeln(`GPIO${pin} = ${value}`);
                return;
            }
        } else if (command === 'gpio-pwm' && parts.length === 3) {
            const pin = parseInt(parts[1]);
            const duty = parseInt(parts[2]);
            if (!isNaN(pin) && !isNaN(duty) && duty >= 0 && duty <= 100) {
                gpioSimulator.setPWM(pin, duty);
                term.writeln(`GPIO${pin} PWM = ${duty}%`);
                return;
            }
        } else if (command === 'gpio-status') {
            term.writeln('\x1b[36m┌─────┬──────┬───────┐\x1b[0m');
            term.writeln('\x1b[36m│ Pin │ Mode │ Value │\x1b[0m');
            term.writeln('\x1b[36m├─────┼──────┼───────┤\x1b[0m');
            gpioSimulator.getAllPins().slice(0, 28).forEach(p => {
                const val = p.mode === 'PWM' && p.pwmDutyCycle !== undefined
                    ? `${p.pwmDutyCycle}%`
                    : p.value.toString();
                term.writeln(`\x1b[36m│\x1b[0m ${p.pin.toString().padStart(3)} \x1b[36m│\x1b[0m ${p.mode.padEnd(4)} \x1b[36m│\x1b[0m ${val.padEnd(5)} \x1b[36m│\x1b[0m`);
            });
            term.writeln('\x1b[36m└─────┴──────┴───────┘\x1b[0m');
            return;
        } else if (command === 'gpio-help') {
            term.writeln('\x1b[33mPiForge GPIO Commands:\x1b[0m');
            term.writeln('  \x1b[32mgpio-mode\x1b[0m <pin> <in|out|pwm>  - Set GPIO pin mode');
            term.writeln('  \x1b[32mgpio-write\x1b[0m <pin> <0|1>        - Write to GPIO pin');
            term.writeln('  \x1b[32mgpio-read\x1b[0m <pin>                - Read from GPIO pin');
            term.writeln('  \x1b[32mgpio-pwm\x1b[0m <pin> <0-100>         - Set PWM duty cycle');
            term.writeln('  \x1b[32mgpio-status\x1b[0m                    - Show all GPIO pins');
            return;
        }

        // Standard commands
        if (trimmed === 'ls') term.writeln('Documents  Downloads  projects');
        else if (trimmed === 'help') {
            term.writeln('Available: ls, help, clear, gpio-help');
            term.writeln('Type \x1b[32mgpio-help\x1b[0m for GPIO commands');
        }
        else if (trimmed === 'clear') term.clear();
        else if (trimmed !== '') term.writeln(`-/bin/sh: ${trimmed.split(' ')[0]}: not found`);
    };

    const startV86 = (term: Terminal) => {
        if (isBooting || modeRef.current === 'v86' || !V86Starter) return;

        modeRef.current = 'v86';
        setCurrentMode('v86');
        setIsBooting(true);

        term.writeln('\x1b[33m>>> INITIALIZING WEBASSEMBLY LINUX (v86) <<<\x1b[0m');
        term.writeln('\x1b[34mBooting minimal Linux environment...\x1b[0m');
        term.writeln('');
        term.writeln('\x1b[36m╔════════════════════════════════════════════════════════╗\x1b[0m');
        term.writeln('\x1b[36m║  \x1b[33mPiForge Linux Emulator\x1b[36m                             ║\x1b[0m');
        term.writeln('\x1b[36m║                                                        ║\x1b[0m');
        term.writeln('\x1b[36m║  This is a minimal BusyBox-based Linux environment    ║\x1b[0m');
        term.writeln('\x1b[36m║  running in WebAssembly via v86.                      ║\x1b[0m');
        term.writeln('\x1b[36m║                                                        ║\x1b[0m');
        term.writeln('\x1b[36m║  \x1b[32mAvailable commands:\x1b[36m                                  ║\x1b[0m');
        term.writeln('\x1b[36m║    ls, cd, pwd, cat, echo, mkdir, rm, cp, mv         ║\x1b[0m');
        term.writeln('\x1b[36m║    vi, grep, find, ps, top, free, df, uname           ║\x1b[0m');
        term.writeln('\x1b[36m║    wget, ping, ifconfig, route                        ║\x1b[0m');
        term.writeln('\x1b[36m║                                                        ║\x1b[0m');
        term.writeln('\x1b[36m║  \x1b[33mNote:\x1b[36m apt/sudo not available in minimal image      ║\x1b[0m');
        term.writeln('\x1b[36m║  Login: \x1b[32mroot\x1b[36m / Password: \x1b[32mroot\x1b[36m                        ║\x1b[0m');
        term.writeln('\x1b[36m╚════════════════════════════════════════════════════════╝\x1b[0m');
        term.writeln('');

        try {
            v86Ref.current = new V86Starter({
                wasm_path: '/v86/v86.wasm',
                memory_size: 128 * 1024 * 1024,
                vga_memory_size: 8 * 1024 * 1024,
                screen_container: null,
                bios: {
                    url: '/bios/seabios.bin',
                },
                vga_bios: {
                    url: '/bios/vgabios.bin',
                },
                cdrom: {
                    url: '/images/linux4.iso',
                },
                boot_order: 0x123, // Boot from CD-ROM first
                autostart: true,
            });

            // Handle serial output and intercept GPIO patterns
            let outputBuffer = '';
            v86Ref.current.add_listener('serial0-output-char', (char: string) => {
                term.write(char);

                // Buffer output to catch GPIO command signals
                outputBuffer += char;
                if (outputBuffer.length > 100) outputBuffer = outputBuffer.slice(-100);

                // Match pattern: [GPIO_OUT: <pin> <val>]
                const matchOut = outputBuffer.match(/\[GPIO_OUT: (\d+) (\d+)\]/);
                if (matchOut) {
                    const pin = parseInt(matchOut[1]);
                    const val = parseInt(matchOut[2]);
                    gpioSimulator.digitalWrite(pin, val);
                    outputBuffer = '';
                }

                // Match pattern: [GPIO_MODE: <pin> <mode>]
                const matchMode = outputBuffer.match(/\[GPIO_MODE: (\d+) (\w+)\]/);
                if (matchMode) {
                    const pin = parseInt(matchMode[1]);
                    const mode = matchMode[2].toUpperCase();
                    gpioSimulator.setMode(pin, mode as any);
                    outputBuffer = '';
                }
            });

            // Handle serial input
            v86Ref.current.add_listener('serial0-output-byte', (byte: number) => {
                term.write(String.fromCharCode(byte));
            });

            v86Ref.current.add_listener('emulator-ready', () => {
                term.writeln('\x1b[32m✓ Emulator ready - Booting Linux...\x1b[0m');
                term.writeln('\x1b[34mInjecting PiForge GPIO Drivers...\x1b[0m');

                // Inject GPIO helper commands into the guest Linux
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
                        'clear\n'
                    ];
                    injectCmds.forEach(cmd => {
                        for (let i = 0; i < cmd.length; i++) {
                            v86Ref.current.serial0_send(cmd[i]);
                        }
                        v86Ref.current.serial0_send('\n');
                    });
                }, 5000); // Wait for shell to be somewhat ready

                setIsBooting(false);
            });

            // Fallback timeout
            setTimeout(() => {
                if (isBooting) {
                    setIsBooting(false);
                }
            }, 3000);

        } catch (err) {
            term.writeln(`\x1b[31m✗ Failed to start v86: ${err}\x1b[0m`);
            term.writeln('\x1b[33mFalling back to simulation mode...\x1b[0m');
            setIsBooting(false);
            modeRef.current = 'mock';
            setCurrentMode('mock');
            hasBootedRef.current = false; // Allow retry
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: 300, opacity: 0 }}
                    animate={{
                        y: 0,
                        opacity: 1,
                        width: isMaximized ? 'calc(100% - 40px)' : '80%',
                        height: isMaximized ? 'calc(100% - 40px)' : '450px',
                        bottom: isMaximized ? '20px' : '20px',
                        left: isMaximized ? '20px' : '10%',
                    }}
                    exit={{ y: 300, opacity: 0 }}
                    className="glass-panel"
                    style={{
                        position: 'absolute',
                        zIndex: 100,
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        transition: 'width 0.3s, height 0.3s'
                    }}
                >
                    <div style={{
                        padding: '12px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'rgba(255,255,255,0.02)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TerminalIcon size={16} style={{ color: currentMode === 'v86' ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                {currentMode === 'v86' ? 'v86 WebAssembly Linux' : 'Initializing...'}
                            </span>
                            {isBooting && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {currentMode === 'mock' && !isBooting && (
                                <button onClick={() => { hasBootedRef.current = false; startV86(xtermRef.current!); }} style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                    <Zap size={12} /> Boot Linux
                                </button>
                            )}
                            <button onClick={() => setIsMaximized(!isMaximized)} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                            <button onClick={onToggle} style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                    <div ref={terminalRef} style={{ flex: 1, padding: '10px', backgroundColor: '#0a0a0c' }} />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Emulator;
