import { ReplConsole } from "./console";
import { validPair } from "./clojure-lexer";

export function wrapSexpr(doc: ReplConsole, open: string, close: string, start: number = doc.selectionStart, end: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(end);
    if(cursor.withinString())
        throw new Error("Invalid context for paredit.wrapSexpr");
    cursor.forwardSexp()
    doc.model.insertString(cursor.offset, ")");
    doc.model.insertString(start, "(");
}

export function splitSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    cursor.backwardWhitespace();
    start = cursor.offset;
    let ws = cursor.clone();
    ws.forwardWhitespace()
    if(cursor.withinString())
        throw new Error("Invalid context for paredit.wrapSexpr");
    if(cursor.backwardList()) {
        let open = cursor.getPrevToken().raw;

        if(cursor.forwardList()) {
            let close = cursor.getToken().raw;
            doc.model.changeRange(start, ws.offset, close+" "+open);
            doc.selectionStart = doc.selectionEnd = start + 1;
        }
    }
}

export function joinSexp(doc: ReplConsole, start: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    cursor.backwardWhitespace();
    let open = cursor.getPrevToken();
    let beginning = cursor.offset;
    if(open.type == "close") {
        cursor.forwardWhitespace();
        let close = cursor.getToken();
        let end = cursor.offset;
        if(close.type == "open" && validPair(open.raw, close.raw)) {
            doc.model.changeRange(beginning-1, end+1, " ");
            doc.selectionStart = doc.selectionEnd = beginning;
        }
    }
}

// spliceSexp

// barfSexp
//   forward
//   backward
// slurpSexp
//   forward
//   backward

// raiseSexp
/*
closeAndNewline
delete
killSexp
*/