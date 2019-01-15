import { LexicalGrammar } from "./lexer";
/** The 'toplevel' lexical grammar. This grammar contains all normal tokens. Multi-line strings are identified as
 * "str-start", which trigger the lexer to switch to the 'multstring' lexical grammar.
 */
let toplevel = new LexicalGrammar();
/** Maps open and close parentheses to their class. */
export const canonicalParens = {
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
export function validPair(open, close) {
    return canonicalParens[open] == canonicalParens[close];
}
// whitespace
toplevel.terminal(/[\s,]+/, (l, m) => ({ type: "ws" }));
// comments
toplevel.terminal(/;.*/, (l, m) => ({ type: "comment" }));
// open parens
toplevel.terminal(/\(|\[|\{|#\(|#\?\(|#\{|#\?@\(/, (l, m) => ({ type: "open" }));
// close parens
toplevel.terminal(/\)|\]|\}/, (l, m) => ({ type: "close" }));
// punctuators
toplevel.terminal(/~@|~|'|#'|#:|#_|\^|`|#|\^:/, (l, m) => ({ type: "punc" }));
toplevel.terminal(/true|false|nil/, (l, m) => ({ type: "lit" }));
toplevel.terminal(/[0-9]+[rR][0-9a-zA-Z]+/, (l, m) => ({ type: "lit" }));
toplevel.terminal(/[-+]?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?/, (l, m) => ({ type: "lit" }));
toplevel.terminal(/:[^()[\]\{\}#,~@'`^\"\s;]*/, (l, m) => ({ type: "kw" }));
// this is a REALLY lose symbol definition, but similar to how clojure really collects it. numbers/true/nil are all 
toplevel.terminal(/[^()[\]\{\}#,~@'`^\"\s:;][^()[\]\{\}#,~@'`^\"\s;]*/, (l, m) => ({ type: "id" }));
// complete string on a single line
toplevel.terminal(/"([^"\\]|\\.)*"/, (l, m) => ({ type: "str" }));
toplevel.terminal(/"([^"\\]|\\.)*/, (l, m) => ({ type: "str-start" }));
toplevel.terminal(/./, (l, m) => ({ type: "junk" }));
/** This is the multi-line string grammar. It spits out 'str-end' once it is time to switch back to the 'toplevel' grammar, and 'str-inside' if the string continues. */
let multstring = new LexicalGrammar();
// end a multiline string
multstring.terminal(/([^"\\]|\\.)*"/, (l, m) => ({ type: "str-end" }));
// still within a multiline string
multstring.terminal(/([^"\\]|\\.)*/, (l, m) => ({ type: "str-inside" }));
/**
 * A Clojure(Script) lexical analyser.
 * Takes a line of text and a start state, and returns an array of Token, updating its internal state.
 */
export class Scanner {
    constructor() {
        this.state = { inString: false };
    }
    processLine(line, state = this.state) {
        let tks = [];
        this.state = state;
        let lex = (this.state.inString ? multstring : toplevel).lex(line);
        let tk;
        do {
            tk = lex.scan();
            if (tk) {
                let oldpos = lex.position;
                switch (tk.type) {
                    case "str-end": // multiline string ended, switch back to toplevel
                        this.state = Object.assign({}, this.state, { inString: false });
                        lex = toplevel.lex(line);
                        lex.position = oldpos;
                        break;
                    case "str-start": // multiline string started, switch to multstring.
                        this.state = Object.assign({}, this.state, { inString: true });
                        lex = multstring.lex(line);
                        lex.position = oldpos;
                        break;
                }
                tks.push(Object.assign({}, tk, { state: this.state }));
            }
        } while (tk);
        // insert a sentinel EOL value, this allows us to simplify TokenCaret's implementation.
        tks.push({ type: "eol", raw: "\n", offset: line.length, state: this.state });
        return tks;
    }
}
