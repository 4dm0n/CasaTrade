// Shared procedural office geometry, character motion and scene behavior.
const officeSeats = new Map();
const officeObstacles = [];
const officeScreens = [];
const officeDeskScreenMeshes = [];
const officePingPongSeats = [];
const officeLevelGroups = {1:null,2:null};
const officeLeisure = {table:null,ball:null,paddles:[],time:0};
const OFFICE_FLOOR_HEIGHT = 8;
let officeBuildGroup = null;
let officeCurrentLevel = 1;
const officePalette = {
    shell: new THREE.MeshStandardMaterial({color:0x162b3b,roughness:.62,metalness:.35}),
    edge: new THREE.MeshStandardMaterial({color:0x40596b,roughness:.32,metalness:.7}),
    cushion: new THREE.MeshStandardMaterial({color:0x21384a,roughness:.92}),
    dark: new THREE.MeshStandardMaterial({color:0x080f1c,roughness:.6}),
    cyan: new THREE.MeshStandardMaterial({color:0x49cbd3,emissive:0x2697a6,emissiveIntensity:1.3}),
    white: new THREE.MeshStandardMaterial({color:0xc4d9e2,roughness:.65}),
    leaf: new THREE.MeshStandardMaterial({color:0x238772,roughness:.85})
};
function officeBox(parent,w,h,d,x,y,z,material=officePalette.shell,round=.06) {
    if(parent===scene&&officeBuildGroup)parent=officeBuildGroup;
    const r=Math.min(round,w/3,h/3,d/3);
    const shape=new THREE.Shape();
    shape.moveTo(-w/2+r,-h/2+r);shape.lineTo(w/2-r,-h/2+r);
    shape.lineTo(w/2-r,h/2-r);shape.lineTo(-w/2+r,h/2-r);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,steps:1,curveSegments:1});
    geometry.translate(0,0,-d/2+r);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function officeCylinder(parent,radius,height,x,y,z,material=officePalette.edge) {
    if(parent===scene&&officeBuildGroup)parent=officeBuildGroup;
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,12),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function officeAdd(object,parent=scene) {
    if(parent===scene&&officeBuildGroup)parent=officeBuildGroup;
    parent.add(object);return object;
}
function officeLabel(text,width,height,color='#69e1e4') {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#0a1422';ctx.fillRect(0,0,1024,160);
    ctx.fillStyle=color;ctx.font='600 52px sans-serif';ctx.fillText(text,32,96);
    const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
    return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture}));
}
function createAgentSpeech(person) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=176;
    const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
    sprite.name=`speech-${person.cfg.id}`;sprite.position.set(0,5,.2);sprite.scale.set(4.6,1.58,1);
    sprite.visible=false;person.group.add(sprite);
    return {canvas,ctx:canvas.getContext('2d'),texture,sprite,status:'hidden',message:'',displayText:'',timer:0,frame:-1};
}
function drawAgentSpeech(person) {
    const speech=person.speech,{ctx,canvas}=speech;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='rgba(6,18,30,.94)';ctx.strokeStyle='rgba(105,225,228,.9)';ctx.lineWidth=3;
    ctx.beginPath();ctx.roundRect(10,8,492,156,25);ctx.fill();ctx.stroke();
    ctx.fillStyle='#67d9dc';ctx.beginPath();ctx.moveTo(42,162);ctx.lineTo(65,162);ctx.lineTo(45,174);ctx.closePath();ctx.fill();
    ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.fillStyle='#8fdedb';ctx.font='600 18px sans-serif';ctx.fillText(person.cfg.name,30,39);
    ctx.fillStyle='#8aa2b4';ctx.font='14px sans-serif';ctx.fillText(person.cfg.role,30,59);
    if(speech.status==='typing'){
        for(let i=0;i<3;i++){
            const lift=speech.frame===i?5:0;
            ctx.fillStyle='#e7f6f5';ctx.beginPath();ctx.arc(39+i*19,105-lift,6,0,Math.PI*2);ctx.fill();
        }
    }else{
        ctx.fillStyle='#f1f6f8';ctx.font='17px sans-serif';
        const words=speech.displayText.split(/\s+/);let line='',lineIndex=0;
        for(const word of words){
            const candidate=line?`${line} ${word}`:word;
            if(ctx.measureText(candidate).width>445&&line){
                ctx.fillText(line,30,88+lineIndex*24);line=word;lineIndex++;
                if(lineIndex===3)break;
            }else line=candidate;
        }
        if(lineIndex<3)ctx.fillText(line,30,88+lineIndex*24);
    }
    speech.texture.needsUpdate=true;
}
function setAgentSpeech(agentId,message,{typing=false,duration=3.8}={}) {
    const person=people.find(p=>p.cfg.id===agentId);
    if(!person)throw new Error(`Unknown agent speech recipient: ${agentId}`);
    const speech=person.speech;
    speech.status=typing?'typing':'message';speech.message=String(message);
    speech.displayText=typing?'...':speech.message;speech.timer=typing ? .7 : duration;speech.frame=0;
    speech.sprite.visible=true;drawAgentSpeech(person);return speech;
}
function clearAgentSpeech(agentId) {
    const person=people.find(p=>p.cfg.id===agentId);
    if(!person)throw new Error(`Unknown agent speech recipient: ${agentId}`);
    person.speech.status='hidden';person.speech.displayText='';person.speech.sprite.visible=false;
}
function updateAgentSpeech(person,dt) {
    const speech=person.speech;
    if(speech.status==='hidden')return;
    speech.timer-=dt;
    if(speech.status==='typing'){
        const frame=Math.floor(person.time*5)%3;
        if(frame!==speech.frame){speech.frame=frame;drawAgentSpeech(person);}
        if(speech.timer<=0){speech.status='message';speech.displayText=speech.message;speech.timer=3.8;drawAgentSpeech(person);}
    }else if(speech.timer<=0){
        speech.status='hidden';speech.displayText='';speech.sprite.visible=false;
    }
}
function registerSeat(id,x,z,yaw,kind,approach,floor=1) {
    const floorY=(floor-1)*OFFICE_FLOOR_HEIGHT;
    const seat={id,position:new THREE.Vector3(x,floorY,z),yaw,kind,floor,surface:floorY+.98,approach:new THREE.Vector3(approach[0],floorY,approach[2]),occupant:null};
    officeSeats.set(id,seat);return seat;
}
function makeOfficeChair(seat) {
    const group=new THREE.Group();group.position.copy(seat.position);group.rotation.y=seat.yaw;officeAdd(group);
    officeCylinder(group,.13,.68,0,.46,0);
    for(let i=0;i<5;i++){
        const arm=officeBox(group,.08,.08,.85,0,.18,0,officePalette.edge);
        arm.rotation.y=i*Math.PI*2/5;arm.translateZ(.33);
        const wheel=officeCylinder(group,.10,.14,Math.sin(i*Math.PI*2/5)*.72,.1,Math.cos(i*Math.PI*2/5)*.72,officePalette.dark);wheel.rotation.z=Math.PI/2;
    }
    officeBox(group,1.25,.18,1.18,0,.89,0,officePalette.cushion);
    officeBox(group,1.2,1.35,.18,0,1.62,-.52,officePalette.cushion);
    officeBox(group,.8,.22,.2,0,2.35,-.52,officePalette.cushion);
    for(const x of [-.71,.71]){
        officeCylinder(group,.05,.52,x,1.17,0);
        officeBox(group,.15,.12,.82,x,1.46,0,officePalette.dark);
    }
    officeBox(group,.7,.035,.035,0,1.9,-.63,officePalette.cyan);
    group.userData.seatId=seat.id;
}
function officeMonitor(parent,x,y,z,width=2.5,height=1.3,agentIndex=0) {
    officeBox(parent,.65,.06,.45,x,y-height/2-.45,z,officePalette.edge);
    officeBox(parent,.09,.6,.09,x,y-height/2-.2,z,officePalette.edge);
    officeBox(parent,width+.14,height+.14,.13,x,y,z,officePalette.dark);
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:0x57b6c6}));
    screen.position.set(x,y,z+.074);parent.add(screen);
    officeScreens.push({mesh:screen,kind:'desk',agentIndex});
}
function makeWorkstation(id,x,z,index) {
    const group=new THREE.Group();group.position.set(x,0,z);officeAdd(group);
    officeBox(group,6.3,.17,2.8,0,1.94,0,officePalette.shell);
    officeBox(group,6,.045,.045,0,1.94,1.41,officePalette.cyan);
    for(const dx of [-2.6,2.6]){
        officeBox(group,.18,1.84,1.9,dx,.94,0,officePalette.edge);
        officeBox(group,.8,.10,2.25,dx,.08,0,officePalette.dark);
    }
    officeMonitor(group,-.9,3.04,-.65,2.4,1.3,index);
    officeMonitor(group,1.62,3.04,-.55,1.75,1.3,index);
    officeBox(group,1.5,.055,.55,0,2.05,1.13,officePalette.dark);
    for(let row=0;row<3;row++)for(let col=0;col<10;col++)officeBox(group,.10,.018,.09,-.65+col*.14,2.088,.97+row*.15,officePalette.edge,.005);
    officeBox(group,.22,.075,.34,1.1,2.08,1.1,officePalette.white);
    const noteCanvas=document.createElement('canvas');noteCanvas.width=320;noteCanvas.height=240;
    const noteContext=noteCanvas.getContext('2d');
    noteContext.fillStyle='#f4f0df';noteContext.fillRect(0,0,320,240);
    noteContext.fillStyle='#9b4d45';noteContext.font='bold 22px sans-serif';noteContext.fillText('PLAN DE SESIÓN',18,35);
    noteContext.strokeStyle='#c4d3d2';noteContext.lineWidth=2;
    for(let y=62;y<220;y+=31){noteContext.beginPath();noteContext.moveTo(18,y);noteContext.lineTo(302,y);noteContext.stroke();}
    noteContext.fillStyle='#355866';noteContext.font='17px monospace';
    noteContext.fillText('01 · observar',22,85);noteContext.fillText('02 · validar',22,116);noteContext.fillText('03 · revisar',22,147);
    const noteTexture=new THREE.CanvasTexture(noteCanvas);noteTexture.encoding=THREE.sRGBEncoding;
    const paper=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.78),new THREE.MeshBasicMaterial({map:noteTexture,side:THREE.DoubleSide}));
    paper.name='desk-plan-paper';paper.rotation.x=-Math.PI/2;paper.position.set(-2.05,2.04,.55);group.add(paper);
    const pencil=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.9,8),new THREE.MeshStandardMaterial({color:0xe5ad55,roughness:.48}));
    pencil.name='desk-pencil';pencil.position.set(-1.27,2.09,.56);pencil.rotation.z=Math.PI/2;pencil.rotation.x=.12;pencil.castShadow=true;group.add(pencil);
    const pencilTip=new THREE.Mesh(new THREE.ConeGeometry(.035,.12,8),new THREE.MeshStandardMaterial({color:0x273746,roughness:.7}));
    pencilTip.position.set(-.79,2.09,.56);pencilTip.rotation.z=-Math.PI/2;group.add(pencilTip);
    officeCylinder(group,.17,.34,-2.5,2.18,.7,officePalette.white);
    const label=officeLabel(['01 / ANALYST','02 / VALIDATION','03 / EXECUTION'][index],3,.45);label.position.set(0,1.46,1.43);group.add(label);
    const seat=registerSeat(`work-${id}`,x,z+2.5,Math.PI,'desk',[x+1.7,0,z+2.7]);makeOfficeChair(seat);
    officeObstacles.push({minX:x-3.65,maxX:x+3.65,minZ:z-1.9,maxZ:z+1.9,floor:1});
}
function makePingPongTable() {
    const table=new THREE.Group();table.position.set(0,0,14.5);officeAdd(table);
    const topMaterial=new THREE.MeshStandardMaterial({color:0x176a69,roughness:.42,metalness:.12});
    officeBox(table,7.2,.18,3.8,0,1.45,0,topMaterial,.09);
    const lineMaterial=new THREE.MeshStandardMaterial({color:0xe4f2ed,roughness:.7});
    officeBox(table,.045,.012,3.55,0,1.55,0,lineMaterial,.006);
    for(const z of [-1.78,1.78])officeBox(table,7,.012,.045,0,1.55,z,lineMaterial,.006);
    for(const x of [-2.5,2.5])officeBox(table,.025,.012,3.5,x,1.55,0,lineMaterial,.004);
    officeBox(table,7.25,.08,.08,0,1.68,0,officePalette.white,.01);
    for(const x of [-3,3])for(const z of [-1.4,1.4]){
        officeBox(table,.10,1.28,.10,x,.64,z,officePalette.edge,.02);
        officeBox(table,.8,.10,.8,x,.08,z,officePalette.dark,.02);
    }
    officeLeisure.table=table;
    officePingPongSeats.push(
        registerSeat('pingpong-left',-4.9,14.5,Math.PI/2,'pingpong',[-5.3,0,14.5]),
        registerSeat('pingpong-right',4.9,14.5,-Math.PI/2,'pingpong',[5.3,0,14.5])
    );
    officeObstacles.push({minX:-4.1,maxX:4.1,minZ:12.1,maxZ:16.9});
    const courtLabel=officeLabel('PING-PONG / DESCANSO',5,.38,'#8fe9df');
    courtLabel.rotation.x=-Math.PI/2;courtLabel.position.set(0,.015,17.65);officeAdd(courtLabel);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(.13,18,14),new THREE.MeshStandardMaterial({color:0xff9d58,roughness:.34}));
    ball.castShadow=true;table.add(ball);officeLeisure.ball=ball;
    for(const side of [-1,1]){
        const paddle=new THREE.Group();paddle.position.set(side*2.7,1.55,side*.35);table.add(paddle);
        const handle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.48,8),new THREE.MeshStandardMaterial({color:0x9b6041,roughness:.7}));
        handle.position.set(0,.12,.42);handle.rotation.x=Math.PI/2;paddle.add(handle);
        const blade=new THREE.Mesh(new THREE.CylinderGeometry(.38,.34,.10,24),new THREE.MeshStandardMaterial({color:side<0?0xc43f4e:0x397cba,roughness:.55}));
        blade.position.y=.17;blade.scale.set(1,1,.82);blade.castShadow=true;paddle.add(blade);
        officeLeisure.paddles.push(paddle);
    }
    officeBox(scene,7.6,.06,.06,0,.05,17.3,officePalette.edge);
}
function updateOfficeLeisure(dt) {
    if(!officeLeisure.ball)return;
    const active=officePingPongSeats.every(seat=>people.some(person=>person.seat===seat&&person.state==='playing'));
    officeLeisure.ball.visible=active;
    officeLeisure.paddles.forEach(paddle=>{paddle.visible=true;});
    if(!active)return;
    officeLeisure.time+=dt;
    const phase=officeLeisure.time*2.5;
    officeLeisure.ball.position.set(Math.sin(phase)*2.45,1.72+Math.abs(Math.sin(phase))*.82,Math.sin(phase*.5)*.62);
    officeLeisure.paddles.forEach(paddle=>{paddle.rotation.y=Math.sin(phase*2+(paddle.position.x<0?0:Math.PI))*.22;});
}
function makePlant(x,z) {
    officeCylinder(scene,.58,.8,x,.4,z,officePalette.shell);
    officeCylinder(scene,.06,2.4,x,1.7,z,officePalette.edge);
    for(let i=0;i<8;i++){
        const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),officePalette.leaf);
        const angle=i*2.4;leaf.scale.set(.30,.8,.16);leaf.rotation.set(.35,angle,.65);
        leaf.position.set(x+Math.sin(angle)*.35,1.3+i*.22,z+Math.cos(angle)*.35);leaf.castShadow=true;officeAdd(leaf);
    }
}
buildMirroredSkyBackground=function(){};
buildRichOfficeArchitecture=function() {
    officeLevelGroups[1]=new THREE.Group();officeLevelGroups[1].name='ground-floor';
    scene.add(officeLevelGroups[1]);officeBuildGroup=officeLevelGroups[1];officeCurrentLevel=1;
    renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMappingExposure=1;
    scene.background=new THREE.Color(0x0a1524);scene.fog=new THREE.FogExp2(0x0a1524,.004);
    scene.children.filter(o=>o.isLight).forEach(o=>scene.remove(o));
    scene.add(new THREE.HemisphereLight(0xb8e7ff,0x1b2434,.8));
    const key=new THREE.DirectionalLight(0xe7f3ff,1.5);key.position.set(-12,30,16);key.castShadow=true;
    Object.assign(key.shadow.camera,{left:-36,right:36,top:30,bottom:-30,near:1,far:85});
    key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.04;key.shadow.bias=-.0002;scene.add(key);
    const rim=new THREE.DirectionalLight(0x4aa6be,.65);rim.position.set(12,15,-20);scene.add(rim);
    officeBox(scene,61,.25,44,0,-.16,0,new THREE.MeshStandardMaterial({color:0x152532,roughness:.77,metalness:.16}));
    const grid=new THREE.GridHelper(60,30,0x284356,0x213747);grid.position.y=-.025;officeAdd(grid);
    // Low-glare architectural lighting and open circulation lanes.
    for(const x of [-29,29])officeBox(scene,.045,.02,40,x,.006,0,officePalette.cyan,.005);
    officeBox(scene,58,10,.5,0,5,-20,officePalette.shell);
    for(let x=-27;x<=27;x+=6)officeBox(scene,.05,9,.06,x,4.5,-19.72,officePalette.edge,.008);
    officeBox(scene,56,.055,.1,0,9.35,-19.65,officePalette.cyan);
    const brand=officeLabel('CASA TRADE / DECISION FLOOR',24,1);brand.position.set(0,8.45,-19.7);officeAdd(brand);
    const windowMat=new THREE.MeshStandardMaterial({color:0x45788c,transparent:true,opacity:.13,roughness:.18,metalness:.25,side:THREE.DoubleSide,depthWrite:false});
    for(let z=-15;z<=15;z+=6){
        officeBox(scene,.16,9,.16,-29,4.5,z,officePalette.edge);
        officeBox(scene,.045,8.4,5.8,-29,4.5,z+2.9,windowMat,.01);
    }
    for(let i=0;i<12;i++){
        const height=5+(i*7%13);officeBox(scene,3.2,height,3,-35-(i%3)*4,height/2-3,-23+i*4,officePalette.dark);
        for(let j=0;j<4;j++)officeBox(scene,.035,.12,1.6,-33.38-(i%3)*4,j*1.6,-23+i*4,officePalette.cyan,.006);
    }
    [-17,0,17].forEach((x,i)=>makeWorkstation(['analyst','tester','manager'][i],x,-10,i));
    // Shared client table: five real, individually assigned chairs.
    officeBox(scene,11,.17,3.8,-13,1.94,8,officePalette.shell);
    for(const x of [-17,-9])officeBox(scene,.35,1.8,2.6,x,.9,8,officePalette.edge);
    officeObstacles.push({minX:-19,maxX:-7,minZ:5.6,maxZ:10.4});
    const clientPositions=[[-17,4.9,0],[-13,4.9,0],[-9,4.9,0],[-15,11.1,Math.PI],[-10,11.1,Math.PI]];
    clientPositions.forEach(([x,z,yaw],i)=>{
        const seat=registerSeat(`work-client${i+1}`,x,z,yaw,'meeting',[x+1.4,0,z+(yaw===0?-.6:.6)]);makeOfficeChair(seat);
        officeBox(scene,1.6,.065,.9,x,2.05,z+(yaw===0?1.6:-1.6),officePalette.dark);
    });
    // Eight lounge cushions, one per person; no shared destination points.
    [7,15].forEach((z,row)=>{
        const yaw=row?Math.PI:0;
        officeBox(scene,13,.64,1.8,16,.52,z,officePalette.shell);
        officeBox(scene,13,1.45,.35,16,1.22,z+(row?.8:-.8),officePalette.cushion);
        for(const x of [9.6,22.4])officeBox(scene,.35,1.1,1.9,x,.65,z,officePalette.cushion);
        for(let i=0;i<4;i++){
            const x=11.5+i*3;officeBox(scene,2.7,.24,1.5,x,.86,z,officePalette.cushion);
            registerSeat(`rest-${row*4+i}`,x,z,yaw,'lounge',[x,0,z+(row?-1.5:1.5)]);
        }
        officeObstacles.push({minX:9,maxX:23,minZ:z+(row?.85:-1.4),maxZ:z+(row?1.4:-.85)});
    });
    officeBox(scene,9,.12,1.8,16,.78,11,officePalette.shell);
    for(const x of [12.5,19.5])officeBox(scene,.25,.7,1.2,x,.36,11,officePalette.edge);
    officeObstacles.push({minX:11,maxX:21,minZ:9.6,maxZ:12.4});
    makePingPongTable();
    const plateMaterial=new THREE.MeshStandardMaterial({color:0xe7e9e3,roughness:.38});
    const snackMaterial=new THREE.MeshStandardMaterial({color:0xd99143,roughness:.62});
    for(const x of [13.5,18.5]){
        officeCylinder(scene,.48,.055,x,.88,11,plateMaterial);
        for(let i=0;i<3;i++){
            const snack=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),snackMaterial);
            snack.scale.set(1,.55,.8);snack.position.set(x-.22+i*.21,.99,11);snack.castShadow=true;officeAdd(snack);
        }
        const mug=new THREE.Mesh(new THREE.CylinderGeometry(.15,.13,.32,14),new THREE.MeshStandardMaterial({color:0x9b3945,roughness:.36}));
        mug.position.set(x+.75,1,11);mug.castShadow=true;officeAdd(mug);
        const coffee=new THREE.Mesh(new THREE.CircleGeometry(.115,14),new THREE.MeshStandardMaterial({color:0x51301e,roughness:.25}));
        coffee.rotation.x=-Math.PI/2;coffee.position.set(x+.75,1.17,11);officeAdd(coffee);
    }
    const tableSign=officeLabel('RESEARCH / CLIENT DESK',9,.65);tableSign.rotation.x=-Math.PI/2;tableSign.position.set(-13,.01,14);officeAdd(tableSign);
    const loungeSign=officeLabel('LOUNGE / RECHARGE',9,.65);loungeSign.rotation.x=-Math.PI/2;loungeSign.position.set(16,.01,18.5);officeAdd(loungeSign);
    [[-26,-16],[26,-16],[-26,16],[26,18],[5,15]].forEach(([x,z])=>makePlant(x,z));
    cameraTarget.set(0,1,-2);cameraSpherical={radius:61,theta:.22,phi:Math.PI/3.1};
};
buildWallArtAndDecorations=function(){};

function officePath(start,end,person,floor=1) {
    const key=(x,z)=>`${x},${z}`;
    const blocked=(x,z)=>officeObstacles.some(o=>(o.floor||1)===floor&&x>o.minX-.55&&x<o.maxX+.55&&z>o.minZ-.55&&z<o.maxZ+.55)
        ||people.some(other=>other!==person&&other.floor===floor&&other.state!=='walking'&&Math.hypot(x-other.group.position.x,z-other.group.position.z)<1.4);
    const sx=Math.round(start.x),sz=Math.round(start.z),ex=Math.round(end.x),ez=Math.round(end.z);
    const frontier=[{x:sx,z:sz,g:0,f:0}],best=new Map([[key(sx,sz),0]]),parents=new Map();
    let reached=false;
    while(frontier.length){
        frontier.sort((a,b)=>a.f-b.f);const p=frontier.shift();
        if(p.x===ex&&p.z===ez){reached=true;break;}
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
            const x=p.x+dx,z=p.z+dz,k=key(x,z),g=p.g+1;
            if(x< -27||x>27||z< -17||z>20||blocked(x,z)||(best.has(k)&&best.get(k)<=g))continue;
            best.set(k,g);parents.set(k,p);frontier.push({x,z,g,f:g+Math.abs(x-ex)+Math.abs(z-ez)});
        }
    }
    if(!reached)return [];
    const route=[end.clone()];let p={x:ex,z:ez};
    while(p.x!==sx||p.z!==sz){route.unshift(new THREE.Vector3(p.x,0,p.z));p=parents.get(key(p.x,p.z));}
    route.forEach(point=>{point.y=(floor-1)*OFFICE_FLOOR_HEIGHT;});
    return route;
}

Person3D=class {
    constructor(cfg,index){
        this.cfg=cfg;this.index=index;this.home=officeSeats.get(`work-${cfg.id}`);this.rest=officeSeats.get(`rest-${index}`);
        this.group=new THREE.Group();this.group.userData.person=this;scene.add(this.group);
        this.group.position.copy(this.home.approach);this.group.rotation.y=this.home.yaw;
        this.floor=1;
        this.speech=createAgentSpeech(this);this.speechSprite=this.speech.sprite;
        this.seat=null;this.goal=null;this.state='standing';this.sitAmount=0;this.time=index*.7;
        this.isSitting=false;this.isWalking=false;this.statusText='Preparando estación';this.interactionTimer=6;
        this.tabSwitchTimer=3+index*.8;this.tabSwitching=0;this.activeScreenTab=index%3;
        this.buildBodyParts();people.push(this);
    }
    buildBodyParts(){
        const cloth=new THREE.MeshStandardMaterial({color:this.cfg.topColor,roughness:.88});
        const trousers=new THREE.MeshStandardMaterial({color:this.cfg.bottomColor,roughness:.85});
        const skin=new THREE.MeshStandardMaterial({color:0xd6a587,roughness:.85});
        this.rig=new THREE.Group();this.group.add(this.rig);
        officeBox(this.rig,.84,.30,.49,0,0,0,trousers);
        this.torso=officeBox(this.rig,1.02,1.02,.58,0,.66,0,cloth,.12);
        this.headRoot=new THREE.Group();this.headRoot.position.y=1.53;this.rig.add(this.headRoot);
        this.head=new THREE.Mesh(new THREE.SphereGeometry(.39,16,12),skin);this.head.scale.set(.88,1.1,.9);this.headRoot.add(this.head);
        const nose=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),skin);nose.scale.set(.72,1.35,.72);nose.position.set(0,-.04,.34);this.headRoot.add(nose);
        if(!this.cfg.isClient){
            const hood=new THREE.Mesh(new THREE.SphereGeometry(.44,16,12),cloth);hood.scale.set(1,1.15,1);hood.position.z=-.06;this.headRoot.add(hood);
            officeBox(this.headRoot,.5,.39,.12,0,-.02,.35,officePalette.white,.09);
            for(const x of [-.13,.13]){
                officeBox(this.headRoot,.095,.035,.02,x,.05,.419,officePalette.dark,.007);
                officeBox(this.headRoot,.105,.025,.025,x,.105,.413,officePalette.edge,.008);
            }
            officeBox(this.headRoot,.13,.07,.025,0,-.12,.42,officePalette.dark,.015);
            officeBox(this.rig,.035,.75,.02,0,.65,.30,officePalette.edge,.004);
        } else {
            const hair=new THREE.Mesh(new THREE.SphereGeometry(.38,12,8,0,Math.PI*2,0,Math.PI/2),officePalette.dark);hair.position.y=.06;this.headRoot.add(hair);
            for(const x of [-.12,.12]){
                officeBox(this.headRoot,.065,.04,.03,x,.03,.34,officePalette.dark,.008);
                const eye=new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),officePalette.white);eye.position.set(x,.04,.365);this.headRoot.add(eye);
            }
            officeBox(this.headRoot,.11,.018,.018,0,-.18,.34,officePalette.edge,.005);
        }
        officeBox(this.rig,.13,.21,.035,.29,.83,.31,officePalette.cyan,.01);
        officeBox(this.rig,.24,.055,.025,0,.88,.302,officePalette.white,.008);
        officeBox(this.rig,.035,.52,.026,0,.48,.304,officePalette.edge,.004);
        this.arms=[];this.legs=[];
        for(const side of [-1,1]){
            const arm=new THREE.Group();arm.position.set(side*.64,1.13,0);this.rig.add(arm);
            officeBox(arm,.28,.60,.3,0,-.30,0,cloth,.1);
            const elbow=new THREE.Group();elbow.position.y=-.63;arm.add(elbow);
            officeBox(elbow,.24,.59,.25,0,-.30,0,cloth,.08);
            officeBox(elbow,.24,.20,.22,0,-.65,0,skin,.07);
            this.arms.push({root:arm,elbow});
            const leg=new THREE.Group();leg.position.set(side*.26,0,0);this.rig.add(leg);
            officeBox(leg,.34,.91,.36,0,-.475,0,trousers,.09);
            const knee=new THREE.Group();knee.position.y=-.95;leg.add(knee);
            officeBox(knee,.30,.94,.32,0,-.49,0,trousers,.08);
            const foot=officeBox(knee,.36,.20,.63,0,-1.02,.12,officePalette.dark,.05);
            this.legs.push({root:leg,knee,foot});
        }
        this.group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    }
    desiredSeat(){
        if(globalOrder==='rest_all'&&this.index<officePingPongSeats.length)return officePingPongSeats[this.index];
        if(globalOrder==='rest_all'||(globalOrder==='rest_half'&&this.index%2===1))return this.rest;
        return this.home;
    }
    turnTo(angle,dt){const diff=Math.atan2(Math.sin(angle-this.group.rotation.y),Math.cos(angle-this.group.rotation.y));this.group.rotation.y+=Math.sign(diff)*Math.min(Math.abs(diff),dt*5);return Math.abs(diff)<.04;}
    beginRoute(){
        const desired=this.desiredSeat();
        // Leave the old seat through its approach before navigating around furniture.
        this.route=[];
        let from=this.group.position.clone();
        if(this.seat){this.route.push(this.seat.approach.clone());from=this.seat.approach;this.seat.occupant=null;this.seat=null;}
        this.goal=desired;
        const path=officePath(from,desired.approach,this,this.floor);
        if(!path.length){this.statusText='Esperando una ruta libre';this.state='standing';this.goal=null;return;}
        this.route.push(...path,desired.position.clone());
        this.state='walking';
    }
    update(dt){
        this.time+=dt;updateAgentSpeech(this,dt);const desired=this.desiredSeat();
        if(this.goal!==desired){
            if(this.sitAmount>0){this.state='standing-up';}
            else this.beginRoute();
        }
        if(this.state==='standing-up'){
            this.sitAmount=Math.max(0,this.sitAmount-dt/0.65);this.statusText='Levantándose';
            if(!this.sitAmount)this.beginRoute();
        } else if(this.state==='walking'){
            const target=this.route[0];
            if(target){
                const direction=target.clone().sub(this.group.position);direction.y=0;const distance=direction.length();
                if(distance<.045){
                    this.group.position.copy(target);this.route.shift();
                }
                else {
                    const step=Math.min(distance,dt*3.1);direction.normalize();this.turnTo(Math.atan2(direction.x,direction.z),dt);
                    const proposed=this.group.position.clone().addScaledVector(direction,step);
                    const blocker=people.find(p=>p!==this&&p.floor===this.floor&&p.group.position.distanceTo(proposed)<.85&&(p.state!=='walking'||p.index<this.index));
                    if(!blocker)this.group.position.copy(proposed);
                    else if(blocker.state!=='walking'&&this.goal){
                        const detour=officePath(this.group.position,this.goal.approach,this,this.floor);
                        if(detour.length)this.route=[...detour,this.goal.position.clone()];
                    }
                }
                this.statusText=this.goal.kind==='lounge'?'Caminando al descanso':'Caminando a su estación';
            } else {this.state='aligning';}
        } else if(this.state==='aligning'){
            this.statusText='Alineándose con el asiento';
            if(this.turnTo(this.goal.yaw,dt)&&!this.goal.occupant){
                this.floor=this.goal.floor;
                this.seat=this.goal;this.seat.occupant=this.cfg.id;
                if(this.goal.kind==='pingpong'){this.sitAmount=0;this.state='playing';}
                else this.state='sitting-down';
            }
        } else if(this.state==='sitting-down'){
            this.sitAmount=Math.min(1,this.sitAmount+dt/.8);this.statusText='Sentándose';
            if(this.sitAmount===1)this.state='seated';
        } else if(this.state==='seated'){
            const sel=typeof chooseSelection==='function'?chooseSelection():null;
            this.statusText=this.seat.kind==='lounge'?(this.cfg.isClient?'Descansando · tomando un refrigerio':'En descanso · recargando energía'):this.cfg.isClient?'Sentado · consultando el panel':`${globalOrder==='work'?'Analizando':'En espera'}${sel?` · ${sel.contract} ${sel.target}`:''}`;
            if(this.cfg.id==='analyst'&&globalOrder==='work'){
                this.interactionTimer-=dt;
                if(this.interactionTimer<=0){this.interactionTimer=6;triggerCoherentDocumentHandover();}
            }
            if(this.seat.kind==='desk'&&globalOrder==='work'){
                this.tabSwitchTimer-=dt;this.tabSwitching=Math.max(0,this.tabSwitching-dt);
                if(this.tabSwitchTimer<=0){
                    this.activeScreenTab=(this.activeScreenTab+1)%3;
                    this.tabSwitchTimer=6+this.index*.45;this.tabSwitching=.55;
                }
            } else if(this.state==='playing'){
                this.statusText='Jugando ping-pong durante el descanso';
            }
        }
        this.isWalking=this.state==='walking';this.isSitting=this.state==='seated';
        this.group.visible=this.floor===officeCurrentLevel;
        this.pose();
    }
    pose(){
        const s=this.sitAmount;const blend=s*s*(3-2*s);const walking=this.isWalking;
        this.rig.position.y=THREE.MathUtils.lerp(2.10,1.15,blend)+(walking||this.state==='playing'?Math.abs(Math.sin(this.time*7))*.10:.03);
        const desk=this.seat?.kind==='desk'&&globalOrder==='work';
        const lounge=this.seat?.kind==='lounge';
        const playing=this.state==='playing';
        this.torso.rotation.x=playing?Math.sin(this.time*2.5)*.025:blend*(desk?.055:lounge?Math.sin(this.time*1.7)*.018:0);
        const working=this.goal?.kind==='desk';
        this.arms.forEach((arm,i)=>{
            const swing=walking?Math.sin(this.time*7+i*Math.PI)*.45:0;
            const writing=desk&&i===1;
            const eating=lounge&&i===1&&Math.sin(this.time*1.6)>-.55;
            arm.root.rotation.x=playing?-.42+Math.sin(this.time*7+i*Math.PI)*.32:THREE.MathUtils.lerp(swing,writing?-.92:eating?-.35:working?-.9:-.25,blend);
            arm.root.rotation.z=blend*(writing?Math.sin(this.time*7)*.045:this.tabSwitching&&i===1?.2:0);
            arm.elbow.rotation.x=playing?-.58+Math.max(0,Math.sin(this.time*7+i*Math.PI))*.34:blend*(writing?-.78:eating?-1.22:working?- .7:-1.1)
                +(writing?Math.sin(this.time*10)*.09:0)
                +(eating?Math.sin(this.time*1.6)*.18:0)
                +(this.tabSwitching&&i===1?-.2:0);
        });
        this.legs.forEach((leg,i)=>{
            leg.root.rotation.x=THREE.MathUtils.lerp(walking?Math.sin(this.time*7+i*Math.PI)*-.4:0,-Math.PI/2,blend);
            leg.knee.rotation.x=blend*Math.PI/2;
        });
        this.headRoot.rotation.y=this.isSitting?Math.sin(this.time*.5)*.035:0;
        this.headRoot.rotation.x=this.isSitting?(desk?.045+Math.sin(this.time*5)*.012:lounge?Math.sin(this.time*1.6)*.025:0):0;
    }
};

buildTradingScreens=function(){
    [-17,0,17].forEach((x,i)=>{
        officeBox(scene,14.4,4.95,.2,x,5.12,-19.55,officePalette.dark);
        const mesh=new THREE.Mesh(new THREE.PlaneGeometry(14,4.55),new THREE.MeshBasicMaterial());mesh.position.set(x,5.12,-19.43);officeAdd(mesh);
        officeScreens.push({mesh,kind:i});
    });
    for(let i=0;i<3;i++){
        const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=384;
        const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
        tradingScreenMeshes[i]={canvas,ctx:canvas.getContext('2d'),texture};
        officeScreens.filter(s=>s.kind===i).forEach(s=>{s.mesh.material.map=texture;s.mesh.material.needsUpdate=true;});
    }
    officeScreens.filter(s=>s.kind==='desk').forEach(s=>{
        const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=384;
        const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
        officeDeskScreenMeshes.push({canvas,ctx:canvas.getContext('2d'),texture,agentIndex:s.agentIndex});
        s.mesh.material.color.set(0xffffff);s.mesh.material.map=texture;s.mesh.material.needsUpdate=true;
    });
};
let lastOfficeScreenUpdate=-Infinity;
updateTradingScreens=function(){
    const now=performance.now();if(now-lastOfficeScreenUpdate<200)return;lastOfficeScreenUpdate=now;
    const market=typeof displayedMarket==='function'?displayedMarket():null;
    const values=market?.prices||priceHistory;
    tradingScreenMeshes.forEach(({canvas,ctx,texture},i)=>{
        const background=ctx.createLinearGradient(0,0,1024,384);
        background.addColorStop(0,'#081522');background.addColorStop(1,'#0b1b27');
        ctx.fillStyle=background;ctx.fillRect(0,0,1024,384);
        const activeTab=i;
        const tabs=[['MERCADO','fa-chart-line'],['DÍGITOS','fa-chart-column'],['SESIÓN','fa-chart-pie']];
        tabs.forEach(([label],tab)=>{
            const x=28+tab*155;ctx.fillStyle=tab===activeTab?'#17484d':'#102431';ctx.beginPath();ctx.roundRect(x,16,142,35,9);ctx.fill();
            if(tab===activeTab){ctx.fillStyle='#63e1d2';ctx.beginPath();ctx.roundRect(x+12,27,5,14,2);ctx.fill();}
            ctx.fillStyle=tab===activeTab?'#b7f8ed':'#7d9baa';ctx.font='600 15px sans-serif';ctx.fillText(label,x+27,39);
        });
        const panelTitles=['Precio del mercado','Frecuencia por último dígito','Rendimiento de la sesión'];
        ctx.fillStyle='#d9eaf0';ctx.font='600 21px sans-serif';ctx.fillText(panelTitles[activeTab],28,86);
        ctx.fillStyle='#7f9bab';ctx.font='14px sans-serif';
        ctx.fillText(activeTab===0?(market?.name||'Esperando conexión'):activeTab===1?`${market?.name||'Mercado'} · muestra de ${market?.digits?.length||0} ticks`:'Balance virtual · resumen de cuenta',28,110);
        const plot={left:64,right:991,top:132,bottom:326};
        ctx.strokeStyle='#1a3442';ctx.lineWidth=1;
        for(let row=0;row<=4;row++){
            const y=plot.top+(plot.bottom-plot.top)*row/4;
            ctx.beginPath();ctx.moveTo(plot.left,y);ctx.lineTo(plot.right,y);ctx.stroke();
        }
        for(let col=0;col<=8;col++){
            const x=plot.left+(plot.right-plot.left)*col/8;
            ctx.beginPath();ctx.moveTo(x,plot.top);ctx.lineTo(x,plot.bottom);ctx.stroke();
        }
        if(activeTab===0){
            const quote=market?.quote;
            if(Number.isFinite(quote)){
                ctx.fillStyle='#b8d1db';ctx.font='bold 26px monospace';
                ctx.fillText(quote.toFixed(market.precision),plot.left,129);
                ctx.fillStyle='#58dcb2';ctx.beginPath();ctx.arc(972,76,5+Math.sin(now/280)*1.2,0,Math.PI*2);ctx.fill();
            }
            if(values.length>1){
                const recent=values.slice(-48),min=Math.min(...recent),range=Math.max(...recent)-min||1;
                const points=recent.map((value,j)=>[
                    plot.left+j*(plot.right-plot.left)/(recent.length-1),
                    plot.bottom-((value-min)/range)*(plot.bottom-plot.top-24)-12
                ]);
                const area=ctx.createLinearGradient(0,plot.top,0,plot.bottom);
                area.addColorStop(0,'#42d8cc48');area.addColorStop(1,'#42d8cc00');
                ctx.beginPath();points.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));
                ctx.lineTo(points.at(-1)[0],plot.bottom);ctx.lineTo(points[0][0],plot.bottom);ctx.closePath();ctx.fillStyle=area;ctx.fill();
                ctx.beginPath();points.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));
                ctx.strokeStyle='#63eee0';ctx.lineWidth=3;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
                const [lastX,lastY]=points.at(-1);
                ctx.fillStyle='#d3fff5';ctx.beginPath();ctx.arc(lastX,lastY,5,0,Math.PI*2);ctx.fill();
                ctx.strokeStyle='#63eee088';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(lastX,lastY,10+Math.sin(now/250)*2,0,Math.PI*2);ctx.stroke();
            }else{
                ctx.fillStyle='#8196a5';ctx.font='15px sans-serif';ctx.textAlign='center';
                ctx.fillText('Esperando ticks para dibujar el gráfico en vivo',512,236);ctx.textAlign='left';
            }
        }else if(activeTab===1){
            const counts=Array(10).fill(0);market?.digits.forEach(d=>counts[d]++);
            const max=Math.max(1,...counts),slot=(plot.right-plot.left)/10,barWidth=56;
            counts.forEach((count,d)=>{
                const height=count/max*(plot.bottom-plot.top-28),x=plot.left+d*slot+(slot-barWidth)/2,y=plot.bottom-height;
                const gradient=ctx.createLinearGradient(0,y,0,plot.bottom);
                gradient.addColorStop(0,d===market?.digits.at(-1)?'#ffd17a':'#6ce6dc');
                gradient.addColorStop(1,d===market?.digits.at(-1)?'#b76c4d':'#27899b');
                ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(x,y,barWidth,Math.max(3,height),7);ctx.fill();
                ctx.fillStyle='#c2d7df';ctx.font='15px monospace';ctx.textAlign='center';ctx.fillText(String(count),x+barWidth/2,y-7);
                ctx.fillStyle=d===market?.digits.at(-1)?'#ffd17a':'#8da7b4';ctx.font='15px monospace';ctx.fillText(String(d),x+barWidth/2,plot.bottom+21);
            });
            ctx.textAlign='left';
        }else{
            const pnl=tradeHistory.reduce((sum,t)=>sum+t.payout,0),wins=tradeHistory.filter(t=>t.isWon).length;
            const stats=[
                ['BALANCE VIRTUAL',`$${currentBalance.toFixed(2)}`,'#a8e9dc'],
                ['PNL DE SESIÓN',`${pnl>=0?'+':''}$${pnl.toFixed(2)}`,pnl<0?'#f18c9a':'#a8e9dc'],
                ['OPERACIONES GANADAS',`${wins} / ${tradeHistory.length}`,'#81d8eb'],
                ['TASA DE ACIERTO',tradeHistory.length?`${(wins/tradeHistory.length*100).toFixed(1)}%`:'—','#f3cb83']
            ];
            stats.forEach(([label,value,color],j)=>{
                const x=plot.left+j%2*455,y=plot.top+12+Math.floor(j/2)*91;
                ctx.fillStyle='#102532';ctx.beginPath();ctx.roundRect(x,y,425,76,12);ctx.fill();
                ctx.strokeStyle='#294553';ctx.lineWidth=1;ctx.stroke();
                ctx.fillStyle='#88a5b1';ctx.font='600 13px sans-serif';ctx.fillText(label,x+18,y+25);
                ctx.fillStyle=color;ctx.font='bold 27px monospace';ctx.fillText(value,x+18,y+58);
            });
        }
        ctx.textAlign='left';ctx.fillStyle='#6c8593';ctx.font='12px monospace';
        ctx.fillText(`CASA TRADE  /  ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`,28,371);
        ctx.textAlign='right';ctx.fillText(activeTab===0&&market?.source==='live'?'DATOS EN VIVO':'TRADE DE PRUEBA · NO ENVÍA ÓRDENES',996,371);ctx.textAlign='left';
        texture.needsUpdate=true;
    });
    officeDeskScreenMeshes.forEach(({canvas,ctx,texture,agentIndex})=>{
        const agent=people.find(person=>person.index===agentIndex);
        const activeTab=agent?.activeScreenTab??0;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(tradingScreenMeshes[activeTab].canvas,0,0,canvas.width,canvas.height);
        texture.needsUpdate=true;
    });
};
let officeLastFrame=0;
animate=function(timestamp=performance.now()){
    requestAnimationFrame(animate);
    const dt=officeLastFrame?Math.min((timestamp-officeLastFrame)/1000,.05):1/60;officeLastFrame=timestamp;
    people.forEach(p=>p.update(dt));updateOfficeLeisure(dt);updateFinanceFloor(dt);updateTradingScreens();updateCameraPosition();updateFloatingBadges();
    if(selectedAgent){document.getElementById('sidebar-status').textContent=selectedAgent.statusText;document.getElementById('sidebar-action').textContent=selectedAgent.state==='seated'?'Sentado en su asiento asignado':selectedAgent.statusText;}
    renderer.render(scene,camera);
};
const previousOfficeCamera=setCameraView;
setCameraView=function(view){
    previousOfficeCamera(view);
    if(view==='overview'){cameraTarget.set(0,1,-2);cameraSpherical={radius:61,theta:.22,phi:Math.PI/3.1};}
    if(view==='manager')cameraTarget.set(17,2,-8);
    if(view==='lounge'){cameraTarget.set(16,1.5,11);cameraSpherical={radius:24,theta:.6,phi:Math.PI/3};}
    updateCameraPosition();
};
