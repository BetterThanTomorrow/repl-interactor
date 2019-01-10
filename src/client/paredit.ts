import { ReplConsole } from "./console";
import { validPair } from "./clojure-lexer";

export function wrapSexpr(doc: ReplConsole, open: string, close: string, start: number = doc.selectionStart, end: number = doc.selectionEnd) {
    let st = Math.min(start, end);
    let en = Math.max(start, end);
    let cursor = doc.getTokenCursor(en);
    if(cursor.withinString())
        throw new Error("Invalid context for paredit.wrapSexp");
    if(st == end) {
        cursor.forwardSexp()
        en = cursor.offsetStart;
        // NOTE: emacs leaves the selection as is, but it has no relation to what was selected after the transform.
        //       I have opted to clear it here.
        doc.selectionStart = doc.selectionEnd = en;
    }
    doc.model.insertString(en, close);
    doc.model.insertString(st, open);
}

export function splitSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    if(cursor.withinString()) {
        if(doc.model.getText(start-1, start+1) == '\\"') {
            doc.model.changeRange(start+1, start+1, "\" \"")
            doc.selectionStart = doc.selectionEnd = start+2;
        } else {
            doc.model.changeRange(start, start, "\" \"")
            doc.selectionStart = doc.selectionEnd = start+1;
        }
        return;
    }
    cursor.backwardWhitespace();
    start = cursor.offsetStart;
    let ws = cursor.clone();
    ws.forwardWhitespace()
    if(cursor.backwardList()) {
        let open = cursor.getPrevToken().raw;

        if(cursor.forwardList()) {
            let close = cursor.getToken().raw;
            doc.model.changeRange(start, ws.offsetStart, close+" "+open);
            doc.selectionStart = doc.selectionEnd = start + 1;
        }
    }
}

export function joinSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    cursor.backwardWhitespace();
    let open = cursor.getPrevToken();
    let beginning = cursor.offsetStart;
    if(cursor.withinString())
        throw new Error("Invalid context for paredit.joinSexp");
    if(open.type == "str-end" || open.type == "str") {
        cursor.forwardWhitespace();
        let close = cursor.getToken();
        let end = cursor.offsetStart;
        if((close.type == "str" || close.type == "str-start")) {
            doc.model.changeRange(beginning-1, end+1, "");
            doc.selectionStart = doc.selectionEnd = beginning-1;
        }
        
    } else if(open.type == "close") {
        cursor.forwardWhitespace();
        let close = cursor.getToken();
        let end = cursor.offsetStart;
        if(close.type == "open" && validPair(open.raw, close.raw)) {
            doc.model.changeRange(beginning-1, end+1, " ");
            doc.selectionStart = doc.selectionEnd = beginning;
        }
    }
}

export function spliceSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    // NOTE: this should unwrap the string, not throw.
    if(cursor.withinString())
        throw new Error("Invalid context for paredit.spliceSexp");
    
    cursor.backwardList()
    let open = cursor.getPrevToken();
    let beginning = cursor.offsetStart;
    if(open.type == "open") {
        cursor.forwardList();
        let close = cursor.getToken();
        let end = cursor.offsetStart;
        if(close.type == "close" && validPair(open.raw, close.raw)) {
            doc.model.changeRange(end, end+1, "");
            doc.model.changeRange(beginning-1, beginning, "");
            doc.selectionStart = doc.selectionEnd = start-1;
        }
    }
}

export function killBackwardList(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    // NOTE: this should unwrap the string, not throw.
    if(cursor.withinString())
        throw new Error("Invalid context for paredit.killBackwardList");
    cursor.backwardList();
    doc.model.changeRange(cursor.offsetStart, start, "");
    return doc.selectionStart = doc.selectionEnd = cursor.offsetStart;
}

export function killForwardList(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    let inComment = (cursor.getToken().type == "comment" && start > cursor.offsetStart) || cursor.getPrevToken().type == "comment";
    // NOTE: this should unwrap the string, not throw.
    if(cursor.withinString())
        throw new Error("Invalid context for paredit.killForwardList");
    cursor.forwardList();
    doc.model.changeRange(start, cursor.offsetStart, inComment ? "\n" : "");
    return doc.selectionStart = doc.selectionEnd = start;
}

export function spliceSexpKillingBackward(doc: ReplConsole, start: number = doc.selectionEnd) {
    spliceSexp(doc, killBackwardList(doc, start));
}

export function spliceSexpKillingForward(doc: ReplConsole, start: number = doc.selectionEnd) {
    spliceSexp(doc, killForwardList(doc, start));
}

export function forwardSlurpSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    cursor.forwardList();
    if(cursor.getToken().type == "close") {
        let offset = cursor.offsetStart;
        let close = cursor.getToken().raw;
        cursor.next();
        cursor.forwardSexp(true);
        cursor.backwardWhitespace(false);
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close);
        doc.model.changeRange(offset, offset+1, "");
    }
}

export function backwardSlurpSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    cursor.backwardList();
    let tk = cursor.getPrevToken();
    if(tk.type == "open") {
        let offset = cursor.clone().previous().offsetStart;
        let close = cursor.getPrevToken().raw;
        cursor.previous();
        cursor.backwardSexp(true);
        cursor.forwardWhitespace(false);
        doc.model.changeRange(offset, offset+tk.raw.length, "");
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close);
    }
}

export function forwardBarfSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    cursor.forwardList();
    if(cursor.getToken().type == "close") {
        let offset = cursor.offsetStart;
        let close = cursor.getToken().raw;
        cursor.backwardSexp(true);
        cursor.backwardWhitespace();
        doc.model.changeRange(offset, offset+1, "");
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close);
    }
}

export function backwardBarfSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    cursor.backwardList();
    let tk = cursor.getPrevToken();
    if(tk.type == "open") {
        cursor.previous();
        let offset = cursor.offsetStart;
        let close = cursor.getToken().raw;
        cursor.next();
        cursor.forwardSexp(true);
        cursor.forwardWhitespace(false);
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close);
        doc.model.changeRange(offset, offset+tk.raw.length, "");
    }
}

export function open(doc: ReplConsole, pair: string, start: number = doc.selectionEnd) {
    doc.insertString(pair);
    doc.selectionStart = doc.selectionEnd = start+1;
}

export function close(doc: ReplConsole, close: string, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor();
    cursor.forwardWhitespace(false);
    if(cursor.getToken().raw == close) {
        doc.model.changeRange(start, cursor.offsetStart, "");
        doc.selectionStart = doc.selectionEnd = start+1;
    } else {
        // one of two things are possible:
        if(cursor.forwardList()) {
            //   we are in a matched list, just jump to the end of it.
            doc.selectionStart = doc.selectionEnd = cursor.offsetEnd;
        } else {
            while(cursor.forwardSexp()) {}
            doc.model.changeRange(cursor.offsetEnd, cursor.offsetEnd, close)
            doc.selectionStart = doc.selectionEnd = cursor.offsetEnd+1;
        }
    }
}

const parenPair = new Set(["()", "[]", "{}", '""', '\\"'])
const openParen = new Set(["(", "[", "{", '"'])
const closeParen = new Set([")", "]", "}", '"'])

export function backspace(doc: ReplConsole, start: number = doc.selectionStart, end: number = doc.selectionEnd) {
    if(start != end) {
        doc.backspace();
    } else {
        if(parenPair.has(doc.model.getText(start-1, start+1))) {
            doc.model.deleteRange(start-1, 2);
            doc.selectionStart = doc.selectionEnd = start-1;
        } else if(closeParen.has(doc.model.getText(start-1, start)) || openParen.has(doc.model.getText(start-1, start))) {
            doc.selectionStart = doc.selectionEnd = start-1;
        } else if(openParen.has(doc.model.getText(start-1, start+1)) || closeParen.has(doc.model.getText(start-1, start))) {
            doc.model.deleteRange(start-1, 2);
            doc.selectionStart = doc.selectionEnd = start-1;
        } else
            doc.backspace();
    }
}


export function deleteForward(doc: ReplConsole, start: number = doc.selectionStart, end: number = doc.selectionEnd) {
    if(start != end) {
        doc.delete();
    } else {
        if(parenPair.has(doc.model.getText(start, start+2))) {
            doc.model.deleteRange(start, 2);
        } else if(parenPair.has(doc.model.getText(start-1, start+1))) {
            doc.model.deleteRange(start-1, 2);
            doc.selectionStart = doc.selectionEnd = start-1;
        } else if(openParen.has(doc.model.getText(start, start+1)) || closeParen.has(doc.model.getText(start, start+1))) {
            doc.selectionStart = doc.selectionEnd = start+1;
        } else
            doc.delete();
    }
}

export function stringQuote(doc: ReplConsole, start: number = doc.selectionStart, end: number = doc.selectionEnd) {
    if(start != end) {
        doc.insertString('"');
    } else {
        let cursor = doc.getTokenCursor(start);
        if(cursor.withinString()) {
            // inside a string, let's be clever
            if(doc.model.getText(start, start+1) == '"' || doc.model.getText(start-1, start+1) == '\\"') {
                doc.selectionStart = doc.selectionEnd = start + 1;
            } else if(doc.model.getText(start, start+2) == '\\"') {
                doc.selectionStart = doc.selectionEnd = start + 2;
            } else {
                doc.model.changeRange(start, start, '\\"');
                doc.selectionStart = doc.selectionEnd = start + 2;
            }
        } else {
            doc.model.changeRange(start, start, '""');
            doc.selectionStart = doc.selectionEnd = start + 1;
        }
    }
}

// raiseSexp
// convolute
