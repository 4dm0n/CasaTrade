// Scene geometry and character motion share the same seat definitions.
const officeSeats = new Map();
const officeObstacles = [];
const officeScreens = [];
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
    const r=Math.min(round,w/3,h/3,d/3);
    const shape=new THREE.Shape();
    shape.moveTo(-w/2+r,-h/2+r);shape.lineTo(w/2-r,-h/2+r);
    shape.lineTo(w/2-r,h/2-r);shape.lineTo(-w/2+r,h/2-r);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,steps:1,curveSegments:1});
    geometry.translate(0,0,-d/2+r);
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function officeCylinder(parent,radius,height,x,y,z,material=officePalette.edge) {
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,12),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function officeLabel(text,width,height,color='#69e1e4') {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#0a1422';ctx.fillRect(0,0,1024,160);
    ctx.fillStyle=color;ctx.font='600 52px sans-serif';ctx.fillText(text,32,96);
    const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
    return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture}));
}
function registerSeat(id,x,z,yaw,kind,approach) {
    const seat={id,position:new THREE.Vector3(x,0,z),yaw,kind,surface:.98,approach:new THREE.Vector3(...approach),occupant:null};
    officeSeats.set(id,seat);return seat;
}
function makeOfficeChair(seat) {
    const group=new THREE.Group();group.position.copy(seat.position);group.rotation.y=seat.yaw;scene.add(group);
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
function officeMonitor(parent,x,y,z,width=2.5,height=1.3) {
    officeBox(parent,.65,.06,.45,x,y-height/2-.45,z,officePalette.edge);
    officeBox(parent,.09,.6,.09,x,y-height/2-.2,z,officePalette.edge);
    officeBox(parent,width+.14,height+.14,.13,x,y,z,officePalette.dark);
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({color:0x57b6c6}));
    screen.position.set(x,y,z+.074);parent.add(screen);
    officeScreens.push({mesh:screen,kind:'desk'});
}
function makeWorkstation(id,x,z,index) {
    const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
    officeBox(group,6.3,.17,2.8,0,1.94,0,officePalette.shell);
    officeBox(group,6,.045,.045,0,1.94,1.41,officePalette.cyan);
    for(const dx of [-2.6,2.6]){
        officeBox(group,.18,1.84,1.9,dx,.94,0,officePalette.edge);
        officeBox(group,.8,.10,2.25,dx,.08,0,officePalette.dark);
    }
    officeMonitor(group,-.9,3.04,-.65,2.4,1.3);
    officeMonitor(group,1.62,3.04,-.55,1.75,1.3);
    officeBox(group,1.5,.055,.55,0,2.05,1.13,officePalette.dark);
    for(let row=0;row<3;row++)for(let col=0;col<10;col++)officeBox(group,.10,.018,.09,-.65+col*.14,2.088,.97+row*.15,officePalette.edge,.005);
    officeBox(group,.22,.075,.34,1.1,2.08,1.1,officePalette.white);
    officeCylinder(group,.17,.34,-2.5,2.18,.7,officePalette.white);
    const label=officeLabel(['01 / ANALYST','02 / VALIDATION','03 / EXECUTION'][index],3,.45);label.position.set(0,1.46,1.43);group.add(label);
    const seat=registerSeat(`work-${id}`,x,z+2.5,Math.PI,'desk',[x+1.7,0,z+2.7]);makeOfficeChair(seat);
    officeObstacles.push({minX:x-3.65,maxX:x+3.65,minZ:z-1.9,maxZ:z+1.9});
}
function makePlant(x,z) {
    officeCylinder(scene,.58,.8,x,.4,z,officePalette.shell);
    officeCylinder(scene,.06,2.4,x,1.7,z,officePalette.edge);
    for(let i=0;i<8;i++){
        const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),officePalette.leaf);
        const angle=i*2.4;leaf.scale.set(.30,.8,.16);leaf.rotation.set(.35,angle,.65);
        leaf.position.set(x+Math.sin(angle)*.35,1.3+i*.22,z+Math.cos(angle)*.35);leaf.castShadow=true;scene.add(leaf);
    }
}
buildMirroredSkyBackground=function(){};
buildRichOfficeArchitecture=function() {
    renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMappingExposure=1;
    scene.background=new THREE.Color(0x0a1524);scene.fog=new THREE.FogExp2(0x0a1524,.004);
    scene.children.filter(o=>o.isLight).forEach(o=>scene.remove(o));
    scene.add(new THREE.HemisphereLight(0xb8e7ff,0x1b2434,.8));
    const key=new THREE.DirectionalLight(0xe7f3ff,1.5);key.position.set(-12,30,16);key.castShadow=true;
    Object.assign(key.shadow.camera,{left:-36,right:36,top:30,bottom:-30,near:1,far:85});
    key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.04;key.shadow.bias=-.0002;scene.add(key);
    const rim=new THREE.DirectionalLight(0x4aa6be,.65);rim.position.set(12,15,-20);scene.add(rim);
    officeBox(scene,61,.25,44,0,-.16,0,new THREE.MeshStandardMaterial({color:0x152532,roughness:.77,metalness:.16}));
    const grid=new THREE.GridHelper(60,30,0x284356,0x213747);grid.position.y=-.025;scene.add(grid);
    // Low-glare architectural lighting and open circulation lanes.
    for(const x of [-29,29])officeBox(scene,.045,.02,40,x,.006,0,officePalette.cyan,.005);
    officeBox(scene,58,10,.5,0,5,-20,officePalette.shell);
    for(let x=-27;x<=27;x+=6)officeBox(scene,.05,9,.06,x,4.5,-19.72,officePalette.edge,.008);
    officeBox(scene,56,.055,.1,0,9.35,-19.65,officePalette.cyan);
    const brand=officeLabel('CASA TRADE / DECISION FLOOR',24,1);brand.position.set(0,8.45,-19.7);scene.add(brand);
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
    const tableSign=officeLabel('RESEARCH / CLIENT DESK',9,.65);tableSign.rotation.x=-Math.PI/2;tableSign.position.set(-13,.01,14);scene.add(tableSign);
    const loungeSign=officeLabel('LOUNGE / RECHARGE',9,.65);loungeSign.rotation.x=-Math.PI/2;loungeSign.position.set(16,.01,18.5);scene.add(loungeSign);
    [[-26,-16],[26,-16],[-26,16],[26,18],[5,15]].forEach(([x,z])=>makePlant(x,z));
    cameraTarget.set(0,1,-2);cameraSpherical={radius:61,theta:.22,phi:Math.PI/3.1};
};
buildWallArtAndDecorations=function(){};

function officePath(start,end) {
    const key=(x,z)=>`${x},${z}`;
    const blocked=(x,z)=>officeObstacles.some(o=>x>o.minX&&x<o.maxX&&z>o.minZ&&z<o.maxZ);
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
    return route;
}

Person3D=class {
    constructor(cfg,index){
        this.cfg=cfg;this.index=index;this.home=officeSeats.get(`work-${cfg.id}`);this.rest=officeSeats.get(`rest-${index}`);
        this.group=new THREE.Group();this.group.userData.person=this;scene.add(this.group);
        this.group.position.copy(this.home.approach);this.group.rotation.y=this.home.yaw;
        this.seat=null;this.goal=null;this.state='standing';this.sitAmount=0;this.time=index*.7;
        this.isSitting=false;this.isWalking=false;this.statusText='Preparando estación';this.interactionTimer=6;
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
        if(!this.cfg.isClient){
            const hood=new THREE.Mesh(new THREE.SphereGeometry(.44,16,12),cloth);hood.scale.set(1,1.15,1);hood.position.z=-.06;this.headRoot.add(hood);
            officeBox(this.headRoot,.5,.39,.12,0,-.02,.35,officePalette.white,.09);
            for(const x of [-.13,.13])officeBox(this.headRoot,.095,.035,.02,x,.05,.419,officePalette.dark,.007);
            officeBox(this.rig,.035,.75,.02,0,.65,.30,officePalette.edge,.004);
        } else {
            const hair=new THREE.Mesh(new THREE.SphereGeometry(.38,12,8,0,Math.PI*2,0,Math.PI/2),officePalette.dark);hair.position.y=.06;this.headRoot.add(hair);
            for(const x of [-.12,.12])officeBox(this.headRoot,.065,.04,.03,x,.03,.34,officePalette.dark,.008);
        }
        officeBox(this.rig,.13,.21,.035,.29,.83,.31,officePalette.cyan,.01);
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
    desiredSeat(){return globalOrder==='rest_all'||(globalOrder==='rest_half'&&this.index%2===1)?this.rest:this.home;}
    turnTo(angle,dt){const diff=Math.atan2(Math.sin(angle-this.group.rotation.y),Math.cos(angle-this.group.rotation.y));this.group.rotation.y+=Math.sign(diff)*Math.min(Math.abs(diff),dt*5);return Math.abs(diff)<.04;}
    beginRoute(){
        const desired=this.desiredSeat();
        // Leave the old seat through its approach before navigating around furniture.
        this.route=[];
        let from=this.group.position.clone();
        if(this.seat){this.route.push(this.seat.approach.clone());from=this.seat.approach;this.seat.occupant=null;this.seat=null;}
        const path=officePath(from,desired.approach);
        if(!path.length){this.statusText='Esperando una ruta libre';this.state='standing';return;}
        this.route.push(...path,desired.position.clone());this.goal=desired;this.state='walking';
    }
    update(dt){
        this.time+=dt;const desired=this.desiredSeat();
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
                if(distance<.045){this.group.position.copy(target);this.route.shift();}
                else {
                    const step=Math.min(distance,dt*3.1);direction.normalize();this.turnTo(Math.atan2(direction.x,direction.z),dt);
                    const proposed=this.group.position.clone().addScaledVector(direction,step);
                    const occupied=people.some(p=>p!==this&&p.group.position.distanceTo(proposed)<.85&&(p.state!=='walking'||p.index<this.index));
                    if(!occupied)this.group.position.copy(proposed);
                }
                this.statusText=this.goal.kind==='lounge'?'Caminando al descanso':'Caminando a su estación';
            } else {this.state='aligning';}
        } else if(this.state==='aligning'){
            this.statusText='Alineándose con el asiento';
            if(this.turnTo(this.goal.yaw,dt)&&!this.goal.occupant){this.seat=this.goal;this.seat.occupant=this.cfg.id;this.state='sitting-down';}
        } else if(this.state==='sitting-down'){
            this.sitAmount=Math.min(1,this.sitAmount+dt/.8);this.statusText='Sentándose';
            if(this.sitAmount===1)this.state='seated';
        } else if(this.state==='seated'){
            const sel=typeof chooseSelection==='function'?chooseSelection():null;
            this.statusText=this.seat.kind==='lounge'?'Sentado · en descanso':this.cfg.isClient?'Sentado · consultando el panel':`${globalOrder==='work'?'Analizando':'En espera'}${sel?` · ${sel.contract} ${sel.target}`:''}`;
            if(this.cfg.id==='analyst'&&globalOrder==='work'){
                this.interactionTimer-=dt;
                if(this.interactionTimer<=0){this.interactionTimer=6;triggerCoherentDocumentHandover();}
            }
        }
        this.isWalking=this.state==='walking';this.isSitting=this.state==='seated';
        this.pose();
    }
    pose(){
        const s=this.sitAmount;const blend=s*s*(3-2*s);const walking=this.isWalking;
        this.rig.position.y=THREE.MathUtils.lerp(2.10,1.15,blend)+(walking?Math.abs(Math.sin(this.time*7))*.045:0);
        this.torso.rotation.x=blend*(this.goal?.kind==='desk'?.045:0);
        const working=this.goal?.kind==='desk';
        this.arms.forEach((arm,i)=>{
            const swing=walking?Math.sin(this.time*7+i*Math.PI)*.45:0;
            arm.root.rotation.x=THREE.MathUtils.lerp(swing,working?-.9:-.25,blend);
            arm.elbow.rotation.x=blend*(working?-.7:-1.1)+(this.isSitting&&working?Math.sin(this.time*5+i)*.045:0);
        });
        this.legs.forEach((leg,i)=>{
            leg.root.rotation.x=THREE.MathUtils.lerp(walking?Math.sin(this.time*7+i*Math.PI)*-.4:0,-Math.PI/2,blend);
            leg.knee.rotation.x=blend*Math.PI/2;
        });
        this.headRoot.rotation.y=this.isSitting?Math.sin(this.time*.5)*.035:0;
    }
};

buildTradingScreens=function(){
    [-17,0,17].forEach((x,i)=>{
        officeBox(scene,14.4,4.95,.2,x,5.12,-19.55,officePalette.dark);
        const mesh=new THREE.Mesh(new THREE.PlaneGeometry(14,4.55),new THREE.MeshBasicMaterial());mesh.position.set(x,5.12,-19.43);scene.add(mesh);
        officeScreens.push({mesh,kind:i});
    });
    for(let i=0;i<3;i++){
        const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=384;
        const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
        tradingScreenMeshes[i]={canvas,ctx:canvas.getContext('2d'),texture};
        officeScreens.filter(s=>s.kind===i).forEach(s=>{s.mesh.material.map=texture;s.mesh.material.needsUpdate=true;});
    }
    officeScreens.filter(s=>s.kind==='desk').forEach((s,i)=>{s.mesh.material.color.set(0xffffff);s.mesh.material.map=tradingScreenMeshes[i%3].texture;s.mesh.material.needsUpdate=true;});
};
let lastOfficeScreenUpdate=-Infinity;
updateTradingScreens=function(){
    const now=performance.now();if(now-lastOfficeScreenUpdate<200)return;lastOfficeScreenUpdate=now;
    const market=typeof displayedMarket==='function'?displayedMarket():null;
    const values=market?.prices||priceHistory;
    tradingScreenMeshes.forEach(({canvas,ctx,texture},i)=>{
        ctx.fillStyle='#07131e';ctx.fillRect(0,0,1024,384);
        ctx.fillStyle='#56dce1';ctx.font='600 24px sans-serif';ctx.fillText(['01 / LIVE MARKET','02 / DIGIT DISTRIBUTION','03 / SESSION PERFORMANCE'][i],28,40);
        ctx.strokeStyle='#1b3544';ctx.lineWidth=1;
        for(let y=90;y<325;y+=55){ctx.beginPath();ctx.moveTo(28,y);ctx.lineTo(995,y);ctx.stroke();}
        if(i===0){
            ctx.fillStyle='#d5f2f4';ctx.font='24px monospace';ctx.fillText(`${market?.name||'Esperando datos'}  ${market?.quote?.toFixed(market.precision)||'—'}`,28,80);
            if(values.length>1){
                const min=Math.min(...values),range=Math.max(...values)-min||1;
                const points=values.map((v,j)=>[28+j*968/(values.length-1),310-(v-min)/range*190]);
                ctx.beginPath();points.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle='#55e0e5';ctx.lineWidth=3;ctx.stroke();
                ctx.lineTo(996,330);ctx.lineTo(28,330);ctx.closePath();const grad=ctx.createLinearGradient(0,110,0,330);grad.addColorStop(0,'#29bfc84a');grad.addColorStop(1,'#29bfc802');ctx.fillStyle=grad;ctx.fill();
            }
        } else if(i===1){
            const counts=Array(10).fill(0);market?.digits.forEach(d=>counts[d]++);
            counts.forEach((n,d)=>{const h=n/Math.max(1,...counts)*210;ctx.fillStyle=d===market?.digits.at(-1)?'#f6c478':'#369fae';ctx.fillRect(37+d*97,320-h,61,h);ctx.fillStyle='#c2e1e5';ctx.font='22px monospace';ctx.fillText(String(d),57+d*97,351);ctx.fillText(String(n),49+d*97,309-h);});
        } else {
            const pnl=tradeHistory.reduce((sum,t)=>sum+t.payout,0),wins=tradeHistory.filter(t=>t.isWon).length;
            const labels=['BALANCE USD','PNL USD','WINRATE','TRADES'];
            const stats=[currentBalance.toFixed(2),`${pnl>=0?'+':''}${pnl.toFixed(2)}`,tradeHistory.length?`${(wins/tradeHistory.length*100).toFixed(1)}%`:'—',String(tradeHistory.length)];
            stats.forEach((value,j)=>{const x=40+j%2*490,y=130+Math.floor(j/2)*125;ctx.fillStyle='#89a7b8';ctx.font='20px sans-serif';ctx.fillText(labels[j],x,y);ctx.fillStyle=j===1&&pnl<0?'#ed8193':'#9fe8d9';ctx.font='bold 40px monospace';ctx.fillText(value,x,y+52);});
        }
        texture.needsUpdate=true;
    });
};
let officeLastFrame=0;
animate=function(timestamp=performance.now()){
    requestAnimationFrame(animate);
    const dt=officeLastFrame?Math.min((timestamp-officeLastFrame)/1000,.05):1/60;officeLastFrame=timestamp;
    people.forEach(p=>p.update(dt));updateTradingScreens();updateCameraPosition();updateFloatingBadges();
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
