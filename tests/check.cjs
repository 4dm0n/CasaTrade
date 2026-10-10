const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');
const path=require('path');
const root=path.resolve(__dirname,'..');
for(const name of ['workspace.js','analysis-engine.js']) new vm.Script(fs.readFileSync(path.join(root,name),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
const engine=require('../analysis-engine.js');
assert.equal(engine.analyze(Array(29).fill(9),'OVER',6,75).eligible,false);
assert.equal(engine.analyze(Array(30).fill(9),'OVER',6,75).eligible,true);
assert.equal(engine.analyze([0,1,2,3,4,5,6,7,8,9],'OVER',6,75).frequency,30);
for(let digit=0;digit<10;digit++) for(let target=1;target<9;target++) for(const type of ['OVER','UNDER']) {
 const r=engine.settle(digit,type,target,10,3);
 assert.equal(r.won,type==='OVER'?digit>target:digit<target);
 assert.equal(r.profit,r.won?20:-10);
}
console.log('Syntax and 160 deterministic settlement cases passed.');
