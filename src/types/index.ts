export type RPiModel = 'RPi5' | 'RPi4B' | 'RPi3B+' | 'RPiZeroW';

export interface UIState {
    showEmulator: boolean;
    showToolbar: boolean;
}

export type ComponentType = 'LED' | 'Resistor' | 'Button' | 'Speaker' | 'Breadboard' | 'Servo' | 'Buzzer' | 'Potentiometer' | 'OLED';

export interface Position {
    x: number;
    y: number;
}

export interface CircuitComponent {
    id: string;
    type: ComponentType;
    position: Position;
    props?: any;
}

export interface Wire {
    id: string;
    fromId: string;
    fromPin: string;
    toId: string;
    toPin: string;
    color: string;
}
