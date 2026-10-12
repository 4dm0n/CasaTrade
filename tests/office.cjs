const {chromium}=require('C:/Users/david/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file:///'+path.resolve(__dirname,'../index.html').replace(/\\/g,'/'));
  await page.waitForFunction(()=>typeof people!=='undefined'&&people.length===8);
  // Deterministic motion tests use elapsed seconds, without waiting for real-time walks.
  console.log(await page.evaluate(()=>{
   const check=(ok,label)=>{if(!ok)throw Error(label);};
   const advance=(seconds,dt=1/60)=>{for(let t=0;t<seconds;t+=dt)people.forEach(p=>p.update(dt));};
   const seatsValid=()=>{
    check(people.every(p=>p.state==='seated'),`Not seated: ${people.map(p=>p.cfg.id+':'+p.state).join(',')}`);
    check(new Set(people.map(p=>p.seat.id)).size===8,'Duplicate seat assignment');
    for(const p of people){
     check(p.group.position.distanceTo(p.seat.position)<.001,'Seat alignment');
     check(Math.abs(Math.atan2(Math.sin(p.group.rotation.y-p.seat.yaw),Math.cos(p.group.rotation.y-p.seat.yaw)))<.05,'Seat facing');
     p.group.updateMatrixWorld(true);
     for(const leg of p.legs){const v=new THREE.Vector3();leg.foot.getWorldPosition(v);check(v.y>.08&&v.y<.21,'Foot not on floor');}
     check(p.headRoot.parent===p.rig,'Head disconnected from rig');
    }
   };
   globalOrder='chill';advance(12);seatsValid();
   check(people.every(p=>p.seat===p.home),'Work seats');
   globalOrder='rest_all';advance(.3);check(people.every(p=>p.state==='standing-up'),'Stand before walk');
   advance(100);seatsValid();check(people.every(p=>p.seat===p.rest),'Lounge seats');
   globalOrder='rest_half';advance(100,1/30);seatsValid();check(people.filter(p=>p.seat===p.rest).length===4,'Half rest');
   globalOrder='chill';advance(100,1/120);seatsValid();
   setCameraView('overview');
   return 'Eight unique seats, facing, grounded feet, standing transitions, lounge, half rest and 30/60/120 fps checks passed';
  }));
  await page.waitForTimeout(300);
  await page.screenshot({path:path.resolve(__dirname,'office-overview.png')});
  await page.evaluate(()=>setCameraView('analyst'));
  await page.waitForTimeout(300);await page.screenshot({path:path.resolve(__dirname,'office-seated.png')});
  console.log(JSON.stringify({errors}));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
