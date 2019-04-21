"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALT = 1;
exports.CTRL = 2;
exports.SHIFT = 4;
exports.META = 8;
var isMac = navigator.platform.match(/Mac(Intel|PPC|68k)/i); // somewhat optimistic this would run on MacOS8 but hey ;)
var keyToId = {};
var idToKey = {};
function key(name, id) {
    keyToId[name.toLowerCase()] = id;
    idToKey[id] = name;
}
key("Backspace", 8);
key("Space", 0x20);
key("Tab", 9);
key("Return", 13);
key("End", 35);
key("/", 191);
key("[", 219);
key("Home", 36);
key("LeftArrow", 37);
key("UpArrow", 38);
key("RightArrow", 39);
key("DownArrow", 40);
key("Delete", 46);
function parseHotKey(key, command) {
    var parts = key.split("+").map(function (x) { return x.trim().toLowerCase(); });
    var i = 0;
    var modifiers = 0;
    outer: for (; i < parts.length; i++) {
        switch (parts[i]) {
            case "alt":
                modifiers |= exports.ALT;
                break;
            case "ctrl":
                modifiers |= exports.CTRL;
                break;
            case "shift":
                modifiers |= exports.SHIFT;
                break;
            case "meta":
                modifiers |= exports.META;
                break;
            case "cmd":
                modifiers |= (isMac ? exports.META : exports.CTRL);
                break;
            default:
                break outer;
        }
    }
    if (i == parts.length)
        throw new Error("No key after modifiers");
    if (i != parts.length - 1)
        throw new Error("Too many keys after modifiers");
    var mainKey = parts[parts.length - 1];
    if (mainKey.length == 1) {
        var key_1 = keyToId[mainKey];
        if (key_1 === undefined)
            return new HotKey(modifiers, mainKey.toUpperCase().charCodeAt(0), command);
        return new HotKey(modifiers, key_1, command);
    }
    else {
        var key_2 = keyToId[mainKey];
        if (key_2 === undefined)
            throw new Error("Unknown key: " + mainKey);
        return new HotKey(modifiers, key_2, command);
    }
}
exports.parseHotKey = parseHotKey;
var HotKey = /** @class */ (function () {
    function HotKey(modifiers, key, command) {
        this.modifiers = modifiers;
        this.key = key;
        this.command = command;
    }
    HotKey.prototype.match = function (e) {
        var mods = 0;
        if (e.altKey)
            mods |= exports.ALT;
        if (e.shiftKey)
            mods |= exports.SHIFT;
        if (e.ctrlKey)
            mods |= exports.CTRL;
        if (e.metaKey)
            mods |= exports.META;
        return this.modifiers == mods && this.key == e.keyCode;
    };
    return HotKey;
}());
exports.HotKey = HotKey;
var HotKeyTable = /** @class */ (function () {
    function HotKeyTable(keys) {
        this.table = [];
        for (var key_3 in keys)
            this.table.push(parseHotKey(key_3, keys[key_3]));
    }
    HotKeyTable.prototype.execute = function (obj, e) {
        var e_1, _a;
        try {
            for (var _b = __values(this.table), _c = _b.next(); !_c.done; _c = _b.next()) {
                var key_4 = _c.value;
                if (key_4.match(e)) {
                    obj.commands[key_4.command]();
                    return true;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return false;
    };
    return HotKeyTable;
}());
exports.HotKeyTable = HotKeyTable;
