import { ReplConsole } from "./console";
import { getIndent } from "./indent";
import * as paredit from "./paredit";

import {  HotKeyTable }  from "./hotkeys"

const isMac = navigator.platform.match(/Mac(Intel|PPC|68k)/i); // somewhat optimistic this would run on MacOS8 but hey ;)

let hotkeys = new HotKeyTable({
    "Alt+R": () => {
        replMain.withUndo(() => {
            paredit.raiseSexp(replMain);
            replMain.repaint();
        });
    },
    "Alt+Shift+/": () => {
        replMain.withUndo(() => {
            paredit.convolute(replMain);
            replMain.repaint();
        });
    },
    "Alt+Backspace": () => {
        replMain.withUndo(() => {
            replMain.backspace();
            replMain.repaint();
        });
    },
    "Ctrl+Shift+Space": () => {
        replMain.withUndo(() => {
            paredit.growSelection(replMain)
            replMain.repaint();
        })
    },
    "Ctrl+Alt+Shift+Space": () => {
        replMain.withUndo(() => {
            paredit.shrinkSelection(replMain)
            replMain.repaint();
        })
    },
    "Alt+Delete": () => {
        replMain.withUndo(() => {
            replMain.delete();
            replMain.repaint();
        });
    },
    "Ctrl+LeftArrow": () => {
        let cursor = replMain.getTokenCursor();
        cursor.backwardSexp(true);
        replMain.selectionStart = replMain.selectionEnd = cursor.offsetStart;
        replMain.repaint();
    },
    "Ctrl+RightArrow": () => {
        let cursor = replMain.getTokenCursor();
        cursor.forwardSexp(true);
        replMain.selectionStart = replMain.selectionEnd = cursor.offsetStart;
        replMain.repaint();
    },
    "Ctrl+DownArrow": () => {
        let cursor = replMain.getTokenCursor();
        
        do {
            cursor.forwardWhitespace()
        } while (cursor.getToken().type != "open" && cursor.forwardSexp()) {}
        cursor.downList();
        replMain.selectionStart = replMain.selectionEnd = cursor.offsetStart;
        replMain.repaint();
    },
    "Ctrl+Shift+UpArrow": () => {
        let cursor = replMain.getTokenCursor();
        cursor.forwardList();
        cursor.upList();
        replMain.selectionStart = replMain.selectionEnd = cursor.offsetStart;
        replMain.repaint();
    },
    "Ctrl+UpArrow": () => {
        let cursor = replMain.getTokenCursor();
        cursor.backwardList();
        cursor.backwardUpList();
        replMain.selectionStart = replMain.selectionEnd = cursor.offsetStart;
        replMain.repaint();
    },
    "Cmd+A": () => {
        replMain.selectionStart = 0;
        replMain.selectionEnd = replMain.model.maxOffset;
        replMain.repaint();
    },
    "Cmd+Z": () => {
        replMain.model.undoManager.undo(replMain)
        replMain.repaint();
    },
    "Cmd+Shift+Z": () => {
        replMain.model.undoManager.redo(replMain)
        replMain.repaint();
    },
    "Alt+Shift+J": () => {
        replMain.withUndo(() => {
            paredit.joinSexp(replMain);
            replMain.repaint();
        })
    },
    "Alt+Shift+Cmd+LeftArrow": () => {
        replMain.withUndo(() => {
            paredit.backwardSlurpSexp(replMain);
            replMain.repaint();
        })    
    },
    "Alt+Cmd+LeftArrow": () => {
        replMain.withUndo(() => {
            paredit.forwardBarfSexp(replMain);
            replMain.repaint();
        })    
    },
    "LeftArrow": () => {
        replMain.caretLeft(true);
        replMain.repaint();
    },
    "Shift+LeftArrow": () => {
        replMain.caretLeft(false);
        replMain.repaint();
    },
    "Alt+Shift+Cmd+RightArrow": () => {
        replMain.withUndo(() => {
            paredit.forwardSlurpSexp(replMain);
            replMain.repaint();
        })
    },
    "Alt+Cmd+RightArrow": () => {
        replMain.withUndo(() => {
            paredit.backwardBarfSexp(replMain);
            replMain.repaint();
        })    
    },
    "RightArrow": () => {
        replMain.caretRight(true)
        replMain.repaint();
    },
    "Shift+RightArrow": () => {
        replMain.caretRight(false)
        replMain.repaint();
    },
    "Alt+UpArrow": () => {
        replMain.withUndo(() => {
            paredit.spliceSexpKillingBackward(replMain)
            replMain.repaint();
        });
    },
    "UpArrow": () => {
        replMain.caretUp(true);
        replMain.repaint();
    },
    "Shift+UpArrow": () => {
        replMain.caretUp(false);
        replMain.repaint();
    },
    "Alt+DownArrow": () => {
        replMain.withUndo(() => {
            paredit.spliceSexpKillingForward(replMain)
            replMain.repaint();
        });
    },
    "DownArrow": () => {
        replMain.caretDown(true);
        replMain.repaint();
    },
    "Shift+DownArrow": () => {
        replMain.caretDown(false);
        replMain.repaint();
    },
    "Backspace": () => {
        replMain.withUndo(() => {
            paredit.backspace(replMain);
            replMain.repaint()
        })        
    },
    "Home": () => {
        replMain.caretHome(true);
        replMain.repaint();
    },
    "Shift+Home": () => {
        replMain.caretHome(false);
        replMain.repaint();
    },
    "Ctrl+Home": () => {
        replMain.caretHomeAll(true);
        replMain.repaint();
    },
    "Shift+Ctrl+Home": () => {
        replMain.caretHomeAll(false);
        replMain.repaint();
    },
    "End": () => {
        replMain.caretEnd(true);
        replMain.repaint();
    },
    "Shift+End": () => {
        replMain.caretEnd(false);
        replMain.repaint();
    },
    "Ctrl+End": () => {
        replMain.caretEndAll(true);
        replMain.repaint();
    },
    "Shift+Ctrl+End": () => {
        replMain.caretEndAll(false);
        replMain.repaint();
    },
    "Delete": () => {
        replMain.withUndo(() => {
            paredit.deleteForward(replMain);
            replMain.repaint()
        })        
    },
    "Alt+Shift+9": () => {
        replMain.withUndo(() => {
            paredit.wrapSexpr(replMain, "(", ")");
            replMain.repaint();
        })
    },
    "Alt+[": () => {
        replMain.withUndo(() => {
            paredit.wrapSexpr(replMain, "[", "]");
            replMain.repaint();
        })
    },
    "Alt+Shift+[": () => {
        replMain.withUndo(() => {
            paredit.wrapSexpr(replMain, "{", "}");
            replMain.repaint();
        })
    },
    "Alt+Shift+S": () => {
        replMain.withUndo(() => {
            paredit.splitSexp(replMain);
            replMain.repaint();
        })    
    },
    "Alt+S": () => {
        replMain.withUndo(() => {
            paredit.spliceSexp(replMain);
            replMain.repaint();
        })    
    }
})

document.getElementById("input").addEventListener("keydown", e => {
    let commandKey = isMac ? e.metaKey : e.ctrlKey;
    if(hotkeys.execute(e)) {
        e.preventDefault();
        return;
    }
    if(e.key.length == 1 && !e.metaKey && !e.ctrlKey) {
        if(e.key == " ")
            replMain.model.undoManager.insertUndoStop();    
    } else {
        switch(e.keyCode) {
            case 9: // Tab
                e.preventDefault();
                break;
            case 13:
                replMain.model.undoManager.insertUndoStop();
                let indent = getIndent(replMain, replMain.selectionEnd);
                let istr = ""
                for(let i=0; i<indent; i++)
                    istr += " "
                replMain.insertString("\n"+istr);
                break;
        }
    }
},  { capture: true })

let replMain = new ReplConsole(document.getElementById("repl") as HTMLDivElement);
replMain.insertString("[asdf sdf (b a foo what) (c) (d)]");
replMain.repaint()
let input = document.getElementById("input") as HTMLInputElement;
document.getElementById("input").addEventListener("blur", e => {
    document.getElementById("input").focus();
})

input.addEventListener("input", e => {
    if(input.value == '"') {
        replMain.withUndo(() => {
            paredit.stringQuote(replMain)
            replMain.repaint()
        })
        e.preventDefault();
    } else if(input.value == "(") {
        replMain.withUndo(() => {
            paredit.open(replMain, "()");
            replMain.repaint();
        })
        e.preventDefault();
    } else if(input.value == "[") {
        replMain.withUndo(() => {
            paredit.open(replMain, "[]");
            replMain.repaint();
        })
        e.preventDefault();
    } else if(input.value == "{") {
        replMain.withUndo(() => {
            paredit.open(replMain, "{}");
            replMain.repaint();
        })
        e.preventDefault();
    } else if(input.value == "{") {
        replMain.withUndo(() => {
            paredit.open(replMain, "{}");
            replMain.repaint();
        })
        e.preventDefault();
    } else if(input.value == ")") {
        replMain.withUndo(() => {
            paredit.close(replMain, ")");
            replMain.repaint();
        })
        e.preventDefault();
    } else if(input.value == "]") {
        replMain.withUndo(() => {
            paredit.close(replMain, "]");
            replMain.repaint();
        })
        e.preventDefault();
    } else if(input.value == "}") {
        replMain.withUndo(() => {
            paredit.close(replMain, "}");
            replMain.repaint();
        })
        e.preventDefault();
    } else if(input.value == "\n") {
        replMain.model.undoManager.insertUndoStop();
        let indent = getIndent(replMain, replMain.selectionEnd);
        let istr = ""
        for(let i=0; i<indent; i++)
            istr += " "
        replMain.insertString("\n"+istr);
    } else {
        replMain.insertString(input.value)
    }
    input.value = ""
    e.preventDefault();
})

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("input").focus();
})

document.addEventListener("cut", e => {
    e.clipboardData.setData("text/plain", replMain.model.getText(replMain.selectionStart, replMain.selectionEnd));
    replMain.delete();
    e.preventDefault();
})

document.addEventListener("copy", e => {
    e.clipboardData.setData("text/plain", replMain.model.getText(replMain.selectionStart, replMain.selectionEnd));
    e.preventDefault();
})

document.addEventListener("paste", e => {
    replMain.model.undoManager.insertUndoStop()
    replMain.insertString(e.clipboardData.getData("text/plain"));
    e.preventDefault();
})
