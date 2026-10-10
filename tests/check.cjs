const fs=require('fs');
const vm=require('vm');
const assert=require('node:assert/strict');
const path=require('path');
const root=path.resolve(__dirname,'..');
for(const name of ['workspace.js','analysis-engine.js','market-feed.js','office-scene.js']) new vm.Script(fs.readFileSync(path.join(root,name),'utf8'));
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
assert.equal(engine.nextStake(10,2,0),10);
assert.equal(engine.nextStake(10,2,3),80);
assert.equal(engine.nextStake(10,10,2),1000);
assert.equal(engine.nextStake(10,1,100),10);
assert.ok(Number.isNaN(engine.nextStake(10,11,1)));
assert.ok(Number.isNaN(engine.nextStake(-1,2,1)));
const now=Date.now();
const markets=[
 {symbol:'R_10',digits:Array(100).fill(9),types:['OVER','UNDER'],lastTickAt:now,source:'live'},
 {symbol:'1HZ100V',digits:Array(100).fill(0),types:['UNDER'],lastTickAt:now,source:'live'},
 {symbol:'STALE',digits:Array(100).fill(9),types:['OVER'],lastTickAt:now-6000,source:'live'},
 {symbol:'SHORT',digits:Array(99).fill(9),types:['OVER'],lastTickAt:now,source:'live'},
 {symbol:'DEMO',digits:Array(100).fill(9),types:['OVER'],lastTickAt:now,source:'demo'}
];
const ranked=engine.rankMarkets(markets,75,now);
assert.ok(ranked.length>0);
assert.ok(ranked.every(c=>['R_10','1HZ100V'].includes(c.symbol)&&c.frequency>=75));
assert.ok(ranked.every(c=>c.symbol!=='1HZ100V'||c.contract==='UNDER'));
assert.equal(ranked[0].score,90);
assert.deepEqual(engine.rankMarkets(markets,101,now),[]);
console.log('Syntax, 160 settlements, martingale and multi-market ranking passed.');
