export declare const ALT = 1;
export declare const CTRL = 2;
export declare const SHIFT = 4;
export declare const META = 8;
interface CommandWidget {
    commands: {
        [id: string]: () => void;
    };
}
export declare function parseHotKey(key: string, command: any): HotKey;
export declare class HotKey {
    modifiers: number;
    key: number;
    command: string;
    constructor(modifiers: number, key: number, command: string);
    match(e: KeyboardEvent): boolean;
}
export declare class HotKeyTable<T extends CommandWidget> {
    table: HotKey[];
    constructor(keys: {
        [id: string]: keyof T["commands"];
    });
    execute(obj: T, e: KeyboardEvent): boolean;
}
export {};
