/**
 * A reversable operation to a document of type T.
 */
export declare abstract class UndoStep<T> {
    /** The name of this undo operation. */
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
    coalesce(c: UndoStep<T>): boolean;
}
export declare class UndoStepGroup<T> extends UndoStep<T> {
    steps: UndoStep<T>[];
    addUndoStep(step: UndoStep<T>): void;
    undo(c: T): void;
    redo(c: T): void;
}
/**
 * Handles the undo/redo stacks.
 */
export declare class UndoManager<T> {
    private undos;
    private redos;
    private groupedUndo;
    /**
     * Adds the step to the undo stack, and clears the redo stack.
     * If possible, coalesces it into the previous undo.
     *
     * @param step the UndoStep to add.
     */
    addUndoStep(step: UndoStep<T>): void;
    withUndo(f: () => void): void;
    /** Prevents this undo from becoming coalesced with future undos */
    insertUndoStop(): void;
    /** Performs the top undo operation on the document (if it exists), moving it to the redo stack. */
    undo(c: T): void;
    /** Performs the top redo operation on the document (if it exists), moving it back onto the undo stack. */
    redo(c: T): void;
}
