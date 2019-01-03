import { debug } from "util";
import { Scanner, Token, ScannerState } from "./clojure-lexer";

const canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

function measureText(str: string) {
    return ctx.measureText(str).width;
}

let macros = new Set(["if", "let", "do", "while", "cond", "case"]);

const scanner = new Scanner();

function makeToken(tk: Token) {
    let span = document.createElement("span");
    let className = tk.type;
    if(tk.type == "id") {
        if(tk.raw.startsWith("def"))
            className = "decl";
        else if(macros.has(tk.raw))
            className = "macro";
    }

    span.textContent = tk.raw;
    span.className = className;
    return span;
}

class ReplLine {
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

abstract class UndoStep {
    name: string;
    undoStop: boolean;
    abstract undo(c: ReplConsole): void;
    abstract redo(c: ReplConsole): void;

    coalesce(c: UndoStep): boolean {
        return false;
    }
}

class EditorUndoStep extends UndoStep {
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

    coalesce(step: UndoStep) {
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

    coalesce(step: UndoStep) {
        if(step instanceof EditorDeleteUndoStep) {
            // repeated delete key
            if(this.offset == step.offset) {
                this.deletedText += step.deletedText;
                this.newSelection = step.newSelection;
                return true;
            }

            // repeated backspace key
            if(this.offset - this.deletedText.length == step.offset) {
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

class LineInputModel {
    lines: ReplLine[] = [new ReplLine("", this.getStateForLine(0))];
    changedLines: Set<number> = new Set();
    insertedLines: Set<[number, number]> = new Set();
    deletedLines: Set<[number, number]> = new Set();
    undoManager = new UndoManager();

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

    getRowCol(offset: number) {
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

class UndoManager {
    private undos: UndoStep[] = [];
    private redos: UndoStep[] = [];

    addUndoStep(step: UndoStep) {
        if(this.undos.length) {
            let prevUndo = this.undos[this.undos.length-1];
            if(prevUndo.undoStop) {
                this.undos.push(step);
            } else if(!prevUndo.coalesce(step)) {
                this.undos.push(step);
            }
        } else {
            this.undos.push(step);
        }
        this.redos = [];
    }

    /** Prevents this undo from becoming coalesced with future undos */
    insertUndoStop() {
        if(this.undos.length)
            this.undos[this.undos.length-1].undoStop = true;
    }

    undo(c: ReplConsole) {
        if(this.undos.length) {
            const step = this.undos.pop();
            step.undo(c);
            this.redos.push(step);
        }
    }

    redo(c: ReplConsole) {
        if(this.redos.length) {
            const step = this.redos.pop();
            step.redo(c);
            this.undos.push(step);
        }
    }
}

class ReplConsole {
    private _cursorStart: number = 0;

    get cursorStart() {
        return this._cursorStart
    };
    
    set cursorStart(val: number) {
        this._cursorStart = Math.min(this.model.maxOffset, Math.max(val, 0));
    }

    private _cursorEnd: number = 0;

    get cursorEnd() {
        return this._cursorEnd
    };
    
    set cursorEnd(val: number) {
        this._cursorEnd = Math.min(this.model.maxOffset, Math.max(val, 0));
    }    

    private lastCursorStart: number = 0;
    private lastCursorEnd: number = 0;

    /** The underlying tokenized source. */
    model = new LineInputModel();

    /** The HTMLDivElements in the rendered view for each line. */
    inputLines: HTMLDivElement[] = [];

    /** The element representing the caret. */
    caret: HTMLDivElement;
    
    /** The target column of the caret, for up/down movement. */
    caretX: number = 0;

    withUndo(f: () => void) {
        let oldUndo = this.model.recordingUndo;
        try {
            this.model.recordingUndo = true;
            f();
        } finally {
            this.model.recordingUndo = oldUndo;
        }
    }

    insertString(text: string) {
        this.withUndo(() => {
            if(this.cursorStart != this.cursorEnd) {
                this.deleteSelection();
            }
            let [cs, ce] = [this.cursorStart, this.cursorEnd]
            this.cursorEnd += this.model.insertString(this.cursorEnd, text, [cs, ce]);
            this.cursorStart = this.cursorEnd;

            this.updateState();
            
            this.caretX = this.model.getRowCol(this.cursorEnd)[1];
        });
    }

    caretLeft(clear: boolean = true) {
        if(clear && this.cursorStart != this.cursorEnd) {
            if(this.cursorStart < this.cursorEnd)
                this.cursorEnd = this.cursorStart;
            else
                this.cursorStart = this.cursorEnd;
        } else {
            this.cursorEnd--;
            if(clear)
                this.cursorStart = this.cursorEnd;
        }
        this.updateState();
        this.caretX = this.model.getRowCol(this.cursorEnd)[1];
    }

    caretRight(clear: boolean = true) {
        if(clear && this.cursorStart != this.cursorEnd) {
            if(this.cursorStart > this.cursorEnd)
                this.cursorEnd = this.cursorStart;
            else
                this.cursorStart = this.cursorEnd;
        } else {
            this.cursorEnd++
            if(clear)
                this.cursorStart = this.cursorEnd;
        }
        this.updateState();
        this.caretX = this.model.getRowCol(this.cursorEnd)[1];
    }

    caretHomeAll(clear: boolean = true) {
        this.cursorEnd = 0;
        if(clear)
            this.cursorStart = this.cursorEnd;
        this.updateState();
        this.caretX = this.model.getRowCol(this.cursorEnd)[1];
    }

    caretEndAll(clear: boolean = true) {
        this.cursorEnd = this.model.maxOffset;
        if(clear)
            this.cursorStart = this.cursorEnd;
        this.updateState();
        this.caretX = this.model.getRowCol(this.cursorEnd)[1];
    }

    caretHome(clear: boolean = true) {
        let [row, col] = this.model.getRowCol(this.cursorEnd);
        this.cursorEnd = this.cursorEnd-col;
        if(clear)
            this.cursorStart = this.cursorEnd;
        this.updateState();
        this.caretX = this.model.getRowCol(this.cursorEnd)[1];
    }

    caretEnd(clear: boolean = true) {
        let [row, col] = this.model.getRowCol(this.cursorEnd);
        this.cursorEnd = this.cursorEnd-col + this.model.lines[row].text.length;
        if(clear)
            this.cursorStart = this.cursorEnd;
        this.updateState();
        this.caretX = this.model.getRowCol(this.cursorEnd)[1];
    }

    caretUp(clear: boolean = true) {
        let [row, col] = this.model.getRowCol(this.cursorEnd);
        if(row > 0) {
            let len = this.model.lines[row-1].text.length;
            this.cursorEnd = this.model.getOffsetForLine(row-1)+Math.min(this.caretX, len);
        } else {
            this.cursorEnd = 0;
        }
        if(clear)
            this.cursorStart = this.cursorEnd;
        this.updateState();
    }

    caretDown(clear: boolean = true) {
        let [row, col] = this.model.getRowCol(this.cursorEnd);
        if(row < this.model.lines.length-1) {
            let len = this.model.lines[row+1].text.length;
            this.cursorEnd = this.model.getOffsetForLine(row+1)+Math.min(this.caretX, len);
        } else {
            this.cursorEnd = this.model.maxOffset;
        }
        if(clear)
            this.cursorStart = this.cursorEnd;
        this.updateState();
    }
    
    private deleteSelection() {
        this.withUndo(() => {
            if(this.cursorStart != this.cursorEnd) {
                this.model.deleteRange(Math.min(this.cursorStart, this.cursorEnd), Math.max(this.cursorStart, this.cursorEnd)-Math.min(this.cursorStart, this.cursorEnd));
                this.cursorStart = this.cursorEnd = Math.min(this.cursorStart, this.cursorEnd);
            }
        })
    }

    backspace() {
        this.withUndo(() => {
            if(this.cursorStart != this.cursorEnd) {
                this.deleteSelection();
            } else {
                if(this.cursorEnd > 0) {
                    this.model.deleteRange(this.cursorEnd-1, 1, [this.cursorStart, this.cursorEnd], [this.cursorEnd-1, this.cursorEnd-1]);
                    this.cursorEnd--;
                }
                this.cursorStart = this.cursorEnd;
            }
            this.updateState()
            this.caretX = this.model.getRowCol(this.cursorEnd)[1];
        });
    }

    delete() {
        this.withUndo(() => {
            if(this.cursorStart != this.cursorEnd) {
                this.deleteSelection();
            } else {
                this.model.deleteRange(this.cursorEnd, 1);
                this.cursorStart = this.cursorEnd;
            }
            this.caretX = this.model.getRowCol(this.cursorEnd)[1];
            this.updateState()
        });
    }

    private makeSelection(start: number, width: number) {
        let div = document.createElement("div")
        div.className = "sel-marker";
        let left = start;
        div.style.left = left + "px";
        div.style.width = width + "px";
        return div;
    }

    updateState() {
        this.model.flushChanges()
        // insert any new lines
        for(let [start, count] of this.model.insertedLines) {
            for(let j=0; j<count; j++) {
                let line = this.makeLine()
                if(!this.inputLines[start+j+1])
                    this.mainElem.append(line);
                else
                    this.mainElem.insertBefore(line, this.inputLines[start+j+1]);
                
                this.inputLines.splice(start+j+1, 0, line)
            }
        }
        this.model.insertedLines.clear();

        // remove any deleted lines
        for(let [start, count] of this.model.deletedLines) {
            for(let j=0; j<count; j++)
                this.mainElem.removeChild(this.inputLines[start+j]);
            this.inputLines.splice(start, count);
        }
        this.model.deletedLines.clear();

        // update changed lines
        for(let line of this.model.changedLines) {
            let ln = this.inputLines[line].querySelector(".content");
            while(ln.firstChild)
                ln.removeChild(ln.firstChild);
            for(let tk of this.model.lines[line].tokens) {
                if(!tk)
                    break;
                ln.appendChild(makeToken(tk));
            }
            if(!ln.firstChild)
                ln.appendChild(document.createTextNode(" ")) // otherwise the line will collapse to height=0 due to html fun.
        }
        this.model.changedLines.clear();

        // reposition the caret
        let [row, col] = this.model.getRowCol(this.cursorEnd);
        this.inputLines[row].appendChild(this.caret);
        this.caret.style.left = measureText(this.model.lines[row].text.substr(0, col)) + "px";

        let startLine = this.model.getRowCol(Math.min(this.lastCursorStart, this.lastCursorEnd, this.cursorStart, this.cursorEnd));
        let endLine = this.model.getRowCol(Math.max(this.lastCursorStart, this.lastCursorEnd, this.cursorStart, this.cursorEnd));

        let cs = this.model.getRowCol(Math.min(this.cursorStart, this.cursorEnd));
        let ce = this.model.getRowCol(Math.max(this.cursorStart, this.cursorEnd));

        let lcs = this.model.getRowCol(Math.min(this.lastCursorStart, this.lastCursorEnd));
        let lce = this.model.getRowCol(Math.max(this.lastCursorStart, this.lastCursorEnd));

        // update the selection
        for(let line = startLine[0]; line<=endLine[0]; line++) {
            let ln = this.inputLines[line].querySelector(".selection");
            if(line < cs[0] || line > ce[0]) {
                // definitely outside the selection, nuke all the selectiond divs.
                while(ln.firstChild)
                    ln.removeChild(ln.firstChild);
            } else if(line == cs[0] && line == ce[0]) {
                // this selection is exactly 1 line, and we're at it.
                while(ln.firstChild)
                    ln.removeChild(ln.firstChild);
                let left = measureText("M")*cs[1];
                ln.appendChild(this.makeSelection(left, measureText("M")*ce[1]-left));
            } else if(line == cs[0]) {
                // this is the first line of the selection
                while(ln.firstChild)
                    ln.removeChild(ln.firstChild);
                let left = measureText("M")*cs[1];
                ln.appendChild(this.makeSelection(left, measureText("M")*this.model.lines[line].text.length - left));
            } else if(line == ce[0]) {
                // this is the last line of the selection
                while(ln.firstChild)
                    ln.removeChild(ln.firstChild);
                ln.appendChild(this.makeSelection(0, measureText("M")*ce[1]));
            } else if(line > cs[0] && line < ce[0]) {
                // this line is within the selection, but is not the first or last.
                if(line > lcs[0] && line < lce[0]) {
                    // this line was within the selection previously, it is already highlighted,
                    // nothing to do.
                } else if(line >= cs[0] && line <= ce[0]) {
                    // this line is newly within the selection
                    while(ln.firstChild)
                        ln.removeChild(ln.firstChild);
                    ln.appendChild(this.makeSelection(0, Math.max(measureText("M"), measureText("M")*this.model.lines[line].text.length)));
                } else {
                    // this line is no longer within the selection
                    while(ln.firstChild)
                        ln.removeChild(ln.firstChild);
                }
            }
        }

        this.lastCursorStart = this.cursorStart;
        this.lastCursorEnd = this.cursorEnd;
    }

    positionToOffset(pageX: number, pageY: number) {
        let rect = this.mainElem.getBoundingClientRect();
        let y = pageY-rect.top;
        let i: number;
        for(i=0; i<this.mainElem.children.length; i++) {
            let child = this.mainElem.children.item(i) as HTMLElement;
            if(y < child.offsetTop)
                break;
        }
        i--;

        let offset = this.model.getOffsetForLine(i);
        
        offset += Math.min(Math.floor((pageX-rect.left) / measureText("M")), this.model.lines[i].text.length)
        return offset;
    }

    private mouseDrag = (e: MouseEvent) => {
        this.cursorEnd = this.positionToOffset(e.pageX, e.pageY)
        this.caretX = this.model.getRowCol(this.cursorEnd)[1];
        this.updateState();
    }

    private mouseUp = (e: MouseEvent) => {
        window.removeEventListener("mousemove", this.mouseDrag)
        window.removeEventListener("mouseup", this.mouseUp)
    }

    constructor(public mainElem: HTMLDivElement) {
        this.mainElem.addEventListener("mousedown", e => {
            e.preventDefault();
            this.cursorStart = this.cursorEnd = this.positionToOffset(e.pageX, e.pageY)
            this.caretX = this.model.getRowCol(this.cursorEnd)[1];
            this.updateState();

            window.addEventListener("mousemove", this.mouseDrag)
            window.addEventListener("mouseup", this.mouseUp)
        })
        
        this.caret = document.createElement("div");
        this.caret.className = "caret";
        let line = this.makeLine();
        this.inputLines.push(line)
        this.mainElem.appendChild(line);
        ctx.font = getComputedStyle(line).font+"";
        this.caret.style.width = measureText("M")+"px";
        line.appendChild(this.caret);
    }

    private makeLine() {
        let line = document.createElement("div");
        line.className = "line";

        let content = document.createElement("div");
        content.className = "content";
        line.append(content);

        let selection = document.createElement("div");
        selection.className = "selection";
        line.append(selection);
        return line;
    }
}

const isMac = navigator.platform.match(/Mac(Intel|PPC|68k)/i); // somewhat optimistic this would run on MacOS8 but hey ;)

window.addEventListener("keydown", e => {
    let commandKey = isMac ? e.metaKey : e.ctrlKey;

    if(e.key.length == 1 && !e.metaKey && !e.ctrlKey) {
        if(e.key == " ")
            replMain.model.undoManager.insertUndoStop();    
        replMain.insertString(e.key);
    } else if(e.key.length == 1 && commandKey) {
        switch(e.key) {
            case "a":
                replMain.cursorStart = 0;
                replMain.cursorEnd = replMain.model.maxOffset;
                replMain.updateState();
                e.preventDefault();
                break;
            case 'z':
                replMain.model.undoManager.undo(replMain);
                replMain.updateState()
                break;
            case 'Z':
                replMain.model.undoManager.redo(replMain);
                replMain.updateState()
                break;
        }
    } else {
        switch(e.keyCode) {
            case 9: // Tab
                e.preventDefault();
                break;
            case 13:
                replMain.model.undoManager.insertUndoStop();
                replMain.insertString("\n");
                break;
            case 37: // Left arrow
                replMain.caretLeft(!e.shiftKey);
                break;
            case 39: // Right arrow
                replMain.caretRight(!e.shiftKey);
                break;
            case 8: // Backspace
                replMain.backspace();
                break;
            case 36: // Home
                if(e.ctrlKey)
                    replMain.caretHomeAll(!e.shiftKey);
                else
                    replMain.caretHome(!e.shiftKey);
                break;
            case 35: // End
                if(e.ctrlKey)
                    replMain.caretEndAll(!e.shiftKey)
                else
                    replMain.caretEnd(!e.shiftKey);
                break;
            case 38: // Up
                replMain.caretUp(!e.shiftKey);
                break;
            case 40: // Down
                replMain.caretDown(!e.shiftKey);
                break;
            case 46: // Delete
                replMain.delete();
                break;
        }
    }
})

let replMain = new ReplConsole(document.getElementById("repl") as HTMLDivElement);

document.addEventListener("cut", e => {
    e.clipboardData.setData("text/plain", replMain.model.getText(replMain.cursorStart, replMain.cursorEnd));
    replMain.delete();
    e.preventDefault();
})

document.addEventListener("copy", e => {
    e.clipboardData.setData("text/plain", replMain.model.getText(replMain.cursorStart, replMain.cursorEnd));
    e.preventDefault();
})

document.addEventListener("paste", e => {
    replMain.insertString(e.clipboardData.getData("text/plain"));
    e.preventDefault();
})
