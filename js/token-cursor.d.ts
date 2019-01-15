import { LineInputModel } from "./model";
import { Token } from "./clojure-lexer";
/**
 * A mutable cursor into the token stream.
 */
export declare class TokenCursor {
    doc: LineInputModel;
    line: number;
    token: number;
    constructor(doc: LineInputModel, line: number, token: number);
    /** Create a copy of this cursor. */
    clone(): TokenCursor;
    /**
     * Sets this TokenCursor state to the same as another.
     * @param cursor the cursor to copy state from.
     */
    set(cursor: TokenCursor): void;
    /** Return the position */
    readonly rowCol: number[];
    /** Return the offset at the start of the token */
    readonly offsetStart: number;
    /** Return the offset at the end of the token */
    readonly offsetEnd: number;
    /** True if we are at the start of the document */
    atStart(): boolean;
    /** True if we are at the end of the document */
    atEnd(): boolean;
    /** Move this cursor backwards one token */
    previous(): this;
    /** Move this cursor forwards one token */
    next(): this;
    /**
     * Return the token immediately preceding this cursor. At the start of the file, a token of type "eol" is returned.
     */
    getPrevToken(): Token;
    /**
     * Returns the token at this cursor position.
     */
    getToken(): Token;
    equals(cursor: TokenCursor): boolean;
}
export declare class LispTokenCursor extends TokenCursor {
    doc: LineInputModel;
    line: number;
    token: number;
    constructor(doc: LineInputModel, line: number, token: number);
    /** Create a copy of this cursor. */
    clone(): LispTokenCursor;
    /**
     * Moves this token past the inside of a multiline string
     */
    fowardString(): void;
    /**
     * Moves this token past any whitespace or comment.
     */
    forwardWhitespace(includeComments?: boolean): void;
    /**
     * Moves this token back past any whitespace or comment.
     */
    backwardWhitespace(includeComments?: boolean): void;
    /**
     * Moves this token forward one s-expression at this level.
     * If the next non whitespace token is an open paren, skips past it's matching
     * close paren.
     *
     * If the next token is a form of closing paren, does not move.
     *
     * @returns true if the cursor was moved, false otherwise.
     */
    forwardSexp(skipComments?: boolean): boolean;
    /**
     * Moves this token backward one s-expression at this level.
     * If the previous non whitespace token is an close paren, skips past it's matching
     * open paren.
     *
     * If the previous token is a form of open paren, does not move.
     *
     * @returns true if the cursor was moved, false otherwise.
     */
    backwardSexp(skipComments?: boolean): boolean;
    /**
     * Moves this cursor to the close paren of the containing sexpr, or until the end of the document.
     */
    forwardList(): boolean;
    /**
     * Moves this cursor backwards to the open paren of the containing sexpr, or until the start of the document.
     */
    backwardList(): boolean;
    /**
     * If possible, moves this cursor forwards past any whitespace, and then past the immediately following open-paren and returns true.
     * If the source does not match this, returns false and does not move the cursor.
     */
    downList(): boolean;
    /**
     * If possible, moves this cursor forwards past any whitespace, and then past the immediately following close-paren and returns true.
     * If the source does not match this, returns false and does not move the cursor.
     */
    upList(): boolean;
    /**
     * If possible, moves this cursor backwards past any whitespace, and then backwards past the immediately following open-paren and returns true.
     * If the source does not match this, returns false and does not move the cursor.
     */
    backwardUpList(): boolean;
    withinWhitespace(): boolean;
    withinString(): boolean;
}
