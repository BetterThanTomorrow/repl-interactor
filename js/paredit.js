"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var clojure_lexer_1 = require("./clojure-lexer");
function wrapSexpr(doc, open, close, start, end) {
    if (start === void 0) { start = doc.selectionStart; }
    if (end === void 0) { end = doc.selectionEnd; }
    var st = Math.min(start, end);
    var en = Math.max(start, end);
    var cursor = doc.getTokenCursor(en);
    if (cursor.withinString())
        throw new Error("Invalid context for paredit.wrapSexp");
    if (st == end) {
        cursor.forwardSexp();
        en = cursor.offsetStart;
        // NOTE: emacs leaves the selection as is, but it has no relation to what was selected after the transform.
        //       I have opted to clear it here.
        doc.selectionStart = doc.selectionEnd = en;
    }
    doc.model.insertString(en, close);
    doc.model.insertString(st, open);
}
exports.wrapSexpr = wrapSexpr;
function splitSexp(doc, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    var cursor = doc.getTokenCursor(start);
    if (cursor.withinString()) {
        if (doc.model.getText(start - 1, start + 1, true) == '\\"') {
            doc.model.changeRange(start + 1, start + 1, "\" \"");
            doc.selectionStart = doc.selectionEnd = start + 2;
        }
        else {
            doc.model.changeRange(start, start, "\" \"");
            doc.selectionStart = doc.selectionEnd = start + 1;
        }
        return;
    }
    cursor.backwardWhitespace();
    start = cursor.offsetStart;
    var ws = cursor.clone();
    ws.forwardWhitespace();
    if (cursor.backwardList()) {
        var open_1 = cursor.getPrevToken().raw;
        if (cursor.forwardList()) {
            var close_1 = cursor.getToken().raw;
            doc.model.changeRange(start, ws.offsetStart, close_1 + " " + open_1);
            doc.selectionStart = doc.selectionEnd = start + 1;
        }
    }
}
exports.splitSexp = splitSexp;
function joinSexp(doc, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    var cursor = doc.getTokenCursor(start);
    cursor.backwardWhitespace();
    var open = cursor.getPrevToken();
    var beginning = cursor.offsetStart;
    if (cursor.withinString())
        throw new Error("Invalid context for paredit.joinSexp");
    if (open.type == "str-end" || open.type == "str") {
        cursor.forwardWhitespace();
        var close_2 = cursor.getToken();
        var end = cursor.offsetStart;
        if ((close_2.type == "str" || close_2.type == "str-start")) {
            doc.model.changeRange(beginning - 1, end + 1, "");
            doc.selectionStart = doc.selectionEnd = beginning - 1;
        }
    }
    else if (open.type == "close") {
        cursor.forwardWhitespace();
        var close_3 = cursor.getToken();
        var end = cursor.offsetStart;
        if (close_3.type == "open" && clojure_lexer_1.validPair(open.raw, close_3.raw)) {
            doc.model.changeRange(beginning - 1, end + 1, " ");
            doc.selectionStart = doc.selectionEnd = beginning;
        }
    }
}
exports.joinSexp = joinSexp;
function spliceSexp(doc, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    var cursor = doc.getTokenCursor(start);
    // NOTE: this should unwrap the string, not throw.
    if (cursor.withinString())
        throw new Error("Invalid context for paredit.spliceSexp");
    cursor.backwardList();
    var open = cursor.getPrevToken();
    var beginning = cursor.offsetStart;
    if (open.type == "open") {
        cursor.forwardList();
        var close_4 = cursor.getToken();
        var end = cursor.offsetStart;
        if (close_4.type == "close" && clojure_lexer_1.validPair(open.raw, close_4.raw)) {
            doc.model.changeRange(end, end + 1, "");
            doc.model.changeRange(beginning - 1, beginning, "");
            doc.selectionStart = doc.selectionEnd = start - 1;
        }
    }
}
exports.spliceSexp = spliceSexp;
function killBackwardList(doc, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    var cursor = doc.getTokenCursor(start);
    // NOTE: this should unwrap the string, not throw.
    if (cursor.withinString())
        throw new Error("Invalid context for paredit.killBackwardList");
    cursor.backwardList();
    doc.model.changeRange(cursor.offsetStart, start, "");
    return doc.selectionStart = doc.selectionEnd = cursor.offsetStart;
}
exports.killBackwardList = killBackwardList;
function killForwardList(doc, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    var cursor = doc.getTokenCursor(start);
    var inComment = (cursor.getToken().type == "comment" && start > cursor.offsetStart) || cursor.getPrevToken().type == "comment";
    // NOTE: this should unwrap the string, not throw.
    if (cursor.withinString())
        throw new Error("Invalid context for paredit.killForwardList");
    cursor.forwardList();
    doc.model.changeRange(start, cursor.offsetStart, inComment ? "\n" : "");
    return doc.selectionStart = doc.selectionEnd = start;
}
exports.killForwardList = killForwardList;
function spliceSexpKillingBackward(doc, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    spliceSexp(doc, killBackwardList(doc, start));
}
exports.spliceSexpKillingBackward = spliceSexpKillingBackward;
function spliceSexpKillingForward(doc, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    spliceSexp(doc, killForwardList(doc, start));
}
exports.spliceSexpKillingForward = spliceSexpKillingForward;
function forwardSlurpSexp(doc, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    var cursor = doc.getTokenCursor(start);
    cursor.forwardList();
    if (cursor.getToken().type == "close") {
        var offset = cursor.offsetStart;
        var close_5 = cursor.getToken().raw;
        cursor.next();
        cursor.forwardSexp(true);
        cursor.backwardWhitespace(false);
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close_5);
        doc.model.changeRange(offset, offset + 1, "");
    }
}
exports.forwardSlurpSexp = forwardSlurpSexp;
function backwardSlurpSexp(doc, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    var cursor = doc.getTokenCursor(start);
    cursor.backwardList();
    var tk = cursor.getPrevToken();
    if (tk.type == "open") {
        var offset = cursor.clone().previous().offsetStart;
        var close_6 = cursor.getPrevToken().raw;
        cursor.previous();
        cursor.backwardSexp(true);
        cursor.forwardWhitespace(false);
        doc.model.changeRange(offset, offset + tk.raw.length, "");
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close_6);
    }
}
exports.backwardSlurpSexp = backwardSlurpSexp;
function forwardBarfSexp(doc, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    var cursor = doc.getTokenCursor(start);
    cursor.forwardList();
    if (cursor.getToken().type == "close") {
        var offset = cursor.offsetStart;
        var close_7 = cursor.getToken().raw;
        cursor.backwardSexp(true);
        cursor.backwardWhitespace();
        doc.model.changeRange(offset, offset + 1, "");
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close_7);
    }
}
exports.forwardBarfSexp = forwardBarfSexp;
function backwardBarfSexp(doc, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    var cursor = doc.getTokenCursor(start);
    cursor.backwardList();
    var tk = cursor.getPrevToken();
    if (tk.type == "open") {
        cursor.previous();
        var offset = cursor.offsetStart;
        var close_8 = cursor.getToken().raw;
        cursor.next();
        cursor.forwardSexp(true);
        cursor.forwardWhitespace(false);
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close_8);
        doc.model.changeRange(offset, offset + tk.raw.length, "");
    }
}
exports.backwardBarfSexp = backwardBarfSexp;
function open(doc, pair, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    doc.insertString(pair);
    doc.selectionStart = doc.selectionEnd = start + 1;
}
exports.open = open;
function close(doc, close, start) {
    if (start === void 0) { start = doc.selectionEnd; }
    var cursor = doc.getTokenCursor();
    cursor.forwardWhitespace(false);
    if (cursor.getToken().raw == close) {
        doc.model.changeRange(start, cursor.offsetStart, "");
        doc.selectionStart = doc.selectionEnd = start + 1;
    }
    else {
        // one of two things are possible:
        if (cursor.forwardList()) {
            //   we are in a matched list, just jump to the end of it.
            doc.selectionStart = doc.selectionEnd = cursor.offsetEnd;
        }
        else {
            while (cursor.forwardSexp()) { }
            doc.model.changeRange(cursor.offsetEnd, cursor.offsetEnd, close);
            doc.selectionStart = doc.selectionEnd = cursor.offsetEnd + 1;
        }
    }
}
exports.close = close;
var parenPair = new Set(["()", "[]", "{}", '""', '\\"']);
var openParen = new Set(["(", "[", "{", '"']);
var closeParen = new Set([")", "]", "}", '"']);
function backspace(doc, start, end) {
    if (start === void 0) { start = doc.selectionStart; }
    if (end === void 0) { end = doc.selectionEnd; }
    if (start != end) {
        doc.backspace();
    }
    else {
        if (doc.model.getText(start - 3, start, true) == '\\""') {
            doc.selectionStart = doc.selectionEnd = start - 1;
        }
        else if (doc.model.getText(start - 2, start - 1, true) == '\\') {
            doc.model.deleteRange(start - 2, 2);
            doc.selectionStart = doc.selectionEnd = start - 2;
        }
        else if (parenPair.has(doc.model.getText(start - 1, start + 1, true))) {
            doc.model.deleteRange(start - 1, 2);
            doc.selectionStart = doc.selectionEnd = start - 1;
        }
        else if (closeParen.has(doc.model.getText(start - 1, start, true)) || openParen.has(doc.model.getText(start - 1, start, true))) {
            doc.selectionStart = doc.selectionEnd = start - 1;
        }
        else if (openParen.has(doc.model.getText(start - 1, start + 1, true)) || closeParen.has(doc.model.getText(start - 1, start, true))) {
            doc.model.deleteRange(start - 1, 2);
            doc.selectionStart = doc.selectionEnd = start - 1;
        }
        else
            doc.backspace();
    }
}
exports.backspace = backspace;
function deleteForward(doc, start, end) {
    if (start === void 0) { start = doc.selectionStart; }
    if (end === void 0) { end = doc.selectionEnd; }
    if (start != end) {
        doc.delete();
    }
    else {
        if (parenPair.has(doc.model.getText(start, start + 2, true))) {
            doc.model.deleteRange(start, 2);
        }
        else if (parenPair.has(doc.model.getText(start - 1, start + 1, true))) {
            doc.model.deleteRange(start - 1, 2);
            doc.selectionStart = doc.selectionEnd = start - 1;
        }
        else if (openParen.has(doc.model.getText(start, start + 1, true)) || closeParen.has(doc.model.getText(start, start + 1, true))) {
            doc.selectionStart = doc.selectionEnd = start + 1;
        }
        else
            doc.delete();
    }
}
exports.deleteForward = deleteForward;
function stringQuote(doc, start, end) {
    if (start === void 0) { start = doc.selectionStart; }
    if (end === void 0) { end = doc.selectionEnd; }
    if (start != end) {
        doc.insertString('"');
    }
    else {
        var cursor = doc.getTokenCursor(start);
        if (cursor.withinString()) {
            // inside a string, let's be clever
            if (cursor.offsetEnd - 1 == start && cursor.getToken().type == "str" || cursor.getToken().type == "str-end") {
                doc.selectionStart = doc.selectionEnd = start + 1;
            }
            else {
                doc.model.changeRange(start, start, '"');
                doc.selectionStart = doc.selectionEnd = start + 1;
            }
        }
        else {
            doc.model.changeRange(start, start, '""');
            doc.selectionStart = doc.selectionEnd = start + 1;
        }
    }
}
exports.stringQuote = stringQuote;
function growSelection(doc, start, end) {
    if (start === void 0) { start = doc.selectionStart; }
    if (end === void 0) { end = doc.selectionEnd; }
    var startC = doc.getTokenCursor(start);
    var endC = doc.getTokenCursor(end);
    if (startC.equals(endC) && !startC.withinWhitespace()) {
        if (startC.getToken().type == "close") {
            if (startC.getPrevToken().type == "close") {
                startC.backwardList();
                doc.growSelectionStack.push([doc.selectionStart = startC.offsetStart, doc.selectionEnd = endC.offsetStart]);
            }
            else {
                endC = startC.previous();
                doc.growSelectionStack.push([doc.selectionStart = startC.offsetStart, doc.selectionEnd = endC.offsetEnd]);
            }
        }
        else if (startC.getToken().type == "open") {
            endC.forwardList();
            doc.growSelectionStack.push([doc.selectionStart = startC.offsetStart, doc.selectionEnd = endC.offsetStart]);
        }
        else {
            doc.growSelectionStack.push([doc.selectionStart = startC.offsetStart, doc.selectionEnd = startC.offsetEnd]);
        }
    }
    else {
        if (startC.getPrevToken().type == "open" && endC.getToken().type == "close") {
            startC.backwardList();
            startC.backwardUpList();
            endC.forwardList();
            doc.growSelectionStack.push([doc.selectionStart = startC.offsetStart, doc.selectionEnd = endC.offsetEnd]);
        }
        else {
            startC.backwardList();
            endC.forwardList();
            endC.previous();
            doc.growSelectionStack.push([doc.selectionStart = startC.offsetStart, doc.selectionEnd = endC.offsetEnd]);
        }
    }
}
exports.growSelection = growSelection;
function shrinkSelection(doc) {
    var _a;
    if (doc.growSelectionStack.length) {
        var _b = __read(doc.growSelectionStack.pop(), 2), start = _b[0], end = _b[1];
        if (start == doc.selectionStart && end == doc.selectionEnd && doc.growSelectionStack.length) {
            _a = __read(doc.growSelectionStack[doc.growSelectionStack.length - 1], 2), doc.selectionStart = _a[0], doc.selectionEnd = _a[1];
        }
        else {
            doc.growSelectionStack = [];
        }
    }
}
exports.shrinkSelection = shrinkSelection;
function raiseSexp(doc, start, end) {
    if (start === void 0) { start = doc.selectionStart; }
    if (end === void 0) { end = doc.selectionEnd; }
    if (start == end) {
        var cursor = doc.getTokenCursor(end);
        cursor.forwardWhitespace();
        var endCursor = cursor.clone();
        if (endCursor.forwardSexp()) {
            var raised = doc.model.getText(cursor.offsetStart, endCursor.offsetStart);
            cursor.backwardList();
            endCursor.forwardList();
            if (cursor.getPrevToken().type == "open") {
                cursor.previous();
                if (endCursor.getToken().type == "close") {
                    doc.model.changeRange(cursor.offsetStart, endCursor.offsetEnd, raised);
                    doc.selectionStart = doc.selectionEnd = cursor.offsetStart;
                }
            }
        }
    }
}
exports.raiseSexp = raiseSexp;
function convolute(doc, start, end) {
    if (start === void 0) { start = doc.selectionStart; }
    if (end === void 0) { end = doc.selectionEnd; }
    if (start == end) {
        var cursorStart = doc.getTokenCursor(end);
        var cursorEnd = cursorStart.clone();
        if (cursorStart.backwardList()) {
            if (cursorEnd.forwardList()) {
                var head = doc.model.getText(cursorStart.offsetStart, end);
                if (cursorStart.getPrevToken().type == "open") {
                    cursorStart.previous();
                    var headStart = cursorStart.clone();
                    if (headStart.backwardList() && headStart.backwardUpList()) {
                        var headEnd = cursorStart.clone();
                        if (headEnd.forwardList() && cursorEnd.getToken().type == "close") {
                            doc.model.changeRange(headEnd.offsetEnd, headEnd.offsetEnd, ")");
                            doc.model.changeRange(cursorEnd.offsetStart, cursorEnd.offsetEnd, "");
                            doc.model.changeRange(cursorStart.offsetStart, end, "");
                            doc.model.changeRange(headStart.offsetStart, headStart.offsetStart, "(" + head);
                        }
                    }
                }
            }
        }
    }
}
exports.convolute = convolute;
