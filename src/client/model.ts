import { Scanner, Token, ScannerState } from "./clojure-lexer";
import { UndoManager, UndoStep } from "./undo";
import { ReplConsole } from "./console";

const scanner = new Scanner();

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

export class ReplLine {
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

export class LineInputModel {
    lines: ReplLine[] = [new ReplLine("", this.getStateForLine(0))];
    changedLines: Set<number> = new Set();
    insertedLines: Set<[number, number]> = new Set();
    deletedLines: Set<[number, number]> = new Set();
    undoManager = new UndoManager<ReplConsole>();

    recordingUndo: boolean = false;
    dirtyLines: number[] = [];

    private markDirty(idx: number) {
        if(idx >= 0 && idx < this.lines.length && this.dirtyLines.indexOf(idx) == -1)
            this.dirtyLines.push(idx);
    }

    private removeDirty(start: number, end: number, inserted: number) {
        let delta = end-start + inserted;
        this.dirtyLines = this.dirtyLines.filter(x => x < start || x > end)
                                          .map(x => x > start ? x - delta : x);
    }

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

    getOffsetForLine(line: number) {
        let max = 0;
        for(let i=0; i<line; i++)
            max += this.lines[i].text.length + 1;
        return max;
    }

    getText(start: number, end: number) {
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

    getRowCol(offset: number): [number, number] {
        for(let i=0; i<this.lines.length; i++) {
            if(offset > this.lines[i].text.length)
                offset -= this.lines[i].text.length+1;
            else
                return [i, offset];
        }
        return [this.lines.length-1, this.lines[this.lines.length-1].text.length]
    }

    private getStateForLine(line: number): ScannerState {
        return line == 0 ? { inString: false, } : { ... this.lines[line-1].endState };
    }

    insertString(offset: number, text: string, oldCursor?: [number, number], newCursor?: [number, number]): number {
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
                newItems.push(new ReplLine(lines[i], this.getStateForLine(0)));
            }
            newItems.push(new ReplLine(lines[lines.length-1]+rhs, this.getStateForLine(0)));
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

    deleteRange(offset: number, length: number, oldCursor?: [number, number], newCursor?: [number, number]) {
        this.removeDirty(this.getRowCol(offset)[0], this.getRowCol(offset+length)[0], 0);

        let [row, col] = length > 0 ? this.getRowCol(offset) : this.getRowCol(offset+length);
        let [endRow, endCol] = length > 0 ? this.getRowCol(offset+length) : this.getRowCol(offset);

        let deleted = this.getText(offset, offset+length)
        this.markDirty(row);

        if(endRow != row) {
            let left = this.lines[row].text.substring(0, col);
            let right = this.lines[endRow].text.substring(endCol);
            this.lines[row].text = left + right;
            this.lines.splice(row+1, endRow-row);
            this.changedLines.add(row);
            this.deletedLines.add([row+1, endRow-row])
        } else {
            this.lines[row].text = this.lines[row].text.substring(0, col) + this.lines[row].text.substring(col+length);
            this.changedLines.add(row);
        }
        if(this.recordingUndo)
            this.undoManager.addUndoStep(new EditorDeleteUndoStep("Delete", offset, deleted, oldCursor, newCursor))
    }

    get maxOffset() {
        let max = 0;
        for(let i=0; i<this.lines.length; i++)
            max += this.lines[i].text.length + 1;
        return max-1;
    }
}

class EditorUndoStep extends UndoStep<ReplConsole> {
    constructor(public name: string, public oldSelection?: [number, number], public newSelection?: [number, number]) {
        super();
    }

    undo(c: ReplConsole) {
        if(this.oldSelection)
            [c.cursorStart, c.cursorEnd] = this.oldSelection;
        // delete the insertedText
    }

    redo(c: ReplConsole) {
        if(this.newSelection)
            [c.cursorStart, c.cursorEnd] = this.newSelection;
    }
}

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
