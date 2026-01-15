declare module 'v86' {
    export default class V86Starter {
        constructor(options: any);
        add_listener(event: string, callback: (data: any) => void): void;
        serial0_send(data: string): void;
        destroy(): void;
    }
}
