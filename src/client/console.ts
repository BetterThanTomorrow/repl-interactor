import { LineInputModel } from "./model";
import { Token } from "./clojure-lexer";
import { TokenCursor } from "./token-cursor";

const canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

function measureText(str: string) {
    return ctx.measureText(str).width;
}


let canonicalParens = {
    '#?(': '()',
    '#?@(': '()',
    '#(': '()',
    '(': '()',
    ')': '()',
    '#{': '{}',
    '{': '{}',
    '}': '{}',
    '[': '[]',
    ']': '[]'
}

function validPair(open: string, close: string) {
    return canonicalParens[open] == canonicalParens[close];
}

export class ReplConsole {
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

    public getTokenCursor([row, col]: [number, number] = this.model.getRowCol(this.cursorEnd), previous: boolean = false) {
        let line = this.model.lines[row]
        let lastIndex = 0;
        if(line) {
            for(let i=0; i<line.tokens.length; i++) {
                let tk = line.tokens[i];
                if(previous ? tk.offset > col : tk.offset > col)
                    return new TokenCursor(this.model, row, previous ? Math.max(0, lastIndex-1) : lastIndex);
                lastIndex = i;
            }
            return new TokenCursor(this.model, row, line.tokens.length-1);
        }
    }

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

    closeParen: TokenCursor;
    openParen: TokenCursor;

    matchingParen = false;

    private getElementForToken(cursor: TokenCursor) {
        if(cursor && this.inputLines[cursor.line])
            return this.inputLines[cursor.line].querySelector(".content").children.item(cursor.token) as HTMLElement
    }

    private clearParenMatches() {
        let cp = this.getElementForToken(this.closeParen);
        if(cp) {
            cp.classList.remove("match");
            cp.classList.remove("match-fail");
        }

        let op = this.getElementForToken(this.openParen);
        if(op) {
            op.classList.remove("match");
            op.classList.remove("match-fail");
        }
        this.closeParen = null;
        this.openParen = null;
    }

    updateParenMatches() {
        let cursor = this.getTokenCursor();

        if(cursor.getPrevToken().type == "close") {
            this.closeParen = cursor.clone().previous();
            cursor.previous();
            while(cursor.backwardSexp());
            if(cursor.getPrevToken().type == "open") {
                this.openParen = cursor.previous();
            }
            this.matchingParen = validPair(this.openParen.getToken().raw, this.closeParen.getToken().raw);
        } else if(cursor.getToken().type == "open") {
            this.openParen = cursor.clone();
            cursor.next();
            while(cursor.forwardSexp());
            if(cursor.getToken().type == "close") {
                this.closeParen = cursor;
            }            
            this.matchingParen = validPair(this.openParen.getToken().raw, this.closeParen.getToken().raw);
        }

        let cp = this.getElementForToken(this.closeParen);
        if(cp) {
            if(this.matchingParen)
                cp.classList.add("match");
            else
                cp.classList.add("fail-match")
        }

        let op = this.getElementForToken(this.openParen);
        if(op) {
            if(this.matchingParen)
                op.classList.add("match");
            else
                op.classList.add("fail-match")
        }
    }

    updateState() {
        this.clearParenMatches();
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

        this.updateParenMatches()
    }

    positionToOffset(pageX: number, pageY: number) {
        let rect = this.mainElem.getBoundingClientRect();
        let y = pageY-(rect.top + window.scrollY);
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

const macros = new Set(["if", "let", "do", "while", "cond", "case"]);

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


const whitespace = new Set(["ws", "comment", "eol"])

type IndentRule = ["block", number] | ["inner", number] | ["inner", number, number];

let indentRules: { [id: string]: IndentRule[]} = {
    "alt!": [["block", 0]],
    "alt!!": [["block", 0]],
    "are": [["block", 2]] ,
    "as->": [["block", 2]],
    "binding": [["block", 1]],
    "bound-fn": [["inner", 1]],
    "case": [["block", 1]],
    "catch": [["block", 2]],
    "comment": [["block", 0]],
    "cond": [["block", 0]],
    "condp": [["block", 2]],
    "cond->": [["block", 1]],
    "cond->>": [["block", 1]],
    "def": [["inner", 0]],
    "defmacro": [["inner", 0]],
    "defmethod": [["inner", 0]],
    "defmulti": [["inner", 0]],
    "defn": [["inner", 0]],
    "defn-": [["inner", 0]],
    "defonce": [["inner", 0]],
    "defprotocol": [["block", 1], ["inner", 1]],
    "defrecord": [["block", 2], ["inner", 1]],
    "defstruct": [["block", 1]],
    "deftest": [["inner", 0]],
    "deftype": [["block", 2], ["inner", 1]],
    "do": [["block", 0]],
    "doseq": [["block", 1]],
    "dotimes": [["block", 1]],
    "doto": [["block", 1]],
    "extend": [["block", 1]],
    "extend-protocol": [["block", 1], ["inner", 1]],
    "extend-type": [["block", 1], ["inner", 1]],
    "fdef": [["inner", 0]],
    "finally": [["block", 0]],
    "fn": [["inner", 0]],
    "for": [["block", 1]],
    "future": [["block", 0]],
    "go": [["block", 0]],
    "go-loop": [["block", 1]],
    "if": [["block", 1]],
    "if-let": [["block", 1]],
    "if-not": [["block", 1]],
    "if-some": [["block", 1]],
    "let": [["block", 1]],
    "letfn": [["block", 1], ["inner", 2, 0]],
    "locking": [["block", 1]],
    "loop": [["block", 1]],
    "match": [["block", 1]],
    "ns": [["block", 1]],
    "proxy": [["block", 2], ["inner", 1]],
    "reify": [["inner", 0], ["inner", 1]],
    "struct-map": [["block", 1]],
    "testing": [["block", 1]],
    "thread": [["block", 0]],
    "try": [["block", 0]],
    "use-fixtures": [["inner", 0]],
    "when": [["block", 1]],
    "when-first": [["block", 1]],
    "when-let": [["block", 1]],
    "when-not": [["block", 1]],
    "when-some": [["block", 1]],
    "while": [["block", 1]],
    "with-local-vars": [["block", 1]],
    "with-open": [["block", 1]],
    "with-out-str": [["block", 0]],
    "with-precision": [["block", 1]],
    "with-redefs": [["block", 1]],
}

interface IndentState {
    first: string;
    startIndent: number;
    firstItemIdent: number;
    rules: IndentRule[];
    argPos: number;
    exprsOnLine: number;
}

// If a token's raw string is in this set, then it counts as an 'open list'. An open list is something that could be
// considered code, so special formatting rules apply.
let OPEN_LIST = new Set(["#(", "#?(", "(", "#?@("])

export function collectIndentState(document: ReplConsole, position: [number, number], maxDepth: number = 3, maxLines: number = 20): IndentState[] {
    let cursor = document.getTokenCursor(position);
    cursor.backwardWhitespace();
    let argPos = 0;
    let startLine = cursor.line;
    let exprsOnLine = 0;
    let lastLine = cursor.line;
    let lastIndent = 0;
    let indents: IndentState[] = [];
    do {
        if(!cursor.backwardSexp()) {
            // this needs some work..
            let prevToken = cursor.getPrevToken();
            if(prevToken.type == 'open' && prevToken.offset <= 1) {
                maxDepth = 0; // treat an sexpr starting on line 0 sensibly.
            }
            // skip past the first item and record the indent of the first item on the same line if there is one.
            let nextCursor = cursor.clone();
            nextCursor.forwardSexp()
            nextCursor.forwardWhitespace();

            // iff the first item of this list is a an identifier, and the second item is on the same line, indent to that second item. otherwise indent to the open paren.
            let firstItemIdent = cursor.getToken().type == "id" && nextCursor.line == cursor.line && !nextCursor.atEnd() && OPEN_LIST.has(prevToken.raw) ? nextCursor.rowCol[1] : cursor.rowCol[1];


            let token = cursor.getToken().raw;
            let startIndent = cursor.rowCol[1];
            if(!cursor.backwardUpList())
                break;
            let indentRule = indentRules[token] || [];
            indents.unshift({ first: token, rules: indentRule, argPos, exprsOnLine, startIndent, firstItemIdent });
            argPos = 0;
            exprsOnLine = 1;
        }

        if(cursor.line != lastLine) {
            let head = cursor.clone();
            head.forwardSexp();
            head.forwardWhitespace();
            if(!head.atEnd()) {
                lastIndent = head.rowCol[1];
                exprsOnLine = 0;
                lastLine = cursor.line;
            }
        }

        if(whitespace.has(cursor.getPrevToken().type)) {
            argPos++;
            exprsOnLine++;
        }
    } while(!cursor.atStart() && Math.abs(startLine-cursor.line) < maxLines && indents.length < maxDepth);
    if(!indents.length)
        indents.push({argPos: 0, first: null, rules: [], exprsOnLine: 0, startIndent: lastIndent >= 0 ? lastIndent : 0, firstItemIdent: lastIndent >= 0 ? lastIndent : 0})
    return indents;
}

/** Returns [argumentPosition, startOfList] */
export function getIndent(document: ReplConsole, position: [number, number]): number {
    let state = collectIndentState(document, position);
    // now find applicable indent rules
    let indent = -1;
    let thisBlock = state[state.length-1];
    if(!state.length)
        return 0;
    
    for(let pos = state.length-1; pos >= 0; pos--) {
        for(let rule of state[pos].rules) {
            if(rule[0] == "inner") {
                if(pos + rule[1] == state.length-1) {
                    if(rule.length == 3) {
                        if(rule[2] > thisBlock.argPos)
                            indent = thisBlock.startIndent + 1;
                    } else
                        indent = thisBlock.startIndent + 1;
                }
            } else if(rule[0] == "block" && pos == state.length-1) {
                if(thisBlock.exprsOnLine <= rule[1]) {
                    if(thisBlock.argPos >= rule[1])
                        indent = thisBlock.startIndent + 1
                } else {
                    indent = thisBlock.firstItemIdent;
                }
            }
        }
    }

    if(indent == -1) {
        // no indentation styles applied, so use default style.
        if(thisBlock.exprsOnLine > 0)
            indent = thisBlock.firstItemIdent;
        else
            indent = thisBlock.startIndent
    }
    return indent;
}