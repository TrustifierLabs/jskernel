"use strict";
var operand_1 = require('../x86/operand');
var code_1 = require('../x64/code');
var _ = new code_1.Code;
// var ins = _.addq(rsi, 31);
// console.log(ins);
_.movq(operand_1.rsi, operand_1.rax);
_.movq(operand_1.rax, 1);
_.movq(operand_1.rdi, 1);
_.addq(operand_1.rsi, 31);
_.movq(operand_1.rdx, 13);
_.syscall();
_.ret();
_.db('Hello World!\n\0');
// var ins = _.movq(rax.ref(), rax);
// var ins = _.movq(rax, 0x01);
// var ins = _.ret(5);
// console.log(ins);
// _.incq(rax).lock();
// var ins = _.int(0x80);
// _.syscall();
var bin = _.compile();
console.log(_.toString());
