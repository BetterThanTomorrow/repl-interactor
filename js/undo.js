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
 * A reversable operation to a document of type T.
 */
var UndoStep = /** @class */ (function () {
    function UndoStep() {
    }
    /**
     * Given another UndoStep, attempts to modify this undo-step to include the subsequent one.
     * If successful, returns true, if unsuccessful, returns false, and the step must be added to the
     * UndoManager, too.
     */
    UndoStep.prototype.coalesce = function (c) {
        return false;
    };
    return UndoStep;
}());
exports.UndoStep = UndoStep;
var UndoStepGroup = /** @class */ (function (_super) {
    __extends(UndoStepGroup, _super);
    function UndoStepGroup() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.steps = [];
        return _this;
    }
    UndoStepGroup.prototype.addUndoStep = function (step) {
        var prevStep = this.steps.length && this.steps[this.steps.length - 1];
        if (prevStep && !prevStep.undoStop && prevStep.coalesce(step))
            return;
        this.steps.push(step);
    };
    UndoStepGroup.prototype.undo = function (c) {
        for (var i = this.steps.length - 1; i >= 0; i--)
            this.steps[i].undo(c);
    };
    UndoStepGroup.prototype.redo = function (c) {
        for (var i = 0; i < this.steps.length; i++)
            this.steps[i].redo(c);
    };
    return UndoStepGroup;
}(UndoStep));
exports.UndoStepGroup = UndoStepGroup;
/**
 * Handles the undo/redo stacks.
 */
var UndoManager = /** @class */ (function () {
    function UndoManager() {
        this.undos = [];
        this.redos = [];
    }
    /**
     * Adds the step to the undo stack, and clears the redo stack.
     * If possible, coalesces it into the previous undo.
     *
     * @param step the UndoStep to add.
     */
    UndoManager.prototype.addUndoStep = function (step) {
        if (this.groupedUndo) {
            this.groupedUndo.addUndoStep(step);
        }
        else if (this.undos.length) {
            var prevUndo = this.undos[this.undos.length - 1];
            if (prevUndo.undoStop) {
                this.undos.push(step);
            }
            else if (!prevUndo.coalesce(step)) {
                this.undos.push(step);
            }
        }
        else {
            this.undos.push(step);
        }
        this.redos = [];
    };
    UndoManager.prototype.withUndo = function (f) {
        if (!this.groupedUndo) {
            try {
                this.groupedUndo = new UndoStepGroup();
                f();
                var undo = this.groupedUndo;
                this.groupedUndo = null;
                switch (undo.steps.length) {
                    case 0: break;
                    case 1:
                        this.addUndoStep(undo.steps[0]);
                        break;
                    default:
                        this.addUndoStep(undo);
                }
            }
            finally {
                this.groupedUndo = null;
            }
        }
        else {
            f();
        }
    };
    /** Prevents this undo from becoming coalesced with future undos */
    UndoManager.prototype.insertUndoStop = function () {
        if (this.undos.length)
            this.undos[this.undos.length - 1].undoStop = true;
    };
    /** Performs the top undo operation on the document (if it exists), moving it to the redo stack. */
    UndoManager.prototype.undo = function (c) {
        if (this.undos.length) {
            var step = this.undos.pop();
            step.undo(c);
            this.redos.push(step);
        }
    };
    /** Performs the top redo operation on the document (if it exists), moving it back onto the undo stack. */
    UndoManager.prototype.redo = function (c) {
        if (this.redos.length) {
            var step = this.redos.pop();
            step.redo(c);
            this.undos.push(step);
        }
    };
    return UndoManager;
}());
exports.UndoManager = UndoManager;
