// GPIO Simulator for Raspberry Pi emulation
export class GPIOSimulator {
    private pins: Map<number, { mode: 'IN' | 'OUT' | 'PWM', value: number, pwmDutyCycle?: number }>;
    private listeners: Map<number, Set<(value: number) => void>>;

    constructor() {
        this.pins = new Map();
        this.listeners = new Map();

        // Initialize all GPIO pins (BCM numbering)
        for (let i = 0; i <= 27; i++) {
            this.pins.set(i, { mode: 'IN', value: 0 });
            this.listeners.set(i, new Set());
        }
    }

    setMode(pin: number, mode: 'IN' | 'OUT' | 'PWM') {
        const pinState = this.pins.get(pin);
        if (pinState) {
            pinState.mode = mode;
            console.log(`GPIO${pin} set to ${mode} mode`);
        }
    }

    digitalWrite(pin: number, value: number) {
        const pinState = this.pins.get(pin);
        if (pinState && pinState.mode === 'OUT') {
            pinState.value = value;
            this.notifyListeners(pin, value);
            console.log(`GPIO${pin} set to ${value}`);
        }
    }

    digitalRead(pin: number): number {
        const pinState = this.pins.get(pin);
        return pinState ? pinState.value : 0;
    }

    setPWM(pin: number, dutyCycle: number) {
        const pinState = this.pins.get(pin);
        if (pinState && pinState.mode === 'PWM') {
            pinState.pwmDutyCycle = dutyCycle;
            pinState.value = dutyCycle > 0 ? 1 : 0;
            this.notifyListeners(pin, dutyCycle);
            console.log(`GPIO${pin} PWM set to ${dutyCycle}%`);
        }
    }

    onPinChange(pin: number, callback: (value: number) => void) {
        const listeners = this.listeners.get(pin);
        if (listeners) {
            listeners.add(callback);
        }
    }

    private notifyListeners(pin: number, value: number) {
        const listeners = this.listeners.get(pin);
        if (listeners) {
            listeners.forEach(callback => callback(value));
        }
    }

    getPinState(pin: number) {
        return this.pins.get(pin);
    }

    getAllPins() {
        return Array.from(this.pins.entries()).map(([pin, state]) => ({
            pin,
            ...state
        }));
    }
}

// Create a global instance
export const gpioSimulator = new GPIOSimulator();

// Expose to window for terminal access
if (typeof window !== 'undefined') {
    (window as any).GPIO = {
        setMode: (pin: number, mode: string) => gpioSimulator.setMode(pin, mode as any),
        digitalWrite: (pin: number, value: number) => gpioSimulator.digitalWrite(pin, value),
        digitalRead: (pin: number) => gpioSimulator.digitalRead(pin),
        setPWM: (pin: number, duty: number) => gpioSimulator.setPWM(pin, duty),
        status: () => {
            console.table(gpioSimulator.getAllPins());
            return 'GPIO status logged to console';
        }
    };
}
