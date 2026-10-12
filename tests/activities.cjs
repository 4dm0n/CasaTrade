const {chromium}=require('C:/Users/david/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/fonts.googleapis.com/**',r=>r.abort());
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.goto('file:///'+path.resolve(__dirname,'../index.html').replace(/\\/g,'/'));
 await page.waitForFunction(()=>typeof people!=='undefined'&&people.length===8);
 console.log(await page.evaluate(()=>{
  const check=(v,m)=>{if(!v)throw Error(m);};
  setGlobalOrder('rest_all');assignActivities();
  check(officeLife.players.length===2,'Rest must assign a pair');
  check(people.some(p=>p.activity?.kind==='eat'),'Rest must assign someone to eat');
  for(let t=0;t<100;t+=.05){officeLife.time+=.05;people.forEach(p=>p.update(.05));}
  const eater=people.find(p=>p.activity?.kind==='eat'&&p.isSitting);
  check(eater,'Eater must reach a seat');eater.mealClock=1.9;eater.update(.01);
  scene.updateMatrixWorld(true);
  const food=eater.snack.getWorldPosition(new THREE.Vector3());
  const mouth=eater.rig.localToWorld(new THREE.Vector3(0,1.4,.65));
  check(food.distanceTo(mouth)<.015,'Food must reach the mouth, error '+food.distanceTo(mouth));
  const biteError=food.distanceTo(mouth);
  setCameraView('meal');renderer.render(scene,camera);
  return {biteError,eaters:people.filter(p=>p.activity?.kind==='eat').length};
 }));
 await page.screenshot({path:path.resolve(__dirname,'activity-meal.png')});
 console.log(await page.evaluate(()=>{
  const check=(v,m)=>{if(!v)throw Error(m);};
  check(officeLife.players.every(p=>p.state==='visiting'),'Both players must arrive');
  updateLeisureActivities(0);
  let maxContactError=0,minNetClearance=Infinity;
  for(let side=0;side<2;side++){
   leisure.turn=side;beginRallyFlight();const f=leisure.flight;
   for(const [time,index,anchor] of [[0,f.from,f.start],[f.duration,f.to,f.end]]){
    leisure.time=time;officeLife.players.forEach(updatePingPose);scene.updateMatrixWorld(true);
    const paddle=officeLife.players[index].paddle.getWorldPosition(new THREE.Vector3());
    const err=paddle.distanceTo(anchor);maxContactError=Math.max(maxContactError,err);
    check(err<.02,'Paddle must meet ball at contact: '+err);
   }
   const bounce=sampleRally(f,f.first);check(Math.abs(bounce.y-1.685)<1e-6,'Bounce must touch tabletop');
   check(Math.abs(bounce.x-1)<2&&bounce.z>9&&bounce.z<15,'Bounce within tabletop');
   const netTime=(12-f.start.z)/(f.bounce.z-f.start.z)*f.first;
   const clearance=sampleRally(f,netTime).y-.095-1.99;minNetClearance=Math.min(minNetClearance,clearance);
   check(clearance>0,'Ball must clear the net');
  }
  leisure.turn=0;beginRallyFlight();leisure.time=.43;updateLeisureActivities(0);
  const contacts=leisure.contacts,bounces=leisure.bounces;
  for(let t=0;t<4;t+=.025)updateLeisureActivities(.025);
  check(leisure.contacts-contacts>=4&&leisure.bounces-bounces>=4,'Continuous rally must alternate contacts and bounces');
  leisure.time=.45;updateLeisureActivities(0);setCameraView('ping');renderer.render(scene,camera);
  return {maxContactError,minNetClearance,contacts:leisure.contacts,bounces:leisure.bounces};
 }));
 await page.screenshot({path:path.resolve(__dirname,'activity-ping.png')});
 assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
