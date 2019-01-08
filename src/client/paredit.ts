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
    cursor.backwardWhitespace();
    start = cursor.offsetStart;
    let ws = cursor.clone();
    ws.forwardWhitespace()
    if(cursor.withinString())
        throw new Error("Invalid context for paredit.splitSexp");
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
    if(open.type == "close") {
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
    // NOTE: this should unwrap the string, not throw.
    if(cursor.withinString())
        throw new Error("Invalid context for paredit.killForwardList");
    cursor.forwardList();
    doc.model.changeRange(start, cursor.offsetStart, "");
    return doc.selectionStart = doc.selectionEnd = cursor.offsetStart;
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
        cursor.forwardSexp();
        cursor.backwardWhitespace();
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close);
        doc.model.changeRange(offset, offset+1, "");
    }
}

export function backwardSlurpSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    cursor.backwardList();
    if(cursor.getPrevToken().type == "open") {
        let offset = cursor.offsetStart-1;
        let close = cursor.getPrevToken().raw;
        cursor.previous();
        cursor.backwardSexp();
        cursor.forwardWhitespace();
        doc.model.changeRange(offset, offset+1, "");
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close);
    }
}

export function forwardBarfSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    cursor.forwardList();
    if(cursor.getToken().type == "close") {
        let offset = cursor.offsetStart;
        let close = cursor.getToken().raw;
        cursor.backwardSexp();
        cursor.backwardWhitespace();
        doc.model.changeRange(offset, offset+1, "");
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close);
    }
}

export function backwardBarfSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    cursor.backwardList();
    if(cursor.getPrevToken().type == "open") {
        cursor.previous();
        let offset = cursor.offsetStart;
        let close = cursor.getToken().raw;
        cursor.next();
        cursor.forwardSexp();
        cursor.forwardWhitespace();
        doc.model.changeRange(cursor.offsetStart, cursor.offsetStart, close);
        doc.model.changeRange(offset, offset+1, "");
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

// raiseSexp
// convolute
