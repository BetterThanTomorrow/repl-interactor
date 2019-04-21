"use strict";
/**
 * A Lexical analyser
 * @module lexer
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A Lexer instance, parsing a given file.  Usually you should use a LexicalGrammar to
 * create one of these.
 *
 * @class
 * @param {string} source the source code to parse
 * @param rules the rules of this lexer.
 */
var Lexer = /** @class */ (function () {
    function Lexer(source, rules) {
        this.source = source;
        this.rules = rules;
        this.position = 0;
    }
    /** Returns the next token in this lexer, or null if at the end. If the match fails, throws an Error. */
    Lexer.prototype.scan = function () {
        var _this = this;
        var token = null;
        var length = 0;
        this.rules.forEach(function (rule) {
            rule.r.lastIndex = _this.position;
            var x = rule.r.exec(_this.source);
            if (x && x[0].length > length && _this.position + x[0].length == rule.r.lastIndex) {
                token = rule.fn(_this, x);
                token.offset = _this.position;
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
    };
    return Lexer;
}());
exports.Lexer = Lexer;
/**
 * A lexical grammar- factory for lexer instances.
 * @class
 */
var LexicalGrammar = /** @class */ (function () {
    function LexicalGrammar() {
        this.rules = [];
    }
    /**
     * Defines a terminal with the given pattern and constructor.
     * @param {string | RegExp} pattern the pattern this terminal must match.
     * @param {function(Array<string>): Object} fn returns a lexical token representing
     *        this terminal.  An additional "offset" property containing the token source position
     *        will also be added, as well as a "raw" property, containing the raw string match.
     */
    LexicalGrammar.prototype.terminal = function (pattern, fn) {
        this.rules.push({
            // This is b/c the RegExp constructor seems to not like our union type (unknown reasons why)
            r: pattern instanceof RegExp ? new RegExp(pattern, "g") : new RegExp(pattern, "g"),
            fn: fn
        });
    };
    /**
     * Create a Lexer for the given input.
     */
    LexicalGrammar.prototype.lex = function (source) {
        return new Lexer(source, this.rules);
    };
    return LexicalGrammar;
}());
exports.LexicalGrammar = LexicalGrammar;
