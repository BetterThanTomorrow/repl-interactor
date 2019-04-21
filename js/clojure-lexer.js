"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var lexer_1 = require("./lexer");
/** The 'toplevel' lexical grammar. This grammar contains all normal tokens. Multi-line strings are identified as
 * "str-start", which trigger the lexer to switch to the 'multstring' lexical grammar.
 */
var toplevel = new lexer_1.LexicalGrammar();
/** Maps open and close parentheses to their class. */
exports.canonicalParens = {
    '#?(': '()',
    '#?@(': '()',
    '#(': '()',
    '(': '()',
    ')': '()',
    '#{': '{}',
    '{': '{}',
    '}': '{}',
    '[': '[]',
    ']': '[]'
};
/** Returns true if open and close are compatible parentheses */
function validPair(open, close) {
    return exports.canonicalParens[open] == exports.canonicalParens[close];
}
exports.validPair = validPair;
// whitespace
toplevel.terminal(/[\s,]+/, function (l, m) { return ({ type: "ws" }); });
// comments
toplevel.terminal(/;.*/, function (l, m) { return ({ type: "comment" }); });
// open parens
toplevel.terminal(/\(|\[|\{|#\(|#\?\(|#\{|#\?@\(/, function (l, m) { return ({ type: "open" }); });
// close parens
toplevel.terminal(/\)|\]|\}/, function (l, m) { return ({ type: "close" }); });
// punctuators
toplevel.terminal(/~@|~|'|#'|#:|#_|\^|`|#|\^:/, function (l, m) { return ({ type: "punc" }); });
toplevel.terminal(/true|false|nil/, function (l, m) { return ({ type: "lit" }); });
toplevel.terminal(/[0-9]+[rR][0-9a-zA-Z]+/, function (l, m) { return ({ type: "lit" }); });
toplevel.terminal(/[-+]?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?/, function (l, m) { return ({ type: "lit" }); });
toplevel.terminal(/:[^()[\]\{\}#,~@'`^\"\s;]*/, function (l, m) { return ({ type: "kw" }); });
// this is a REALLY lose symbol definition, but similar to how clojure really collects it. numbers/true/nil are all 
toplevel.terminal(/[^()[\]\{\}#,~@'`^\"\s:;][^()[\]\{\}#,~@'`^\"\s;]*/, function (l, m) { return ({ type: "id" }); });
// complete string on a single line
toplevel.terminal(/"([^"\\]|\\.)*"/, function (l, m) { return ({ type: "str" }); });
toplevel.terminal(/"([^"\\]|\\.)*/, function (l, m) { return ({ type: "str-start" }); });
toplevel.terminal(/./, function (l, m) { return ({ type: "junk" }); });
/** This is the multi-line string grammar. It spits out 'str-end' once it is time to switch back to the 'toplevel' grammar, and 'str-inside' if the string continues. */
var multstring = new lexer_1.LexicalGrammar();
// end a multiline string
multstring.terminal(/([^"\\]|\\.)*"/, function (l, m) { return ({ type: "str-end" }); });
// still within a multiline string
multstring.terminal(/([^"\\]|\\.)*/, function (l, m) { return ({ type: "str-inside" }); });
/**
 * A Clojure(Script) lexical analyser.
 * Takes a line of text and a start state, and returns an array of Token, updating its internal state.
 */
var Scanner = /** @class */ (function () {
    function Scanner() {
        this.state = { inString: false };
    }
    Scanner.prototype.processLine = function (line, state) {
        if (state === void 0) { state = this.state; }
        var tks = [];
        this.state = state;
        var lex = (this.state.inString ? multstring : toplevel).lex(line);
        var tk;
        do {
            tk = lex.scan();
            if (tk) {
                var oldpos = lex.position;
                switch (tk.type) {
                    case "str-end": // multiline string ended, switch back to toplevel
                        this.state = __assign({}, this.state, { inString: false });
                        lex = toplevel.lex(line);
                        lex.position = oldpos;
                        break;
                    case "str-start": // multiline string started, switch to multstring.
                        this.state = __assign({}, this.state, { inString: true });
                        lex = multstring.lex(line);
                        lex.position = oldpos;
                        break;
                }
                tks.push(__assign({}, tk, { state: this.state }));
            }
        } while (tk);
        // insert a sentinel EOL value, this allows us to simplify TokenCaret's implementation.
        tks.push({ type: "eol", raw: "\n", offset: line.length, state: this.state });
        return tks;
    };
    return Scanner;
}());
exports.Scanner = Scanner;
