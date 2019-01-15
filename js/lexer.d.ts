/**
 * A Lexical analyser
 * @module lexer
 */
/**
 * The base Token class. Contains the token type,
 * the raw string of the token, and the offset into the input line.
 */
export interface Token {
    type: string;
    raw: string;
    offset: number;
}
/**
 * A Lexical rule for a terminal. Consists of a RegExp and an action.
 */
export interface Rule {
    r: RegExp;
    fn: (Lexer: any, RegExpExecArray: any) => any;
}
/**
 * A Lexer instance, parsing a given file.  Usually you should use a LexicalGrammar to
 * create one of these.
 *
 * @class
 * @param {string} source the source code to parse
 * @param rules the rules of this lexer.
 */
export declare class Lexer {
    source: string;
    rules: Rule[];
    position: number;
    constructor(source: string, rules: Rule[]);
    /** Returns the next token in this lexer, or null if at the end. If the match fails, throws an Error. */
    scan(): Token;
}
/**
 * A lexical grammar- factory for lexer instances.
 * @class
 */
export declare class LexicalGrammar {
    rules: Rule[];
    /**
     * Defines a terminal with the given pattern and constructor.
     * @param {string | RegExp} pattern the pattern this terminal must match.
     * @param {function(Array<string>): Object} fn returns a lexical token representing
     *        this terminal.  An additional "offset" property containing the token source position
     *        will also be added, as well as a "raw" property, containing the raw string match.
     */
    terminal(pattern: string | RegExp, fn: (T: any, RegExpExecArray: any) => any): void;
    /**
     * Create a Lexer for the given input.
     */
    lex(source: string): Lexer;
}
