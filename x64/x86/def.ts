import * as t from './table';
import * as o from './operand';
import {extend} from '../util';


export class Def {
    opcode: number;
    opreg: number;
    mnemonic: string;
    operands: any[];
    operandSize: number;
    lock: boolean;
    regInOp: boolean;
    opcodeDirectionBit: boolean;

    constructor(def: t.Definition) {
        this.opcode             = def.o;
        this.opreg              = def.or;
        this.mnemonic           = def.mn;
        this.operandSize        = def.s;
        this.lock               = def.lock;
        this.regInOp            = def.r;
        this.opcodeDirectionBit = def.dbit;

        this.operands = [];
        if(def.ops && def.ops.length) {
            for(var operand of def.ops) {
                if(!(operand instanceof Array)) operand = [operand];
                this.operands.push(operand);
            }
        }
    }

    protected validateOperandDefinitions(definitions: any[], target: o.Operand) {
        for(var def of definitions) {
            if(typeof def === 'object') { // Object: rax, rbx, r8, etc...
                if(def === target) return true;
            } else if(typeof def === 'function') { // Class: o.Register, o.Memory, etc...
                if(target instanceof def) return true;
            }
        }
        return false;
    }

    validateOperands(operands: o.Operands) {
        if(this.operands.length !== operands.list.length)
            return false;

        for(var i = 0; i < operands.list.length; i++) {
            var is_valid = this.validateOperandDefinitions(this.operands[i], operands.list[i]);
            if(!is_valid) return false;
        }
        return true;
    }
}


export class DefGroup {

    name: string = '';

    defs: Def[] = [];

    constructor(name: string, defs: t.Definition[], defaults: t.Definition) {
        this.name = name;
        var [group_defaults, ...definitions] = defs;

        // If only one object provided, we treat it as instruction definition rather then
        // as group defaults.
        if(!definitions.length) definitions = [group_defaults];

        // Mnemonic.
        if(!group_defaults.mn) group_defaults.mn = name;

        for(var definition of definitions)
            this.defs.push(new Def(extend<any>({}, defaults, group_defaults, definition)));
    }

    find(operands: o.Operands): Def {
        for(var def of this.defs) {
            if(def.validateOperands(operands)) return def;
        }
        return null;
    }
}


export class DefTable {

    groups: {[s: string]: DefGroup;}|any = {};
    
    constructor(table: t.TableDefinition, defaults: t.Definition) {
        for(var name in table) {
            var group = new DefGroup(name, table[name], defaults);
            this.groups[name] = group;
        }
    }

    find(name: string, operands: o.Operands): Def {
        var group: DefGroup = this.groups[name] as DefGroup;
        return group.find(operands);
    }
}
