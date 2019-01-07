import { ReplConsole } from "./console";

export function wrapSexpr(doc: ReplConsole, open: string, close: string, start: number = doc.selectionStart, end: number = doc.selectionEnd) {
    let cursor = doc.getTokenCursor(start);
    if(cursor.withinString())
        throw new Error("Invalid context for paredit.wrapSexpr");
    cursor.forwardSexp()
    doc.model.insertString(cursor.offset, ")");
    doc.model.insertString(start, "(");
}