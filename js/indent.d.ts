import { ReplReadline } from "./readline";
declare type IndentRule = ["block", number] | ["inner", number] | ["inner", number, number];
/**
 * The information about an enclosing s-expr, returned by collectIndents
 */
interface IndentInformation {
    /** The first token in the expression (after the open paren/bracket etc.), as a raw string */
    first: string;
    /** The indent immediately after the open paren/bracket etc */
    startIndent: number;
    /** If there is a second token on the same line as the first token, the indent for that token */
    firstItemIdent: number;
    /** The applicable indent rules for this IndentInformation, local only. */
    rules: IndentRule[];
    /** The index at which the cursor (or the sexpr containing the cursor at this level) is in the expression. */
    argPos: number;
    /** The number of expressions on the first line of this expression. */
    exprsOnLine: number;
}
/**
 * Analyses the text before position in the document, and returns a list of enclosing expression information with
 * various indent information, for use with getIndent()
 *
 * @param document The document to analyse
 * @param position The position (as [row, col] into the document to analyse from)
 * @param maxDepth The maximum depth upwards from the expression to search.
 * @param maxLines The maximum number of lines above the position to search until we bail with an imprecise answer.
 */
export declare function collectIndents(document: ReplReadline, offset: number, maxDepth?: number, maxLines?: number): IndentInformation[];
/** Returns the expected newline indent for the given position, in characters. */
export declare function getIndent(document: ReplReadline, offset: number): number;
export {};
