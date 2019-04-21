"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var whitespace = new Set(["ws", "comment", "eol"]);
/** Rules shamelessly copied from cljfmt. */
var indentRules = {
    "alt!": [["block", 0]],
    "alt!!": [["block", 0]],
    "are": [["block", 2]],
    "as->": [["block", 2]],
    "binding": [["block", 1]],
    "bound-fn": [["inner", 1]],
    "case": [["block", 1]],
    "catch": [["block", 2]],
    "comment": [["block", 0]],
    "cond": [["block", 0]],
    "condp": [["block", 2]],
    "cond->": [["block", 1]],
    "cond->>": [["block", 1]],
    "def": [["inner", 0]],
    "defmacro": [["inner", 0]],
    "defmethod": [["inner", 0]],
    "defmulti": [["inner", 0]],
    "defn": [["inner", 0]],
    "defn-": [["inner", 0]],
    "defonce": [["inner", 0]],
    "defprotocol": [["block", 1], ["inner", 1]],
    "defrecord": [["block", 2], ["inner", 1]],
    "defstruct": [["block", 1]],
    "deftest": [["inner", 0]],
    "deftype": [["block", 2], ["inner", 1]],
    "do": [["block", 0]],
    "doseq": [["block", 1]],
    "dotimes": [["block", 1]],
    "doto": [["block", 1]],
    "extend": [["block", 1]],
    "extend-protocol": [["block", 1], ["inner", 1]],
    "extend-type": [["block", 1], ["inner", 1]],
    "fdef": [["inner", 0]],
    "finally": [["block", 0]],
    "fn": [["inner", 0]],
    "for": [["block", 1]],
    "future": [["block", 0]],
    "go": [["block", 0]],
    "go-loop": [["block", 1]],
    "if": [["block", 1]],
    "if-let": [["block", 1]],
    "if-not": [["block", 1]],
    "if-some": [["block", 1]],
    "let": [["block", 1]],
    "letfn": [["block", 1], ["inner", 2, 0]],
    "locking": [["block", 1]],
    "loop": [["block", 1]],
    "match": [["block", 1]],
    "ns": [["block", 1]],
    "proxy": [["block", 2], ["inner", 1]],
    "reify": [["inner", 0], ["inner", 1]],
    "struct-map": [["block", 1]],
    "testing": [["block", 1]],
    "thread": [["block", 0]],
    "try": [["block", 0]],
    "use-fixtures": [["inner", 0]],
    "when": [["block", 1]],
    "when-first": [["block", 1]],
    "when-let": [["block", 1]],
    "when-not": [["block", 1]],
    "when-some": [["block", 1]],
    "while": [["block", 1]],
    "with-local-vars": [["block", 1]],
    "with-open": [["block", 1]],
    "with-out-str": [["block", 0]],
    "with-precision": [["block", 1]],
    "with-redefs": [["block", 1]],
};
/**
 * If a token's raw string is in this set, then it counts as an 'open list'. An open list that starts with a symbol
 * is something that could be
 * considered code, so special formatting rules apply.
 */
var OPEN_LIST = new Set(["#(", "#?(", "(", "#?@("]);
/**
 * Analyses the text before position in the document, and returns a list of enclosing expression information with
 * various indent information, for use with getIndent()
 *
 * @param document The document to analyse
 * @param position The position (as [row, col] into the document to analyse from)
 * @param maxDepth The maximum depth upwards from the expression to search.
 * @param maxLines The maximum number of lines above the position to search until we bail with an imprecise answer.
 */
function collectIndents(document, offset, maxDepth, maxLines) {
    if (maxDepth === void 0) { maxDepth = 3; }
    if (maxLines === void 0) { maxLines = 20; }
    var cursor = document.getTokenCursor(offset);
    cursor.backwardWhitespace();
    var argPos = 0;
    var startLine = cursor.line;
    var exprsOnLine = 0;
    var lastLine = cursor.line;
    var lastIndent = 0;
    var indents = [];
    do {
        if (!cursor.backwardSexp()) {
            // this needs some work..
            var prevToken = cursor.getPrevToken();
            if (prevToken.type == 'open' && prevToken.offset <= 1) {
                maxDepth = 0; // treat an sexpr starting on line 0 sensibly.
            }
            // skip past the first item and record the indent of the first item on the same line if there is one.
            var nextCursor = cursor.clone();
            nextCursor.forwardSexp();
            nextCursor.forwardWhitespace();
            // iff the first item of this list is a an identifier, and the second item is on the same line, indent to that second item. otherwise indent to the open paren.
            var firstItemIdent = cursor.getToken().type == "id" && nextCursor.line == cursor.line && !nextCursor.atEnd() && OPEN_LIST.has(prevToken.raw) ? nextCursor.rowCol[1] : cursor.rowCol[1];
            var token = cursor.getToken().raw;
            var startIndent = cursor.rowCol[1];
            if (!cursor.backwardUpList())
                break;
            var indentRule = indentRules[token] || [];
            indents.unshift({ first: token, rules: indentRule, argPos: argPos, exprsOnLine: exprsOnLine, startIndent: startIndent, firstItemIdent: firstItemIdent });
            argPos = 0;
            exprsOnLine = 1;
        }
        if (cursor.line != lastLine) {
            var head = cursor.clone();
            head.forwardSexp();
            head.forwardWhitespace();
            if (!head.atEnd()) {
                lastIndent = head.rowCol[1];
                exprsOnLine = 0;
                lastLine = cursor.line;
            }
        }
        if (whitespace.has(cursor.getPrevToken().type)) {
            argPos++;
            exprsOnLine++;
        }
    } while (!cursor.atStart() && Math.abs(startLine - cursor.line) < maxLines && indents.length < maxDepth);
    if (!indents.length)
        indents.push({ argPos: 0, first: null, rules: [], exprsOnLine: 0, startIndent: lastIndent >= 0 ? lastIndent : 0, firstItemIdent: lastIndent >= 0 ? lastIndent : 0 });
    return indents;
}
exports.collectIndents = collectIndents;
/** Returns the expected newline indent for the given position, in characters. */
function getIndent(document, offset) {
    var e_1, _a;
    var state = collectIndents(document, offset);
    // now find applicable indent rules
    var indent = -1;
    var thisBlock = state[state.length - 1];
    if (!state.length)
        return 0;
    for (var pos = state.length - 1; pos >= 0; pos--) {
        try {
            for (var _b = __values(state[pos].rules), _c = _b.next(); !_c.done; _c = _b.next()) {
                var rule = _c.value;
                if (rule[0] == "inner") {
                    if (pos + rule[1] == state.length - 1) {
                        if (rule.length == 3) {
                            if (rule[2] > thisBlock.argPos)
                                indent = thisBlock.startIndent + 1;
                        }
                        else
                            indent = thisBlock.startIndent + 1;
                    }
                }
                else if (rule[0] == "block" && pos == state.length - 1) {
                    if (thisBlock.exprsOnLine <= rule[1]) {
                        if (thisBlock.argPos >= rule[1])
                            indent = thisBlock.startIndent + 1;
                    }
                    else {
                        indent = thisBlock.firstItemIdent;
                    }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    if (indent == -1) {
        // no indentation styles applied, so use default style.
        if (thisBlock.exprsOnLine > 0)
            indent = thisBlock.firstItemIdent;
        else
            indent = thisBlock.startIndent;
    }
    return indent;
}
exports.getIndent = getIndent;
