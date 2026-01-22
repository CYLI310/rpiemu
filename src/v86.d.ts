interface V86Options {
    wasm_path: string;
    memory_size: number;
    vga_memory_size: number;
    screen_container: HTMLElement | null;
    bios: { url: string };
    vga_bios: { url: string };
    cdrom: { url: string };
    boot_order: number;
    autostart: boolean;
}

declare module 'v86' {
    export default class V86Starter {
        constructor(options: V86Options);
        add_listener(event: 'serial0-output-char', callback: (char: string) => void): void;
        add_listener(event: 'serial0-output-byte', callback: (byte: number) => void): void;
        add_listener(event: 'emulator-ready', callback: () => void): void;
        serial0_send(data: string): void;
        destroy(): void;
    }
}
