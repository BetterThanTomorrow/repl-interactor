/**
 * A reversable operation to a document of type T.
 */
export abstract class UndoStep<T> {
    name: string;
    /** If true, the UndoManager will not attempt to coalesce events onto this step. */
    undoStop: boolean;

    /** Given the document, undos the effect of this step */
    abstract undo(c: T): void;

    /** Given the document, redoes the effect of this step */
    abstract redo(c: T): void;

    /**
     * Given another UndoStep, attempts to modify this undo-step to include the subsequent one.
     * If successful, returns true, if unsuccessful, returns false, and the step must be added to the
     * UndoManager, too.
     */
    coalesce(c: UndoStep<T>): boolean {
        return false;
    }
}

/**
 * Handles the undo/redo stacks.
 */
export class UndoManager<T> {
    private undos: UndoStep<T>[] = [];
    private redos: UndoStep<T>[] = [];

    /**
     * Adds the step to the undo stack, and clears the redo stack.
     * If possible, coalesces it into the previous undo.
     * 
     * @param step the UndoStep to add.
     */
    addUndoStep(step: UndoStep<T>) {
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

    /** Performs the top undo operation on the document (if it exists), moving it to the redo stack. */
    undo(c: T) {
        if(this.undos.length) {
            const step = this.undos.pop();
            step.undo(c);
            this.redos.push(step);
        }
    }

    /** Performs the top redo operation on the document (if it exists), moving it back onto the undo stack. */
    redo(c: T) {
        if(this.redos.length) {
            const step = this.redos.pop();
            step.redo(c);
            this.undos.push(step);
        }
    }
}
