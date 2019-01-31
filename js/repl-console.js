import { ReplReadline } from "./readline";
import * as paredit from "./paredit";
import { getIndent } from "./indent";
import { HotKeyTable } from "./hotkeys";
const defaultHotkeys = new HotKeyTable({
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
export class ReplConsole {
    constructor(elem, onReadLine = () => { }) {
        this.elem = elem;
        this.onReadLine = onReadLine;
        this.historyIndex = -1;
        this.history = [];
        /** Event listeners for history */
        this._historyListeners = [];
        /** Event listeners for completion */
        this._completionListeners = [];
        this.onRepaint = () => { };
        this.commands = {
            "raise-sexp": () => {
                this.readline.withUndo(() => {
                    paredit.raiseSexp(this.readline);
                    this.readline.repaint();
                });
            },
            "convolute-sexp": () => {
                this.readline.withUndo(() => {
                    paredit.convolute(this.readline);
                    this.readline.repaint();
                });
            },
            "force-backspace": () => {
                this.readline.withUndo(() => {
                    this.readline.backspace();
                    this.readline.repaint();
                });
            },
            "force-delete": () => {
                this.readline.withUndo(() => {
                    this.readline.delete();
                    this.readline.repaint();
                });
            },
            "grow-selection": () => {
                this.readline.withUndo(() => {
                    paredit.growSelection(this.readline);
                    this.readline.repaint();
                });
            },
            "shrink-selection": () => {
                this.readline.withUndo(() => {
                    paredit.shrinkSelection(this.readline);
                    this.readline.repaint();
                });
            },
            "backward-sexp": () => {
                let cursor = this.readline.getTokenCursor();
                cursor.backwardSexp(true);
                this.readline.selectionStart = this.readline.selectionEnd = cursor.offsetStart;
                this.readline.repaint();
            },
            "forward-sexp": () => {
                let cursor = this.readline.getTokenCursor();
                cursor.forwardSexp(true);
                this.readline.selectionStart = this.readline.selectionEnd = cursor.offsetStart;
                this.readline.repaint();
            },
            "down-list": () => {
                let cursor = this.readline.getTokenCursor();
                do {
                    cursor.forwardWhitespace();
                } while (cursor.getToken().type != "open" && cursor.forwardSexp());
                { }
                cursor.downList();
                this.readline.selectionStart = this.readline.selectionEnd = cursor.offsetStart;
                this.readline.repaint();
            },
            "up-list": () => {
                let cursor = this.readline.getTokenCursor();
                cursor.forwardList();
                cursor.upList();
                this.readline.selectionStart = this.readline.selectionEnd = cursor.offsetStart;
                this.readline.repaint();
            },
            "backward-up-list": () => {
                let cursor = this.readline.getTokenCursor();
                cursor.backwardList();
                cursor.backwardUpList();
                this.readline.selectionStart = this.readline.selectionEnd = cursor.offsetStart;
                this.readline.repaint();
            },
            "select-all": () => {
                this.readline.selectionStart = 0;
                this.readline.selectionEnd = this.readline.model.maxOffset;
                this.readline.repaint();
            },
            "undo": () => {
                this.readline.model.undoManager.undo(this.readline);
                this.readline.repaint();
            },
            "redo": () => {
                this.readline.model.undoManager.redo(this.readline);
                this.readline.repaint();
            },
            "join-sexp": () => {
                this.readline.withUndo(() => {
                    paredit.joinSexp(this.readline);
                    this.readline.repaint();
                });
            },
            "backward-slurp-sexp": () => {
                this.readline.withUndo(() => {
                    paredit.backwardSlurpSexp(this.readline);
                    this.readline.repaint();
                });
            },
            "forward-barf-sexp": () => {
                this.readline.withUndo(() => {
                    paredit.forwardBarfSexp(this.readline);
                    this.readline.repaint();
                });
            },
            "cursor-left": () => {
                this.readline.caretLeft(true);
                this.readline.repaint();
            },
            "cursor-select-left": () => {
                this.readline.caretLeft(false);
                this.readline.repaint();
            },
            "forward-slurp-sexp": () => {
                this.readline.withUndo(() => {
                    paredit.forwardSlurpSexp(this.readline);
                    this.readline.repaint();
                });
            },
            "backward-barf-sexp": () => {
                this.readline.withUndo(() => {
                    paredit.backwardBarfSexp(this.readline);
                    this.readline.repaint();
                });
            },
            "cursor-right": () => {
                this.readline.caretRight(true);
                this.readline.repaint();
            },
            "cursor-select-right": () => {
                this.readline.caretRight(false);
                this.readline.repaint();
            },
            "splice-sexp-killing-backwards": () => {
                this.readline.withUndo(() => {
                    paredit.spliceSexpKillingBackward(this.readline);
                    this.readline.repaint();
                });
            },
            "cursor-up": () => {
                this.readline.caretUp(true);
                this.readline.repaint();
            },
            "cursor-select-up": () => {
                this.readline.caretUp(false);
                this.readline.repaint();
            },
            "splice-sexp-killing-forwards": () => {
                this.readline.withUndo(() => {
                    paredit.spliceSexpKillingForward(this.readline);
                    this.readline.repaint();
                });
            },
            "cursor-down": () => {
                this.readline.caretDown(true);
                this.readline.repaint();
            },
            "cursor-select-down": () => {
                this.readline.caretDown(false);
                this.readline.repaint();
            },
            "backspace": () => {
                this.readline.withUndo(() => {
                    paredit.backspace(this.readline);
                    this.readline.repaint();
                });
            },
            "cursor-home": () => {
                this.readline.caretHome(true);
                this.readline.repaint();
            },
            "cursor-select-home": () => {
                this.readline.caretHome(false);
                this.readline.repaint();
            },
            "cursor-home-all": () => {
                this.readline.caretHomeAll(true);
                this.readline.repaint();
            },
            "cursor-select-home-all": () => {
                this.readline.caretHomeAll(false);
                this.readline.repaint();
            },
            "cursor-end": () => {
                this.readline.caretEnd(true);
                this.readline.repaint();
            },
            "cursor-select-end": () => {
                this.readline.caretEnd(false);
                this.readline.repaint();
            },
            "cursor-end-all": () => {
                this.readline.caretEndAll(true);
                this.readline.repaint();
            },
            "cursor-select-end-all": () => {
                this.readline.caretEndAll(false);
                this.readline.repaint();
            },
            "delete": () => {
                this.readline.withUndo(() => {
                    paredit.deleteForward(this.readline);
                    this.readline.repaint();
                });
            },
            "wrap-round": () => {
                this.readline.withUndo(() => {
                    paredit.wrapSexpr(this.readline, "(", ")");
                    this.readline.repaint();
                });
            },
            "wrap-square": () => {
                this.readline.withUndo(() => {
                    paredit.wrapSexpr(this.readline, "[", "]");
                    this.readline.repaint();
                });
            },
            "wrap-curly": () => {
                this.readline.withUndo(() => {
                    paredit.wrapSexpr(this.readline, "{", "}");
                    this.readline.repaint();
                });
            },
            "split-sexp": () => {
                this.readline.withUndo(() => {
                    paredit.splitSexp(this.readline);
                    this.readline.repaint();
                });
            },
            "splice-sexp": () => {
                this.readline.withUndo(() => {
                    paredit.spliceSexp(this.readline);
                    this.readline.repaint();
                });
            },
            "history-up": () => {
                if (this.historyIndex == 0)
                    return;
                if (this.historyIndex == -1)
                    this.historyIndex = this.history.length;
                this.historyIndex--;
                let line = this.history[this.historyIndex] || "";
                this.readline.withUndo(() => {
                    this.readline.model.changeRange(0, this.readline.model.maxOffset, line);
                    this.readline.selectionStart = this.readline.selectionEnd = line.length;
                });
                this.readline.repaint();
            },
            "history-down": () => {
                if (this.historyIndex == this.history.length || this.historyIndex == -1)
                    return;
                this.historyIndex++;
                let line = this.history[this.historyIndex] || "";
                this.readline.withUndo(() => {
                    this.readline.model.changeRange(0, this.readline.model.maxOffset, line);
                    this.readline.selectionStart = this.readline.selectionEnd = line.length;
                });
                this.readline.repaint();
            }
        };
        this.hotkeys = defaultHotkeys;
        this.input = document.createElement("input");
        this.input.style.width = "0px";
        this.input.style.height = "0px";
        this.input.style.position = "fixed";
        this.input.style.opacity = "0";
        this.input.addEventListener("focus", () => {
            this.readline.mainElem.classList.add("is-focused");
        });
        this.input.addEventListener("blur", () => {
            this.readline.clearCompletion();
            this.readline.mainElem.classList.remove("is-focused");
        });
        document.addEventListener("cut", e => {
            if (document.activeElement == this.input) {
                e.clipboardData.setData("text/plain", this.readline.model.getText(this.readline.selectionStart, this.readline.selectionEnd));
                this.readline.delete();
                e.preventDefault();
            }
        });
        document.addEventListener("copy", e => {
            if (document.activeElement == this.input) {
                e.clipboardData.setData("text/plain", this.readline.model.getText(this.readline.selectionStart, this.readline.selectionEnd));
                e.preventDefault();
            }
        });
        document.addEventListener("paste", e => {
            if (document.activeElement == this.input) {
                this.readline.clearCompletion();
                this.readline.model.undoManager.insertUndoStop();
                this.readline.insertString(e.clipboardData.getData("text/plain"));
                e.preventDefault();
            }
        });
        this.input.addEventListener("keydown", e => {
            if (this.hotkeys.execute(this, e)) {
                e.preventDefault();
                this.readline.mainElem.scrollIntoView({ block: "end" });
                return;
            }
            if (e.key.length == 1 && !e.metaKey && !e.ctrlKey) {
                if (e.key == " ")
                    this.readline.model.undoManager.insertUndoStop();
            }
            else {
                switch (e.keyCode) {
                    case 9: // Tab
                        e.preventDefault();
                        break;
                    case 13:
                        if (this.readline.canReturn()) {
                            this.submitLine();
                            this.readline.clearCompletion();
                        }
                        else {
                            this.readline.model.undoManager.insertUndoStop();
                            let indent = getIndent(this.readline, this.readline.selectionEnd);
                            let istr = "";
                            for (let i = 0; i < indent; i++)
                                istr += " ";
                            this.readline.insertString("\n" + istr);
                        }
                        break;
                }
            }
            this.readline.mainElem.scrollIntoView({ block: "end" });
        }, { capture: true });
        this.input.addEventListener("input", e => {
            this.readline.mainElem.scrollIntoView({ block: "end" });
            if (this.input.value == '"') {
                this.readline.withUndo(() => {
                    paredit.stringQuote(this.readline);
                    this.readline.repaint();
                });
                this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (this.input.value == "(") {
                this.readline.withUndo(() => {
                    paredit.open(this.readline, "()");
                    this.readline.repaint();
                });
                this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (this.input.value == "[") {
                this.readline.withUndo(() => {
                    paredit.open(this.readline, "[]");
                    this.readline.repaint();
                });
                this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (this.input.value == "{") {
                this.readline.withUndo(() => {
                    paredit.open(this.readline, "{}");
                    this.readline.repaint();
                });
                this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (this.input.value == "{") {
                this.readline.withUndo(() => {
                    paredit.open(this.readline, "{}");
                    this.readline.repaint();
                });
                this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (this.input.value == ")") {
                this.readline.withUndo(() => {
                    paredit.close(this.readline, ")");
                    this.readline.repaint();
                });
                this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (this.input.value == "]") {
                this.readline.withUndo(() => {
                    paredit.close(this.readline, "]");
                    this.readline.repaint();
                });
                this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (this.input.value == "}") {
                this.readline.withUndo(() => {
                    paredit.close(this.readline, "}");
                    this.readline.repaint();
                });
                this.readline.clearCompletion();
                e.preventDefault();
            }
            else if (this.input.value == "\n") {
                if (this.readline.canReturn()) {
                    this.submitLine();
                }
                else {
                    this.readline.model.undoManager.insertUndoStop();
                    let indent = getIndent(this.readline, this.readline.selectionEnd);
                    let istr = "";
                    for (let i = 0; i < indent; i++)
                        istr += " ";
                    this.readline.insertString("\n" + istr);
                    this.readline.clearCompletion();
                }
            }
            else {
                this.readline.insertString(this.input.value);
                this.readline.maybeShowCompletion();
            }
            this.input.value = "";
            e.preventDefault();
            this.readline.mainElem.scrollIntoView({ block: "end" });
        });
    }
    addHistoryListener(c) {
        if (this._historyListeners.indexOf(c) == -1)
            this._historyListeners.push(c);
    }
    removeHistoryListener(c) {
        let idx = this._historyListeners.indexOf(c);
        if (idx != -1)
            this._historyListeners.splice(idx, 1);
    }
    addCompletionListener(c) {
        if (this._completionListeners.indexOf(c) == -1)
            this._completionListeners.push(c);
    }
    removeCompletionListener(c) {
        let idx = this._completionListeners.indexOf(c);
        if (idx != -1)
            this._completionListeners.splice(idx, 1);
    }
    printElement(element) {
        if (!this.readline || this.input.disabled) {
            this.elem.appendChild(element);
        }
        else {
            this.elem.insertBefore(element, this.readline.elem);
        }
        this.elem.lastElementChild.scrollIntoView({ block: "end" });
    }
    print(text) {
        let el = document.createElement("div");
        el.textContent = text;
        el.className = "output";
        this.printElement(el);
    }
    setText(text) {
        this.readline.model.changeRange(0, this.readline.model.maxOffset, text);
        this.readline.repaint();
    }
    setHistory(history) {
        this.history = history;
        this.historyIndex = -1;
    }
    submitLine(trigger = true) {
        let line = this.readline.model.getText(0, this.readline.model.maxOffset);
        if (line.trim() == "")
            return;
        this.history.push(line);
        this._historyListeners.forEach(x => x(line));
        this.historyIndex = -1;
        this.readline.freeze();
        if (trigger)
            this.onReadLine(line);
    }
    requestPrompt(prompt) {
        if (this.readline && !this.input.disabled)
            return;
        this.readline = new ReplReadline(this.elem, prompt, this.input);
        this.readline.addCompletionListener(e => this._completionListeners.forEach(listener => listener(e)));
        this.elem.appendChild(this.input);
        this.input.disabled = false;
        this.input.focus();
        this.readline.mainElem.scrollIntoView({ block: "end" });
    }
}
