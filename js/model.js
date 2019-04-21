"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var clojure_lexer_1 = require("./clojure-lexer");
var undo_1 = require("./undo");
var token_cursor_1 = require("./token-cursor");
var scanner = new clojure_lexer_1.Scanner();
/** A cheesy deep-equal function for matching scanner states. Good enough to compare plain old js objects. */
function equal(x, y) {
    if (x == y)
        return true;
    if (x instanceof Array && y instanceof Array) {
        if (x.length == y.length) {
            for (var i = 0; i < x.length; i++)
                if (!equal(x[i], y[i]))
                    return false;
            return true;
        }
        else
            return false;
    }
    else if (!(x instanceof Array) && !(y instanceof Array) && x instanceof Object && y instanceof Object) {
        for (var f in x)
            if (!equal(x[f], y[f]))
                return false;
        for (var f in y)
            if (!x.hasOwnProperty(f))
                return false;
        return true;
    }
    return false;
}
var TextLine = /** @class */ (function () {
    function TextLine(text, startState) {
        this.startState = startState;
        this.tokens = [];
        this.text = text;
        this.tokens = scanner.processLine(text);
        this.endState = __assign({}, scanner.state);
    }
    TextLine.prototype.processLine = function (oldState) {
        this.startState = __assign({}, oldState);
        this.tokens = scanner.processLine(this.text, oldState);
        this.endState = __assign({}, scanner.state);
    };
    return TextLine;
}());
exports.TextLine = TextLine;
/** The underlying model for the REPL readline. */
var LineInputModel = /** @class */ (function () {
    function LineInputModel() {
        /** The input lines. */
        this.lines = [new TextLine("", this.getStateForLine(0))];
        /** Lines whose text has changed. */
        this.changedLines = new Set();
        /** Lines which must be inserted. */
        this.insertedLines = new Set();
        /** Lines which must be deleted. */
        this.deletedLines = new Set();
        /** Handles undo/redo support */
        this.undoManager = new undo_1.UndoManager();
        /** When set, insertString and deleteRange will be added to the undo history. */
        this.recordingUndo = false;
        /** Lines which must be re-lexed. */
        this.dirtyLines = [];
    }
    LineInputModel.prototype.updateLines = function (start, deleted, inserted) {
        var delta = inserted - deleted;
        this.dirtyLines = this.dirtyLines.filter(function (x) { return x < start || x >= start + deleted; })
            .map(function (x) { return x >= start ? x + delta : x; });
        this.changedLines = new Set(Array.from(this.changedLines).map(function (x) {
            if (x > start && x < start + deleted)
                return null;
            if (x >= start)
                return x + delta;
            return x;
        }).filter(function (x) { return x !== null; }));
        this.insertedLines = new Set(Array.from(this.insertedLines).map(function (x) {
            var _a = __read(x, 2), a = _a[0], b = _a[1];
            if (a > start && a < start + deleted)
                return null;
            if (a >= start)
                return [a + delta, b];
            return [a, b];
        }).filter(function (x) { return x !== null; }));
        this.deletedLines = new Set(Array.from(this.deletedLines).map(function (x) {
            var _a = __read(x, 2), a = _a[0], b = _a[1];
            if (a > start && a < start + deleted)
                return null;
            if (a >= start)
                return [a + delta, b];
            return [a, b];
        }).filter(function (x) { return x !== null; }));
    };
    LineInputModel.prototype.deleteLines = function (start, count) {
        if (count == 0)
            return;
        this.updateLines(start, count, 0);
        this.deletedLines.add([start, count]);
    };
    LineInputModel.prototype.insertLines = function (start, count) {
        this.updateLines(start, 0, count);
        this.insertedLines.add([start, count]);
    };
    /**
     * Mark a line as needing to be re-lexed.
     *
     * @param idx the index of the line which needs re-lexing (0-based)
    */
    LineInputModel.prototype.markDirty = function (idx) {
        if (idx >= 0 && idx < this.lines.length && this.dirtyLines.indexOf(idx) == -1)
            this.dirtyLines.push(idx);
    };
    /**
     * Re-lexes all lines marked dirty, cascading onto the lines below if the end state for this line has
     * changed.
     */
    LineInputModel.prototype.flushChanges = function () {
        if (!this.dirtyLines.length)
            return;
        var seen = new Set();
        this.dirtyLines.sort();
        while (this.dirtyLines.length) {
            var nextIdx = this.dirtyLines.shift();
            if (seen.has(nextIdx))
                continue; // already processed.
            var prevState = this.getStateForLine(nextIdx);
            do {
                seen.add(nextIdx);
                this.changedLines.add(nextIdx);
                this.lines[nextIdx].processLine(prevState);
                prevState = this.lines[nextIdx].endState;
            } while (this.lines[++nextIdx] && !(equal(this.lines[nextIdx].startState, prevState)));
        }
    };
    /**
     * Returns the character offset in the model to the start of a given line.
     *
     * @param line the line who's offset will be returned.
     */
    LineInputModel.prototype.getOffsetForLine = function (line) {
        var max = 0;
        for (var i = 0; i < line; i++)
            max += this.lines[i].text.length + 1;
        return max;
    };
    /**
     * Returns the text between start and end as a string. These may be in any order.
     *
     * @param start the start offset in the text range
     * @param end the end offset in the text range
     * @param mustBeWithin if the start or end are outside the document, returns ""
     */
    LineInputModel.prototype.getText = function (start, end, mustBeWithin) {
        if (mustBeWithin === void 0) { mustBeWithin = false; }
        if (start == end)
            return "";
        if (mustBeWithin && (Math.min(start, end) < 0 || Math.max(start, end) > this.maxOffset))
            return "";
        var st = this.getRowCol(Math.min(start, end));
        var en = this.getRowCol(Math.max(start, end));
        var lines = [];
        if (st[0] == en[0])
            lines[0] = this.lines[st[0]].text.substring(st[1], en[1]);
        else
            lines[0] = this.lines[st[0]].text.substring(st[1]);
        for (var i = st[0] + 1; i < en[0]; i++)
            lines.push(this.lines[i].text);
        if (st[0] != en[0])
            lines.push(this.lines[en[0]].text.substring(0, en[1]));
        return lines.join('\n');
    };
    /**
     * Returns the row and column for a given text offset in this model.
     */
    LineInputModel.prototype.getRowCol = function (offset) {
        for (var i = 0; i < this.lines.length; i++) {
            if (offset > this.lines[i].text.length)
                offset -= this.lines[i].text.length + 1;
            else
                return [i, offset];
        }
        return [this.lines.length - 1, this.lines[this.lines.length - 1].text.length];
    };
    /**
     * Returns the initial lexer state for a given line.
     * Line 0 is always { inString: false }, all lines below are equivalent to their previous line's startState.
     *
     * @param line the line to retrieve the lexer state.
     */
    LineInputModel.prototype.getStateForLine = function (line) {
        return line == 0 ? { inString: false, } : __assign({}, this.lines[line - 1].endState);
    };
    /**
     * Changes the model. Deletes any text between `start` and `end`, and the inserts `text`.
     *
     * If provided, `oldSelection` and `newSelection` are used to manage the cursor positioning for undo support.
     *
     * @param start the start offset in the range to delete
     * @param end the end offset in the range to delete
     * @param text the new text to insert
     * @param oldSelection the old selection
     * @param newSelection the new selection
     */
    LineInputModel.prototype.changeRange = function (start, end, text, oldSelection, newSelection) {
        var _a;
        var deletedText = this.recordingUndo ? this.getText(start, end) : "";
        var _b = __read(this.getRowCol(start), 2), startLine = _b[0], startCol = _b[1];
        var _c = __read(this.getRowCol(end), 2), endLine = _c[0], endCol = _c[1];
        // extract the lines we will replace
        var replaceLines = text.split(/\r\n|\n/);
        // the left side of the line unaffected by the edit.
        var left = this.lines[startLine].text.substr(0, startCol);
        // the right side of the line unaffected by the edit.
        var right = this.lines[endLine].text.substr(endCol);
        var items = [];
        // initialize the lexer state - the first line is definitely not in a string, otherwise copy the
        // end state of the previous line before the edit
        var state = this.getStateForLine(startLine);
        if (startLine != endLine)
            this.deleteLines(startLine + 1, endLine - startLine - (replaceLines.length - 1));
        if (replaceLines.length == 1) {
            // trivial single line edit
            items.push(new TextLine(left + replaceLines[0] + right, state));
            this.changedLines.add(startLine);
        }
        else {
            // multi line edit.
            items.push(new TextLine(left + replaceLines[0], state));
            for (var i = 1; i < replaceLines.length - 1; i++)
                items.push(new TextLine(replaceLines[i], scanner.state));
            items.push(new TextLine(replaceLines[replaceLines.length - 1] + right, scanner.state));
            this.insertLines(startLine + 1, replaceLines.length - 1 - (endLine - startLine));
            for (var i = 1; i < items.length; i++)
                this.changedLines.add(startLine + i);
            this.markDirty(startLine + 1);
        }
        // now splice in our edited lines
        (_a = this.lines).splice.apply(_a, __spread([startLine, endLine - startLine + 1], items));
        this.markDirty(startLine);
        if (this.recordingUndo) {
            this.undoManager.addUndoStep(new EditorUndoStep("Edit", start, text, deletedText, oldSelection, newSelection));
        }
    };
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
    LineInputModel.prototype.insertString = function (offset, text, oldSelection, newSelection) {
        this.changeRange(offset, offset, text, oldSelection, newSelection);
        return text.length;
    };
    /**
     * Deletes count characters starting at offset from the document.
     * If recordingUndo is set, adds an undoStep, using oldCursor and newCursor.
     *
     * @param offset the offset to delete from
     * @param count the number of characters to delete
     * @param oldCursor the cursor at the start of the operation
     * @param newCursor the cursor at the end of the operation
     */
    LineInputModel.prototype.deleteRange = function (offset, count, oldSelection, newSelection) {
        this.changeRange(offset, offset + count, "", oldSelection, newSelection);
    };
    Object.defineProperty(LineInputModel.prototype, "maxOffset", {
        /** Return the offset of the last character in this model. */
        get: function () {
            var max = 0;
            for (var i = 0; i < this.lines.length; i++)
                max += this.lines[i].text.length + 1;
            return max - 1;
        },
        enumerable: true,
        configurable: true
    });
    LineInputModel.prototype.getTokenCursor = function (offset, previous) {
        if (previous === void 0) { previous = false; }
        var _a = __read(this.getRowCol(offset), 2), row = _a[0], col = _a[1];
        var line = this.lines[row];
        var lastIndex = 0;
        if (line) {
            for (var i = 0; i < line.tokens.length; i++) {
                var tk = line.tokens[i];
                if (previous ? tk.offset > col : tk.offset > col)
                    return new token_cursor_1.LispTokenCursor(this, row, previous ? Math.max(0, lastIndex - 1) : lastIndex);
                lastIndex = i;
            }
            return new token_cursor_1.LispTokenCursor(this, row, line.tokens.length - 1);
        }
    };
    return LineInputModel;
}());
exports.LineInputModel = LineInputModel;
/**
 * An Editor UndoStep.
 *
 * All Editor Undo steps contain the position of the cursor before and after the edit.
 */
var EditorUndoStep = /** @class */ (function (_super) {
    __extends(EditorUndoStep, _super);
    function EditorUndoStep(name, start, insertedText, deletedText, oldSelection, newSelection) {
        var _this = _super.call(this) || this;
        _this.name = name;
        _this.start = start;
        _this.insertedText = insertedText;
        _this.deletedText = deletedText;
        _this.oldSelection = oldSelection;
        _this.newSelection = newSelection;
        return _this;
    }
    EditorUndoStep.prototype.undo = function (c) {
        var _a;
        c.model.changeRange(this.start, this.start + this.insertedText.length, this.deletedText);
        if (this.oldSelection)
            _a = __read(this.oldSelection, 2), c.selectionStart = _a[0], c.selectionEnd = _a[1];
    };
    EditorUndoStep.prototype.redo = function (c) {
        var _a;
        c.model.changeRange(this.start, this.start + this.deletedText.length, this.insertedText);
        if (this.newSelection)
            _a = __read(this.newSelection, 2), c.selectionStart = _a[0], c.selectionEnd = _a[1];
    };
    EditorUndoStep.prototype.coalesce = function (step) {
        if (this.deletedText === "" && step.deletedText === "" && this.insertedText !== "" && step.insertedText !== "") {
            if (this.start + this.insertedText.length == step.start) {
                this.insertedText += step.insertedText;
                this.newSelection = step.newSelection;
                return true;
            }
        }
        else if (this.deletedText !== "" && step.deletedText !== "" && this.insertedText === "" && step.insertedText === "") {
            // repeated delete key
            if (this.start == step.start) {
                this.deletedText += step.deletedText;
                this.newSelection = step.newSelection;
                return true;
            }
            // repeated backspace key
            if (this.start - step.deletedText.length == step.start) {
                this.start = step.start;
                this.deletedText = step.deletedText + this.deletedText;
                this.newSelection = step.newSelection;
                return true;
            }
        }
        return false;
    };
    return EditorUndoStep;
}(undo_1.UndoStep));
