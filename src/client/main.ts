import { LexicalGrammar, Token } from "./lexer"

let toplevel = new LexicalGrammar()


// whitespace
toplevel.terminal("[\\s,]+", (l, m) => ({ type: "ws" }))
// comments
toplevel.terminal(";.*", (l, m) => ({ type: "comment" }))
// open parens
toplevel.terminal("\\(|\\[|\\{|#\\(|#?\\(|#\\{|#?@\\(", (l, m) => ({ type: "open" }))
// close parens
toplevel.terminal("\\)|\\]|\\}", (l, m) => ({ type: "close" }))

// punctuators
toplevel.terminal("~@|~|'|#'|#:|#_|\\^|`|#|\\^:", (l, m) => ({ type: "punc" }))

toplevel.terminal("true|false|nil", (l, m) => ({type: "lit"}))
toplevel.terminal("[0-9]+[rR][0-9a-zA-Z]+", (l, m) => ({ type: "lit" }))
toplevel.terminal("[-+]?[0-9]+(\\.[0-9]+)?([eE][-+]?[0-9]+)?", (l, m) => ({ type: "lit" }))

toplevel.terminal(":[^()[\\]\\{\\}#,~@'`^\"\\s;]*", (l, m) => ({ type: "kw" }))
// this is a REALLY lose symbol definition, but similar to how clojure really collects it. numbers/true/nil are all 
toplevel.terminal("[^()[\\]\\{\\}#,~@'`^\"\\s:;][^()[\\]\\{\\}#,~@'`^\"\\s;]*", (l, m) => ({ type: "id" }))
// complete string on a single line
toplevel.terminal('"([^"\\\\]|\\\\.)*"?', (l, m) => ({ type: "str"}))

toplevel.terminal('.', (l, m) => ({ type: "junk" }))

const canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

function measureText(str: string) {
    return ctx.measureText(str).width;
}

let macros = new Set(["if", "let", "do", "while", "cond", "case"]);

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
    constructor(public text: string) {
    }
}

abstract class UndoStep {
    name: string;
    abstract undo(c: ReplConsole): void;
    abstract redo(c: ReplConsole): void;
}

class EditorUndoStep extends UndoStep {
    constructor(public name: string, public selectionStart: [number, number], public selectionEnd: [number, number]) {
        super();
    }

    undo(c: ReplConsole) {
        [c.cursorStart, c.cursorEnd] = this.selectionStart;
        // delete the insertedText
    }

    redo(c: ReplConsole) {
        [c.cursorStart, c.cursorEnd] = this.selectionEnd;
    }
}

class EditorInsertUndoStep extends EditorUndoStep {
    constructor(name: string, selectionStart: [number, number], selectionEnd: [number, number], public offset: number, public insertedText: string) {
        super(name, selectionStart, selectionEnd);
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
    constructor(name: string, selectionStart: [number, number], selectionEnd: [number, number], public offset: number, public deletedText: string) {
        super(name, selectionStart, selectionEnd);
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

class LineInputModel {
    lines: ReplLine[] = [new ReplLine("")];
    changedLines: Set<number> = new Set();
    insertedLines: Set<[number, number]> = new Set();
    deletedLines: Set<[number, number]> = new Set();

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
        lines[0] = this.lines[st[0]].text.substr(Math.min(start, end)-this.getOffsetForLine(st[0]))
        for(let i=st[0]+1; i<en[0]; i++)
            lines.push(this.lines[i].text);
        lines.push(this.lines[en[0]].text.substr(0, Math.max(start, end)-this.getOffsetForLine(en[0])));
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

    insertString(offset: number, text: string): number {
        let [row, col] = this.getRowCol(offset);
        let lines = text.split(/\r\n|\n/);
        let count = 0;
        if(lines.length == 1) {
            this.lines[row].text = this.lines[row].text.substring(0, col) + text + this.lines[row].text.substring(col);
            count += text.length;
        } else {
            let rhs = this.lines[row].text.substring(col);
            this.lines[row].text = this.lines[row].text.substring(0, col) + lines[0];
            let newItems = [];
            for(let i=1; i<lines.length-1; i++) {
                newItems.push(new ReplLine(lines[i]));
            }
            newItems.push(new ReplLine(lines[lines.length-1]+rhs));
            for(let i=0; i<lines.length; i++)
                count+=lines[i].length+1;
            this.insertedLines.add([row, lines.length-1]);
            this.lines.splice(row+1, 0, ...newItems);
            count--;
        }
        for(let i=0; i<lines.length; i++)
            this.changedLines.add(row+i);
        return count;
    }

    deleteRange(offset: number, length: number) {
        let [row, col] = length > 0 ? this.getRowCol(offset) : this.getRowCol(offset+length);
        let [endRow, endCol] = length > 0 ? this.getRowCol(offset+length) : this.getRowCol(offset);

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
        this.undos.push(step);
        this.redos = [];
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
    undoManager = new UndoManager();

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

    insertString(text: string) {
        if(this.cursorStart != this.cursorEnd) {
            this.deleteSelection();
        }
        let [cs, ce] = [this.cursorStart, this.cursorEnd]
        let offset = this.cursorStart = this.cursorEnd;
        this.cursorEnd += this.model.insertString(this.cursorEnd, text);
        this.cursorStart = this.cursorEnd;
        this.undoManager.addUndoStep(new EditorInsertUndoStep("Insert", [cs, ce], [this.cursorStart, this.cursorEnd], offset, text))
        this.updateState();
        this.caretX = this.model.getRowCol(this.cursorEnd)[1];
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
        if(this.cursorStart != this.cursorEnd) {
            this.model.deleteRange(Math.min(this.cursorStart, this.cursorEnd), Math.max(this.cursorStart, this.cursorEnd)-Math.min(this.cursorStart, this.cursorEnd));
            this.cursorStart = this.cursorEnd = Math.min(this.cursorStart, this.cursorEnd);
        }
    }

    backspace() {
        if(this.cursorStart != this.cursorEnd) {
            this.deleteSelection();
        } else {
            if(this.cursorEnd > 0) {
                this.model.deleteRange(this.cursorEnd-1, 1);
                this.cursorEnd--;
            }
            this.cursorStart = this.cursorEnd;
        }
        this.updateState()
        this.caretX = this.model.getRowCol(this.cursorEnd)[1];
    }

    delete() {
        if(this.cursorStart != this.cursorEnd) {
            this.deleteSelection();
        } else {
            this.model.deleteRange(this.cursorEnd, 1);
            this.cursorStart = this.cursorEnd;
        }
        this.caretX = this.model.getRowCol(this.cursorEnd)[1];
        this.updateState()
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
            let lex = toplevel.lex(this.model.lines[line].text);
            for(;;) {
                let tk = lex.scan();
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

window.addEventListener("keydown", e => {
    if(e.key.length == 1 && !e.ctrlKey) {
        replMain.insertString(e.key);
    } else if(e.key.length == 1) {
        switch(e.key) {
            case "a":
                replMain.cursorStart = 0;
                replMain.cursorEnd = replMain.model.maxOffset;
                replMain.updateState();
                e.preventDefault();
                break;
            case 'z':
                replMain.undoManager.undo(replMain);
                replMain.updateState()
                break;
            case 'Z':
                replMain.undoManager.redo(replMain);
                replMain.updateState()
                break;
        }
    } else {
        switch(e.keyCode) {
            case 9: // Tab
                e.preventDefault();
                break;
            case 13:
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
    console.log("Pasted "+e.clipboardData.getData("text/plain"));
    e.preventDefault();
})
