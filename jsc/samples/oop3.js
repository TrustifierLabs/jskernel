"use strict";
var dom = require('../c/dom');
var translator_1 = require('../translator');
var codegen = require('../x64/codegen-basic');
var StaticBuffer = require('../../static-buffer/buffer').StaticBuffer;
var unit = new dom.TranslationUnit();
var main = new dom.FunctionDefinition('main');
unit.add(main);
main.body.push(new dom.ReturnStatement(new dom.PrimaryExpressionConstant(25)));
console.log(unit.toString());
var domToTac = new translator_1.TranslatorDomToTacUnit();
var tac = domToTac.translate(unit);
console.log(tac.toString());
var generator = new codegen.BasicUnitCodegen(tac);
generator.translate();
var bin = generator.mc.compile();
console.log(generator.mc.toString());
var buf = new StaticBuffer(bin.length, 'rwe');
for (var i = 0; i < bin.length; i++)
    buf[i] = bin[i];
var res = buf.call();
console.log(res);
