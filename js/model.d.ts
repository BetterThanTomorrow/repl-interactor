import { Token, ScannerState } from "./clojure-lexer";
import { UndoManager } from "./undo";
import { ReplReadline } from "./readline";
export declare class TextLine {
    startState: ScannerState;
    tokens: Token[];
    text: string;
    endState: ScannerState;
    constructor(text: string, startState: ScannerState);
    processLine(oldState: any): void;
}
/** The underlying model for the REPL readline. */
export declare class LineInputModel {
    /** The input lines. */
    lines: TextLine[];
    /** Lines whose text has changed. */
    changedLines: Set<number>;
    /** Lines which must be inserted. */
    insertedLines: Set<[number, number]>;
    /** Lines which must be deleted. */
    deletedLines: Set<[number, number]>;
    /** Handles undo/redo support */
    undoManager: UndoManager<ReplReadline>;
    /** When set, insertString and deleteRange will be added to the undo history. */
    recordingUndo: boolean;
    /** Lines which must be re-lexed. */
    dirtyLines: number[];
    private updateLines;
    private deleteLines;
    private insertLines;
    /**
     * Mark a line as needing to be re-lexed.
     *
     * @param idx the index of the line which needs re-lexing (0-based)
    */
    private markDirty;
    /**
     * Re-lexes all lines marked dirty, cascading onto the lines below if the end state for this line has
     * changed.
     */
    flushChanges(): void;
    /**
     * Returns the character offset in the model to the start of a given line.
     *
     * @param line the line who's offset will be returned.
     */
    getOffsetForLine(line: number): number;
    /**
     * Returns the text between start and end as a string. These may be in any order.
     *
     * @param start the start offset in the text range
     * @param end the end offset in the text range
     * @param mustBeWithin if the start or end are outside the document, returns ""
     */
    getText(start: number, end: number, mustBeWithin?: boolean): string;
    /**
     * Returns the row and column for a given text offset in this model.
     */
    getRowCol(offset: number): [number, number];
    /**
     * Returns the initial lexer state for a given line.
     * Line 0 is always { inString: false }, all lines below are equivalent to their previous line's startState.
     *
     * @param line the line to retrieve the lexer state.
     */
    private getStateForLine;
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
    changeRange(start: number, end: number, text: string, oldSelection?: [number, number], newSelection?: [number, number]): void;
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
    insertString(offset: number, text: string, oldSelection?: [number, number], newSelection?: [number, number]): number;
    /**
     * Deletes count characters starting at offset from the document.
     * If recordingUndo is set, adds an undoStep, using oldCursor and newCursor.
     *
     * @param offset the offset to delete from
     * @param count the number of characters to delete
     * @param oldCursor the cursor at the start of the operation
     * @param newCursor the cursor at the end of the operation
     */
    deleteRange(offset: number, count: number, oldSelection?: [number, number], newSelection?: [number, number]): void;
    /** Return the offset of the last character in this model. */
    readonly maxOffset: number;
}
