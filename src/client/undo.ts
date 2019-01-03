export abstract class UndoStep<T> {
    name: string;
    undoStop: boolean;
    abstract undo(c: T): void;
    abstract redo(c: T): void;

    coalesce(c: UndoStep<T>): boolean {
        return false;
    }
}

export class UndoManager<T> {
    private undos: UndoStep<T>[] = [];
    private redos: UndoStep<T>[] = [];

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

    undo(c: T) {
        if(this.undos.length) {
            const step = this.undos.pop();
            step.undo(c);
            this.redos.push(step);
        }
    }

    redo(c: T) {
        if(this.redos.length) {
            const step = this.redos.pop();
            step.redo(c);
            this.undos.push(step);
        }
    }
}
