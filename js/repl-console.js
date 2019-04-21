"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var readline_1 = require("./readline");
var paredit = require("./paredit");
var indent_1 = require("./indent");
var hotkeys_1 = require("./hotkeys");
var defaultHotkeys = new hotkeys_1.HotKeyTable({
    "Alt+R": "raise-sexp",
    "Alt+Shift+/": "convolute-sexp",
    "Alt+Backspace": "force-backspace",
    "Ctrl+Shift+Space": "grow-selection",
    "Ctrl+Alt+Shift+Space": "shrink-selection",
    "Alt+Delete": "force-delete",
    "Ctrl+LeftArrow": "backward-sexp",
    "Ctrl+RightArrow": "forward-sexp",
    "Ctrl+DownArrow": "down-list",
    "Ctrl+Shift+UpArrow": "up-list",
    "Ctrl+UpArrow": "backward-up-list",
    "Cmd+A": "select-all",
    "Cmd+Z": "undo",
    "Cmd+Shift+Z": "redo",
    "Alt+Shift+J": "join-sexp",
    "Alt+Shift+Cmd+LeftArrow": "backward-slurp-sexp",
    "Alt+Cmd+LeftArrow": "forward-barf-sexp",
    "LeftArrow": "cursor-left",
    "Shift+LeftArrow": "cursor-select-left",
    "Alt+Shift+Cmd+RightArrow": "forward-slurp-sexp",
    "Alt+Cmd+RightArrow": "backward-barf-sexp",
    "RightArrow": "cursor-right",
    "Shift+RightArrow": "cursor-select-right",
    "Alt+LeftArrow": "splice-sexp-killing-backwards",
    "UpArrow": "cursor-up",
    "Shift+UpArrow": "cursor-select-up",
    "Alt+RightArrow": "splice-sexp-killing-forwards",
    "DownArrow": "cursor-down",
    "Shift+DownArrow": "cursor-select-down",
    "Backspace": "backspace",
    "Home": "cursor-home",
    "Shift+Home": "cursor-select-home",
    "Ctrl+Home": "cursor-home-all",
    "Shift+Ctrl+Home": "cursor-select-home-all",
    "End": "cursor-end",
    "Shift+End": "cursor-select-end",
    "Ctrl+End": "cursor-end-all",
    "Shift+Ctrl+End": "cursor-select-end-all",
    "Delete": "delete",
    "Alt+Shift+9": "wrap-round",
    "Alt+[": "wrap-square",
    "Alt+Shift+[": "wrap-curly",
    "Alt+Shift+S": "split-sexp",
    "Alt+S": "splice-sexp",
    "Alt+UpArrow": "history-up",
    "Alt+DownArrow": "history-down",
});
var ReplConsole = /** @class */ (function () {
    function ReplConsole(elem, onReadLine) {
        if (onReadLine === void 0) { onReadLine = function () { }; }
        var _this = this;
        this.elem = elem;
        this.onReadLine = onReadLine;
        this.historyIndex = -1;
        this.history = [];
        /** Event listeners for history */
        this._historyListeners = [];
        /** Event listeners for completion */
        this._completionListeners = [];
        this.onRepaint = function () { };
        this.commands = {
            "raise-sexp": function () {
                _this.readline.withUndo(function () {
                    paredit.raiseSexp(_this.readline);
                    _this.readline.repaint();
                });
            },
            "convolute-sexp": function () {
                _this.readline.withUndo(function () {
                    paredit.convolute(_this.readline);
                    _this.readline.repaint();
                });
            },
            "force-backspace": function () {
                _this.readline.withUndo(function () {
                    _this.readline.backspace();
                    _this.readline.repaint();
                });
            },
            "force-delete": function () {
                _this.readline.withUndo(function () {
                    _this.readline.delete();
                    _this.readline.repaint();
                });
            },
            "grow-selection": function () {
                _this.readline.withUndo(function () {
                    paredit.growSelection(_this.readline);
                    _this.readline.repaint();
                });
            },
            "shrink-selection": function () {
                _this.readline.withUndo(function () {
                    paredit.shrinkSelection(_this.readline);
                    _this.readline.repaint();
                });
            },
            "backward-sexp": function () {
                var cursor = _this.readline.getTokenCursor();
                cursor.backwardSexp(true);
                _this.readline.selectionStart = _this.readline.selectionEnd = cursor.offsetStart;
                _this.readline.repaint();
            },
            "forward-sexp": function () {
                var cursor = _this.readline.getTokenCursor();
                cursor.forwardSexp(true);
                _this.readline.selectionStart = _this.readline.selectionEnd = cursor.offsetStart;
                _this.readline.repaint();
            },
            "down-list": function () {
                var cursor = _this.readline.getTokenCursor();
                do {
                    cursor.forwardWhitespace();
                } while (cursor.getToken().type != "open" && cursor.forwardSexp());
                { }
                cursor.downList();
                _this.readline.selectionStart = _this.readline.selectionEnd = cursor.offsetStart;
                _this.readline.repaint();
            },
            "up-list": function () {
                var cursor = _this.readline.getTokenCursor();
                cursor.forwardList();
                cursor.upList();
                _this.readline.selectionStart = _this.readline.selectionEnd = cursor.offsetStart;
                _this.readline.repaint();
            },
            "backward-up-list": function () {
                var cursor = _this.readline.getTokenCursor();
                cursor.backwardList();
                cursor.backwardUpList();
                _this.readline.selectionStart = _this.readline.selectionEnd = cursor.offsetStart;
                _this.readline.repaint();
            },
            "select-all": function () {
                _this.readline.selectionStart = 0;
                _this.readline.selectionEnd = _this.readline.model.maxOffset;
                _this.readline.repaint();
            },
            "undo": function () {
                _this.readline.model.undoManager.undo(_this.readline);
                _this.readline.repaint();
            },
            "redo": function () {
                _this.readline.model.undoManager.redo(_this.readline);
                _this.readline.repaint();
            },
            "join-sexp": function () {
                _this.readline.withUndo(function () {
                    paredit.joinSexp(_this.readline);
                    _this.readline.repaint();
                });
            },
            "backward-slurp-sexp": function () {
                _this.readline.withUndo(function () {
                    paredit.backwardSlurpSexp(_this.readline);
                    _this.readline.repaint();
                });
            },
            "forward-barf-sexp": function () {
                _this.readline.withUndo(function () {
                    paredit.forwardBarfSexp(_this.readline);
                    _this.readline.repaint();
                });
            },
            "cursor-left": function () {
                _this.readline.caretLeft(true);
                _this.readline.repaint();
            },
            "cursor-select-left": function () {
                _this.readline.caretLeft(false);
                _this.readline.repaint();
            },
            "forward-slurp-sexp": function () {
                _this.readline.withUndo(function () {
                    paredit.forwardSlurpSexp(_this.readline);
                    _this.readline.repaint();
                });
            },
            "backward-barf-sexp": function () {
                _this.readline.withUndo(function () {
                    paredit.backwardBarfSexp(_this.readline);
                    _this.readline.repaint();
                });
            },
            "cursor-right": function () {
                _this.readline.caretRight(true);
                _this.readline.repaint();
            },
            "cursor-select-right": function () {
                _this.readline.caretRight(false);
                _this.readline.repaint();
            },
            "splice-sexp-killing-backwards": function () {
                _this.readline.withUndo(function () {
                    paredit.spliceSexpKillingBackward(_this.readline);
                    _this.readline.repaint();
                });
            },
            "cursor-up": function () {
                _this.readline.caretUp(true);
                _this.readline.repaint();
            },
            "cursor-select-up": function () {
                _this.readline.caretUp(false);
                _this.readline.repaint();
            },
            "splice-sexp-killing-forwards": function () {
                _this.readline.withUndo(function () {
                    paredit.spliceSexpKillingForward(_this.readline);
                    _this.readline.repaint();
                });
            },
            "cursor-down": function () {
                _this.readline.caretDown(true);
                _this.readline.repaint();
            },
            "cursor-select-down": function () {
                _this.readline.caretDown(false);
                _this.readline.repaint();
            },
            "backspace": function () {
                _this.readline.withUndo(function () {
                    paredit.backspace(_this.readline);
                    _this.readline.repaint();
                });
            },
            "cursor-home": function () {
                _this.readline.caretHome(true);
                _this.readline.repaint();
            },
            "cursor-select-home": function () {
                _this.readline.caretHome(false);
                _this.readline.repaint();
            },
            "cursor-home-all": function () {
                _this.readline.caretHomeAll(true);
                _this.readline.repaint();
            },
            "cursor-select-home-all": function () {
                _this.readline.caretHomeAll(false);
                _this.readline.repaint();
            },
            "cursor-end": function () {
                _this.readline.caretEnd(true);
                _this.readline.repaint();
            },
            "cursor-select-end": function () {
                _this.readline.caretEnd(false);
                _this.readline.repaint();
            },
            "cursor-end-all": function () {
                _this.readline.caretEndAll(true);
                _this.readline.repaint();
            },
            "cursor-select-end-all": function () {
                _this.readline.caretEndAll(false);
                _this.readline.repaint();
            },
            "delete": function () {
                _this.readline.withUndo(function () {
                    paredit.deleteForward(_this.readline);
                    _this.readline.repaint();
                });
            },
            "wrap-round": function () {
                _this.readline.withUndo(function () {
                    paredit.wrapSexpr(_this.readline, "(", ")");
                    _this.readline.repaint();
                });
            },
            "wrap-square": function () {
                _this.readline.withUndo(function () {
                    paredit.wrapSexpr(_this.readline, "[", "]");
                    _this.readline.repaint();
                });
            },
            "wrap-curly": function () {
                _this.readline.withUndo(function () {
                    paredit.wrapSexpr(_this.readline, "{", "}");
                    _this.readline.repaint();
                });
            },
            "split-sexp": function () {
                _this.readline.withUndo(function () {
                    paredit.splitSexp(_this.readline);
                    _this.readline.repaint();
                });
            },
            "splice-sexp": function () {
                _this.readline.withUndo(function () {
                    paredit.spliceSexp(_this.readline);
                    _this.readline.repaint();
                });
            },
            "history-up": function () {
                if (_this.historyIndex == 0)
                    return;
                if (_this.historyIndex == -1)
                    _this.historyIndex = _this.history.length;
                _this.historyIndex--;
                var line = _this.history[_this.historyIndex] || "";
                _this.readline.withUndo(function () {
                    _this.readline.model.changeRange(0, _this.readline.model.maxOffset, line);
                    _this.readline.selectionStart = _this.readline.selectionEnd = line.length;
                });
                _this.readline.repaint();
            },
            "history-down": function () {
                if (_this.historyIndex == _this.history.length || _this.historyIndex == -1)
                    return;
                _this.historyIndex++;
                var line = _this.history[_this.historyIndex] || "";
                _this.readline.withUndo(function () {
                    _this.readline.model.changeRange(0, _this.readline.model.maxOffset, line);
                    _this.readline.selectionStart = _this.readline.selectionEnd = line.length;
                });
                _this.readline.repaint();
            }
        };
        this.hotkeys = defaultHotkeys;
        this.input = document.createElement("input");
        this.input.style.width = "0px";
        this.input.style.height = "0px";
        this.input.style.position = "fixed";
        this.input.style.opacity = "0";
        this.input.addEventListener("focus", function () {
            _this.readline.mainElem.classList.add("is-focused");
        });
        this.input.addEventListener("blur", function () {
            _this.readline.clearCompletion();
            _this.readline.mainElem.classList.remove("is-focused");
        });
        document.addEventListener("cut", function (e) {
            if (document.activeElement == _this.input) {
                e.clipboardData.setData("text/plain", _this.readline.model.getText(_this.readline.selectionStart, _this.readline.selectionEnd));
                _this.readline.delete();
                e.preventDefault();
            }
        });
        document.addEventListener("copy", function (e) {
            if (document.activeElement == _this.input) {
                e.clipboardData.setData("text/plain", _this.readline.model.getText(_this.readline.selectionStart, _this.readline.selectionEnd));
                e.preventDefault();
            }
        });
        document.addEventListener("paste", function (e) {
            if (document.activeElement == _this.input) {
                _this.readline.clearCompletion();
                _this.readline.model.undoManager.insertUndoStop();
                _this.readline.insertString(e.clipboardData.getData("text/plain"));
                e.preventDefault();
            }
        });
        this.input.addEventListener("keydown", function (e) {
            if (_this.hotkeys.execute(_this, e)) {
                e.preventDefault();
                _this.readline.mainElem.scrollIntoView({ block: "end" });
                return;
            }
            if (e.key.length == 1 && !e.metaKey && !e.ctrlKey) {
                if (e.key == " ")
                    _this.readline.model.undoManager.insertUndoStop();
            }
            else {
                switch (e.keyCode) {
                    case 9: // Tab
                        e.preventDefault();
                        break;
                    case 13:
                        if (_this.readline.canReturn()) {
                            _this.submitLine();
                            _this.readline.clearCompletion();
                        }
                        else {
                            _this.readline.model.undoManager.insertUndoStop();
                            var indent = indent_1.getIndent(_this.readline.model, _this.readline.selectionEnd);
                            var istr = "";
                            for (var i = 0; i < indent; i++)
                                istr += " ";
                            _this.readline.insertString("\n" + istr);
                        }
                        break;
                }
            }
            _this.readline.mainElem.scrollIntoView({ block: "end" });
        }, { capture: true });
        this.input.addEventListener("input", function (e) {
            _this.readline.mainElem.scrollIntoView({ block: "end" });
            if (_this.input.value == '"') {
                _this.readline.withUndo(function () {
                    paredit.stringQuote(_this.readline);
                    _this.readline.repaint();
                });
                _this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (_this.input.value == "(") {
                _this.readline.withUndo(function () {
                    paredit.open(_this.readline, "()");
                    _this.readline.repaint();
                });
                _this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (_this.input.value == "[") {
                _this.readline.withUndo(function () {
                    paredit.open(_this.readline, "[]");
                    _this.readline.repaint();
                });
                _this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (_this.input.value == "{") {
                _this.readline.withUndo(function () {
                    paredit.open(_this.readline, "{}");
                    _this.readline.repaint();
                });
                _this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (_this.input.value == "{") {
                _this.readline.withUndo(function () {
                    paredit.open(_this.readline, "{}");
                    _this.readline.repaint();
                });
                _this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (_this.input.value == ")") {
                _this.readline.withUndo(function () {
                    paredit.close(_this.readline, ")");
                    _this.readline.repaint();
                });
                _this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (_this.input.value == "]") {
                _this.readline.withUndo(function () {
                    paredit.close(_this.readline, "]");
                    _this.readline.repaint();
                });
                _this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (_this.input.value == "}") {
                _this.readline.withUndo(function () {
                    paredit.close(_this.readline, "}");
                    _this.readline.repaint();
                });
                _this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (_this.input.value == "\n") {
                if (_this.readline.canReturn()) {
                    _this.submitLine();
                }
                else {
                    _this.readline.model.undoManager.insertUndoStop();
                    var indent = indent_1.getIndent(_this.readline.model, _this.readline.selectionEnd);
                    var istr = "";
                    for (var i = 0; i < indent; i++)
                        istr += " ";
                    _this.readline.insertString("\n" + istr);
                    _this.readline.clearCompletion();
                }
            }
            else {
                _this.readline.insertString(_this.input.value);
                _this.readline.maybeShowCompletion();
            }
            _this.input.value = "";
            e.preventDefault();
            _this.readline.mainElem.scrollIntoView({ block: "end" });
        });
    }
    ReplConsole.prototype.addHistoryListener = function (c) {
        if (this._historyListeners.indexOf(c) == -1)
            this._historyListeners.push(c);
    };
    ReplConsole.prototype.removeHistoryListener = function (c) {
        var idx = this._historyListeners.indexOf(c);
        if (idx != -1)
            this._historyListeners.splice(idx, 1);
    };
    ReplConsole.prototype.addCompletionListener = function (c) {
        if (this._completionListeners.indexOf(c) == -1)
            this._completionListeners.push(c);
    };
    ReplConsole.prototype.removeCompletionListener = function (c) {
        var idx = this._completionListeners.indexOf(c);
        if (idx != -1)
            this._completionListeners.splice(idx, 1);
    };
    ReplConsole.prototype.printElement = function (element) {
        if (!this.readline || this.input.disabled) {
            this.elem.appendChild(element);
        }
        else {
            this.elem.insertBefore(element, this.readline.elem);
        }
        this.elem.lastElementChild.scrollIntoView({ block: "end" });
    };
    ReplConsole.prototype.print = function (text) {
        var el = document.createElement("div");
        el.textContent = text;
        el.className = "output";
        this.printElement(el);
    };
    ReplConsole.prototype.setText = function (text) {
        this.readline.model.changeRange(0, this.readline.model.maxOffset, text);
        this.readline.repaint();
    };
    ReplConsole.prototype.setHistory = function (history) {
        this.history = history;
        this.historyIndex = -1;
    };
    ReplConsole.prototype.submitLine = function (trigger) {
        if (trigger === void 0) { trigger = true; }
        var line = this.readline.model.getText(0, this.readline.model.maxOffset);
        if (line.trim() == "") {
            this.readline.freeze();
            this.requestPrompt(this.readline.promptElem.textContent);
            return;
        }
        this.history.push(line);
        this._historyListeners.forEach(function (x) { return x(line); });
        this.historyIndex = -1;
        this.readline.freeze();
        if (trigger)
            this.onReadLine(line);
    };
    ReplConsole.prototype.requestPrompt = function (prompt) {
        var _this = this;
        if (this.readline && !this.input.disabled)
            return;
        this.readline = new readline_1.ReplReadline(this.elem, prompt, this.input);
        this.readline.addCompletionListener(function (e) { return _this._completionListeners.forEach(function (listener) { return listener(e); }); });
        this.elem.appendChild(this.input);
        this.input.disabled = false;
        this.input.focus();
        this.readline.mainElem.scrollIntoView({ block: "end" });
    };
    return ReplConsole;
}());
exports.ReplConsole = ReplConsole;
