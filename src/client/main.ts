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
                e.preventDefault();
                break;
            case 'Z':
                replMain.model.undoManager.redo(replMain);
                replMain.updateState()
                e.preventDefault();
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
                e.preventDefault();
                break;
            case 39: // Right arrow
                replMain.caretRight(!e.shiftKey);
                e.preventDefault();
                break;
            case 8: // Backspace
                replMain.backspace();
                e.preventDefault();
                break;
            case 36: // Home
                if(e.ctrlKey)
                    replMain.caretHomeAll(!e.shiftKey);
                else
                    replMain.caretHome(!e.shiftKey);
                    e.preventDefault();
                    break;
            case 35: // End
                if(e.ctrlKey)
                    replMain.caretEndAll(!e.shiftKey)
                else
                    replMain.caretEnd(!e.shiftKey);
                    e.preventDefault();
                    break;
            case 38: // Up
                replMain.caretUp(!e.shiftKey);
                e.preventDefault();
                break;
            case 40: // Down
                replMain.caretDown(!e.shiftKey);
                e.preventDefault();
                break;
            case 46: // Delete
                replMain.delete();
                break;
        }
    }
},  { capture: true })

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
