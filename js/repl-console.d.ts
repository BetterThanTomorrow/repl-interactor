import { ReplReadline, CompletionListener } from "./readline";
import { HotKeyTable } from "./hotkeys";
export declare class ReplConsole {
    elem: HTMLElement;
    onReadLine: (x: string) => void;
    readline: ReplReadline;
    input: HTMLInputElement;
    hotkeys: HotKeyTable<ReplConsole>;
    historyIndex: number;
    history: string[];
    /** Event listeners for history */
    private _historyListeners;
    addHistoryListener(c: (line: string) => void): void;
    removeHistoryListener(c: (line: string) => void): void;
    /** Event listeners for completion */
    private _completionListeners;
    addCompletionListener(c: CompletionListener): void;
    removeCompletionListener(c: CompletionListener): void;
    constructor(elem: HTMLElement, onReadLine?: (x: string) => void);
    printElement(element: HTMLElement): void;
    print(text: string): void;
    setText(text: string): void;
    setHistory(history: string[]): void;
    submitLine(trigger?: boolean): void;
    requestPrompt(prompt: string): void;
    onRepaint: () => void;
    commands: {
        "raise-sexp": () => void;
        "convolute-sexp": () => void;
        "force-backspace": () => void;
        "force-delete": () => void;
        "grow-selection": () => void;
        "shrink-selection": () => void;
        "backward-sexp": () => void;
        "forward-sexp": () => void;
        "down-list": () => void;
        "up-list": () => void;
        "backward-up-list": () => void;
        "select-all": () => void;
        "undo": () => void;
        "redo": () => void;
        "join-sexp": () => void;
        "backward-slurp-sexp": () => void;
        "forward-barf-sexp": () => void;
        "cursor-left": () => void;
        "cursor-select-left": () => void;
        "forward-slurp-sexp": () => void;
        "backward-barf-sexp": () => void;
        "cursor-right": () => void;
        "cursor-select-right": () => void;
        "splice-sexp-killing-backwards": () => void;
        "cursor-up": () => void;
        "cursor-select-up": () => void;
        "splice-sexp-killing-forwards": () => void;
        "cursor-down": () => void;
        "cursor-select-down": () => void;
        "backspace": () => void;
        "cursor-home": () => void;
        "cursor-select-home": () => void;
        "cursor-home-all": () => void;
        "cursor-select-home-all": () => void;
        "cursor-end": () => void;
        "cursor-select-end": () => void;
        "cursor-end-all": () => void;
        "cursor-select-end-all": () => void;
        "delete": () => void;
        "wrap-round": () => void;
        "wrap-square": () => void;
        "wrap-curly": () => void;
        "split-sexp": () => void;
        "splice-sexp": () => void;
        "history-up": () => void;
        "history-down": () => void;
    };
}
