import React, { useState } from 'react';
import {
    Cpu,
    Lightbulb,
    Zap,
    Square,
    Grid3X3,
    RotateCw,
    Volume1,
    Activity,
    Monitor,
    ChevronDown,
    ChevronRight,
    Gauge,
    Wifi,
    Radio,
    Clock,
    Wind,
    Droplets,
    ZapOff,
    Crosshair,
    Fingerprint
} from 'lucide-react';
import type { RPiModel, ComponentType } from '../types/index.ts';

interface SidebarProps {
    activeModel: RPiModel;
    onModelChange: (model: RPiModel) => void;
    onAddComponent: (type: ComponentType) => void;
}

interface ComponentDef {
    type: ComponentType;
    icon: React.ReactNode;
    label: string;
}

const CATEGORIES: { name: string; components: ComponentDef[] }[] = [
    {
        name: 'DISCRETE_COMPONENTS',
        components: [
            { type: 'LED', icon: <Lightbulb size={16} />, label: '5MM LED' },
            { type: 'Resistor', icon: <Zap size={16} />, label: '1/4W RES' },
            { type: 'Button', icon: <Square size={16} />, label: '6MM TACT' },
            { type: 'Capacitor', icon: <ZapOff size={16} />, label: 'E-CAP' },
            { type: 'Transistor', icon: <Cpu size={16} />, label: '2N2222' },
            { type: 'Diode', icon: <Activity size={16} />, label: '1N4148' },
            { type: 'RGBLED', icon: <Lightbulb size={16} />, label: 'WS2812B' },
        ]
    },
    {
        name: 'SENSORS_ENVIRONMENT',
        components: [
            { type: 'DHT11', icon: <Wind size={16} />, label: 'DHT11' },
            { type: 'Photocell', icon: <Lightbulb size={16} />, label: 'GL5528' },
            { type: 'Ultrasonic', icon: <Activity size={16} />, label: 'HC-SR04' },
            { type: 'Smoke', icon: <Wind size={16} />, label: 'MQ-2' },
            { type: 'Gas', icon: <Wind size={16} />, label: 'MQ-135' },
            { type: 'Rain', icon: <Droplets size={16} />, label: 'YT-69' },
            { type: 'SoilMoisture', icon: <Droplets size={16} />, label: 'HW-384' },
            { type: 'Flame', icon: <Zap size={16} />, label: 'KY-026' },
            { type: 'Pressure', icon: <Gauge size={16} />, label: 'BMP280' },
        ]
    },
    {
        name: 'SENSORS_MOTION',
        components: [
            { type: 'PIR', icon: <Activity size={16} />, label: 'HC-SR501' },
            { type: 'Gyro', icon: <Activity size={16} />, label: 'MPU6050' },
            { type: 'Compass', icon: <Activity size={16} />, label: 'HMC5883L' },
            { type: 'Joystick', icon: <Crosshair size={16} />, label: 'KY-023' },
            { type: 'Tilt', icon: <Activity size={16} />, label: 'SW-520D' },
            { type: 'Vibration', icon: <Activity size={16} />, label: 'SW-420' },
        ]
    },
    {
        name: 'SENSORS_BIOMETRIC',
        components: [
            { type: 'HeartRate', icon: <Activity size={16} />, label: 'MAX30102' },
            { type: 'Fingerprint', icon: <Fingerprint size={16} />, label: 'AS608' },
            { type: 'Touch', icon: <Fingerprint size={16} />, label: 'TTP223' },
        ]
    },
    {
        name: 'ACTUATORS_MOTORS',
        components: [
            { type: 'Servo', icon: <RotateCw size={16} />, label: 'SG90' },
            { type: 'Stepper', icon: <RotateCw size={16} />, label: '28BYJ-48' },
            { type: 'DCMotor', icon: <RotateCw size={16} />, label: 'RF-300' },
            { type: 'Relay', icon: <Zap size={16} />, label: 'SRD-05VDC' },
            { type: 'Pump', icon: <Droplets size={16} />, label: 'JT-DC3' },
            { type: 'Buzzer', icon: <Volume1 size={16} />, label: 'SFM-27' },
        ]
    },
    {
        name: 'VISUAL_DISPLAY',
        components: [
            { type: 'OLED', icon: <Monitor size={16} />, label: 'SSD1306' },
            { type: 'LCD1602', icon: <Monitor size={16} />, label: 'HD44780' },
            { type: 'TFTDisplay', icon: <Monitor size={16} />, label: 'ST7735' },
            { type: 'SevenSegment', icon: <Activity size={16} />, label: '5161AS' },
            { type: 'LEDMatrix', icon: <Grid3X3 size={16} />, label: 'MAX7219' },
            { type: 'LEDBar', icon: <Activity size={16} />, label: 'MYB10' },
        ]
    },
    {
        name: 'CONNECTIVITY',
        components: [
            { type: 'WiFi', icon: <Wifi size={16} />, label: 'ESP8266' },
            { type: 'Bluetooth', icon: <Radio size={16} />, label: 'HC-05' },
            { type: 'GPS', icon: <Activity size={16} />, label: 'NEO-6M' },
            { type: 'RFID', icon: <Activity size={16} />, label: 'RC522' },
            { type: 'NRF24', icon: <Radio size={16} />, label: 'NRF24L01' },
            { type: 'IRReceiver', icon: <Radio size={16} />, label: 'VS1838B' },
        ]
    },
    {
        name: 'INTEGRATED_CIRCUITS',
        components: [
            { type: 'RTC', icon: <Clock size={16} />, label: 'DS3231' },
            { type: 'ShiftRegister', icon: <Cpu size={16} />, label: '74HC595' },
            { type: 'ADC', icon: <Activity size={16} />, label: 'MCP3008' },
            { type: 'DAC', icon: <Activity size={16} />, label: 'MCP4725' },
            { type: 'LevelShifter', icon: <Zap size={16} />, label: 'TXS0108E' },
        ]
    }
];

const MODELS: { id: RPiModel; name: string }[] = [
    { id: 'RPi5', name: 'BCM2712' },
    { id: 'RPi4B', name: 'BCM2711' },
    { id: 'RPi3B+', name: 'BCM2837B0' },
    { id: 'RPiZeroW', name: 'BCM2835' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeModel, onModelChange, onAddComponent }) => {
    const [expandedCats, setExpandedCats] = useState<string[]>(['BASIC', 'INPUT', 'DISCRETE_COMPONENTS']);

    const toggleCat = (name: string) => {
        setExpandedCats(prev =>
            prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
        );
    };

    return (
        <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                    <h2 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>CHIPSET</h2>
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

                <section style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>LIBRARY [INSTANTIATE CLICK]</h2>

                    {CATEGORIES.map(cat => (
                        <div key={cat.name} style={{ marginBottom: '8px' }}>
                            <div
                                onClick={() => toggleCat(cat.name)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    padding: '4px 0',
                                    color: expandedCats.includes(cat.name) ? 'var(--text-main)' : 'var(--text-muted)'
                                }}
                            >
                                {expandedCats.includes(cat.name) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>{cat.name}</span>
                            </div>

                            {expandedCats.includes(cat.name) && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '8px', paddingLeft: '8px' }}>
                                    {cat.components.map((comp) => (
                                        <div
                                            key={comp.type}
                                            onClick={() => onAddComponent(comp.type)}
                                            style={{
                                                padding: '10px 8px',
                                                border: '1px solid #222',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: 'pointer',
                                                background: 'var(--bg-secondary)',
                                                transition: 'all 0.1s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.borderColor = '#fff'}
                                            onMouseOut={(e) => e.currentTarget.style.borderColor = '#222'}
                                        >
                                            <div style={{ color: '#666' }}>{comp.icon}</div>
                                            <span style={{ fontSize: '0.5rem', fontWeight: 800, textAlign: 'center' }}>{comp.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </section>
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    HW_STACK // v0.6.0_PRO
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
