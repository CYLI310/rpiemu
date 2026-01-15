export type RPiModel = 'RPi5' | 'RPi4B' | 'RPi3B+' | 'RPiZeroW';

export interface UIState {
    showEmulator: boolean;
    showToolbar: boolean;
}

export type ComponentType =
    | 'LED' | 'Resistor' | 'Button' | 'Capacitor' | 'Diode' | 'Transistor' | 'Breadboard'
    | 'Potentiometer' | 'Photocell' | 'DHT11' | 'Ultrasonic' | 'PIR' | 'Joystick' | 'Tilt' | 'Vibration' | 'Sound' | 'Smoke' | 'Gas' | 'Rain' | 'SoilMoisture' | 'Flame' | 'Pressure' | 'Compass' | 'Gyro' | 'HeartRate' | 'HallEffect' | 'Touch'
    | 'Servo' | 'Buzzer' | 'DCMotor' | 'Stepper' | 'Relay' | 'Laser' | 'RGBLED' | 'LEDMatrix' | 'SevenSegment' | 'Solenoid' | 'Pump'
    | 'OLED' | 'LCD1602' | 'LCD2004' | 'EInk' | 'TFTDisplay' | 'LEDBar'
    | 'RFID' | 'Bluetooth' | 'WiFi' | 'NRF24' | 'GPS' | 'IRReceiver' | 'IRRemote'
    | 'ShiftRegister' | 'LevelShifter' | 'RTC' | 'ADC' | 'DAC';

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
