import * as libjs from '../libjs';

console.log(`process.pid: ${process.pid}`);
console.log(`process.getuid(): ${process.getuid()}`);
console.log(`process.getgid(): ${process.getgid()}`);


console.log(`libjs.getpid(): ${libjs.getpid()}`);
console.log(`libjs.getppid(): ${libjs.getppid()}`);
console.log(`libjs.getuid(): ${libjs.getuid()}`);
console.log(`libjs.geteuid(): ${libjs.geteuid()}`);
console.log(`libjs.getgid(): ${libjs.getgid()}`);
console.log(`libjs.getegid(): ${libjs.getegid()}`);
