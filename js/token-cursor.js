"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * A mutable cursor into the token stream.
 */
var TokenCursor = /** @class */ (function () {
    function TokenCursor(doc, line, token) {
        this.doc = doc;
        this.line = line;
        this.token = token;
    }
    /** Create a copy of this cursor. */
    TokenCursor.prototype.clone = function () {
        return new TokenCursor(this.doc, this.line, this.token);
    };
    /**
     * Sets this TokenCursor state to the same as another.
     * @param cursor the cursor to copy state from.
     */
    TokenCursor.prototype.set = function (cursor) {
        this.doc = cursor.doc;
        this.line = cursor.line;
        this.token = cursor.token;
    };
    Object.defineProperty(TokenCursor.prototype, "rowCol", {
        /** Return the position */
        get: function () {
            return [this.line, this.getToken().offset];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TokenCursor.prototype, "offsetStart", {
        /** Return the offset at the start of the token */
        get: function () {
            return this.doc.getOffsetForLine(this.line) + this.getToken().offset;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TokenCursor.prototype, "offsetEnd", {
        /** Return the offset at the end of the token */
        get: function () {
            return Math.min(this.doc.maxOffset, this.doc.getOffsetForLine(this.line) + this.getToken().offset + this.getToken().raw.length);
        },
        enumerable: true,
        configurable: true
    });
    /** True if we are at the start of the document */
    TokenCursor.prototype.atStart = function () {
        return this.token == 0 && this.line == 0;
    };
    /** True if we are at the end of the document */
    TokenCursor.prototype.atEnd = function () {
        return this.line == this.doc.lines.length - 1 && this.token == this.doc.lines[this.line].tokens.length - 1;
    };
    /** Move this cursor backwards one token */
    TokenCursor.prototype.previous = function () {
        if (this.token > 0) {
            this.token--;
        }
        else {
            if (this.line == 0)
                return;
            this.line--;
            this.token = this.doc.lines[this.line].tokens.length - 1;
        }
        return this;
    };
    /** Move this cursor forwards one token */
    TokenCursor.prototype.next = function () {
        if (this.token < this.doc.lines[this.line].tokens.length - 1) {
            this.token++;
        }
        else {
            if (this.line == this.doc.lines.length - 1)
                return;
            this.line++;
            this.token = 0;
        }
        return this;
    };
    /**
     * Return the token immediately preceding this cursor. At the start of the file, a token of type "eol" is returned.
     */
    TokenCursor.prototype.getPrevToken = function () {
        if (this.line == 0 && this.token == 0)
            return { type: "eol", raw: "\n", offset: 0, state: null };
        var cursor = this.clone();
        cursor.previous();
        return cursor.getToken();
    };
    /**
     * Returns the token at this cursor position.
     */
    TokenCursor.prototype.getToken = function () {
        return this.doc.lines[this.line].tokens[this.token];
    };
    TokenCursor.prototype.equals = function (cursor) {
        return this.line == cursor.line && this.token == cursor.token && this.doc == cursor.doc;
    };
    return TokenCursor;
}());
exports.TokenCursor = TokenCursor;
var LispTokenCursor = /** @class */ (function (_super) {
    __extends(LispTokenCursor, _super);
    function LispTokenCursor(doc, line, token) {
        var _this = _super.call(this, doc, line, token) || this;
        _this.doc = doc;
        _this.line = line;
        _this.token = token;
        return _this;
    }
    /** Create a copy of this cursor. */
    LispTokenCursor.prototype.clone = function () {
        return new LispTokenCursor(this.doc, this.line, this.token);
    };
    /**
     * Moves this token past the inside of a multiline string
     */
    LispTokenCursor.prototype.fowardString = function () {
        while (!this.atEnd()) {
            switch (this.getToken().type) {
                case "eol":
                case "str-inside":
                case "str-start":
                    this.next();
                    continue;
                default:
                    return;
            }
        }
    };
    /**
     * Moves this token past any whitespace or comment.
     */
    LispTokenCursor.prototype.forwardWhitespace = function (includeComments) {
        if (includeComments === void 0) { includeComments = true; }
        while (!this.atEnd()) {
            switch (this.getToken().type) {
                case "comment":
                    if (!includeComments)
                        return;
                case "eol":
                case "ws":
                    this.next();
                    continue;
                default:
                    return;
            }
        }
    };
    /**
     * Moves this token back past any whitespace or comment.
     */
    LispTokenCursor.prototype.backwardWhitespace = function (includeComments) {
        if (includeComments === void 0) { includeComments = true; }
        while (!this.atStart()) {
            switch (this.getPrevToken().type) {
                case "comment":
                    if (!includeComments)
                        return;
                case "eol":
                    this.previous();
                    if (this.getPrevToken().type == "comment") {
                        this.next();
                        return;
                    }
                    continue;
                case "ws":
                    this.previous();
                    continue;
                default:
                    return;
            }
        }
    };
    // Lisp navigation commands begin here.
    /**
     * Moves this token forward one s-expression at this level.
     * If the next non whitespace token is an open paren, skips past it's matching
     * close paren.
     *
     * If the next token is a form of closing paren, does not move.
     *
     * @returns true if the cursor was moved, false otherwise.
     */
    LispTokenCursor.prototype.forwardSexp = function (skipComments) {
        if (skipComments === void 0) { skipComments = false; }
        var delta = 0;
        this.forwardWhitespace(!skipComments);
        if (this.getToken().type == "close") {
            return false;
        }
        while (!this.atEnd()) {
            this.forwardWhitespace(!skipComments);
            var tk = this.getToken();
            switch (tk.type) {
                case 'comment':
                    this.next(); // skip past comment
                    this.next(); // skip past EOL.
                    return true;
                case 'id':
                case 'lit':
                case 'kw':
                case 'str':
                case 'str-end':
                    this.next();
                    if (delta <= 0)
                        return true;
                    break;
                case 'str-inside':
                case 'str-start':
                    do {
                        this.next();
                        tk = this.getToken();
                    } while (!this.atEnd() && (tk.type == "str-inside" || tk.type == "eol"));
                    continue;
                case 'close':
                    delta--;
                    this.next();
                    if (delta <= 0)
                        return true;
                    break;
                case 'open':
                    delta++;
                    this.next();
                    break;
                default:
                    this.next();
                    break;
            }
        }
    };
    /**
     * Moves this token backward one s-expression at this level.
     * If the previous non whitespace token is an close paren, skips past it's matching
     * open paren.
     *
     * If the previous token is a form of open paren, does not move.
     *
     * @returns true if the cursor was moved, false otherwise.
     */
    LispTokenCursor.prototype.backwardSexp = function (skipComments) {
        if (skipComments === void 0) { skipComments = true; }
        var delta = 0;
        this.backwardWhitespace(!skipComments);
        switch (this.getPrevToken().type) {
            case "open":
                return false;
        }
        while (!this.atStart()) {
            this.backwardWhitespace(!skipComments);
            var tk = this.getPrevToken();
            switch (tk.type) {
                case 'id':
                case 'lit':
                case 'kw':
                case 'comment':
                case 'str':
                case 'str-start':
                    this.previous();
                    if (delta <= 0)
                        return true;
                    break;
                case 'str-inside':
                case 'str-end':
                    do {
                        this.previous();
                        tk = this.getPrevToken();
                    } while (!this.atStart() && tk.type == "str-inside");
                    continue;
                case 'close':
                    delta++;
                    this.previous();
                    break;
                case 'open':
                    delta--;
                    this.previous();
                    if (delta <= 0)
                        return true;
                    break;
                default:
                    this.previous();
            }
        }
    };
    /**
     * Moves this cursor to the close paren of the containing sexpr, or until the end of the document.
     */
    LispTokenCursor.prototype.forwardList = function () {
        var cursor = this.clone();
        while (cursor.forwardSexp()) { }
        if (cursor.getToken().type == "close") {
            this.set(cursor);
            return true;
        }
        return false;
    };
    /**
     * Moves this cursor backwards to the open paren of the containing sexpr, or until the start of the document.
     */
    LispTokenCursor.prototype.backwardList = function () {
        var cursor = this.clone();
        while (cursor.backwardSexp()) { }
        if (cursor.getPrevToken().type == "open") {
            this.set(cursor);
            return true;
        }
        return false;
    };
    /**
     * If possible, moves this cursor forwards past any whitespace, and then past the immediately following open-paren and returns true.
     * If the source does not match this, returns false and does not move the cursor.
     */
    LispTokenCursor.prototype.downList = function () {
        var cursor = this.clone();
        cursor.forwardWhitespace();
        if (cursor.getToken().type == "open") {
            cursor.next();
            this.set(cursor);
            return true;
        }
        return false;
    };
    /**
     * If possible, moves this cursor forwards past any whitespace, and then past the immediately following close-paren and returns true.
     * If the source does not match this, returns false and does not move the cursor.
     */
    LispTokenCursor.prototype.upList = function () {
        var cursor = this.clone();
        cursor.forwardWhitespace();
        if (cursor.getToken().type == "close") {
            cursor.next();
            this.set(cursor);
            return true;
        }
        return false;
    };
    /**
     * If possible, moves this cursor backwards past any whitespace, and then backwards past the immediately following open-paren and returns true.
     * If the source does not match this, returns false and does not move the cursor.
     */
    LispTokenCursor.prototype.backwardUpList = function () {
        var cursor = this.clone();
        cursor.backwardWhitespace();
        if (cursor.getPrevToken().type == "open") {
            cursor.previous();
            this.set(cursor);
            return true;
        }
        return false;
    };
    LispTokenCursor.prototype.withinWhitespace = function () {
        var tk = this.getToken().type;
        if (tk == "eol" || tk == "ws") {
            return true;
        }
    };
    LispTokenCursor.prototype.withinString = function () {
        var tk = this.getToken().type;
        if (tk == "str" || tk == "str-start" || tk == "str-end" || tk == "str-inside") {
            return true;
        }
        if (tk == "eol") {
            tk = this.getPrevToken().type;
            if (tk == "str-inside" || tk == "str-start")
                return true;
        }
        return false;
    };
    return LispTokenCursor;
}(TokenCursor));
exports.LispTokenCursor = LispTokenCursor;
