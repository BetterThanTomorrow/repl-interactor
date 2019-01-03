import { LineInputModel } from "./model";
import { Token } from "./clojure-lexer";

/** A mutable cursor into the token stream. */
export class TokenCursor {
    constructor(public doc: LineInputModel, public line: number, public token: number) {
    }

    /** Create a copy of this cursor. */
    clone() {
        return new TokenCursor(this.doc, this.line, this.token);
    }

    set(cursor: TokenCursor) {
        this.doc = cursor.doc;
        this.line = cursor.line;
        this.token = cursor.token;
    }

    /** Return the position */
    get rowCol() {
        return [this.line, this.getToken().offset];
    }

    /** True if we are at the start of the document */
    atStart() {
        return this.token == 0 && this.line == 0;
    }

    /** True if we are at the end of the document */
    atEnd() {
        return this.line == this.doc.lines.length-1 && this.token == this.doc.lines[this.line].tokens.length-1;
    }

    /** Move this cursor backwards one token */
    previous() {
        if(this.token > 0) {
            this.token--;
        } else {
            if(this.line == 0) return;
            this.line--;
            this.token = this.doc.lines[this.line].tokens.length-1;
        }
        return this;
    }

    /** Move this cursor forwards one token */
    next() {
        if(this.token < this.doc.lines[this.line].tokens.length-1) {
            this.token++;
        } else {
            if(this.line == this.doc.lines.length-1) return;
            this.line++;
            this.token = 0;
        }
    }

    fowardString() {
        while(!this.atEnd()) {
            switch(this.getToken().type) {
                case "eol":
                case "str-inside":
                case "str-start":
                    this.next();
                    continue;
                default:
                    return;
            }
        }
    }

    forwardWhitespace() {
        while(!this.atEnd()) {
            switch(this.getToken().type) {
                case "eol":
                case "ws":
                case "comment":
                    this.next();
                    continue;
                default:
                    return;
            }
        }
    }

    backwardWhitespace() {
        while(!this.atStart()) {
            switch(this.getPrevToken().type) {
                case "eol":
                case "ws":
                case "comment":
                    this.previous();
                    continue;
                default:
                    return;
            }
        }
    }

    forwardSexp(): boolean {
        let delta = 0;
        this.forwardWhitespace();
        if(this.getToken().type == "close") {
            return false;
        }
        while(!this.atEnd()) {
            this.forwardWhitespace();
            let tk = this.getToken();
            switch(tk.type) {
                case 'id':
                case 'lit':
                case 'str':
                case 'str-end':
                    this.next();
                    if(delta <= 0)
                        return true;
                    break;
                case 'str-inside':
                case 'str-start':
                    do {
                        this.next();
                        tk = this.getToken();
                    } while(!this.atEnd() && (tk.type == "str-inside" || tk.type == "eol"))
                    continue;
                case 'close':
                    delta--;
                    this.next();
                    if(delta <= 0)
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
    }

    backwardSexp() {
        let delta = 0;
        this.backwardWhitespace();
        switch(this.getPrevToken().type) {
            case "open":
                return false;
        }
        while(!this.atStart()) {
            this.backwardWhitespace();
            let tk = this.getPrevToken();
            switch(tk.type) {
                case 'id':
                case 'lit':
                case 'str':
                case 'str-start':
                    this.previous();
                    if(delta <= 0)
                        return true;
                    break;
                case 'str-inside':
                case 'str-end':
                    do {
                        this.previous();
                        tk = this.getPrevToken();
                    } while(!this.atStart() && tk.type == "str-inside")
                    continue;                    
                case 'close':
                    delta++;
                    this.previous();
                    break;
                case 'open':
                    delta--;
                    this.previous();
                    if(delta <= 0)
                        return true;
                    break;
                default:
                    this.previous();
            }
        }
    }

    forwardList(): boolean {
        let cursor = this.clone();
        while(cursor.forwardSexp()) {
            if(cursor.getPrevToken().type == "close") {
                this.set(cursor);
                return true;
            }
            this.next()
        }
        return false;
    }

    backwardList(): boolean {
        let cursor = this.clone();
        while(cursor.backwardSexp()) {
            if(cursor.getToken().type == "open") {
                this.set(cursor);
                return true;
            }
        }
        return false;
    }

    downList(): boolean {
        let cursor = this.clone();
        do {
            cursor.forwardWhitespace();
            if(cursor.getToken().type == "open") {
                cursor.next();
                this.set(cursor);
                return true;
            }
        } while(cursor.forwardSexp())
        return false;
    }

    upList(): boolean {
        let cursor = this.clone();
        do {
            cursor.forwardWhitespace();
            if(cursor.getToken().type == "close") {
                cursor.next();
                this.set(cursor);
                return true;
            }
        } while(cursor.forwardSexp())
        return false;
    }

    backwardUpList(): boolean {
        let cursor = this.clone();
        do {
            cursor.backwardWhitespace();
            if(cursor.getPrevToken().type == "open") {
                cursor.previous();
                this.set(cursor);
                return true;
            }
        } while(cursor.backwardSexp())
        return false;
    }

    getPrevToken(): Token {
        if(this.line == 0 && this.token == 0)
            return { type: "eol", raw: "\n", offset: 0, state: null };
        let cursor = this.clone();
        cursor.previous();
        return cursor.getToken();
    }

    getToken() {
        return this.doc.lines[this.line].tokens[this.token];
    }
}
