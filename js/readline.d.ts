import { LineInputModel } from "./model";
import { TokenCursor, LispTokenCursor } from "./token-cursor";
/**
 * A syntax-highlighting text editor.
 */
export declare class ReplReadline {
    parent: HTMLElement;
    input: HTMLInputElement;
    /** The offset of the start of the selection into the document. */
    private _selectionStart;
    /** Returns the offset of the start of the selection. */
    /** Sets the start of the selection. */
    selectionStart: number;
    /** The offset of the end of the selection into the document. */
    private _selectionEnd;
    /** Returns the offset of the end of the selection. */
    /** Sets the end of the selection. */
    selectionEnd: number;
    /** The underlying tokenized source. */
    model: LineInputModel;
    /** The HTMLDivElements in the rendered view for each line. */
    inputLines: HTMLDivElement[];
    /** The element representing the caret. */
    caret: HTMLDivElement;
    /** The target column of the caret, for up/down movement. */
    caretX: number;
    /** The start of the selection when we last updated the component's DOM. */
    private lastSelectionStart;
    /** The end of the selection when we last updated the component's DOM. */
    private lastSelectionEnd;
    /**
     * Returns a TokenCursor into the document.
     *
     * @param row the line to position the cursor at.
     * @param col the column to position the cursor at.
     * @param previous if true, position the cursor at the previous token.
     */
    getTokenCursor(offset?: number, previous?: boolean): LispTokenCursor;
    /**
     * Executes a block of code, during which any edits that are performed on the document will be created with Undo support.
     * This should happen almost all of the time- in fact the only time it shouldn't is when replaying undo/redo operations.
     *
     * FIXME: Perhaps this should be "withoutUndo"?
     *
     * @param body the code to execute.
     */
    withUndo(body: () => void): void;
    /**
     * Inserts a string at the current cursor location.
     *
     * FIXME: this should just be `changeRange`.
     * @param text the text to insert
     */
    insertString(text: string): void;
    /**
     * Moves the caret left one character, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    caretLeft(clear?: boolean): void;
    /**
     * Moves the caret right one character, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    caretRight(clear?: boolean): void;
    /**
     * Moves the caret to the beginning of the document, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    caretHomeAll(clear?: boolean): void;
    /**
     * Moves the caret to the end of the document, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    caretEndAll(clear?: boolean): void;
    /**
     * Moves the caret to the beginning of the line, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    caretHome(clear?: boolean): void;
    /**
     * Moves the caret to the end of the line, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    caretEnd(clear?: boolean): void;
    /**
     * Moves the caret to the previous line, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    caretUp(clear?: boolean): void;
    /**
     * Moves the caret to the next line, using text editor semantics.
     *
     * @param clear if true, clears the current selection, if any, otherwise moves `cursorEnd` only.
     */
    caretDown(clear?: boolean): void;
    /**
     * Deletes the current selection.
     *
     * FIXME: this should just be `changeRange`
     */
    private deleteSelection;
    /**
     * If there is no selection- deletes the character to the left of the cursor and moves it back one character.
     *
     * If there is a selection, deletes the selection.
     */
    backspace(): void;
    /**
     * If there is no selection- deletes the character to the right of the cursor.
     *
     * If there is a selection, deletes the selection.
     */
    delete(): void;
    /**
     * Construct a selection marker div.
     * @param start the left hand side start position in pixels.
     * @param width the width of the marker, in pixels.
     */
    private makeSelection;
    /**
     * If we are rendering a matched parenthesis, a cursor pointing at the close parenthesis.
     */
    closeParen: TokenCursor;
    /**
     * If we are rendering a matched parenthesis, a cursor pointing at the open parenthesis.
     */
    openParen: TokenCursor;
    /**
     * True if we are rendering a matched parenthesis.
     */
    matchingParen: boolean;
    /**
     * Clears the rendering for matching parenthesis.
     */
    private clearParenMatches;
    /**
     * Sets the rendering for matching parenthesis.
     */
    updateParenMatches(): void;
    /**
     * Given a TokenCursor, returns the HTMLElement that is rendered for this token.
     * @param cursor
     */
    private getElementForToken;
    private _repaintListeners;
    addOnRepaintListener(fn: () => void): void;
    /**
     * Update the DOM for the editor. After a change in the model or local editor information (e.g. cursor position), we apply the changes,
     * attempting to minimize the work.
     */
    repaint(): void;
    getCaretOnScreen(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /** Given a (pageX, pageY) pixel coordinate, returns the character offset into this document. */
    pageToOffset(pageX: number, pageY: number): number;
    private mouseDrag;
    private mouseUp;
    private mouseDown;
    focus: (e: Event) => void;
    mainElem: HTMLElement;
    promptElem: HTMLElement;
    elem: HTMLElement;
    wrap: HTMLElement;
    constructor(parent: HTMLElement, prompt: string, input: HTMLInputElement);
    private makeLine;
    canReturn(): boolean;
    freeze(): void;
    doReturn(): void;
    growSelectionStack: [number, number][];
}
