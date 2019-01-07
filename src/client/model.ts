import { Scanner, Token, ScannerState } from "./clojure-lexer";
import { UndoManager, UndoStep } from "./undo";
import { ReplConsole } from "./console";

const scanner = new Scanner();

/** A cheesy deep-equal function for matching scanner states. Good enough to compare plain old js objects. */
function equal(x: any, y: any): boolean {
    if(x==y) return true;
    if(x instanceof Array && y instanceof Array) {
        if(x.length == y.length) {
            for(let i = 0; i<x.length; i++)
                if(!equal(x[i], y[i]))
                    return false;
            return true;
        } else
            return false;
    } else if (!(x instanceof Array) && !(y instanceof Array) && x instanceof Object && y instanceof Object) {
        for(let f in x)
            if(!equal(x[f], y[f]))
                return false;
        for(let f in y)
            if(!x.hasOwnProperty(f))
                return false
        return true;
    }
    return false;
}

export class TextLine {
    tokens: Token[] = [];
    text: string;
    endState: ScannerState;
    constructor(text: string, public startState: ScannerState) {
        this.text = text;
        this.tokens = scanner.processLine(text)
        this.endState = {...scanner.state};
    }

    processLine(oldState: any) {
        this.startState = { ...oldState}
        this.tokens = scanner.processLine(this.text, oldState)
        this.endState = {...scanner.state};
    }
}

/** The underlying model for the REPL readline. */
export class LineInputModel {
    /** The input lines. */
    lines: TextLine[] = [new TextLine("", this.getStateForLine(0))];

    /** Lines whose text has changed. */
    changedLines: Set<number> = new Set();

    /** Lines which must be inserted. */
    insertedLines: Set<[number, number]> = new Set();

    /** Lines which must be deleted. */
    deletedLines: Set<[number, number]> = new Set();

    /** Handles undo/redo support */
    undoManager = new UndoManager<ReplConsole>();

    /** When set, insertString and deleteRange will be added to the undo history. */
    recordingUndo: boolean = false;

    /** Lines which must be re-lexed. */
    dirtyLines: number[] = [];

    /**
     * Mark a line as needing to be re-lexed.
     * 
     * @param idx the index of the line which needs re-lexing (0-based)
    */
    private markDirty(idx: number) {
        if(idx >= 0 && idx < this.lines.length && this.dirtyLines.indexOf(idx) == -1)
            this.dirtyLines.push(idx);
    }

    /**
     * Lines from start-end have been deleted, and there have been inserted new lines at that point.
     * This twiddles the indices in dirtyLines so they are correct again.
     * 
     * @param start the index of the first line that was deleted
     * @param end the index of the last line that was deleted
     * @param inserted the number of lines that were inserted at start.
     */
    private removeDirty(start: number, end: number, inserted: number) {
        let delta = end-start + inserted;
        this.dirtyLines = this.dirtyLines.filter(x => x < start || x > end)
                                          .map(x => x > start ? x - delta : x);
    }

    /**
     * Re-lexes all lines marked dirty, cascading onto the lines below if the end state for this line has
     * changed.
     */
    flushChanges() {
        if(!this.dirtyLines.length)
            return;
        let seen = new Set<number>();
        this.dirtyLines.sort();
        while(this.dirtyLines.length) {
            let nextIdx = this.dirtyLines.shift();
            if(seen.has(nextIdx))
                continue; // already processed.
            seen.add(nextIdx);
            let prevState = this.getStateForLine(nextIdx);
            do {
                seen.add(nextIdx);
                this.changedLines.add(nextIdx);
                this.lines[nextIdx].processLine(prevState);
                prevState = this.lines[nextIdx].endState;
                
            } while(this.lines[++nextIdx] && !(equal(this.lines[nextIdx].startState, prevState)))
        }
    }

    /**
     * Returns the character offset in the model to the start of a given line.
     * 
     * @param line the line who's offset will be returned.
     */
    getOffsetForLine(line: number) {
        let max = 0;
        for(let i=0; i<line; i++)
            max += this.lines[i].text.length + 1;
        return max;
    }

    /**
     * Returns the text between start and end as a string. These may be in any order.
     * 
     * @param start the start offset in the text range
     * @param end the end offset in the text range
     */
    getText(start: number, end: number): string {
        let st = this.getRowCol(Math.min(start, end));
        let en = this.getRowCol(Math.max(start, end));

        let lines = [];
        if(st[0] == en[0])
            lines[0] = this.lines[st[0]].text.substring(Math.min(st[1], en[1]), Math.max(st[1], en[1]))
        else
            lines[0] = this.lines[st[0]].text.substring(Math.min(st[1], en[1]))
        for(let i=st[0]+1; i<en[0]; i++)
            lines.push(this.lines[i].text);
        if(st[0] != en[0])
            lines.push(this.lines[en[0]].text.substring(0, Math.max(st[1], en[1])));
        return lines.join('\n');
    }

    /**
     * Returns the row and column for a given text offset in this model.
     */
    getRowCol(offset: number): [number, number] {
        for(let i=0; i<this.lines.length; i++) {
            if(offset > this.lines[i].text.length)
                offset -= this.lines[i].text.length+1;
            else
                return [i, offset];
        }
        return [this.lines.length-1, this.lines[this.lines.length-1].text.length]
    }

    /**
     * Returns the initial lexer state for a given line.
     * Line 0 is always { inString: false }, all lines below are equivalent to their previous line's startState.
     * 
     * @param line the line to retrieve the lexer state.
     */
    private getStateForLine(line: number): ScannerState {
        return line == 0 ? { inString: false, } : { ... this.lines[line-1].endState };
    }

    /**
     * Inserts a string at the given position in the document.
     * 
     * If recordingUndo is set, an UndoStep is inserted into the undoManager, which will record the original
     * cursor position.
     * 
     * @param offset the offset to insert at
     * @param text the text to insert
     * @param oldCursor the [row,col] of the cursor at the start of the operation
     */
    insertString(offset: number, text: string, oldCursor?: [number, number],): number {
        let [row, col] = this.getRowCol(offset);
        let lines = text.split(/\r\n|\n/);
        let count = 0;
        if(lines.length == 1) {
            this.lines[row].text = this.lines[row].text.substring(0, col) + text + this.lines[row].text.substring(col);
            this.markDirty(row);
            count += text.length;
        } else {
            let rhs = this.lines[row].text.substring(col);
            this.lines[row].text = this.lines[row].text.substring(0, col) + lines[0];
            this.markDirty(row);
            let newItems = [];
            for(let i=1; i<lines.length-1; i++) {
                newItems.push(new TextLine(lines[i], this.getStateForLine(0)));
            }
            newItems.push(new TextLine(lines[lines.length-1]+rhs, this.getStateForLine(0)));
            for(let i=0; i<lines.length; i++)
                count+=lines[i].length+1;
            this.insertedLines.add([row, lines.length-1]);
            this.lines.splice(row+1, 0, ...newItems);
            count--;
        }
        for(let i=0; i<lines.length; i++)
            this.changedLines.add(row+i);

        if(this.recordingUndo)
            this.undoManager.addUndoStep(new EditorInsertUndoStep("Insert", offset, text, oldCursor, [oldCursor[1]+offset, oldCursor[1]+offset]))

        return count;
    }

    /**
     * Deletes count characters starting at offset from the document.
     * If recordingUndo is set, adds an undoStep, using oldCursor and newCursor.
     * 
     * @param offset the offset to delete from
     * @param count the number of characters to delete
     * @param oldCursor the cursor at the start of the operation
     * @param newCursor the cursor at the end of the operation
     */
    deleteRange(offset: number, count: number, oldCursor?: [number, number], newCursor?: [number, number]) {
        this.removeDirty(this.getRowCol(offset)[0], this.getRowCol(offset+count)[0], 0);

        let [row, col] = count > 0 ? this.getRowCol(offset) : this.getRowCol(offset+count);
        let [endRow, endCol] = count > 0 ? this.getRowCol(offset+count) : this.getRowCol(offset);

        let deleted = this.getText(offset, offset+count)
        this.markDirty(row);

        if(endRow != row) {
            let left = this.lines[row].text.substring(0, col);
            let right = this.lines[endRow].text.substring(endCol);
            this.lines[row].text = left + right;
            this.lines.splice(row+1, endRow-row);
            this.changedLines.add(row);
            this.deletedLines.add([row+1, endRow-row])
        } else {
            this.lines[row].text = this.lines[row].text.substring(0, col) + this.lines[row].text.substring(col+count);
            this.changedLines.add(row);
        }
        if(this.recordingUndo)
            this.undoManager.addUndoStep(new EditorDeleteUndoStep("Delete", offset, deleted, oldCursor, newCursor))
    }

    /** Return the offset of the last character in this model. */
    get maxOffset() {
        let max = 0;
        for(let i=0; i<this.lines.length; i++)
            max += this.lines[i].text.length + 1;
        return max-1;
    }
}

/**
 * An Editor UndoStep.
 * 
 * All Editor Undo steps contain the position of the cursor before and after the edit.
 */
class EditorUndoStep extends UndoStep<ReplConsole> {
    constructor(public name: string, public oldSelection?: [number, number], public newSelection?: [number, number]) {
        super();
    }

    undo(c: ReplConsole) {
        if(this.oldSelection)
            [c.cursorStart, c.cursorEnd] = this.oldSelection;
    }

    redo(c: ReplConsole) {
        if(this.newSelection)
            [c.cursorStart, c.cursorEnd] = this.newSelection;
    }
}

/**
 * An insertText undo stop.
 */
class EditorInsertUndoStep extends EditorUndoStep {
    constructor(name: string, public offset: number, public insertedText: string, oldSelection?: [number, number], newSelection?: [number, number]) {
        super(name);
        this.oldSelection = oldSelection;
        this.newSelection = newSelection;
    }

    coalesce(step: EditorUndoStep) {
        if(step instanceof EditorInsertUndoStep) {
            if(this.offset + this.insertedText.length == step.offset) {
                this.insertedText += step.insertedText;
                this.newSelection = step.newSelection;
                return true;
            }
        }
        return false;
    }

    undo(c: ReplConsole) {
        c.model.deleteRange(this.offset, this.insertedText.length)
        super.undo(c);
    }

    redo(c: ReplConsole) {
        c.model.insertString(this.offset, this.insertedText)
        super.redo(c);
    }
}

/**
 * An deleteRange undo stop.
 */
class EditorDeleteUndoStep extends EditorUndoStep {
    constructor(name: string, public offset: number, public deletedText: string, oldSelection?: [number, number], newSelection?: [number, number]) {
        super(name);
        this.oldSelection = oldSelection;
        this.newSelection = newSelection;
    }

    coalesce(step: UndoStep<ReplConsole>) {
        if(step instanceof EditorDeleteUndoStep) {
            // repeated delete key
            if(this.offset == step.offset) {
                this.deletedText += step.deletedText;
                this.newSelection = step.newSelection;
                return true;
            }

            // repeated backspace key
            if(this.offset - this.deletedText.length == step.offset) {
                this.offset = step.offset;
                this.deletedText = step.deletedText + this.deletedText;
                this.newSelection = step.newSelection;
                return true;
            }
        }
        return false;
    }

    undo(c: ReplConsole) {
        c.model.insertString(this.offset, this.deletedText)
        super.undo(c);
    }

    redo(c: ReplConsole) {
        c.model.deleteRange(this.offset, this.deletedText.length)
        super.redo(c);
    }
}
