import * as libjs from '../libjs';


var path = '/share/docs';
console.log(libjs.readdir(path));
console.log(libjs.readdirList(path));
