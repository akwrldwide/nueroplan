const tzOffset = (new Date()).getTimezoneOffset() * 60000;
let currentDateWalker = new Date(Date.now() - tzOffset);
console.log("Local YYYY-MM-DD:", currentDateWalker.toISOString().split('T')[0]);

let cd2 = new Date();
cd2.setHours(0,0,0,0);
console.log("Faulty ISO string:", cd2.toISOString().split('T')[0]);
