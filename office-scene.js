// Scene geometry and character motion share the same seat definitions.
const officeSeats = new Map();
const officeObstacles = [];
const officeScreens = [];

// Variable global para el Modo Turbo (multiplicador de velocidad)
let isTurboMode = false;
window.toggleTurboMode = function() {
    isTurboMode = !isTurboMode;
    const btn = document.getElementById('turbo-mode-btn');
    if(btn) {
        btn.style.background = isTurboMode ? '#10b981' : '#1e293b';
        btn.textContent = isTurboMode ? '⚡ MODO TURBO: ON' : '⚡ MODO TURBO: OFF';
    }
};

const officePalette = {
    shell: new THREE.MeshStandardMaterial({color:0x162b3b,roughness:.62,metalness:.35}),
    edge: new THREE.MeshStandardMaterial({color:0x40596b,roughness:.32,metalness:.7}),
    cushion: new THREE.MeshStandardMaterial({color:0x21384a,roughness:.92}),
    dark: new THREE.MeshStandardMaterial({color:0x080f1c,roughness:.6}),
    cyan: new THREE.MeshStandardMaterial({color:0x49cbd3,emissive:0x2697a6,emissiveIntensity:1.3}),
    white: new THREE.MeshStandardMaterial({color:0xc4d9e2,roughness:.65}),
    leaf: new THREE.MeshStandardMaterial({color:0x238772,roughness:.85}),
    // Deck finishes for the departmental floor plan.
    deck: new THREE.MeshStandardMaterial({color:0x1d3752,roughness:.55,metalness:.45}),
    deckDark: new THREE.MeshStandardMaterial({color:0x10203a,roughness:.72,metalness:.28}),
    panel: new THREE.MeshStandardMaterial({color:0x122334,roughness:.45,metalness:.55}),
    metal: new THREE.MeshStandardMaterial({color:0x33506a,roughness:.3,metalness:.9}),
    glass: new THREE.MeshStandardMaterial({color:0x69b6cf,transparent:true,opacity:.14,roughness:.05,metalness:.25,side:THREE.DoubleSide,depthWrite:false}),
    glassDark: new THREE.MeshStandardMaterial({color:0x2d4d66,transparent:true,opacity:.2,roughness:.08,metalness:.3,side:THREE.DoubleSide,depthWrite:false}),
    glowCyan: new THREE.MeshBasicMaterial({color:0x6ff0f6,toneMapped:false}),
    glowPink: new THREE.MeshBasicMaterial({color:0xf07bd8,toneMapped:false}),
    glowAmber: new THREE.MeshBasicMaterial({color:0xffb45e,toneMapped:false}),
    glowGreen: new THREE.MeshBasicMaterial({color:0x63f0ae,toneMapped:false})
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

// ── Futuristic deck fittings: zone tags, neon guides, glazing, data panels ──
const officeTags=[],officeNeonStrips=[],officeRackLeds=[],officeHoloRings=[],officeZoneScreens=[];
// Walkable footprint: the office slab plus the outside terrace.
const officeNavigableRects=[{minX:-28,maxX:28,minZ:-18,maxZ:20.5}];

// Floating callout tag with a leader line down to the floor, as on the floor plan.
function officeTag(text,x,z,y=5.4,width=10,accent='#7fe8ef',baseY=0) {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=176;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='rgba(5,13,24,0.9)';ctx.fillRect(0,0,1024,176);
    ctx.strokeStyle=accent;ctx.lineWidth=5;ctx.strokeRect(9,9,1006,158);
    ctx.fillStyle=accent;ctx.textAlign='center';ctx.textBaseline='middle';
    let size=58;ctx.font=`700 ${size}px "JetBrains Mono",monospace`;
    while(ctx.measureText(text).width>950&&size>24){size-=2;ctx.font=`700 ${size}px "JetBrains Mono",monospace`;}
    ctx.fillText(text,512,92);
    const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
    const height=width*176/1024;
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
    panel.position.set(x,y,z);panel.renderOrder=4;scene.add(panel);officeTags.push(panel);
    const stemHeight=Math.max(.3,y-height/2-baseY);
    const stem=officeBox(scene,.05,stemHeight,.05,x,baseY+stemHeight/2,z,officePalette.metal,.01);
    stem.castShadow=false;stem.receiveShadow=false;
    const dot=new THREE.Mesh(new THREE.CircleGeometry(.24,20),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.7,toneMapped:false,side:THREE.DoubleSide}));
    dot.rotation.x=-Math.PI/2;dot.position.set(x,baseY+.03,z);scene.add(dot);
    return panel;
}
function officeNeon(x1,z1,x2,z2,material=officePalette.glowCyan,width=.1,y=.05) {
    const dx=x2-x1,dz=z2-z1,length=Math.hypot(dx,dz);
    if(length<.05)return null;
    const strip=officeBox(scene,width,.04,length,(x1+x2)/2,y,(z1+z2)/2,material,.012);
    strip.rotation.y=Math.atan2(dx,dz);strip.castShadow=false;strip.receiveShadow=false;
    officeNeonStrips.push(strip);return strip;
}
function officeZoneOutline(minX,maxX,minZ,maxZ,material=officePalette.glowCyan,width=.08) {
    officeNeon(minX,minZ,maxX,minZ,material,width);
    officeNeon(minX,maxZ,maxX,maxZ,material,width);
    officeNeon(minX,minZ,minX,maxZ,material,width);
    officeNeon(maxX,minZ,maxX,maxZ,material,width);
}
function officeGlassWall(x1,z1,x2,z2,height=2.6,material=officePalette.glass,baseY=0) {
    const dx=x2-x1,dz=z2-z1,length=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),cx=(x1+x2)/2,cz=(z1+z2)/2;
    const glass=officeBox(scene,.06,height,length,cx,baseY+height/2+.02,cz,material,.008);
    glass.rotation.y=yaw;glass.castShadow=false;glass.receiveShadow=false;
    const cap=officeBox(scene,.13,.07,length,cx,baseY+height+.05,cz,officePalette.metal,.02);cap.rotation.y=yaw;
    const edge=officeBox(scene,.05,.03,length,cx,baseY+.04,cz,officePalette.glowCyan,.006);edge.rotation.y=yaw;edge.castShadow=false;
    for(const t of [0,1]){
        const px=x1+dx*t,pz=z1+dz*t;
        officeBox(scene,.16,height+.16,.16,px,baseY+(height+.16)/2,pz,officePalette.metal,.02);
    }
    return glass;
}
function officeFloorPlate(minX,maxX,minZ,maxZ,material,y=.02) {
    const plate=officeBox(scene,maxX-minX,.05,maxZ-minZ,(minX+maxX)/2,y-.025,(minZ+maxZ)/2,material,.02);
    plate.castShadow=false;return plate;
}
// Framed live data panel; its canvas is redrawn by updateZoneScreens.
function officeCanvasPanel(x,y,z,width,height,rotationY,kind,opts={}) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=288;
    const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
    officeZoneScreens.push({ctx:canvas.getContext('2d'),texture,kind,opts});
    const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=rotationY;scene.add(group);
    officeBox(group,width+.18,height+.18,.12,0,0,0,officePalette.dark,.03);
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
    screen.position.z=.07;group.add(screen);
    return group;
}
function makeServerRack(x,z,yaw=0) {
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=yaw;scene.add(group);
    officeBox(group,1.25,2.3,1.15,0,1.18,0,officePalette.panel,.05);
    officeBox(group,1.33,.09,1.23,0,2.36,0,officePalette.metal,.03);
    officeBox(group,1.08,1.9,.08,0,1.2,.55,officePalette.dark,.02);
    for(let i=0;i<3;i++)officeBox(group,.95,.05,.03,0,.6+i*.58,.61,i===1?officePalette.cyan:officePalette.edge,.008);
    const led=officeBox(group,.18,.06,.03,.5,2.24,.61,officePalette.glowGreen,.01);
    led.castShadow=false;officeRackLeds.push({mesh:led,offset:Math.random()*6.283});
    return group;
}
// One wide display sliced across the cyber-security video wall.
function officeCyberWallTexture() {
    const canvas=document.createElement('canvas');canvas.width=2560;canvas.height=300;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#04101c';ctx.fillRect(0,0,2560,300);
    ctx.strokeStyle='#0e3a4d';ctx.lineWidth=1;
    for(let x=0;x<2560;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,300);ctx.stroke();}
    for(let y=0;y<300;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(2560,y);ctx.stroke();}
    const headings=[[60,'RADAR'],[620,'NETWORK TRAFFIC'],[1180,'GLOBAL MAP'],[1740,'THREAT MATRIX'],[2300,'SESSION LOG']];
    ctx.font='700 22px monospace';ctx.fillStyle='#5ff0e0';
    headings.forEach(([ox,label])=>ctx.fillText(label,ox,34));
    ctx.strokeStyle='#2fbfae';ctx.lineWidth=2;
    for(let r=30;r<=110;r+=27){ctx.beginPath();ctx.arc(180,170,r,0,Math.PI*2);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(180,170);ctx.lineTo(262,112);ctx.strokeStyle='#7ff6e2';ctx.stroke();
    ctx.fillStyle='#7ff6e2';
    for(let i=0;i<16;i++){const a=i*1.7,r=28+(i*17)%82;ctx.beginPath();ctx.arc(180+Math.cos(a)*r,170+Math.sin(a)*r,3,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#5ff0e0';ctx.lineWidth=3;ctx.beginPath();
    for(let i=0;i<=26;i++){const px=640+i*20,py=230-Math.abs(Math.sin(i*1.1))*88-(i%5)*7;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}
    ctx.stroke();
    ctx.fillStyle='#2f8fa8';
    for(let gx=1200;gx<1700;gx+=11)for(let gy=56;gy<280;gy+=11){if(Math.sin(gx*.21)*Math.cos(gy*.17)>.25)ctx.fillRect(gx,gy,5,5);}
    ctx.fillStyle='#ffd27f';
    for(let i=0;i<12;i++){const gx=1220+(i*97)%440,gy=76+(i*61)%180;ctx.beginPath();ctx.arc(gx,gy,5,0,Math.PI*2);ctx.fill();}
    for(let i=0;i<16;i++){const px=1760+((i*57)%420),hgt=24+Math.abs(Math.sin(i*1.7))*150;ctx.fillStyle=i%3?'#3ad6c0':'#f4a259';ctx.fillRect(px,268-hgt,18,hgt);}
    ctx.fillStyle='#7ff6e2';ctx.font='16px monospace';
    for(let i=0;i<7;i++)ctx.fillText(`[${String(i*7+3).padStart(3,'0')}] ${['HANDSHAKE OK','PACKET FILTER','NODE SYNC','ANOMALY SCAN','TLS ROTATE','EDGE PROBE','LEDGER SEALED'][i]}`,2312,84+i*30);
    return new THREE.CanvasTexture(canvas);
}
function makeAdminOffice(minX,maxX,minZ,maxZ,index) {
    const width=maxX-minX,cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,hasDesk=index!==0;
    officeFloorPlate(minX,maxX,minZ,maxZ,officePalette.deck);
    // La pared oeste se parte en dos tramos para dejar la puerta al pasillo.
    officeGlassWall(minX-.22,minZ,minX-.22,cz-1.3,2.3,officePalette.glassDark);
    officeGlassWall(minX-.22,cz+1.3,minX-.22,maxZ,2.3,officePalette.glassDark);
    officeGlassWall(minX,maxZ+.22,maxX,maxZ+.22,2.3,officePalette.glassDark);
    officeObstacles.push({minX:minX-.45,maxX:minX-.02,minZ:minZ-.1,maxZ:cz-1.3},
                         {minX:minX-.45,maxX:minX-.02,minZ:cz+1.3,maxZ:maxZ+.1},
                         {minX:minX-.1,maxX:maxX+.1,minZ:maxZ+.05,maxZ:maxZ+.45});
    if(hasDesk){
        officeBox(scene,width-.8,.16,1.4,cx,.86,cz,officePalette.panel,.06);
        for(const dx of [-(width-2)/2,(width-2)/2])for(const dz of [-.5,.5])officeBox(scene,.12,.78,.12,cx+dx,.39,cz+dz,officePalette.metal,.03);
        officeMonitor(scene,cx-.5,1.7,cz-.1,1.5,.85);
        officeBox(scene,.72,.05,.5,cx+1.0,1.31,cz+.25,officePalette.white,.02);
        makeOfficeChair(registerSeat(`admin-${index}`,cx,cz+1.95,Math.PI,'desk',[cx+1.4,0,cz+2.4]));
        officeObstacles.push({minX:cx-(width-.8)/2-.1,maxX:cx+(width-.8)/2+.1,minZ:cz-.8,maxZ:cz+.8});
    }
    officeBox(scene,1.7,1.5,.42,maxX-.95,1.22,minZ+.45,officePalette.edge,.05);
    const sign=officeLabel(`ADMIN 0${index+1}`,1.7,.3,'#ffc478');sign.position.set(cx,2.5,minZ+.4);scene.add(sign);
    officeZoneOutline(minX,maxX,minZ,maxZ,officePalette.glowAmber,.05);
}
function makeMeetingTable(x,z,width,depth,baseY=0) {
    officeBox(scene,width,.16,depth,x,baseY+.9,z,officePalette.white,.07);
    for(const dx of [-width/2+.7,width/2-.7])for(const dz of [-depth/2+.5,depth/2-.5])
        officeBox(scene,.12,.82,.12,x+dx,baseY+.41,z+dz,officePalette.metal,.03);
}

// Duty station: the furniture sits in front of the seat, so the agent always faces its console.
function makeDutyStation(id,x,z,label,opts={}) {
    const compact=!!opts.compact,yaw=opts.yaw===0?0:Math.PI,dir=yaw===Math.PI?-1:1;
    const width=compact?1.6:3.6,depth=compact?.95:1.55,accent=opts.accent||officePalette.glowCyan;
    const group=new THREE.Group();group.position.set(x,0,z+dir*(depth/2+.85));group.rotation.y=yaw;scene.add(group);
    officeBox(group,width,.16,depth,0,.82,0,officePalette.panel,.06);
    if(compact){
        officeCylinder(group,.14,.74,0,.37,0,officePalette.metal);
        officeMonitor(group,0,1.64,0,1.3,.78);
    } else {
        for(const dx of [-1.4,1.4])officeBox(group,.12,.74,.12,dx,.37,0,officePalette.metal,.03);
        officeMonitor(group,-.75,1.64,0,1.6,.9);
        officeMonitor(group,1.05,1.64,-.1,1.15,.72);
        officeBox(group,1.1,.05,.45,.95,.9,.28,officePalette.dark,.02);
    }
    const glow=officeBox(group,width,.04,.05,0,.94,depth/2-.02,accent,.01);glow.castShadow=false;
    if(label){const sign=officeLabel(label,compact?1.9:3.2,.32,opts.signColor||'#9fe8f4');sign.position.set(0,compact?1.3:1.36,depth/2+.16);group.add(sign);}
    makeOfficeChair(registerSeat(`work-${id}`,x,z,yaw,'desk',[x+1.5,0,z+dir*.5]));
    const near=Math.min(z+dir*(depth/2+.95),z+dir*(depth/2+.15)),far=Math.max(z+dir*(depth/2+.95),z+dir*(depth/2+.15));
    officeObstacles.push({minX:x-width/2-.2,maxX:x+width/2+.2,minZ:near,maxZ:far});
    return group;
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

function makeWorkstation(id,x,z,index,label) {
    const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
    officeBox(group,6.3,.17,2.8,0,1.94,0,officePalette.deck);
    officeBox(group,6,.045,.045,0,1.94,1.41,officePalette.cyan);
    const rim=officeBox(group,6.1,.03,.04,0,1.86,-1.42,officePalette.glowCyan,.008);rim.castShadow=false;
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
    if(label){const sign=officeLabel(label,3,.45);sign.position.set(0,1.46,1.43);group.add(sign);}
    // Only the three named desks own a workstation seat; the rest are deck dressing.
    const seatId=id?`work-${id}`:`desk-${Math.round(x*10)}-${Math.round(z*10)}`;
    makeOfficeChair(registerSeat(seatId,x,z+2.5,Math.PI,'desk',[x+1.7,0,z+2.7]));
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
    Object.assign(key.shadow.camera,{left:-38,right:38,top:32,bottom:-32,near:1,far:90});
    key.shadow.mapSize.set(2048,2048);key.shadow.normalBias=.04;key.shadow.bias=-.0002;scene.add(key);
    const rim=new THREE.DirectionalLight(0x4aa6be,.7);rim.position.set(14,16,-22);scene.add(rim);
    // Departmental accents: cyan operations, magenta strategy, amber administration, blue macro desk.
    for(const [x,y,z,color,intensity,distance] of [
        [-22.5,3.4,1.4,0x35d6e6,1.6,26],
        [0,4.2,13.2,0xe86fd0,1.5,24],
        [22,3.8,.4,0xffb45e,1.2,24],
        [22,4.2,-13,0x5fa8ff,1.3,26],
        [21.6,3.2,14.4,0x63f0ae,1,22],
        [-22.5,3,13.5,0xffd27f,1,22]
    ]){
        const light=new THREE.PointLight(color,intensity,distance,2);
        light.position.set(x,y,z);light.userData.accent=true;scene.add(light);
    }

    // ── Shell: deck, navigable grid, glazing and the data wall ───────────
    officeBox(scene,62,.3,45,0,-.18,0,officePalette.deckDark);
    const grid=new THREE.GridHelper(58,58,0x3a6d8a,0x24445e);grid.position.y=-.03;scene.add(grid);
    officeBox(scene,58,10,.5,0,5,-20,officePalette.shell);
    for(let x=-27;x<=27;x+=6)officeBox(scene,.05,9,.06,x,4.5,-19.72,officePalette.edge,.008);
    officeBox(scene,56,.055,.1,0,9.35,-19.65,officePalette.cyan);
    const brand=officeLabel('CASA TRADE / DECISION FLOOR',24,1);brand.position.set(0,8.45,-19.7);scene.add(brand);
    const windowMat=new THREE.MeshStandardMaterial({color:0x45788c,transparent:true,opacity:.13,roughness:.18,metalness:.25,side:THREE.DoubleSide,depthWrite:false});
    for(let z=-18;z<=15;z+=6){
        officeBox(scene,.16,9,.16,-29,4.5,z,officePalette.edge);
        officeBox(scene,.045,8.4,5.8,-29,4.5,z+2.9,windowMat,.01);
    }
    officeBox(scene,.5,10,13.6,29.15,5,-12.2,officePalette.shell);
    for(let z=-18;z<=-6.6;z+=3.4)officeBox(scene,.06,9,.05,28.86,4.5,z,officePalette.edge,.008);
    officeBox(scene,.14,.06,13.6,28.84,9.3,-12.2,officePalette.cyan);
    for(let z=-4;z<=18;z+=6){
        officeBox(scene,.16,9,.16,29,4.5,z,officePalette.edge);
        officeBox(scene,.045,8.4,5.8,29,4.5,z+2.9,windowMat,.01);
    }
    for(let i=0;i<12;i++){
        const height=5+(i*7%13);officeBox(scene,3.2,height,3,-35-(i%3)*4,height/2-3,-23+i*4,officePalette.dark);
        for(let j=0;j<4;j++)officeBox(scene,.035,.12,1.6,-33.38-(i%3)*4,j*1.6,-23+i*4,officePalette.cyan,.006);
    }
    // Circulation: two north-south aisles around the trading hall plus the cross corridor.
    officeNeon(-13.6,-19,-13.6,20.4,officePalette.glowCyan,.1);
    officeNeon(13.6,-19,13.6,20.4,officePalette.glowCyan,.1);
    officeNeon(-15.25,7.5,15.25,7.5,officePalette.glowCyan,.1);
    officeNeon(-28.4,7.5,-16.3,7.5,officePalette.glowPink,.07);
    officeNeon(16.3,7.5,28.4,7.5,officePalette.glowPink,.07);
    officeZoneOutline(-12,12,-16.5,8,officePalette.glowCyan,.06);

    // ── Sala de trading principal: tres filas de mesas isla ─────────────
    const deskRows=[-12,-7,-2],deskCols=[-7.2,0,7.2];
    const namedDesks={
        'analyst':{x:-7.2,z:-7,label:'01 / ANALYST'},
        'tester':{x:0,z:-7,label:'02 / VALIDATION'},
        'manager':{x:7.2,z:-7,label:'03 / EXECUTION'}
    };
    for(const z of deskRows)for(const x of deskCols){
        const named=Object.entries(namedDesks).find(([,spec])=>spec.x===x&&spec.z===z);
        makeWorkstation(named?named[0]:null,x,z,0,named?named[1].label:null);
    }
    // Client research desk keeps its five visiting seats in the south-east of the hall.
    officeBox(scene,7.6,.17,3.2,7,1.94,5.2,officePalette.deck);
    for(const dx of [-3.4,3.4])officeBox(scene,.4,1.8,2.4,7+dx,.9,5.2,officePalette.edge);
    officeObstacles.push({minX:2.9,maxX:11.1,minZ:3.4,maxZ:7});
    [[4.6,2.7,0],[7,2.7,0],[9.4,2.7,0],[5.8,7.7,Math.PI],[8.6,7.7,Math.PI]].forEach(([x,z,yaw],i)=>{
        const seat=registerSeat(`work-client${i+1}`,x,z,yaw,'meeting',[x+1.4,0,z+(yaw===0?-.6:.6)]);
        makeOfficeChair(seat);
        officeBox(scene,1.6,.065,.9,x,2.05,z+(yaw===0?1.6:-1.6),officePalette.dark);
    });
    const tableSign=officeLabel('RESEARCH / CLIENT DESK',7,.5);tableSign.rotation.x=-Math.PI/2;tableSign.position.set(7,.02,3.1);scene.add(tableSign);

    // ── Ingeniería de estrategias: pod acristalado con mesa holográfica ──
    officeFloorPlate(-9,9,9,17.6,new THREE.MeshStandardMaterial({color:0x141033,roughness:.6,metalness:.4}));
    officeZoneOutline(-9,9,9,17.6,officePalette.glowPink,.07);
    officeGlassWall(-9,9,9,9,2.6,officePalette.glassDark);
    officeGlassWall(-9,9,-9,17.6,2.6,officePalette.glassDark);
    officeGlassWall(9,9,9,17.6,2.6,officePalette.glassDark);
    officeCylinder(scene,.95,1.3,0,.66,13.2,officePalette.panel);
    officeCylinder(scene,2.6,.18,0,1.38,13.2,officePalette.metal);
    const holoDisc=new THREE.Mesh(new THREE.CircleGeometry(2.35,40),new THREE.MeshBasicMaterial({map:officeCyberWallTexture(),toneMapped:false}));
    holoDisc.rotation.x=-Math.PI/2;holoDisc.position.set(0,1.49,13.2);scene.add(holoDisc);
    for(let i=0;i<3;i++){
        const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05+i*.6,.035,8,48),i%2?officePalette.glowCyan:officePalette.glowPink);
        ring.rotation.x=-Math.PI/2;ring.position.set(0,2.15+i*.45,13.2);ring.userData.base=2.15+i*.45;
        scene.add(ring);officeHoloRings.push(ring);
    }
    for(let i=0;i<6;i++){
        const angle=i*Math.PI/3,x=Math.sin(angle)*3.5,z=13.2+Math.cos(angle)*3.5;
        makeOfficeChair(registerSeat(`strategy-${i}`,x,z,angle+Math.PI,'meeting',[Math.sin(angle)*4.8,0,13.2+Math.cos(angle)*4.8]));
    }
    officeObstacles.push({minX:-3.4,maxX:3.4,minZ:9.9,maxZ:16.5});
    // Los dos lectores de rango viven en el pod: 0-3 OVER al oeste y 9-7 UNDER al este.
    makeDutyStation('over-scout',-6.3,12.7,'LECTOR 0-3 · OVER',{accent:officePalette.glowCyan,signColor:'#8fe8ff'});
    makeDutyStation('under-scout',6.3,12.7,'LECTOR 9-7 · UNDER',{accent:officePalette.glowPink,signColor:'#ffa8e4'});
    officeCanvasPanel(-6.3,3.3,9.06,3.4,1.6,0,'window',{low:0,high:3,contract:'OVER',accent:'#8fe8ff'});
    officeCanvasPanel(6.3,3.3,9.06,3.4,1.6,0,'window',{low:7,high:9,contract:'UNDER',accent:'#ffa8e4'});
    const strategySign=officeLabel('ESTRATEGIAS / BACKTEST LAB',8,.5);strategySign.rotation.x=-Math.PI/2;strategySign.position.set(0,.02,16.7);scene.add(strategySign);

    // ── Ala oeste: zona de servidores ───────────────────────────────────
    officeZoneOutline(-28.6,-16.4,-19,-7,officePalette.glowCyan,.08);
    for(const bankZ of [-16.6,-9.6]){
        for(const side of [-1,1])for(let i=0;i<6;i++)makeServerRack(-27.5+i*2,bankZ+side*1.35,side<0?0:Math.PI);
        officeBox(scene,10.6,.05,2.1,-22.5,.04,bankZ,officePalette.panel,.02).castShadow=false;
        officeObstacles.push({minX:-28.6,maxX:-16.4,minZ:bankZ-2.1,maxZ:bankZ+2.1});
    }
    // Operación de servidores: puesto compacto en el pasillo frío entre los dos bancos.
    makeDutyStation('server-ops',-22.5,-12.2,'OPERACIÓN DE SERVIDORES',{compact:true,accent:officePalette.glowGreen,signColor:'#9ff0c8'});
    officeCanvasPanel(-17.4,2.7,-13.1,3.6,1.8,-Math.PI/2,'racks');

    // ── Ala oeste: ciberseguridad ───────────────────────────────────────
    const cyberFloorTexture=(()=>{
        const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#050b14';ctx.fillRect(0,0,128,128);
        ctx.strokeStyle='#0d2735';ctx.lineWidth=2;
        for(let i=0;i<=128;i+=16){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,128);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(128,i);ctx.stroke();}
        const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(6,6);return texture;
    })();
    officeFloorPlate(-28.6,-16,-5.5,6.5,new THREE.MeshStandardMaterial({map:cyberFloorTexture,color:0xffffff,roughness:.85,metalness:.2}));
    const cyberWall=officeCyberWallTexture();
    for(let i=0;i<5;i++){
        const px=-26.65+i*2.15,pz=-4.6-Math.abs(2-i)*.32;
        const group=new THREE.Group();group.position.set(px,0,pz);group.rotation.y=(2-i)*.13;scene.add(group);
        officeBox(group,2.1,2.0,.16,0,2.85,0,officePalette.dark,.04);
        const map=cyberWall.clone();map.needsUpdate=true;map.repeat.set(.2,1);map.offset.set((4-i)*.2,0);
        const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.8),new THREE.MeshBasicMaterial({map,toneMapped:false}));
        screen.position.set(0,2.85,.09);group.add(screen);
    }
    officeObstacles.push({minX:-27.9,maxX:-17.1,minZ:-5.4,maxZ:-4.1});
    for(const x of [-26.2,-22.5,-18.8]){
        officeBox(scene,3,.16,1.35,x,1.03,1.5,officePalette.panel,.05);
        officeBox(scene,2.7,.62,.9,x,.65,1.5,officePalette.dark,.03);
        officeMonitor(scene,x-.6,1.85,1.5,1.5,.85);
        officeMonitor(scene,x+.62,1.85,1.5,1.4,.8);
        const consoleId=x===-18.8?'work-cyber-ops':`cyber-console-${Math.round(x*10)}`;
        makeOfficeChair(registerSeat(consoleId,x,3.1,Math.PI,'desk',[x+1.4,0,3.5]));
    }
    officeObstacles.push({minX:-27.9,maxX:-17.1,minZ:.7,maxZ:2.7});
    officeCanvasPanel(-16.4,2.7,1.6,3.2,1.7,-Math.PI/2,'risk');
    officeCylinder(scene,1.5,.95,-22.5,.47,4.9,officePalette.panel);
    const mapDisc=new THREE.Mesh(new THREE.CircleGeometry(1.4,32),new THREE.MeshBasicMaterial({map:cyberWall.clone(),toneMapped:false}));
    mapDisc.rotation.x=-Math.PI/2;mapDisc.position.set(-22.5,.96,4.9);scene.add(mapDisc);
    for(let i=0;i<4;i++){
        const angle=i*Math.PI/2+Math.PI/4;
        const px=-22.5+Math.sin(angle)*2.3,pz=4.9+Math.cos(angle)*2.3;
        makeOfficeChair(registerSeat(`cyber-map-${i}`,px,pz,angle+Math.PI,'meeting',[-22.5+Math.sin(angle)*3.3,0,4.9+Math.cos(angle)*3.3]));
    }
    officeObstacles.push({minX:-24.5,maxX:-20.5,minZ:2.8,maxZ:6.3});
    officeGlassWall(-16,-5.5,-16,.4,2.6,officePalette.glassDark);
    officeGlassWall(-16,3,-16,6.5,2.6,officePalette.glassDark);
    officeObstacles.push({minX:-16.3,maxX:-15.7,minZ:-5.5,maxZ:.4},{minX:-16.3,maxX:-15.7,minZ:3,maxZ:6.5});

    // ── Ala oeste sur: descanso y ping-pong ─────────────────────────────
    officeZoneOutline(-28.4,-16.6,8,20.2,officePalette.glowGreen,.06);
    officeBox(scene,1.5,2.3,.9,-28.1,1.15,9.4,officePalette.shell,.05);
    officeBox(scene,1.4,.1,.7,-28.1,1.3,9.4,officePalette.glowCyan,.02).castShadow=false;
    officeBox(scene,1.3,1.9,.8,-28.2,.95,11.3,officePalette.panel,.05);
    officeBox(scene,1.1,.5,.55,-28.2,1.1,11.3,officePalette.glowAmber,.02).castShadow=false;
    officeObstacles.push({minX:-28.6,maxX:-27.4,minZ:8.8,maxZ:11.9});

    // ── Terraza exterior: al mismo nivel del piso, con pérgola y barandilla ─
    const terrace={minX:-29.6,maxX:-13.4,minZ:20.2,maxZ:29.2};
    const woodDeck=new THREE.MeshStandardMaterial({color:0x4a3b2c,roughness:.95,metalness:.05});
    officeBox(scene,terrace.maxX-terrace.minX,.24,terrace.maxZ-terrace.minZ,(terrace.minX+terrace.maxX)/2,-.13,(terrace.minZ+terrace.maxZ)/2,officePalette.deckDark,.05).receiveShadow=true;
    for(let x=terrace.minX+1.1;x<terrace.maxX-1;x+=1.7){
        const plank=officeBox(scene,1.4,.035,terrace.maxZ-terrace.minZ-1.2,x,.005,(terrace.minZ+terrace.maxZ)/2,woodDeck,.01);
        plank.castShadow=false;
    }
    officeNeon(terrace.minX+1,terrace.maxZ-.9,terrace.maxX-1,terrace.maxZ-.9,officePalette.glowAmber,.08);
    officeNeon(terrace.minX+1,terrace.minZ+.9,terrace.minX+1,terrace.maxZ-.9,officePalette.glowAmber,.06);
    // Barandilla de cristal en los tres bordes exteriores.
    officeGlassWall(terrace.minX,terrace.minZ,terrace.minX,terrace.maxZ,1.15,officePalette.glass);
    officeGlassWall(terrace.minX,terrace.maxZ,terrace.maxX,terrace.maxZ,1.15,officePalette.glass);
    officeGlassWall(terrace.maxX,terrace.minZ,terrace.maxX,terrace.maxZ,1.15,officePalette.glass);
    // Pérgola con lamas y luces colgantes (techo propio de la terraza).
    const pergolaTop=officeBox(scene,terrace.maxX-terrace.minX,.16,terrace.maxZ-terrace.minZ,(terrace.minX+terrace.maxX)/2,3.6,(terrace.minZ+terrace.maxZ)/2,officePalette.metal,.05);
    pergolaTop.castShadow=false;
    for(let x=terrace.minX+.6;x<terrace.maxX;x+=1.1){
        const slat=officeBox(scene,.14,.1,terrace.maxZ-terrace.minZ-1,x,3.72,(terrace.minZ+terrace.maxZ)/2,officePalette.deck,.02);
        slat.castShadow=false;
    }
    for(const [px,pz] of [[terrace.minX+.4,terrace.minZ+.4],[terrace.minX+.4,terrace.maxZ-.4],[terrace.maxX-.4,terrace.minZ+.4],[terrace.maxX-.4,terrace.maxZ-.4],[(terrace.minX+terrace.maxX)/2,terrace.minZ+.4],[(terrace.minX+terrace.maxX)/2,terrace.maxZ-.4]])
        officeBox(scene,.22,3.6,.22,px,1.8,pz,officePalette.metal,.04);
    for(let x=terrace.minX+2;x<terrace.maxX-1;x+=3.4){
        const bulb=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),officePalette.glowAmber);
        bulb.position.set(x,3.15,(terrace.minZ+terrace.maxZ)/2);scene.add(bulb);
    }
    // Sofás de exterior: seis plazas de descanso (rest-8 .. rest-13).
    [23.4,27.6].forEach((z,row)=>{
        const yaw=row?Math.PI:0;
        officeBox(scene,8.4,.6,1.7,-24.4,.5,z,officePalette.shell,.05);
        officeBox(scene,8.4,1.1,.3,-24.4,1.12,z+(row?.7:-.7),officePalette.cushion);
        for(let i=0;i<3;i++){
            const x=-27.4+i*3;
            officeBox(scene,2.6,.22,1.4,x,.84,z,officePalette.cushion);
            registerSeat(`rest-${8+row*3+i}`,x,z,yaw,'lounge',[x,0,z+(row?-1.5:1.5)]);
        }
        officeObstacles.push({minX:-28.4,maxX:-20.4,minZ:z+(row?.85:-1.4),maxZ:z+(row?1.4:-.85)});
    });
    officeBox(scene,4.4,.12,1.6,-17.4,.78,25.4,officePalette.shell);
    for(const x of [-19.1,-15.7])officeBox(scene,.22,.68,1.1,x,.34,25.4,officePalette.edge);
    officeObstacles.push({minX:-19.9,maxX:-14.9,minZ:24.5,maxZ:26.3});
    officeBox(scene,3.4,.14,1.1,-16.6,.98,28.2,officePalette.panel,.05);
    officeObstacles.push({minX:-18.4,maxX:-14.8,minZ:27.5,maxZ:28.9});
    officeBox(scene,2.4,1.9,.9,-28.6,.95,23.4,officePalette.panel,.05);
    officeBox(scene,1.8,.7,.6,-28.6,1.35,23.4,officePalette.glowAmber,.03).castShadow=false;
    officeCanvasPanel(-21.5,3.1,29.06,4.8,2.3,Math.PI,'macro');
    [[-14.4,21.2],[-28.8,28.6],[-14.4,28.6],[-28.8,21.2]].forEach(([x,z])=>makePlant(x,z));
    officeNavigableRects.push({minX:-29.2,maxX:-13.8,minZ:20.2,maxZ:28.8});
    officeTag('TERRAZA / AIRE LIBRE',-21.5,22.6,5,10,'#ffd79f');

    // ── Techo con lucernario: cubierta traslúcida y cristal central ──────
    const sideRoof=new THREE.MeshStandardMaterial({color:0x162c40,transparent:true,opacity:.42,roughness:.6,metalness:.35,side:THREE.DoubleSide,depthWrite:false});
    const centralRoof=new THREE.MeshStandardMaterial({color:0x9fd6ec,transparent:true,opacity:.14,roughness:.05,metalness:.3,side:THREE.DoubleSide,depthWrite:false});
    for(const [cx,w] of [[-21,15],[21,15]]){
        const panel=officeBox(scene,w,.18,41,cx,9.7,.5,sideRoof,.06);
        panel.castShadow=false;panel.receiveShadow=false;
    }
    const skylight=officeBox(scene,27,.07,41,0,9.92,.5,centralRoof,.03);
    skylight.castShadow=false;skylight.receiveShadow=false;
    for(let z=-19;z<=20;z+=3.2){
        const beam=officeBox(scene,27,.22,.2,0,9.86,z,officePalette.metal,.05);
        beam.castShadow=false;
    }
    for(let x=-12.6;x<=12.6;x+=4.2){
        const beam=officeBox(scene,.2,.22,40.4,x,9.84,.5,officePalette.metal,.05);
        beam.castShadow=false;
    }
    officeBox(scene,58,.24,.5,0,9.85,-20,officePalette.metal,.06).castShadow=false;
    officeBox(scene,58,.24,.5,0,9.85,20.6,officePalette.metal,.06).castShadow=false;

    // ── Ala este: análisis macroeconómico (sala acristalada transitable) ─
    officeFloorPlate(15.4,28.8,-19,-7.1,officePalette.deck);
    officeGlassWall(15.4,-19,15.4,-11.2,2.4,officePalette.glass);
    officeGlassWall(15.4,-8.4,15.4,-7.1,2.4,officePalette.glass);
    officeGlassWall(15.4,-7.1,28.8,-7.1,2.4,officePalette.glass);
    officeObstacles.push({minX:15.1,maxX:15.7,minZ:-19.4,maxZ:-11.2},{minX:15.1,maxX:15.7,minZ:-8.4,maxZ:-7.1},{minX:15.1,maxX:29,minZ:-7.4,maxZ:-6.8});
    [[22.2,-15.6],[22.2,-10.4]].forEach(([x,z])=>{
        makeMeetingTable(x,z,7.6,2.4,0);
        officeObstacles.push({minX:x-3.8,maxX:x+3.8,minZ:z-1.3,maxZ:z+1.3});
        for(const dx of [-2.5,0,2.5]){
            makeOfficeChair(registerSeat(`macro-n-${Math.round(x*10)}-${Math.round(z*10)}-${Math.round(dx*10)}`,x+dx,z-2.3,0,'meeting',[x+dx,0,z-3.1]));
            makeOfficeChair(registerSeat(`macro-s-${Math.round(x*10)}-${Math.round(z*10)}-${Math.round(dx*10)}`,x+dx,z+2.3,Math.PI,'meeting',[x+dx,0,z+3.1]));
        }
    });
    // Analista macro: su puesto mira al tablero de indicadores.
    makeDutyStation('macro-analyst',22.2,-12.7,'ANALISTA MACRO',{yaw:0,accent:officePalette.glowCyan,signColor:'#9fd4ff'});
    for(const [kind,z] of [['macro',-17.6],['market',-14.6],['risk',-11.6],['world',-8.6]])
        officeCanvasPanel(28.72,3.4,z,2.6,1.5,-Math.PI/2,kind);
    officeCylinder(scene,1.4,.9,25.6,-.02,-9.2,officePalette.panel);
    officeCylinder(scene,1.25,.06,25.6,.44,-9.2,officePalette.glowCyan);
    officeObstacles.push({minX:24.1,maxX:27.1,minZ:-10.7,maxZ:-7.7});

    // ── Ala este: administración (despachos transitables) ───────────────
    [[15.6,21.6,-4.8,.4],[22.4,28.4,-4.8,.4],[15.6,21.6,1.6,6.2],[22.4,28.4,1.6,6.2]]
        .forEach(([minX,maxX,minZ,maxZ],i)=>makeAdminOffice(minX,maxX,minZ,maxZ,i));
    // Administración: un despacho con puesto operativo y tablero de recibos.
    makeDutyStation('admin-ops',18.6,-.3,'ADMINISTRACIÓN',{compact:true,accent:officePalette.glowAmber,signColor:'#ffd79f'});
    officeCanvasPanel(21.4,2.6,-5.4,3.4,1.7,0,'receipts');

    // ── Ala este sur: zona de descanso ──────────────────────────────────
    officeZoneOutline(15.6,27.6,9.6,19.2,officePalette.glowGreen,.06);
    [10.6,18.2].forEach((z,row)=>{
        const yaw=row?Math.PI:0;
        officeBox(scene,13,.64,1.8,21.6,.52,z,officePalette.shell);
        officeBox(scene,13,1.45,.35,21.6,1.22,z+(row?.8:-.8),officePalette.cushion);
        for(const x of [15.4,27.8])officeBox(scene,.35,1.1,1.9,x,.65,z,officePalette.cushion);
        for(let i=0;i<4;i++){
            const x=17.1+i*3;
            officeBox(scene,2.7,.24,1.5,x,.86,z,officePalette.cushion);
            registerSeat(`rest-${row*4+i}`,x,z,yaw,'lounge',[x,0,z+(row?-1.5:1.5)]);
        }
        officeObstacles.push({minX:15,maxX:28.2,minZ:z+(row?.85:-1.4),maxZ:z+(row?1.4:-.85)});
    });
    officeBox(scene,9,.12,1.8,21.6,.78,14.4,officePalette.shell);
    for(const x of [18.2,25])officeBox(scene,.25,.7,1.2,x,.36,14.4,officePalette.edge);
    officeObstacles.push({minX:16.8,maxX:26.4,minZ:13.2,maxZ:15.6});
    officeBox(scene,1.2,2.1,.8,28.2,1.05,8.6,officePalette.panel,.05);
    officeBox(scene,1,1.3,.5,28.2,1.3,8.6,officePalette.glowGreen,.02).castShadow=false;
    const loungeSign=officeLabel('LOUNGE / RECHARGE',9,.65);loungeSign.rotation.x=-Math.PI/2;loungeSign.position.set(21.6,.02,19.9);scene.add(loungeSign);

    // ── Rótulos de zona y vegetación ────────────────────────────────────
    officeTag('SALA DE TRADING PRINCIPAL',0,7.9,5.6,12);
    officeTag('INGENIERÍA DE ESTRATEGIAS DE TRADING',0,18.5,5.8,15,'#f0a0e0');
    officeTag('ZONA DE SERVIDORES',-22.5,-19.1,5.2,9);
    officeTag('ZONA DE SERVIDORES',-22.5,-6.6,5.2,9);
    officeTag('CIBERSEGURIDAD',-22.5,7.4,5.2,9,'#78f0c0');
    officeTag('ALA IZQUIERDA',-13.6,15.6,5,8);
    officeTag('ANÁLISIS MACROECONÓMICO',22,-6.3,5.6,12,'#7fc4ff',.5);
    officeTag('ADMINISTRACIÓN',22,7.5,5.4,10,'#ffc478');
    officeTag('ZONA DE DESCANSO',21.6,20.3,5.4,10,'#8ff0c8');
    officeTag('PING-PONG',-22.5,19.8,5,7,'#8ff0c8');
    [[-15.9,-19.2],[15.9,-19.2],[-28.2,17.6],[28.2,17.6],[-13.5,19.8],[13.5,19.8],[-15.9,6.9],[15.9,6.9],[-9.6,8.6],[9.6,8.6]]
        .forEach(([x,z])=>makePlant(x,z));
    cameraTarget.set(0,1.5,2);cameraSpherical={radius:72,theta:.2,phi:.78};
};
buildWallArtAndDecorations=function(){};

function officePath(start,end) {
    const key=(x,z)=>`${x},${z}`;
    const blocked=(x,z)=>officeObstacles.some(o=>x>o.minX&&x<o.maxX&&z>o.minZ&&z<o.maxZ);
    const open=(x,z)=>officeNavigableRects.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ);
    const sx=Math.round(start.x),sz=Math.round(start.z),ex=Math.round(end.x),ez=Math.round(end.z);
    if(sx===ex && sz===ez) return [end.clone()];
    const frontier=[{x:sx,z:sz,g:0,f:0}],best=new Map([[key(sx,sz),0]]),parents=new Map();
    let reached=false;
    while(frontier.length){
        frontier.sort((a,b)=>a.f-b.f);const p=frontier.shift();
        if(p.x===ex&&p.z===ez){reached=true;break;}
        for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
            const x=p.x+dx,z=p.z+dz,k=key(x,z),g=p.g+1;
            if(!open(x,z)||blocked(x,z)||(best.has(k)&&best.get(k)<=g))continue;
            best.set(k,g);parents.set(k,p);frontier.push({x,z,g,f:g+Math.abs(x-ex)+Math.abs(z-ez)});
        }
    }
    if(!reached)return [];
    const route=[end.clone()];let p={x:ex,z:ez};
    while(p.x!==sx||p.z!==sz){route.unshift(new THREE.Vector3(p.x,0,p.z));p=parents.get(key(p.x,p.z));}
    return route;
}

const clientBusinessDialogues = [
    "Negociando expansión de capital para el fondo trimestral.",
    "Revisando contratos de liquidez con la mesa central.",
    "Evaluando propuesta de coinversión en sintéticos.",
    "Coordinando transferencia de activos de alto rendimiento.",
    "Discutiendo diversificación de riesgo en volatilidad alta."
];

const agentThoughts = {
    analyst: [
        "Analizando racha de dígitos en Volatility 10...",
        "Patrón de sobrecompra detectado en tick.",
        "Filtrando confidencia para entrada de contrato.",
        "Carlos revisando tendencia de alta frecuencia."
    ],
    tester: [
        "Verificando respuesta de ejecución de orden...",
        "Sofía validando latencia en el servidor.",
        "Comprobando resultados de contratos Over/Under."
    ],
    manager: [
        "Don Mateo supervisando operaciones globales de la mesa.",
        "Monitoreando rendimiento general del equipo corporativo.",
        "Revisando estabilidad financiera de la sesión actual."
    ],
    client1: clientBusinessDialogues,
    client2: clientBusinessDialogues,
    client3: clientBusinessDialogues,
    client4: clientBusinessDialogues,
    client5: clientBusinessDialogues
};

Person3D=class {
    constructor(cfg,index){
        this.cfg=cfg;this.index=index;
        this.home=officeSeats.get(`work-${cfg.id}`) || officeSeats.get(`work-client1`);
        this.rest=officeSeats.get(`rest-${index}`);
        this.group=new THREE.Group();this.group.userData.person=this;scene.add(this.group);
        this.group.position.copy(this.home.approach);this.group.rotation.y=this.home.yaw;
        this.seat=null;this.goal=null;this.state='standing';this.sitAmount=0;this.time=index*.7;
        this.isSitting=false;this.isWalking=false;this.statusText='Preparando estación';this.interactionTimer=6;
        
        this.createSpeechBubble();
        this.thoughtTimer = Math.random() * 4;

        this.buildBodyParts();
        people.push(this);
    }

    createSpeechBubble() {
        const bubble = document.createElement('div');
        bubble.className = 'agent-speech-bubble';
        
        let borderColor = 'rgba(56, 189, 248, 0.4)';
        let textColor = '#f8fafc';

        if (this.cfg.id === 'analyst') {
            borderColor = 'rgba(239, 68, 68, 0.6)';
            textColor = '#fca5a5';
        } else if (this.cfg.id === 'tester') {
            borderColor = 'rgba(16, 185, 129, 0.6)';
            textColor = '#6ee7b7';
        } else if (this.cfg.id === 'manager') {
            borderColor = 'rgba(245, 158, 11, 0.7)';
            textColor = '#fde68a';
        } else if (this.cfg.isClient) {
            borderColor = 'rgba(139, 92, 246, 0.5)';
            textColor = '#c4b5fd';
        }

        bubble.style.cssText = `
            position: absolute;
            background: rgba(15, 23, 42, 0.65);
            color: ${textColor};
            border: 1px solid ${borderColor};
            border-radius: 10px;
            padding: 4px 8px;
            font-size: 8px;
            font-weight: 200;
            max-width: 80px;
            white-space: normal;
            word-break: break-word;
            text-align: center;
            pointer-events: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.6);
            transition: opacity 0.2s ease;
            opacity: 0;
            z-index: 50;
            transform: translate(-50%, -100%);
        `;
        document.body.appendChild(bubble);
        this.bubbleElement = bubble;
    }

    updateSpeechBubblePosition() {
        if (!this.bubbleElement || !this.group) return;

        const headPos = new THREE.Vector3();
        this.group.getWorldPosition(headPos);
        headPos.y += 2.9;

        const vector = headPos.clone();
        vector.project(camera);

        if (vector.z > 1 || Math.abs(vector.x) > 1 || Math.abs(vector.y) > 1) {
            this.bubbleElement.style.display = 'none';
            return;
        }

        this.bubbleElement.style.display = 'block';

        let x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        let y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

        if (typeof window.activeBubbleCoords === 'undefined') window.activeBubbleCoords = [];
        
        for (let pos of window.activeBubbleCoords) {
            const dist = Math.hypot(pos.x - x, pos.y - y);
            if (dist < 40) {
                y -= 18;
            }
        }
        window.activeBubbleCoords.push({ x, y });

        this.bubbleElement.style.left = `${x}px`;
        this.bubbleElement.style.top = `${y}px`;
    }

    triggerRandomThought() {
        const thoughts = agentThoughts[this.cfg.id] || ["Monitoreando..."];
        const randomText = thoughts[Math.floor(Math.random() * thoughts.length)];
        
        this.bubbleElement.innerHTML = randomText;
        this.bubbleElement.style.opacity = '1';

        setTimeout(() => {
            if (this.bubbleElement) {
                this.bubbleElement.style.opacity = '0';
            }
        }, isTurboMode ? 1800 : 3500);
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
    
    turnTo(angle,dt){
        const diff=Math.atan2(Math.sin(angle-this.group.rotation.y),Math.cos(angle-this.group.rotation.y));
        this.group.rotation.y+=Math.sign(diff)*Math.min(Math.abs(diff),dt*5*(isTurboMode?3:1));
        return Math.abs(diff)<.04;
    }

    beginRoute(){
        const desired=this.desiredSeat();
        this.route=[];
        let from=this.group.position.clone();
        if(this.seat){
            this.route.push(this.seat.approach.clone());
            from=this.seat.approach;
            this.seat.occupant=null;
            this.seat=null;
        }
        const path=officePath(from,desired.approach);
        if(!path.length){this.statusText='Esperando ruta';this.state='standing';return;}
        this.route.push(...path,desired.position.clone());
        this.goal=desired;
        this.state='walking';
    }

    update(dt){
        const turboMultiplier = isTurboMode ? 3.5 : 1.0;
        const effectiveDt = dt * turboMultiplier;

        this.time+=effectiveDt;
        
        this.thoughtTimer += effectiveDt;
        if (!this.reaction && !this.activity && this.thoughtTimer >= (isTurboMode ? 3 : 10) + Math.random() * 4) {
            this.thoughtTimer = 0;
            this.triggerRandomThought();
        }

        const desired=this.desiredSeat();
        if(this.goal!==desired){
            if(this.sitAmount>0){this.state='standing-up';}
            else this.beginRoute();
        }

        if(this.state==='standing-up'){
            this.sitAmount=Math.max(0,this.sitAmount-effectiveDt/0.65);
            this.statusText='Levantándose';
            if(!this.sitAmount)this.beginRoute();
        } else if(this.state==='walking'){
            const target=this.route[0];
            if(target){
                const direction=target.clone().sub(this.group.position);
                direction.y=0;
                const distance=direction.length();
                if(distance<.1){
                    this.group.position.copy(target);
                    this.route.shift();
                } else {
                    const step=Math.min(distance,effectiveDt*3.1);
                    direction.normalize();
                    this.turnTo(Math.atan2(direction.x,direction.z),effectiveDt);
                    const proposed=this.group.position.clone().addScaledVector(direction,step);
                    this.group.position.copy(proposed);
                }
                this.statusText=this.goal.kind==='lounge'?'Caminando al descanso':'Caminando a su estación';
            } else {this.state='aligning';}
        } else if(this.state==='aligning'){
            this.statusText='Alineándose';
            if(this.turnTo(this.goal.yaw,effectiveDt)){
                this.seat=this.goal;
                this.seat.occupant=this.cfg.id;
                this.state=this.goal.standing?'visiting':'sitting-down';
            }
        } else if(this.state==='sitting-down'){
            this.sitAmount=Math.min(1,this.sitAmount+effectiveDt/.8);
            this.statusText='Sentándose';
            if(this.sitAmount===1)this.state='seated';
        } else if(this.state==='seated'){
            this.statusText=this.seat.kind==='lounge'?'Sentado en descanso':this.cfg.isClient?'Cliente observando':'Analizando mercado';
            if(this.cfg.id==='analyst'&&(globalOrder==='work'||globalOrder==='chill')){
                this.interactionTimer-=effectiveDt;
                if(this.interactionTimer<=0){this.interactionTimer=6;if(typeof triggerCoherentDocumentHandover==='function')triggerCoherentDocumentHandover();}
            }
        }
        this.isWalking=this.state==='walking';
        this.isSitting=this.state==='seated';
        this.pose();
    }

    pose(){
        const s=this.sitAmount;const blend=s*s*(3-2*s);const walking=this.isWalking;
        this.rig.position.y=THREE.MathUtils.lerp(2.10,1.15,blend)+(walking?Math.abs(Math.sin(this.time*7))*.045:0);
        this.torso.rotation.x=blend*(this.goal?.kind==='desk'?.045:0);
        const working=this.goal?.kind==='desk';
        this.arms.forEach((arm,i)=>{
            const swing=walking?Math.sin(this.time*7+i*Math.PI)*.45:0;
            arm.root.rotation.set(THREE.MathUtils.lerp(swing,working?-.9:-.25,blend),0,0);
            arm.elbow.rotation.set(blend*(working?-.7:-1.1)+(this.isSitting&&working?Math.sin(this.time*5+i)*.045:0),0,0);
        });
        this.legs.forEach((leg,i)=>{
            leg.root.rotation.x=THREE.MathUtils.lerp(walking?Math.sin(this.time*7+i*Math.PI)*-.4:0,-Math.PI/2,blend);
            leg.knee.rotation.x=blend*Math.PI/2;
        });
        this.headRoot.rotation.y=this.isSitting?Math.sin(this.time*.5)*.035:0;
    }
}

buildTradingScreens=function(){
    [-17,0,17].forEach((x,i)=>{
        officeBox(scene,14.4,4.95,.2,x,5.12,-19.55,officePalette.dark);
        const mesh=new THREE.Mesh(new THREE.PlaneGeometry(14,4.55),new THREE.MeshBasicMaterial());mesh.position.set(x,5.12,-19.43);scene.add(mesh);
        officeScreens.push({mesh,kind:i});
    });
    const sizes=[[1024,384],[1024,384],[1024,384],[512,288]];
    for(let i=0;i<sizes.length;i++){
        const canvas=document.createElement('canvas');canvas.width=sizes[i][0];canvas.height=sizes[i][1];
        const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
        tradingScreenMeshes[i]={canvas,ctx:canvas.getContext('2d'),texture};
        officeScreens.filter(s=>s.kind===i).forEach(s=>{s.mesh.material.map=texture;s.mesh.material.needsUpdate=true;});
    }
    // Los monitores de las mesas llevan su propia vista compacta con velas y precio.
    officeScreens.filter(s=>s.kind==='desk').forEach(s=>{s.mesh.material.color.set(0xffffff);s.mesh.material.map=tradingScreenMeshes[3].texture;s.mesh.material.needsUpdate=true;});
};

function screenFrame(ctx,w,h,title,accent='#5ff0e0'){
    ctx.fillStyle='#06141f';ctx.fillRect(0,0,w,h);
    ctx.fillStyle=accent;ctx.font='700 19px monospace';ctx.fillText(title,20,30);
    return {left:64,right:w-132,top:56,bottom:h-52};
}
function screenGrid(ctx,box,rows=4,cols=6){
    ctx.strokeStyle='#173a4b';ctx.lineWidth=1;
    for(let i=0;i<=rows;i++){
        const y=box.top+(box.bottom-box.top)*i/rows;
        ctx.beginPath();ctx.moveTo(box.left,y);ctx.lineTo(box.right,y);ctx.stroke();
    }
    for(let i=0;i<=cols;i++){
        const x=box.left+(box.right-box.left)*i/cols;
        ctx.beginPath();ctx.moveTo(x,box.top);ctx.lineTo(x,box.bottom);ctx.stroke();
    }
}
function screenPriceScale(ctx,box,values,precision=2){
    const min=Math.min(...values),max=Math.max(...values),range=(max-min)||1;
    ctx.font='600 15px monospace';
    for(let i=0;i<=4;i++){
        const value=max-range*i/4,y=box.top+(box.bottom-box.top)*i/4;
        ctx.fillStyle='#7f9db0';ctx.fillText(value.toFixed(precision),box.right+10,y+5);
    }
    return {min,max,range};
}
function screenSparkline(ctx,box,values,accent){
    const min=Math.min(...values),max=Math.max(...values),range=(max-min)||1;
    const points=values.map((v,i)=>[box.left+(box.right-box.left)*i/(values.length-1||1),box.bottom-(v-min)/range*(box.bottom-box.top)]);
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.stroke();
    ctx.lineTo(box.right,box.bottom);ctx.lineTo(box.left,box.bottom);ctx.closePath();
    const grad=ctx.createLinearGradient(0,box.top,0,box.bottom);
    grad.addColorStop(0,`${accent}55`);grad.addColorStop(1,`${accent}08`);
    ctx.fillStyle=grad;ctx.fill();
    return points;
}
function drawMarketWall(ctx,canvas,market,prices,age){
    const w=canvas.width,h=canvas.height;
    const box=screenFrame(ctx,w,h,'01 / LIVE MARKET');
    ctx.fillStyle='#d5f2f4';ctx.font='700 22px monospace';
    ctx.fillText(`${market?.name||'Esperando datos'}  ${market?.quote!==undefined?market.quote.toFixed(market.precision??2):'—'}`,250,31);
    screenGrid(ctx,box,4,6);
    if(prices.length>1){
        const scale=screenPriceScale(ctx,box,prices,market?.precision??2);
        const points=screenSparkline(ctx,box,prices,'#55e0e5');
        const [lx,ly]=points.at(-1);
        ctx.fillStyle='#f6c478';ctx.beginPath();ctx.arc(lx,ly,5,0,Math.PI*2);ctx.fill();
        const label=`${market.quote.toFixed(market.precision??2)}`;
        ctx.fillStyle='#0b2230';ctx.fillRect(box.right-4,ly-15,76,30);
        ctx.strokeStyle='#f6c478';ctx.lineWidth=2;ctx.strokeRect(box.right-4,ly-15,76,30);
        ctx.fillStyle='#f6c478';ctx.font='700 17px monospace';ctx.fillText(label,box.right+2,ly+6);
        // Velas del tramo reciente sobre la línea de precio.
        const candles=Math.min(18,Math.max(1,Math.floor(prices.length/3)));
        const step=(box.right-box.left)/candles;
        for(let i=0;i<candles;i++){
            const slice=prices.slice(i*3,i*3+3);
            if(slice.length<2)continue;
            const openV=slice[0],closeV=slice.at(-1);
            const up=closeV>=openV;
            const x=box.left+i*step+step/2;
            const y=o=>box.bottom-(o-scale.min)/scale.range*(box.bottom-box.top);
            ctx.strokeStyle=up?'#3ad6c0':'#ff8fa3';ctx.lineWidth=2;
            ctx.beginPath();ctx.moveTo(x,y(Math.min(...slice)));ctx.lineTo(x,y(Math.max(...slice)));ctx.stroke();
            ctx.fillStyle=up?'#3ad6c0':'#ff8fa3';
            const bodyTop=y(Math.max(openV,closeV)),bodyBottom=y(Math.min(openV,closeV));
            ctx.fillRect(x-step*.3,bodyTop,step*.6,Math.max(2,bodyBottom-bodyTop));
        }
    }
    ctx.font='600 16px monospace';ctx.fillStyle='#8fb0c4';
    const pip=Math.pow(10,-(market?.precision??2));
    ctx.fillText(`BID ${market? (market.quote-pip/2).toFixed(market.precision??2):'—'}   ASK ${market? (market.quote+pip/2).toFixed(market.precision??2):'—'}   SPREAD ${pip.toFixed(market?.precision??2)}`,20,h-16);
    ctx.fillStyle=age===null?'#7f9db0':age>3?'#f4a259':'#6ff0b4';
    ctx.fillText(`${market?.digits.length||0} ticks · actualizado hace ${age===null?'—':age.toFixed(1)+'s'}`,w-330,h-16);
}
function drawDigitWall(ctx,canvas,market,digits){
    const w=canvas.width,h=canvas.height;
    const box=screenFrame(ctx,w,h,'02 / DIGIT DISTRIBUTION');
    const counts=Array(10).fill(0);
    digits.forEach(d=>counts[d]++);
    const sample=digits.slice(-30),short=Array(10).fill(0);
    sample.forEach(d=>short[d]++);
    const top=Math.max(1,...counts);
    const last=digits.at(-1);
    ctx.font='600 16px monospace';
    for(let d=0;d<10;d++){
        const x=70+d*88,barHeight=counts[d]/top*185;
        ctx.fillStyle=d===last?'#f6c478':'#2f97a8';
        ctx.fillRect(x,h-96-barHeight,54,barHeight);
        ctx.fillStyle=d===last?'#f6c478':'#1d5c69';
        ctx.fillRect(x,h-96-short[d]/Math.max(1,...short)*70,54,short[d]/Math.max(1,...short)*70);
        ctx.fillStyle='#c2e1e5';ctx.font='700 20px monospace';ctx.fillText(String(d),x+20,h-64);
        ctx.font='600 15px monospace';ctx.fillStyle='#8fb0c4';
        ctx.fillText(`${counts[d]}`,x+16,h-104-barHeight);
        ctx.fillText(`${digits.length?Math.round(counts[d]/digits.length*100):0}%`,x+8,h-30);
    }
    ctx.fillStyle='#8fb0c4';ctx.font='600 16px monospace';
    ctx.fillText(`100 ticks · ventana 30 resaltada · último dígito ${last===undefined?'—':last}`,20,h-12);
    ctx.fillStyle='#5ff0e0';ctx.fillText('HISTOGRAMA 100 TICKS / VENTANA 30',760,31);
}
function drawSessionWall(ctx,canvas,pnl,wins){
    const w=canvas.width,h=canvas.height;
    const box=screenFrame(ctx,w,h,'03 / SESSION PERFORMANCE');
    const labels=['BALANCE USD','PNL USD','WINRATE','TRADES CERRADOS'];
    const stats=[currentBalance.toFixed(2),`${pnl>=0?'+':''}${pnl.toFixed(2)}`,tradeHistory.length?`${(wins/tradeHistory.length*100).toFixed(1)}%`:'—',String(tradeHistory.length)];
    stats.forEach((value,j)=>{
        const x=40+j%2*490,y=110+Math.floor(j/2)*125;
        ctx.fillStyle='#89a7b8';ctx.font='600 18px monospace';ctx.fillText(labels[j],x,y);
        ctx.fillStyle=j===1&&pnl<0?'#ed8193':'#9fe8d9';ctx.font='800 40px monospace';ctx.fillText(value,x,y+50);
    });
    // Curva de balance real: parte del balance inicial y aplica los cierres.
    const equity=[];let running=currentBalance-pnl;
    equity.push(running);
    for(const t of tradeHistory.slice().reverse()){running+=t.payout;equity.push(running);}
    if(equity.length>1){
        const graph={left:64,right:w-40,top:h-110,bottom:h-26};
        ctx.fillStyle='#0d2534';ctx.fillRect(graph.left,graph.top,graph.right-graph.left,graph.bottom-graph.top);
        const min=Math.min(...equity),max=Math.max(...equity),range=(max-min)||1;
        ctx.beginPath();
        equity.forEach((v,i)=>{
            const x=graph.left+(graph.right-graph.left)*i/(equity.length-1);
            const y=graph.bottom-(v-min)/range*(graph.bottom-graph.top-8)-4;
            i?ctx.lineTo(x,y):ctx.moveTo(x,y);
        });
        ctx.strokeStyle='#f6c478';ctx.lineWidth=3;ctx.stroke();
        ctx.fillStyle='#8fb0c4';ctx.font='600 14px monospace';
        ctx.fillText(`curva de balance ${min.toFixed(2)} → ${max.toFixed(2)}`,graph.left+6,graph.top-6);
    }
    const wins0=tradeHistory.filter(t=>t.isWon).length,losses0=tradeHistory.length-wins0;
    ctx.fillStyle='#8fb0c4';ctx.font='600 16px monospace';
    ctx.fillText(`${wins0} ganados · ${losses0} perdidos · racha ${lossStreak}`,700,31);
}
function drawDeskScreen(ctx,canvas,market,prices,digits){
    const w=canvas.width,h=canvas.height;
    ctx.fillStyle='#06141f';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#5ff0e0';ctx.font='700 16px monospace';
    ctx.fillText((market?.name||'SIN DATOS').toUpperCase().slice(0,26),14,24);
    ctx.fillStyle='#e8fbff';ctx.font='800 40px monospace';
    ctx.fillText(market?.quote!==undefined?market.quote.toFixed(market.precision??2):'--.--',14,72);
    const box={left:14,right:w-14,top:88,bottom:h-58};
    if(prices.length>1)screenSparkline(ctx,box,prices,'#8fd2ff');
    ctx.fillStyle='#8fb0c4';ctx.font='600 14px monospace';
    ctx.fillText(`últimos ${Math.min(10,digits.length)} dígitos`,14,h-38);
    for(let i=0;i<Math.min(10,digits.length);i++){
        const d=digits[digits.length-Math.min(10,digits.length)+i];
        ctx.fillStyle=i===Math.min(10,digits.length)-1?'#f6c478':'#173a4b';
        ctx.fillRect(14+i*46,h-32,38,24);
        ctx.fillStyle=i===Math.min(10,digits.length)-1?'#0b2230':'#9fe8f4';
        ctx.font='700 16px monospace';ctx.fillText(String(d),28+i*46,h-14);
    }
}

let lastOfficeScreenUpdate=-Infinity;
updateTradingScreens=function(){
    const now=performance.now();if(now-lastOfficeScreenUpdate<200)return;lastOfficeScreenUpdate=now;
    const market=typeof displayedMarket==='function'?displayedMarket():null;
    const prices=(market?.prices||priceHistory||[]).slice(-60);
    const digits=market?.digits||[];
    const pnl=tradeHistory.reduce((sum,t)=>sum+t.payout,0);
    const wins=tradeHistory.filter(t=>t.isWon).length;
    const age=market&&market.lastTickAt?((Date.now()-market.lastTickAt)/1000):null;
    if(!tradingScreenMeshes.length)return;
    if(tradingScreenMeshes[0])drawMarketWall(tradingScreenMeshes[0].ctx,tradingScreenMeshes[0].canvas,market,prices,age);
    if(tradingScreenMeshes[1])drawDigitWall(tradingScreenMeshes[1].ctx,tradingScreenMeshes[1].canvas,market,digits);
    if(tradingScreenMeshes[2])drawSessionWall(tradingScreenMeshes[2].ctx,tradingScreenMeshes[2].canvas,pnl,wins);
    if(tradingScreenMeshes[3])drawDeskScreen(tradingScreenMeshes[3].ctx,tradingScreenMeshes[3].canvas,market,prices,digits);
    tradingScreenMeshes.forEach(({texture})=>{texture.needsUpdate=true;});
};

// Departmental data panels, rack telemetry, holographic rings and tag billboards.
function drawZoneScreen(spec,time){
    const ctx=spec.ctx,width=512,height=288;
    ctx.fillStyle='#061524';ctx.fillRect(0,0,width,height);
    ctx.strokeStyle='#123c4f';ctx.lineWidth=1;
    for(let y=36;y<height;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
    for(let x=0;x<width;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
    ctx.font='700 20px monospace';
    if(spec.kind==='macro'||spec.kind==='market'){
        const color=spec.kind==='macro'?'#5ff0e0':'#8fd2ff';
        ctx.fillStyle=color;ctx.fillText(spec.kind==='macro'?'MACRO / GLOBAL FLOW':'MARKET DEPTH',18,26);
        ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();
        for(let i=0;i<=40;i++){
            const px=i*(width/40),py=height*.64-Math.sin(i*.32+time*.0012)*46-Math.sin(i*.11)*24;
            i?ctx.lineTo(px,py):ctx.moveTo(px,py);
        }
        ctx.stroke();
    } else if(spec.kind==='risk'){
        ctx.fillStyle='#3ad6c0';ctx.fillText('RISK MATRIX',18,26);
        for(let i=0;i<18;i++){
            const px=16+i*27,hgt=30+Math.abs(Math.sin(i*1.7+time*.001))*140;
            ctx.fillStyle=i%3?'#3ad6c0':'#f4a259';ctx.fillRect(px,height-20-hgt,17,hgt);
        }
    } else if(spec.kind==='window'){
        // Digit window: the specialist only trades the digits between its two markers.
        const low=spec.opts.low,high=spec.opts.high,accent=spec.opts.accent||'#5ff0e0';
        ctx.fillStyle=accent;ctx.fillText(`RANGO ${low}-${high} / ${spec.opts.contract}`,18,26);
        const counts=Array(10).fill(0);
        const market=typeof marketBook!=='undefined'?[...marketBook.values()].find(m=>m.digits.length):null;
        if(market)market.digits.forEach(d=>counts[d]++);
        const top=Math.max(1,...counts);
        for(let d=0;d<10;d++){
            const inside=d>=Math.min(low,high)&&d<=Math.max(low,high);
            const barHeight=30+counts[d]/top*150,px=22+d*48;
            ctx.fillStyle=inside?accent:'#1d3b4d';
            ctx.fillRect(px,height-34-barHeight,34,barHeight);
            ctx.fillStyle=inside?'#eaffff':'#7f9db0';ctx.font='700 22px monospace';
            ctx.fillText(String(d),px+9,height-12);
            ctx.font='16px monospace';ctx.fillText(String(counts[d]),px+7,height-42-barHeight);
        }
        const window30=market?market.digits.slice(-30):[];
        const inside=window30.filter(d=>d>=Math.min(low,high)&&d<=Math.max(low,high)).length;
        ctx.fillStyle='#9fe8f4';ctx.font='700 20px monospace';
        ctx.fillText(`VENTANA 30 ticks: ${window30.length?Math.round(inside/window30.length*100):0}% en rango`,22,height-58);
    } else if(spec.kind==='racks'){
        ctx.fillStyle='#5ff0e0';ctx.fillText('TELEMETRÍA DE RACKS',18,26);
        for(let i=0;i<8;i++){
            const value=.5+.5*Math.sin(time*.0009+i*1.3);
            const px=24+i*59,barHeight=40+value*150;
            ctx.fillStyle=value>.82?'#f4a259':'#3ad6c0';
            ctx.fillRect(px,height-40-barHeight,36,barHeight);
            ctx.fillStyle='#7f9db0';ctx.font='16px monospace';
            ctx.fillText(`R${String(i+1).padStart(2,'0')}`,px+2,height-14);
            ctx.fillStyle=value>.82?'#f4a259':'#9fe8f4';
            ctx.fillText(`${Math.round(18+value*12)}°`,px+2,height-48-barHeight);
        }
    } else if(spec.kind==='receipts'){
        ctx.fillStyle='#ffc478';ctx.fillText('ADMINISTRACIÓN / RECIBOS',18,26);
        const closed=typeof tradeHistory!=='undefined'?tradeHistory:[];
        const rows=Math.max(1,Math.min(7,closed.length||1));
        ctx.font='17px monospace';
        for(let i=0;i<rows;i++){
            const t=closed[i];
            ctx.fillStyle='#8fb0c4';
            ctx.fillText(t?`#${String(t.id).padStart(3,'0')} ${t.type} · ${t.symbol}`:'--- esperando contratos ---',18,70+i*30);
            if(t){
                ctx.fillStyle=t.isWon?'#6ff0b4':'#ff8fa3';
                ctx.fillText(`${t.isWon?'+':''}${Number(t.payout).toFixed(2)} USD`,330,70+i*30);
            }
        }
    } else {
        ctx.fillStyle='#5ff0e0';ctx.fillText('GLOBAL DESK / LIVE',18,26);
        ctx.fillStyle='#2f8fa8';
        for(let gx=0;gx<width;gx+=11)for(let gy=44;gy<height;gy+=11)
            if(Math.sin(gx*.21)*Math.cos(gy*.17)>.25)ctx.fillRect(gx,gy,5,5);
        ctx.fillStyle='#ffd27f';
        for(let i=0;i<10;i++){
            const gx=40+(i*97)%(width-80),gy=70+(i*61)%(height-110);
            ctx.beginPath();ctx.arc(gx,gy,5,0,Math.PI*2);ctx.fill();
        }
    }
}
let lastOfficeZoneUpdate=-Infinity;
function updateZoneScreens(){
    const now=performance.now();
    if(now-lastOfficeZoneUpdate>260){
        lastOfficeZoneUpdate=now;
        officeZoneScreens.forEach(spec=>{drawZoneScreen(spec,now);spec.texture.needsUpdate=true;});
    }
    officeRackLeds.forEach(led=>{led.mesh.visible=Math.sin(now*.0035+led.offset)>-.15;});
    officeHoloRings.forEach((ring,i)=>{
        ring.rotation.z+=(.004+i*.0015)*(isTurboMode?2.5:1);
        ring.position.y=ring.userData.base+Math.sin(now*.0011+i)*.06;
    });
    if(camera) officeTags.forEach(tag=>tag.quaternion.copy(camera.quaternion));
    // Tags step back on close cameras so they never cover the room they label.
    officeTags.forEach(tag=>{
        const distance=camera.position.distanceTo(tag.position);
        const presence=THREE.MathUtils.clamp((distance-13)/15,0,1);
        tag.visible=presence>.03;
        tag.material.opacity=presence*.96;
        tag.scale.setScalar(.6+.4*THREE.MathUtils.clamp((distance-16)/30,0,1));
    });
}

let officeLastFrame=0;
animate=function(timestamp=performance.now()){
    requestAnimationFrame(animate);
    const dt=officeLastFrame?Math.min((timestamp-officeLastFrame)/1000,.05):1/60;officeLastFrame=timestamp;
    
    window.activeBubbleCoords = [];

    people.forEach(p=>{
        p.update(dt);
        p.updateSpeechBubblePosition();
    });

    updateZoneScreens();
    if(typeof updateTradingScreens==='function') updateTradingScreens();
    if(typeof updateCameraPosition==='function') updateCameraPosition();
    if(typeof updateFloatingBadges==='function') updateFloatingBadges();
    if(typeof updateAgentCard==='function') updateAgentCard();

    if(selectedAgent){
        document.getElementById('sidebar-status').textContent=selectedAgent.statusText;
        document.getElementById('sidebar-action').textContent=selectedAgent.state==='seated'?'Sentado en su asiento asignado':selectedAgent.statusText;
    }
    if(renderer && scene && camera) renderer.render(scene,camera);
};

const previousOfficeCamera=setCameraView;
setCameraView=function(view){
    previousOfficeCamera(view);
    if(view==='overview'){cameraTarget.set(0,1.5,2);cameraSpherical={radius:72,theta:.2,phi:.78};}
    if(view==='manager'){cameraTarget.set(7.2,2.4,-4);cameraSpherical={radius:13,theta:-Math.PI/4,phi:Math.PI/3};}
    if(view==='lounge'){cameraTarget.set(21.6,2.2,14.4);cameraSpherical={radius:18,theta:.5,phi:Math.PI/3};}
    if(typeof updateCameraPosition==='function') updateCameraPosition();
};