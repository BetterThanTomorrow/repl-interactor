/**
 * A Lexical analyser
 * @module lexer
 */
/**
 * A Lexer instance, parsing a given file.  Usually you should use a LexicalGrammar to
 * create one of these.
 *
 * @class
 * @param {string} source the source code to parse
 * @param rules the rules of this lexer.
 */
export class Lexer {
    constructor(source, rules) {
        this.source = source;
        this.rules = rules;
        this.position = 0;
    }
    /** Returns the next token in this lexer, or null if at the end. If the match fails, throws an Error. */
    scan() {
        var token = null;
        var length = 0;
        this.rules.forEach(rule => {
            rule.r.lastIndex = this.position;
            var x = rule.r.exec(this.source);
            if (x && x[0].length > length && this.position + x[0].length == rule.r.lastIndex) {
                token = rule.fn(this, x);
                token.offset = this.position;
                token.raw = x[0];
                length = x[0].length;
            }
        });
        this.position += length;
        if (token == null) {
            if (this.position == this.source.length)
                return null;
            throw new Error("Unexpected character at " + this.position + ": " + JSON.stringify(this.source));
        }
        return token;
    }
}
/**
 * A lexical grammar- factory for lexer instances.
 * @class
 */
export class LexicalGrammar {
    constructor() {
        this.rules = [];
    }
    /**
     * Defines a terminal with the given pattern and constructor.
     * @param {string | RegExp} pattern the pattern this terminal must match.
     * @param {function(Array<string>): Object} fn returns a lexical token representing
     *        this terminal.  An additional "offset" property containing the token source position
     *        will also be added, as well as a "raw" property, containing the raw string match.
     */
    terminal(pattern, fn) {
        this.rules.push({
            // This is b/c the RegExp constructor seems to not like our union type (unknown reasons why)
            r: pattern instanceof RegExp ? new RegExp(pattern, "g") : new RegExp(pattern, "g"),
            fn: fn
        });
    }
    /**
     * Create a Lexer for the given input.
     */
    lex(source) {
        return new Lexer(source, this.rules);
    }
}
