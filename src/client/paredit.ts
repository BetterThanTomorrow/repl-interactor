import { ReplConsole } from "./console";

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

// spliceSexp
// barfSexp
// slurpSexp


/*
closeAndNewline
delete
killSexp
*/