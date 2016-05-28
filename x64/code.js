"use strict";
var i = require('./instruction');
var o = require('./operand');
var util_1 = require('./util');
(function (MODE) {
    MODE[MODE["REAL"] = 16] = "REAL";
    MODE[MODE["COMPAT"] = 17] = "COMPAT";
    MODE[MODE["LONG"] = 18] = "LONG";
})(exports.MODE || (exports.MODE = {}));
var MODE = exports.MODE;
var Code = (function () {
    function Code() {
        this.mode = MODE.LONG;
        this.expr = [];
        this.ClassInstruction = i.Instruction;
    }
    Code.prototype.ins = function (def, operands) {
        var ins = new this.ClassInstruction(def, operands);
        ins.create();
        ins.index = this.ins.length;
        this.expr.push(ins);
        return ins;
    };
    Code.prototype.isRegOrMem = function (operand) {
        if ((operand instanceof o.Register) || (operand instanceof o.Memory))
            return true;
        return false;
    };
    Code.prototype.toRegOrMem = function (operand) {
        if (operand instanceof o.Register)
            return operand;
        if (operand instanceof o.Memory)
            return operand;
        return this.mem(operand);
    };
    Code.prototype.insZeroOperands = function (def) {
        return this.ins(def, this.createOperands());
    };
    Code.prototype.insImmediate = function (def, num, signed) {
        if (signed === void 0) { signed = true; }
        var imm = new o.ImmediateValue(num, signed);
        return this.ins(def, this.createOperands(null, null, imm));
    };
    Code.prototype.insOneOperand = function (def, dst, num) {
        if (num === void 0) { num = null; }
        var disp = num === null ? null : new o.DisplacementValue(num);
        return this.ins(def, this.createOperands(dst, null, disp));
    };
    Code.prototype.insTwoOperands = function (def, dst, src) {
        var imm = null;
        // If `src` argument is constant, treat it as disp/imm rather then memory reference,
        // use `.mem()` to create memeory reference.
        if ((typeof src === 'number') || (src instanceof Array)) {
            imm = new o.ImmediateValue(src);
            src = null;
        }
        return this.ins(def, this.createOperands(dst, src, imm));
    };
    // protected createOperand(operand: TOperand): o.Operand {
    //     if(operand instanceof o.Operand) return operand;
    //     if(typeof operand === 'number') {
    //         var imm = new o.Constant(operand as number);
    //         if(imm.size < o.SIZE.DOUBLE) imm.zeroExtend(o.SIZE.DOUBLE);
    //         return imm;
    //     }
    //     if(operand instanceof Array) return new o.Constant(operand as o.number64);
    //     throw TypeError(`Not a valid TOperand type: ${operand}`);
    // }
    Code.prototype.createOperands = function (dst, src, imm) {
        if (dst === void 0) { dst = null; }
        if (src === void 0) { src = null; }
        if (imm === void 0) { imm = null; }
        var xdst = null;
        var xsrc = null;
        if (dst) {
            xdst = this.toRegOrMem(dst);
            if (!(xdst instanceof o.Register) && !(xdst instanceof o.Memory))
                throw TypeError('Destination operand must be of type Register or Memory.');
        }
        if (src) {
            xsrc = this.toRegOrMem(src);
            if (!(xsrc instanceof o.Register) && !(xsrc instanceof o.Memory))
                throw TypeError('Source operand must be of type Register or Memory.');
        }
        if (imm && !(imm instanceof o.Constant))
            throw TypeError('Immediate operand must be of type Constant.');
        return new i.Operands(xdst, xsrc, imm);
    };
    // Displacement is up to 4 bytes in size, and 8 bytes for some specific MOV instructions, AMD64 Vol.2 p.24:
    //
    // > The size of a displacement is 1, 2, or 4 bytes.
    //
    // > Also, in 64-bit mode, support is provided for some 64-bit displacement
    // > and immediate forms of the MOV instruction. See “Immediate Operand Size” in Volume 1 for more
    // > information on this.
    Code.prototype.mem = function (disp) {
        if (typeof disp === 'number')
            return (new o.Memory).disp(disp);
        else if ((disp instanceof Array) && (disp.length == 2))
            return (new o.Memory).disp(disp);
        else
            throw TypeError('Displacement value must be of type number or number64.');
    };
    Code.prototype.disp = function (disp) {
        return this.mem(disp);
    };
    Code.prototype.label = function (name) {
        if ((typeof name !== 'string') || !name)
            throw TypeError('Label name must be a non-empty string.');
        var label = new i.Label(name);
        this.expr.push(label);
        return label;
    };
    Code.prototype.db = function (a, b) {
        var octets;
        if (a instanceof Array) {
            octets = a;
        }
        else if (typeof a === 'string') {
            var encoding = typeof b === 'string' ? b : 'ascii';
            // var buf = Buffer.from(a, encoding);
            var buf = new Buffer(a, encoding);
            octets = Array.prototype.slice.call(buf, 0);
        }
        else if (a instanceof Buffer) {
            octets = Array.prototype.slice.call(a, 0);
        }
        else
            throw TypeError('Data must be an array of octets, a Buffer or a string.');
        var data = new i.Data;
        data.index = this.expr.length;
        data.octets = octets;
        this.expr.push(data);
        return data;
    };
    Code.prototype.dw = function (words, littleEndian) {
        if (littleEndian === void 0) { littleEndian = true; }
        var size = 4;
        var octets = new Array(words.length * size);
        for (var i = 0; i < words.length; i++) {
            if (littleEndian) {
                octets[i * size + 0] = (words[i] >> 0x00) & 0xFF;
                octets[i * size + 1] = (words[i] >> 0x08) & 0xFF;
            }
            else {
                octets[i * size + 0] = (words[i] >> 0x08) & 0xFF;
                octets[i * size + 1] = (words[i] >> 0x00) & 0xFF;
            }
        }
        return this.db(octets);
    };
    Code.prototype.dd = function (doubles, littleEndian) {
        if (littleEndian === void 0) { littleEndian = true; }
        var size = 4;
        var octets = new Array(doubles.length * size);
        for (var i = 0; i < doubles.length; i++) {
            if (littleEndian) {
                octets[i * size + 0] = (doubles[i] >> 0x00) & 0xFF;
                octets[i * size + 1] = (doubles[i] >> 0x08) & 0xFF;
                octets[i * size + 2] = (doubles[i] >> 0x10) & 0xFF;
                octets[i * size + 3] = (doubles[i] >> 0x18) & 0xFF;
            }
            else {
                octets[i * size + 0] = (doubles[i] >> 0x18) & 0xFF;
                octets[i * size + 1] = (doubles[i] >> 0x10) & 0xFF;
                octets[i * size + 2] = (doubles[i] >> 0x08) & 0xFF;
                octets[i * size + 3] = (doubles[i] >> 0x00) & 0xFF;
            }
        }
        return this.db(octets);
    };
    Code.prototype.dq = function (quads, littleEndian) {
        if (littleEndian === void 0) { littleEndian = true; }
        if (!(quads instanceof Array))
            throw TypeError('Quads must be and array of number[] or [number, number][].');
        if (!quads.length)
            return this.dd([]);
        var doubles = new Array(quads.length * 2);
        if (typeof quads[0] === 'number') {
            var qnumbers = quads;
            for (var i = 0; i < qnumbers.length; i++) {
                var hi = util_1.UInt64.hi(qnumbers[i]);
                var lo = util_1.UInt64.lo(qnumbers[i]);
                if (littleEndian) {
                    doubles[i * 2 + 0] = lo;
                    doubles[i * 2 + 1] = hi;
                }
                else {
                    doubles[i * 2 + 0] = hi;
                    doubles[i * 2 + 1] = lo;
                }
            }
        }
        else if (quads[0] instanceof Array) {
            var numbers64 = quads;
            for (var i = 0; i < numbers64.length; i++) {
                var _a = numbers64[i], lo = _a[0], hi = _a[1];
                if (littleEndian) {
                    doubles[i * 2 + 0] = lo;
                    doubles[i * 2 + 1] = hi;
                }
                else {
                    doubles[i * 2 + 0] = hi;
                    doubles[i * 2 + 1] = lo;
                }
            }
        }
        else
            throw TypeError('Quads must be and array of number[] or [number, number][].');
        return this.dd(doubles);
    };
    Code.prototype.resb = function (length) {
        var data = new i.DataUninitialized(length);
        data.index = this.expr.length;
        this.expr.push(data);
        return data;
    };
    Code.prototype.resw = function (length) {
        return this.resb(length * 2);
    };
    Code.prototype.resd = function (length) {
        return this.resb(length * 4);
    };
    Code.prototype.resq = function (length) {
        return this.resb(length * 8);
    };
    Code.prototype.rest = function (length) {
        return this.resb(length * 10);
    };
    Code.prototype.incbin = function (filepath, offset, len) {
        var fs = require('fs');
        if (typeof offset === 'undefined') {
            return this.db(fs.readFileSync(filepath));
        }
        else if (typeof len === 'undefined') {
            if (typeof offset !== 'number')
                throw TypeError('Offset must be a number.');
            var fd = fs.openSync(filepath, 'r');
            var total_len = 0;
            var data = [];
            var CHUNK = 4096;
            var buf = new Buffer(CHUNK);
            var bytes = fs.readSync(fd, buf, 0, CHUNK, offset);
            data.push(buf.slice(0, bytes));
            total_len += len;
            while ((bytes > 0) && (total_len < len)) {
                buf = new Buffer(4096);
                bytes = fs.readSync(fd, buf, 0, CHUNK);
                if (bytes > 0) {
                    data.push(buf.slice(0, bytes));
                    total_len += bytes;
                }
            }
            buf = Buffer.concat(data);
            if (total_len > len)
                buf = buf.slice(0, len);
            fs.closeSync(fd);
            return this.db(buf);
        }
        else {
            if (typeof offset !== 'number')
                throw TypeError('Offset must be a number.');
            if (typeof len !== 'number')
                throw TypeError('Length must be a number.');
            var buf = new Buffer(len);
            var fd = fs.openSync(filepath, 'r');
            var bytes = fs.readSync(fd, buf, 0, len, offset);
            buf = buf.slice(0, bytes);
            fs.closeSync(fd);
            return this.db(buf);
        }
    };
    Code.prototype.compile = function () {
        var code = [];
        for (var _i = 0, _a = this.expr; _i < _a.length; _i++) {
            var ins = _a[_i];
            code = ins.write(code);
        }
        return code;
    };
    Code.prototype.toString = function () {
        return this.expr.map(function (ins) { return ins.toString(); }).join('\n');
    };
    return Code;
}());
exports.Code = Code;
