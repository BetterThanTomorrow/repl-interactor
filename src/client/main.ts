import { ReplConsole, getIndent } from "./console";

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
                let indent = getIndent(replMain, replMain.model.getRowCol(replMain.cursorEnd));
                let istr = ""
                for(let i=0; i<indent; i++)
                    istr += " "
                replMain.insertString("\n"+istr);
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
    replMain.model.undoManager.insertUndoStop()
    replMain.insertString(e.clipboardData.getData("text/plain"));
    e.preventDefault();
})
