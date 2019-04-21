"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var model_1 = require("./model");
var clojure_lexer_1 = require("./clojure-lexer");
var token_cursor_1 = require("./token-cursor");
/** A cheesy utility canvas, used to measure the length of text. */
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
/** Returns the length of the string. */
function measureText(str) {
    return ctx.measureText(str).width;
}
/**
 * A syntax-highlighting text editor.
 */
var ReplReadline = /** @class */ (function () {
    function ReplReadline(parent, prompt, input) {
        var _this = this;
        this.parent = parent;
        this.input = input;
        /** Event listeners for completion */
        this._completionListeners = [];
        /** The offset of the start of the selection into the document. */
        this._selectionStart = 0;
        /** The offset of the end of the selection into the document. */
        this._selectionEnd = 0;
        /** The underlying tokenized source. */
        this.model = new model_1.LineInputModel();
        /** The HTMLDivElements in the rendered view for each line. */
        this.inputLines = [];
        /** The target column of the caret, for up/down movement. */
        this.caretX = 0;
        /** The start of the selection when we last updated the component's DOM. */
        this.lastSelectionStart = 0;
        /** The end of the selection when we last updated the component's DOM. */
        this.lastSelectionEnd = 0;
        /**
         * True if we are rendering a matched parenthesis.
         */
        this.matchingParen = false;
        this._repaintListeners = [];
        this.mouseDrag = function (e) {
            _this.selectionEnd = _this.pageToOffset(e.pageX, e.pageY);
            _this.caretX = _this.model.getRowCol(_this.selectionEnd)[1];
            _this.repaint();
        };
        this.mouseUp = function (e) {
            window.removeEventListener("mousemove", _this.mouseDrag);
            window.removeEventListener("mouseup", _this.mouseUp);
        };
        this.mouseDown = function (e) {
            e.preventDefault();
            _this.selectionStart = _this.selectionEnd = _this.pageToOffset(e.pageX, e.pageY);
            _this.caretX = _this.model.getRowCol(_this.selectionEnd)[1];
            _this.repaint();
            window.addEventListener("mousemove", _this.mouseDrag);
            window.addEventListener("mouseup", _this.mouseUp);
        };
        this.focus = function (e) { e.preventDefault(); _this.input.focus(); };
        this.growSelectionStack = [];
        this.wrap = this.elem = document.createElement("div");
        this.wrap.className = "prompt-wrap";
        this.wrap.addEventListener("mousedown", this.focus);
        this.wrap.addEventListener("touchstart", this.focus);
        this.promptElem = document.createElement("div");
        this.promptElem.className = "prompt";
        this.promptElem.textContent = prompt;
        this.mainElem = document.createElement("div");
        this.wrap.appendChild(this.promptElem);
        this.wrap.appendChild(this.mainElem);
        parent.appendChild(this.wrap);
        this.mainElem.addEventListener("mousedown", this.mouseDown);
        this.caret = document.createElement("div");
        this.caret.className = "caret";
        var line = this.makeLine();
        this.inputLines.push(line);
        this.mainElem.appendChild(line);
        ctx.font = getComputedStyle(line).font + "";
        this.caret.style.width = measureText("M") + "px";
        line.appendChild(this.caret);
    }
    ReplReadline.prototype.addCompletionListener = function (c) {
        if (this._completionListeners.indexOf(c) == -1)
            this._completionListeners.push(c);
    };
    ReplReadline.prototype.removeCompletionListener = function (c) {
        var idx = this._completionListeners.indexOf(c);
        if (idx != -1)
            this._completionListeners.splice(idx, 1);
    };
    Object.defineProperty(ReplReadline.prototype, "selectionStart", {
        /** Returns the offset of the start of the selection. */
        get: function () {
            return this._selectionStart;
        },
        /** Sets the start of the selection. */
        set: function (val) {
            this._selectionStart = Math.min(this.model.maxOffset, Math.max(val, 0));
        },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(ReplReadline.prototype, "selectionEnd", {
        /** Returns the offset of the end of the selection. */
        get: function () {
            return this._selectionEnd;
        },
        /** Sets the end of the selection. */
        set: function (val) {
            this._selectionEnd = Math.min(this.model.maxOffset, Math.max(val, 0));
        },
        enumerable: true,
        configurable: true
    });
    ;
    /**
     * Returns a TokenCursor into the document.
     *
     * @param row the line to position the cursor at.
     * @param col the column to position the cursor at.
     * @param previous if true, position the cursor at the previous token.
     */
    ReplReadline.prototype.getTokenCursor = function (offset, previous) {
        if (offset === void 0) { offset = this.selectionEnd; }
        if (previous === void 0) { previous = false; }
        var _a = __read(this.model.getRowCol(offset), 2), row = _a[0], col = _a[1];
        var line = this.model.lines[row];
        var lastIndex = 0;
        if (line) {
            for (var i = 0; i < line.tokens.length; i++) {
                var tk = line.tokens[i];
                if (previous ? tk.offset > col : tk.offset > col)
                    return new token_cursor_1.LispTokenCursor(this.model, row, previous ? Math.max(0, lastIndex - 1) : lastIndex);
                lastIndex = i;
            }
            return new token_cursor_1.LispTokenCursor(this.model, row, line.tokens.length - 1);
        }
    };
    /**
     * Executes a block of code, during which any edits that are performed on the document will be created with Undo support.
     * This should happen almost all of the time- in fact the only time it shouldn't is when replaying undo/redo operations.
     *
     * FIXME: Perhaps this should be "withoutUndo"?
     *
     * @param body the code to execute.
     */
    ReplReadline.prototype.withUndo = function (body) {
        var oldUndo = this.model.recordingUndo;
        try {
            this.model.recordingUndo = true;
            this.model.undoManager.withUndo(body);
        }
        finally {
            this.model.recordingUndo = oldUndo;
        }
    };
    /**
     * Inserts a string at the current cursor location.
     *
     * FIXME: this should just be `changeRange`.
     * @param text the text to insert
     */
    ReplReadline.prototype.insertString = function (text) {
        var _this = this;
        this.withUndo(function () {
            if (_this.selectionStart != _this.selectionEnd) {
                _this.deleteSelection();
            }
            var _a = __read([_this.selectionStart, _this.selectionEnd], 2), cs = _a[0], ce = _a[1];
            _this.selectionEnd += _this.model.insertString(_this.selectionEnd, text, [cs, ce], [cs + text.length, cs + text.length]);
            _this.selectionStart = _this.selectionEnd;
            _this.repaint();
            _this.caretX = _this.model.getRowCol(_this.selectionEnd)[1];
        });
    };
    ReplReadline.prototype.clearCompletion = function () {
        var evt = { type: "clear" };
        this._completionListeners.forEach(function (x) { return x(evt); });
    };
    ReplReadline.prototype.maybeShowCompletion = function () {
        if (this.getTokenCursor().offsetStart == this.selectionEnd && !this.getTokenCursor().previous().withinWhitespace()) {
            var evt_1 = { type: "show", position: this.selectionEnd, toplevel: this.model.getText(0, this.model.maxOffset) };
            this._completionListeners.forEach(function (x) { return x(evt_1); });
        }
        else
            this.clearCompletion();
    };
    /**
     * Moves the caret left one character, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    ReplReadline.prototype.caretLeft = function (clear) {
        if (clear === void 0) { clear = true; }
        this.clearCompletion();
        if (clear && this.selectionStart != this.selectionEnd) {
            if (this.selectionStart < this.selectionEnd)
                this.selectionEnd = this.selectionStart;
            else
                this.selectionStart = this.selectionEnd;
        }
        else {
            this.selectionEnd--;
            if (clear)
                this.selectionStart = this.selectionEnd;
        }
        this.repaint();
        this.caretX = this.model.getRowCol(this.selectionEnd)[1];
    };
    /**
     * Moves the caret right one character, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    ReplReadline.prototype.caretRight = function (clear) {
        if (clear === void 0) { clear = true; }
        this.clearCompletion();
        if (clear && this.selectionStart != this.selectionEnd) {
            if (this.selectionStart > this.selectionEnd)
                this.selectionEnd = this.selectionStart;
            else
                this.selectionStart = this.selectionEnd;
        }
        else {
            this.selectionEnd++;
            if (clear)
                this.selectionStart = this.selectionEnd;
        }
        this.repaint();
        this.caretX = this.model.getRowCol(this.selectionEnd)[1];
    };
    /**
     * Moves the caret to the beginning of the document, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    ReplReadline.prototype.caretHomeAll = function (clear) {
        if (clear === void 0) { clear = true; }
        this.clearCompletion();
        this.selectionEnd = 0;
        if (clear)
            this.selectionStart = this.selectionEnd;
        this.repaint();
        this.caretX = this.model.getRowCol(this.selectionEnd)[1];
    };
    /**
     * Moves the caret to the end of the document, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    ReplReadline.prototype.caretEndAll = function (clear) {
        if (clear === void 0) { clear = true; }
        this.clearCompletion();
        this.selectionEnd = this.model.maxOffset;
        if (clear)
            this.selectionStart = this.selectionEnd;
        this.repaint();
        this.caretX = this.model.getRowCol(this.selectionEnd)[1];
    };
    /**
     * Moves the caret to the beginning of the line, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    ReplReadline.prototype.caretHome = function (clear) {
        if (clear === void 0) { clear = true; }
        this.clearCompletion();
        var _a = __read(this.model.getRowCol(this.selectionEnd), 2), row = _a[0], col = _a[1];
        this.selectionEnd = this.selectionEnd - col;
        if (clear)
            this.selectionStart = this.selectionEnd;
        this.repaint();
        this.caretX = this.model.getRowCol(this.selectionEnd)[1];
    };
    /**
     * Moves the caret to the end of the line, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    ReplReadline.prototype.caretEnd = function (clear) {
        if (clear === void 0) { clear = true; }
        this.clearCompletion();
        var _a = __read(this.model.getRowCol(this.selectionEnd), 2), row = _a[0], col = _a[1];
        this.selectionEnd = this.selectionEnd - col + this.model.lines[row].text.length;
        if (clear)
            this.selectionStart = this.selectionEnd;
        this.repaint();
        this.caretX = this.model.getRowCol(this.selectionEnd)[1];
    };
    /**
     * Moves the caret to the previous line, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    ReplReadline.prototype.caretUp = function (clear) {
        if (clear === void 0) { clear = true; }
        this.clearCompletion();
        var _a = __read(this.model.getRowCol(this.selectionEnd), 2), row = _a[0], col = _a[1];
        if (row > 0) {
            var len = this.model.lines[row - 1].text.length;
            this.selectionEnd = this.model.getOffsetForLine(row - 1) + Math.min(this.caretX, len);
        }
        else {
            this.selectionEnd = 0;
        }
        if (clear)
            this.selectionStart = this.selectionEnd;
        this.repaint();
    };
    /**
     * Moves the caret to the next line, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    ReplReadline.prototype.caretDown = function (clear) {
        if (clear === void 0) { clear = true; }
        this.clearCompletion();
        var _a = __read(this.model.getRowCol(this.selectionEnd), 2), row = _a[0], col = _a[1];
        if (row < this.model.lines.length - 1) {
            var len = this.model.lines[row + 1].text.length;
            this.selectionEnd = this.model.getOffsetForLine(row + 1) + Math.min(this.caretX, len);
        }
        else {
            this.selectionEnd = this.model.maxOffset;
        }
        if (clear)
            this.selectionStart = this.selectionEnd;
        this.repaint();
    };
    /**
     * Deletes the current selection.
     *
     * FIXME: this should just be `changeRange`
     */
    ReplReadline.prototype.deleteSelection = function () {
        var _this = this;
        this.withUndo(function () {
            if (_this.selectionStart != _this.selectionEnd) {
                _this.model.deleteRange(Math.min(_this.selectionStart, _this.selectionEnd), Math.max(_this.selectionStart, _this.selectionEnd) - Math.min(_this.selectionStart, _this.selectionEnd));
                _this.selectionStart = _this.selectionEnd = Math.min(_this.selectionStart, _this.selectionEnd);
            }
        });
    };
    /**
     * If there is no selection- deletes the character to the left of the cursor and moves it back one character.
     *
     * If there is a selection, deletes the selection.
     */
    ReplReadline.prototype.backspace = function () {
        var _this = this;
        this.withUndo(function () {
            if (_this.selectionStart != _this.selectionEnd) {
                _this.deleteSelection();
            }
            else {
                if (_this.selectionEnd > 0) {
                    _this.model.deleteRange(_this.selectionEnd - 1, 1, [_this.selectionStart, _this.selectionEnd], [_this.selectionEnd - 1, _this.selectionEnd - 1]);
                    _this.selectionEnd--;
                }
                _this.selectionStart = _this.selectionEnd;
            }
            _this.repaint();
            _this.caretX = _this.model.getRowCol(_this.selectionEnd)[1];
        });
    };
    /**
     * If there is no selection- deletes the character to the right of the cursor.
     *
     * If there is a selection, deletes the selection.
     */
    ReplReadline.prototype.delete = function () {
        var _this = this;
        this.withUndo(function () {
            if (_this.selectionStart != _this.selectionEnd) {
                _this.deleteSelection();
            }
            else {
                _this.model.deleteRange(_this.selectionEnd, 1);
                _this.selectionStart = _this.selectionEnd;
            }
            _this.caretX = _this.model.getRowCol(_this.selectionEnd)[1];
            _this.repaint();
        });
    };
    /**
     * Construct a selection marker div.
     * @param start the left hand side start position in pixels.
     * @param width the width of the marker, in pixels.
     */
    ReplReadline.prototype.makeSelection = function (start, width) {
        var div = document.createElement("div");
        div.className = "sel-marker";
        var left = start;
        div.style.left = left + "px";
        div.style.width = width + "px";
        return div;
    };
    /**
     * Clears the rendering for matching parenthesis.
     */
    ReplReadline.prototype.clearParenMatches = function () {
        var cp = this.getElementForToken(this.closeParen);
        if (cp) {
            cp.classList.remove("match");
            cp.classList.remove("match-fail");
        }
        var op = this.getElementForToken(this.openParen);
        if (op) {
            op.classList.remove("match");
            op.classList.remove("match-fail");
        }
        this.closeParen = null;
        this.openParen = null;
    };
    /**
     * Sets the rendering for matching parenthesis.
     */
    ReplReadline.prototype.updateParenMatches = function () {
        var cursor = this.getTokenCursor();
        if (cursor.getToken().type == "close") {
            this.closeParen = cursor.clone();
            while (cursor.backwardSexp())
                ;
            if (cursor.getPrevToken().type == "open") {
                this.openParen = cursor.previous();
            }
            if (this.closeParen && this.openParen)
                this.matchingParen = clojure_lexer_1.validPair(this.openParen.getToken().raw, this.closeParen.getToken().raw);
            else
                this.matchingParen = false;
        }
        else if (cursor.getToken().type == "open") {
            this.openParen = cursor.clone();
            cursor.next();
            while (cursor.forwardSexp())
                ;
            if (cursor.getToken().type == "close") {
                this.closeParen = cursor;
            }
            if (this.closeParen && this.openParen)
                this.matchingParen = clojure_lexer_1.validPair(this.openParen.getToken().raw, this.closeParen.getToken().raw);
            else
                this.matchingParen = false;
        }
        var cp = this.getElementForToken(this.closeParen);
        if (cp) {
            if (this.matchingParen)
                cp.classList.add("match");
            else
                cp.classList.add("fail-match");
        }
        var op = this.getElementForToken(this.openParen);
        if (op) {
            if (this.matchingParen)
                op.classList.add("match");
            else
                op.classList.add("fail-match");
        }
    };
    /**
     * Given a TokenCursor, returns the HTMLElement that is rendered for this token.
     * @param cursor
     */
    ReplReadline.prototype.getElementForToken = function (cursor) {
        if (cursor && this.inputLines[cursor.line])
            return this.inputLines[cursor.line].querySelector(".content").children.item(cursor.token);
    };
    ReplReadline.prototype.addOnRepaintListener = function (fn) {
        this._repaintListeners.push(fn);
    };
    /**
     * Update the DOM for the editor. After a change in the model or local editor information (e.g. cursor position), we apply the changes,
     * attempting to minimize the work.
     */
    ReplReadline.prototype.repaint = function () {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
        this.clearParenMatches();
        this.model.flushChanges();
        try {
            // remove any deleted lines
            for (var _e = __values(this.model.deletedLines), _f = _e.next(); !_f.done; _f = _e.next()) {
                var _g = __read(_f.value, 2), start = _g[0], count = _g[1];
                for (var j = 0; j < count; j++)
                    this.mainElem.removeChild(this.inputLines[start + j]);
                this.inputLines.splice(start, count);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.model.deletedLines.clear();
        try {
            // insert any new lines
            for (var _h = __values(this.model.insertedLines), _j = _h.next(); !_j.done; _j = _h.next()) {
                var _k = __read(_j.value, 2), start = _k[0], count = _k[1];
                for (var j = 0; j < count; j++) {
                    var line = this.makeLine();
                    if (!this.inputLines[start + j])
                        this.mainElem.append(line);
                    else
                        this.mainElem.insertBefore(line, this.inputLines[start + j]);
                    this.inputLines.splice(start + j, 0, line);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_j && !_j.done && (_b = _h.return)) _b.call(_h);
            }
            finally { if (e_2) throw e_2.error; }
        }
        this.model.insertedLines.clear();
        try {
            // update changed lines
            for (var _l = __values(this.model.changedLines), _m = _l.next(); !_m.done; _m = _l.next()) {
                var line = _m.value;
                var ln = this.inputLines[line].querySelector(".content");
                while (ln.firstChild)
                    ln.removeChild(ln.firstChild);
                try {
                    for (var _o = __values(this.model.lines[line].tokens), _p = _o.next(); !_p.done; _p = _o.next()) {
                        var tk = _p.value;
                        if (!tk)
                            break;
                        ln.appendChild(makeToken(tk));
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_p && !_p.done && (_d = _o.return)) _d.call(_o);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                if (!ln.firstChild)
                    ln.appendChild(document.createTextNode(" ")); // otherwise the line will collapse to height=0 due to html fun.
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_m && !_m.done && (_c = _l.return)) _c.call(_l);
            }
            finally { if (e_3) throw e_3.error; }
        }
        this.model.changedLines.clear();
        // reposition the caret
        var _q = __read(this.model.getRowCol(this.selectionEnd), 2), row = _q[0], col = _q[1];
        this.inputLines[row].appendChild(this.caret);
        var style = getComputedStyle(this.inputLines[row]);
        ctx.font = style.fontStyle + " " + style.fontSize + " " + style.fontFamily;
        this.caret.style.left = measureText(this.model.lines[row].text.substr(0, col)) + "px";
        var startLine = this.model.getRowCol(Math.min(this.lastSelectionStart, this.lastSelectionEnd, this.selectionStart, this.selectionEnd));
        var endLine = this.model.getRowCol(Math.max(this.lastSelectionStart, this.lastSelectionEnd, this.selectionStart, this.selectionEnd));
        var cs = this.model.getRowCol(Math.min(this.selectionStart, this.selectionEnd));
        var ce = this.model.getRowCol(Math.max(this.selectionStart, this.selectionEnd));
        var lcs = this.model.getRowCol(Math.min(this.lastSelectionStart, this.lastSelectionEnd));
        var lce = this.model.getRowCol(Math.max(this.lastSelectionStart, this.lastSelectionEnd));
        // update the selection
        for (var line = startLine[0]; line <= endLine[0]; line++) {
            var ln = this.inputLines[line].querySelector(".selection");
            if (line < cs[0] || line > ce[0]) {
                // definitely outside the selection, nuke all the selectiond divs.
                while (ln.firstChild)
                    ln.removeChild(ln.firstChild);
            }
            else if (line == cs[0] && line == ce[0]) {
                // this selection is exactly 1 line, and we're at it.
                while (ln.firstChild)
                    ln.removeChild(ln.firstChild);
                var left = measureText("M") * cs[1];
                ln.appendChild(this.makeSelection(left, measureText("M") * ce[1] - left));
            }
            else if (line == cs[0]) {
                // this is the first line of the selection
                while (ln.firstChild)
                    ln.removeChild(ln.firstChild);
                var left = measureText("M") * cs[1];
                ln.appendChild(this.makeSelection(left, measureText("M") * this.model.lines[line].text.length - left));
            }
            else if (line == ce[0]) {
                // this is the last line of the selection
                while (ln.firstChild)
                    ln.removeChild(ln.firstChild);
                ln.appendChild(this.makeSelection(0, measureText("M") * ce[1]));
            }
            else if (line > cs[0] && line < ce[0]) {
                // this line is within the selection, but is not the first or last.
                if (line > lcs[0] && line < lce[0]) {
                    // this line was within the selection previously, it is already highlighted,
                    // nothing to do.
                }
                else if (line >= cs[0] && line <= ce[0]) {
                    // this line is newly within the selection
                    while (ln.firstChild)
                        ln.removeChild(ln.firstChild);
                    ln.appendChild(this.makeSelection(0, Math.max(measureText("M"), measureText("M") * this.model.lines[line].text.length)));
                }
                else {
                    // this line is no longer within the selection
                    while (ln.firstChild)
                        ln.removeChild(ln.firstChild);
                }
            }
        }
        this.lastSelectionStart = this.selectionStart;
        this.lastSelectionEnd = this.selectionEnd;
        this.updateParenMatches();
        this._repaintListeners.forEach(function (x) { return x(); });
    };
    ReplReadline.prototype.getCaretOnScreen = function () {
        var rect = this.caret.getBoundingClientRect();
        return { x: rect.left, y: rect.top + window.scrollY, width: rect.width, height: rect.height };
    };
    /** Given a (pageX, pageY) pixel coordinate, returns the character offset into this document. */
    ReplReadline.prototype.pageToOffset = function (pageX, pageY) {
        var rect = this.mainElem.getBoundingClientRect();
        var y = pageY - (rect.top + window.scrollY);
        var i;
        // NOTE: assuming every line is a fixed size, this could be O(1).
        // on the other hand, this seems quite fast for now.
        for (i = 0; i < this.mainElem.children.length; i++) {
            var child = this.mainElem.children.item(i);
            if (y < child.offsetTop)
                break;
        }
        i--;
        if (i < 0)
            return 0;
        var offset = this.model.getOffsetForLine(i);
        offset += Math.min(Math.floor((pageX - rect.left) / measureText("M")), this.model.lines[i].text.length);
        return offset;
    };
    ReplReadline.prototype.makeLine = function () {
        var line = document.createElement("div");
        line.className = "line";
        var content = document.createElement("div");
        content.className = "content";
        line.append(content);
        var selection = document.createElement("div");
        selection.className = "selection";
        line.append(selection);
        return line;
    };
    ReplReadline.prototype.canReturn = function () {
        return this.selectionEnd == this.selectionStart && this.selectionEnd == this.model.maxOffset;
    };
    ReplReadline.prototype.freeze = function () {
        this.mainElem.removeEventListener("mousedown", this.mouseDown);
        window.removeEventListener("mouseup", this.mouseUp);
        window.removeEventListener("mousemove", this.mouseDrag);
        this.wrap.removeEventListener("mousedown", this.focus);
        this.wrap.removeEventListener("touchstart", this.focus);
        this.input.disabled = true;
        this.selectionStart = this.selectionEnd = this.model.maxOffset;
        this.repaint();
        this.caret.parentElement.removeChild(this.caret);
    };
    ReplReadline.prototype.doReturn = function () {
        this.freeze();
    };
    return ReplReadline;
}());
exports.ReplReadline = ReplReadline;
/**
 * A set of tokens which should be highlighted as macros.
 * this is, of course, a really stupid way of doing it.
 */
var macros = new Set(["if", "let", "do", "while", "cond", "case"]);
/**
 * Constructs an HTMLElement to represent a token with the correct syntax highlighting.
 * @param tk the token to construct.
 */
function makeToken(tk) {
    var span = document.createElement("span");
    var className = tk.type;
    if (tk.type == "id") {
        if (tk.raw.startsWith("def"))
            className = "decl";
        else if (macros.has(tk.raw))
            className = "macro";
    }
    span.textContent = tk.raw;
    span.className = className;
    return span;
}
