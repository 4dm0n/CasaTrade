// Arm targets and ball contacts use one rig-space coordinate system.
const leisure={flight:null,time:0,turn:0,contacts:0,bounces:0,clock:0};
const downAxis=new THREE.Vector3(0,-1,0),frontAxis=new THREE.Vector3(0,0,1);
const easeActivity=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
function solveActivityArm(person,index,target,lowerLength=.72){
    const arm=person.arms[index],shoulder=arm.root.position;
    const direction=target.clone().sub(shoulder),upper=.63;
    const distance=THREE.MathUtils.clamp(direction.length(),Math.abs(upper-lowerLength)+.01,upper+lowerLength-.002);
    direction.normalize();
    const along=(upper*upper-lowerLength*lowerLength+distance*distance)/(2*distance);
    const height=Math.sqrt(Math.max(0,upper*upper-along*along));
    const bend=new THREE.Vector3(index===0?-1:1,-.12,.25);
    bend.addScaledVector(direction,-bend.dot(direction)).normalize();
    const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,height);
    const endpoint=shoulder.clone().addScaledVector(direction,distance);
    arm.root.quaternion.setFromUnitVectors(downAxis,elbow.clone().sub(shoulder).normalize());
    const lowerRotation=new THREE.Quaternion().setFromUnitVectors(downAxis,endpoint.sub(elbow).normalize());
    arm.elbow.quaternion.copy(arm.root.quaternion).invert().multiply(lowerRotation);
}
function orientHeldProp(person,prop,worldRotation){
    person.group.updateMatrixWorld(true);
    const parentRotation=prop.parent.getWorldQuaternion(new THREE.Quaternion());
    prop.quaternion.copy(parentRotation.invert().multiply(worldRotation));
}
function buildMeal(person){
    // Replace the tiny placeholder with a layered sandwich and a visible lap tray.
    person.snack.geometry.dispose();person.snack.material.dispose();person.snack.parent.remove(person.snack);
    const bread=new THREE.MeshStandardMaterial({color:new THREE.Color('#d4a55d').convertSRGBToLinear(),roughness:.85});
    const filling=new THREE.MeshStandardMaterial({color:new THREE.Color('#6d9545').convertSRGBToLinear(),roughness:.9});
    const cheese=new THREE.MeshStandardMaterial({color:new THREE.Color('#edca55').convertSRGBToLinear(),roughness:.7});
    person.snack=new THREE.Group();person.snack.position.set(0,-.72,0);person.arms[0].elbow.add(person.snack);
    officeBox(person.snack,.5,.105,.4,0,.065,0,bread,.045);
    officeBox(person.snack,.5,.10,.4,0,-.065,0,bread,.035);
    officeBox(person.snack,.53,.035,.42,0,0,0,filling,.012);
    officeBox(person.snack,.49,.024,.43,0,.024,0,cheese,.008);
    for(let i=0;i<7;i++){
        const seed=new THREE.Mesh(new THREE.SphereGeometry(.013,5,4),cheese);seed.scale.set(1,.4,2);
        seed.position.set((i%3-1)*.13,.12,(Math.floor(i/3)-1)*.11);person.snack.add(seed);
    }
    person.mealTray=new THREE.Group();person.mealTray.position.set(0,.28,.66);person.rig.add(person.mealTray);
    officeBox(person.mealTray,1.08,.05,.8,0,0,0,officePalette.white,.035);
    officeBox(person.mealTray,.32,.008,.38,.30,.032,.03,officePalette.white,.002);
    person.mealClock=0;person.mealBuilt=true;
}
function updateEatingPose(person,dt){
    if(!person.mealBuilt)buildMeal(person);
    const eating=person.activity?.kind==='eat'&&person.isSitting;
    person.snack.visible=eating;person.mealTray.visible=eating;
    if(!eating){person.mealClock=person.index*.61;return;}
    person.mealClock+=dt;const phase=person.mealClock%5.4;
    const lift=phase<.8?0:phase<1.7?easeActivity((phase-.8)/.9):phase<2.45?1:phase<3.35?1-easeActivity((phase-2.45)/.9):0;
    // A point just in front of the mouth; the rear edge of the sandwich meets it.
    const target=new THREE.Vector3(-.16,.48,.67).lerp(new THREE.Vector3(0,1.40,.65),lift);
    solveActivityArm(person,0,target);
    solveActivityArm(person,1,new THREE.Vector3(.34,.27,.64),.65);
    person.group.updateMatrixWorld(true);
    orientHeldProp(person,person.snack,person.group.getWorldQuaternion(new THREE.Quaternion()));
    person.snack.scale.setScalar(1-(Math.floor(person.mealClock/5.4)%3)*.07);
    person.headRoot.rotation.x=phase>3.35?Math.sin(phase*12)*.015:0;
    person.headRoot.rotation.y=0;
    person.statusText=lift>.9?'Comiendo · dando un bocado':phase>3.35?'Comiendo · masticando':'Comiendo · acercando el refrigerio';
}

function pingContact(person){
    person.group.updateMatrixWorld(true);
    // Table face is outside the player; a fixed anchor prevents moving-target ball drift.
    return person.rig.localToWorld(new THREE.Vector3(.35,.15,.85));
}
function updatePingPose(person){
    if(!person.paddle.visible)return;
    person.paddle.scale.setScalar(1.18);
    let target=new THREE.Vector3(.59,.28,.48);
    const index=officeLife.players.indexOf(person),f=leisure.flight;
    if(f){
        const progress=leisure.time/f.duration;
        if(index===f.from){
            // Contact -> follow-through -> ready stance.
            if(progress<.18)target=new THREE.Vector3(.35,.15,.85).lerp(new THREE.Vector3(.22,.27,1.0),easeActivity(progress/.18));
            else target=new THREE.Vector3(.22,.27,1.0).lerp(target,easeActivity((progress-.18)/.25));
        } else {
            const prepared=new THREE.Vector3(.74,.30,.35);
            target.copy(prepared).lerp(new THREE.Vector3(.35,.15,.85),easeActivity((progress-.58)/.42));
        }
        person.headRoot.rotation.y=Math.sin(progress*Math.PI)*.06*(index===0?1:-1);
    }
    solveActivityArm(person,1,target,.75);
    // Keep the paddle face vertical and aimed along the table, independently of the elbow.
    orientHeldProp(person,person.paddle,person.group.getWorldQuaternion(new THREE.Quaternion()));
    person.arms[0].root.rotation.set(-.45,0,.15);person.arms[0].elbow.rotation.set(-1.2,0,0);
}
function resetRally(){leisure.flight=null;leisure.time=0;leisure.turn=0;}
function beginRallyFlight(){
    const from=leisure.turn%2,to=1-from;
    const start=pingContact(officeLife.players[from]),end=pingContact(officeLife.players[to]);
    const bounce=start.clone().lerp(end,.72);bounce.y=1.685;
    leisure.flight={from,to,start,end,bounce,first:.65,second:.35,duration:1,bounced:false};
    leisure.time=0;
}
function sampleRally(f,time){
    const first=time<=f.first,a=first?f.start:f.bounce,b=first?f.bounce:f.end;
    const duration=first?f.first:f.second,t=THREE.MathUtils.clamp(first?time:time-f.first,0,duration);
    const result=a.clone().lerp(b,t/duration),gravity=6;
    const vertical=(b.y-a.y+.5*gravity*duration*duration)/duration;
    result.y=a.y+vertical*t-.5*gravity*t*t;
    return result;
}
function updateLeisureActivities(dt){
    const playing=officeLife.players.length===2&&officeLife.players.every(p=>p.state==='visiting'&&p.group.visible&&p.activity?.kind==='ping');
    officeLife.ball.visible=playing;
    if(!playing){resetRally();return;}
    if(!leisure.flight)beginRallyFlight();
    // Turbo does not change ball physics relative to the stroke animation.
    leisure.time+=dt;
    if(leisure.time>=leisure.flight.first&&!leisure.flight.bounced){leisure.flight.bounced=true;leisure.bounces++;}
    if(leisure.time>=leisure.flight.duration){
        leisure.contacts++;leisure.turn++;beginRallyFlight();
    }
    officeLife.rally=leisure.turn+leisure.time;
    officeLife.ball.position.copy(sampleRally(leisure.flight,leisure.time));
    // Apply both paddles for this same simulation instant, before rendering the ball.
    officeLife.players.forEach(updatePingPose);
}

const previousActivityMount=mountWorkspace;
mountWorkspace=function(){
    previousActivityMount();
    const controls=document.getElementById('cameras');
    for(const [view,label] of [['ping','Ping pong'],['meal','Refrigerio']]){
        const button=document.createElement('button');button.className='activity-camera';button.textContent=label;button.onclick=()=>setCameraView(view);controls.append(button);
    }
};
const previousActivityCamera=setCameraView;
setCameraView=function(view){
    previousActivityCamera(view);
    if(view==='ping'){followedAgent=null;cameraTarget.set(1,1.7,12);cameraSpherical={radius:15,theta:1,phi:Math.PI/3};feedback('Vista de ping pong. Se juega durante el descanso.');}
    if(view==='meal'){
        followedAgent=null;const person=people.find(p=>p.activity?.kind==='eat'&&p.group.visible);
        const pos=person?.rest.position || new THREE.Vector3(16,0,7);
        cameraTarget.copy(pos).add(new THREE.Vector3(0,1.7,0));cameraSpherical={radius:7,theta:person?.rest.yaw || 0,phi:Math.PI/2.7};
        feedback('Vista de refrigerio. Algunos integrantes comen durante el descanso.');
    }
    updateCameraPosition();
};

function makeSurfaceTexture(kind){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#989898';ctx.fillRect(0,0,256,256);
    for(let i=0;i<5000;i++){
        const n=(i*73)%256,m=(i*137+Math.floor(i/256)*19)%256;
        ctx.fillStyle=i%2?'#aaaaaa':'#888888';ctx.fillRect(n,m,kind==='metal'?16:1,1);
    }
    const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.repeat.set(kind==='fabric'?5:2,kind==='fabric'?5:2);texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return texture;
}
const previousActivityBuild=buildPeople;
buildPeople=function(){
    previousActivityBuild();
    const fabric=makeSurfaceTexture('fabric'),metal=makeSurfaceTexture('metal');
    officePalette.cushion.bumpMap=fabric;officePalette.cushion.bumpScale=.018;
    officePalette.edge.bumpMap=metal;officePalette.edge.bumpScale=.008;officePalette.edge.roughness=.32;
    officePalette.shell.roughness=.42;officePalette.shell.metalness=.18;
    const handled=new Set();
    people.forEach(p=>p.group.traverse(o=>{
        const m=o.material;if(!m?.isMeshStandardMaterial||handled.has(m)||Object.values(officePalette).includes(m))return;
        handled.add(m);if(m.roughness>=.8){m.bumpMap=fabric;m.bumpScale=.008;m.roughness=.8;m.needsUpdate=true;}
    }));
    scene.traverse(o=>{if(o.type==='GridHelper'){o.material.transparent=true;o.material.opacity=.17;o.material.depthWrite=false;}});
    // Soft daylight plus warm luminaires: retain contrast instead of washing out surfaces.
    renderer.toneMappingExposure=1.03;
    const hemi=scene.children.find(o=>o.isHemisphereLight);if(hemi){hemi.color.set(0xc7def0);hemi.intensity=.95;}
    scene.children.filter(o=>o.isPointLight).forEach(light=>{light.color.set(0xffe7c6);light.intensity=.85;});
    const sun=scene.children.find(o=>o.isDirectionalLight&&o.castShadow);if(sun){sun.shadow.radius=3;sun.shadow.normalBias=.025;}
    // Court surround and lounge carpet give feet and furniture a readable ground plane.
    const court=new THREE.Mesh(new THREE.PlaneGeometry(8,13),new THREE.MeshStandardMaterial({color:new THREE.Color('#263d48').convertSRGBToLinear(),roughness:.92,bumpMap:fabric,bumpScale:.005}));
    court.rotation.x=-Math.PI/2;court.position.set(1,.009,12);court.receiveShadow=true;scene.add(court);
    const rug=new THREE.Mesh(new THREE.PlaneGeometry(14,11),new THREE.MeshStandardMaterial({color:new THREE.Color('#243642').convertSRGBToLinear(),roughness:1,bumpMap:fabric,bumpScale:.018}));
    rug.rotation.x=-Math.PI/2;rug.position.set(16,.012,11);rug.receiveShadow=true;scene.add(rug);
    for(const material of [officePalette.cushion,officePalette.edge,officePalette.shell])material.needsUpdate=true;
};
