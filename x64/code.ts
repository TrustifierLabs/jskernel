import * as i from './instruction';
import * as o from './operand';
import * as d from './def';
import {number64} from './operand';
import {UInt64} from './util';


export enum MODE {
    REAL = 16,
    COMPAT,
    LONG,
}


export type TOperand = o.Register|o.Memory|number|number64;


export abstract class Code {
    
    mode: MODE = MODE.LONG;

    protected expr: i.Expression[] = [];

    protected ClassInstruction = i.Instruction;

    protected ins(def: d.Definition, operands: i.Operands): i.Instruction {
        var ins = new this.ClassInstruction(def, operands);
        ins.create();
        ins.index = this.ins.length;
        this.expr.push(ins);
        return ins;
    }

    protected isRegOrMem(operand: any) {
        if((operand instanceof o.Register) || (operand instanceof o.Memory)) return true;
        return false;
    }

    protected toRegOrMem(operand: TOperand): o.Register|o.Memory {
        if(operand instanceof o.Register) return operand;
        if(operand instanceof o.Memory) return operand;
        return this.mem(operand as number|number64);
    }

    protected insZeroOperands(def: d.Definition): i.Instruction {
        return this.ins(def, this.createOperands());
    }

    protected insImmediate(def: d.Definition, num: number|number64, signed = true): i.Instruction {
        var imm = new o.ImmediateValue(num, signed);
        return this.ins(def, this.createOperands(null, null, imm));
    }

    protected insOneOperand(def: d.Definition, dst: TOperand, num: number|number64 = null): i.Instruction {
        var disp = num === null ? null : new o.DisplacementValue(num);
        return this.ins(def, this.createOperands(dst, null, disp));
    }

    protected insTwoOperands(def: d.Definition, dst: TOperand, src: TOperand): i.Instruction {
        var imm: o.ImmediateValue = null;

        // If `src` argument is constant, treat it as disp/imm rather then memory reference,
        // use `.mem()` to create memeory reference.
        if((typeof src === 'number') || (src instanceof Array)) {
            imm = new o.ImmediateValue(src as number|number64);
            src = null;
        }

        return this.ins(def, this.createOperands(dst, src as o.Register|o.Memory, imm));
    }

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

    protected createOperands(dst: TOperand = null, src: TOperand = null, imm: o.Constant = null): i.Operands {
        var xdst: o.Register|o.Memory = null;
        var xsrc: o.Register|o.Memory = null;
        if(dst) {
            xdst = this.toRegOrMem(dst);
            if(!(xdst instanceof o.Register) && !(xdst instanceof o.Memory))
                throw TypeError('Destination operand must be of type Register or Memory.');
        }
        if(src) {
            xsrc = this.toRegOrMem(src);
            if(!(xsrc instanceof o.Register) && !(xsrc instanceof o.Memory))
                throw TypeError('Source operand must be of type Register or Memory.');
        }
        if(imm && !(imm instanceof o.Constant))
            throw TypeError('Immediate operand must be of type Constant.');
        return new i.Operands(xdst, xsrc, imm);
    }

    // Displacement is up to 4 bytes in size, and 8 bytes for some specific MOV instructions, AMD64 Vol.2 p.24:
    //
    // > The size of a displacement is 1, 2, or 4 bytes.
    //
    // > Also, in 64-bit mode, support is provided for some 64-bit displacement
    // > and immediate forms of the MOV instruction. See “Immediate Operand Size” in Volume 1 for more
    // > information on this.
    mem(disp: number|number64): o.Memory {
        if(typeof disp === 'number')
            return (new o.Memory).disp(disp as number);
        else if((disp instanceof Array) && (disp.length == 2))
            return (new o.Memory).disp(disp as number64);
        else
            throw TypeError('Displacement value must be of type number or number64.');
    }

    disp(disp: number|number64): o.Memory {
        return this.mem(disp);
    }

    label(name: string): i.Label {
        if((typeof name !== 'string') || !name)
            throw TypeError('Label name must be a non-empty string.');
        var label = new i.Label(name);

        this.expr.push(label);
        return label;
    }

    db(str: string, encoding?: string): i.Data;
    db(octets: number[]): i.Data;
    db(buf: Buffer): i.Data;
    db(a: string|number[]|Buffer, b?: string): i.Data {
        var octets: number[];

        if(a instanceof Array) {
            octets = a as number[];
        } else if(typeof a === 'string') {
            var encoding = typeof b === 'string' ? b : 'ascii';
            // var buf = Buffer.from(a, encoding);
            var buf = new Buffer(a, encoding);
            octets = Array.prototype.slice.call(buf, 0);
        } else if(a instanceof Buffer) {
            octets = Array.prototype.slice.call(a, 0);
        }
        else
            throw TypeError('Data must be an array of octets, a Buffer or a string.');

        var data = new i.Data;
        data.index = this.expr.length;
        data.octets = octets;
        this.expr.push(data);
        return data;
    }

    dw(words: number[], littleEndian = true): i.Data {
        var size = 4;
        var octets = new Array(words.length * size);
        for(var i = 0; i < words.length; i++) {
            if(littleEndian) {
                octets[i * size + 0] = (words[i] >> 0x00) & 0xFF;
                octets[i * size + 1] = (words[i] >> 0x08) & 0xFF;
            } else {
                octets[i * size + 0] = (words[i] >> 0x08) & 0xFF;
                octets[i * size + 1] = (words[i] >> 0x00) & 0xFF;
            }
        }
        return this.db(octets);
    }

    dd(doubles: number[], littleEndian = true): i.Data {
        var size = 4;
        var octets = new Array(doubles.length * size);
        for(var i = 0; i < doubles.length; i++) {
            if(littleEndian) {
                octets[i * size + 0] = (doubles[i] >> 0x00) & 0xFF;
                octets[i * size + 1] = (doubles[i] >> 0x08) & 0xFF;
                octets[i * size + 2] = (doubles[i] >> 0x10) & 0xFF;
                octets[i * size + 3] = (doubles[i] >> 0x18) & 0xFF;
            } else {
                octets[i * size + 0] = (doubles[i] >> 0x18) & 0xFF;
                octets[i * size + 1] = (doubles[i] >> 0x10) & 0xFF;
                octets[i * size + 2] = (doubles[i] >> 0x08) & 0xFF;
                octets[i * size + 3] = (doubles[i] >> 0x00) & 0xFF;
            }
        }
        return this.db(octets);
    }

    dq(quads: (number|number64)[], littleEndian = true): i.Data {
        if(!(quads instanceof Array))
            throw TypeError('Quads must be and array of number[] or [number, number][].');
        if(!quads.length) return this.dd([]);

        var doubles = new Array(quads.length * 2);

        if(typeof quads[0] === 'number') { // number[]
            var qnumbers = quads as number[];
            for(var i = 0; i < qnumbers.length; i++) {
                var hi = UInt64.hi(qnumbers[i]);
                var lo = UInt64.lo(qnumbers[i]);
                if(littleEndian) {
                    doubles[i * 2 + 0] = lo;
                    doubles[i * 2 + 1] = hi;
                } else {
                    doubles[i * 2 + 0] = hi;
                    doubles[i * 2 + 1] = lo;
                }
            }
        } else if(quads[0] instanceof Array) { // number64[]
            var numbers64 = quads as number64[];
            for(var i = 0; i < numbers64.length; i++) {
                var [lo, hi] = numbers64[i];
                if(littleEndian) {
                    doubles[i * 2 + 0] = lo;
                    doubles[i * 2 + 1] = hi;
                } else {
                    doubles[i * 2 + 0] = hi;
                    doubles[i * 2 + 1] = lo;
                }
            }
        } else
            throw TypeError('Quads must be and array of number[] or [number, number][].');

        return this.dd(doubles);
    }

    resb(length: number): i.DataUninitialized {
        var data = new i.DataUninitialized(length);
        data.index = this.expr.length;
        this.expr.push(data);
        return data;
    }

    resw(length: number): i.DataUninitialized {
        return this.resb(length * 2);
    }

    resd(length: number): i.DataUninitialized {
        return this.resb(length * 4);
    }

    resq(length: number): i.DataUninitialized {
        return this.resb(length * 8);
    }

    rest(length: number): i.DataUninitialized {
        return this.resb(length * 10);
    }

    incbin(filepath: string, offset?: number, len?: number): i.Data {
        var fs = require('fs');

        if(typeof offset === 'undefined') { // incbin(filepath);
            return this.db(fs.readFileSync(filepath));

        } else if(typeof len === 'undefined') { // incbin(filepath, offset);
            if(typeof offset !== 'number')
                throw TypeError('Offset must be a number.');

            var fd = fs.openSync(filepath, 'r');

            var total_len = 0;
            var data: Buffer[] = [];
            const CHUNK = 4096;
            var buf = new Buffer(CHUNK);
            var bytes = fs.readSync(fd, buf, 0, CHUNK, offset);
            data.push(buf.slice(0, bytes));
            total_len += len;

            while((bytes > 0) && (total_len < len)) {
                buf = new Buffer(4096);
                bytes = fs.readSync(fd, buf, 0, CHUNK);
                if(bytes > 0) {
                    data.push(buf.slice(0, bytes));
                    total_len += bytes;
                }
            }

            buf = Buffer.concat(data);
            if(total_len > len) buf = buf.slice(0, len);

            fs.closeSync(fd);
            return this.db(buf);
        } else { // incbin(filepath, offset, len);
            if(typeof offset !== 'number')
                throw TypeError('Offset must be a number.');
            if(typeof len !== 'number')
                throw TypeError('Length must be a number.');

            var buf = new Buffer(len);
            var fd = fs.openSync(filepath, 'r');
            var bytes = fs.readSync(fd, buf, 0, len, offset);
            buf = buf.slice(0, bytes);
            fs.closeSync(fd);
            return this.db(buf);
        }
    }

    compile() {
        var code: number[] = [];
        for(var ins of this.expr) code = ins.write(code);
        return code;
    }

    toString() {
        return this.expr.map((ins) => { return ins.toString(); }).join('\n');
    }
}
