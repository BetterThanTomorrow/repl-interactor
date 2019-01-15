import { Token as LexerToken } from "./lexer";
/** Maps open and close parentheses to their class. */
export declare const canonicalParens: {
    '#?(': string;
    '#?@(': string;
    '#(': string;
    '(': string;
    ')': string;
    '#{': string;
    '{': string;
    '}': string;
    '[': string;
    ']': string;
};
/** Returns true if open and close are compatible parentheses */
export declare function validPair(open: string, close: string): boolean;
export interface Token extends LexerToken {
    state: ScannerState;
}
/**
 * The state of the scanner.
 * We only really need to know if we're inside a string or not.
 */
export interface ScannerState {
    /** Are we scanning inside a string? If so use multstring grammar, otherwise use toplevel. */
    inString: boolean;
}
/**
 * A Clojure(Script) lexical analyser.
 * Takes a line of text and a start state, and returns an array of Token, updating its internal state.
 */
export declare class Scanner {
    state: ScannerState;
    processLine(line: string, state?: ScannerState): Token[];
}
