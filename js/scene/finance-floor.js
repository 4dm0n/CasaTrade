const financeVault = {counted:0,discarded:0};
const financeMoneyFlows = [];
const financePendingDeliveries = [];
const financeDeposits = [];
const financeTrash = [];
const financeBots = [];
let financeDisplays = {};
let financeFlowGeometry = null;
let financeCashMaterial = null;
let financeBillTexture = null;

function financeLabel(text,width,height,color='#8be7f1') {
    const label=officeLabel(text,width,height,color);
    return label;
}

function financeFurniture(root) {
    const blue=new THREE.MeshPhysicalMaterial({color:0x144b78,roughness:.3,metalness:.34,clearcoat:.6});
    const blueEdge=new THREE.MeshStandardMaterial({color:0x62c6df,roughness:.25,metalness:.72,emissive:0x124866,emissiveIntensity:.35});
    officeBox(root,26,.32,22,17,7.65,6,blue,.12).name='upper-floor-blue-deck';
    const grid=new THREE.GridHelper(26,13,0x347b9d,0x205477);grid.position.set(17,7.83,6);officeAdd(grid,root);
    for(const x of [4,30]){
        officeBox(root,.25,1.25,22,x,8.35,6,blueEdge,.05);
        for(const z of [-4,2,8,14])officeBox(root,.35,1.25,.16,x,8.35,z,officePalette.white,.04);
    }
    for(const z of [-6,18]){
        officeBox(root,26,1.25,.25,17,8.35,z,blueEdge,.05);
        for(const x of [7,12,17,22,27])officeBox(root,.16,1.25,.35,x,8.35,z,officePalette.white,.04);
    }
    for(const x of [5,29])officeBox(officeLevelGroups[1],.55,7.6,.55,x,3.8,6,officePalette.edge,.08);
    for(const z of [-5,17])officeBox(officeLevelGroups[1],.55,7.6,.55,17,3.8,z,officePalette.edge,.08);
    const floorLabel=financeLabel('EQUIPO BOT  /  TRADE EN VIVO',18,.7,'#9bf4cc');
    floorLabel.rotation.x=-Math.PI/2;floorLabel.position.set(17,7.86,-4.8);officeAdd(floorLabel,root);

    officeBox(root,10,.16,5,15,9.1,-1,officePalette.shell,.08);
    for(const x of [11.5,18.5])officeBox(root,.28,1.75,5,x,8.4,-1,officePalette.edge,.05);
    const counterTop=new THREE.MeshPhysicalMaterial({color:0x163a52,roughness:.2,metalness:.52,clearcoat:1});
    officeBox(root,9,.26,3,15,9.12,1.8,counterTop,.1);
    officeBox(root,4.6,.12,1.25,12,9.33,1.7,officePalette.dark,.06).name='money-counting-tray';
    financeBillTexture=makeFinanceBillTexture();
    const billMaterial=new THREE.MeshStandardMaterial({map:financeBillTexture,roughness:.82,metalness:.02,side:THREE.DoubleSide});
    for(let stack=0;stack<3;stack++){
        const x=12+stack*2.9,z=2.45+(stack%2)*.24;
        for(let layer=0;layer<5;layer++){
            const bill=new THREE.Mesh(new THREE.PlaneGeometry(2.05,1.08),billMaterial);
            bill.name=`cash-table-dollar-${stack+1}-${layer+1}`;
            bill.rotation.x=-Math.PI/2;bill.rotation.z=(stack-1)*.035+(layer%2)*.012;
            bill.position.set(x+(layer%2)*.035,9.27+layer*.014,z+(layer%2)*.02);
            officeAdd(bill,root);
        }
        officeBox(root,.22,.075,1.04,x+.72,9.35,z,stack===1?officePalette.cyan:officePalette.edge,.035).name=`cash-table-bundle-band-${stack+1}`;
    }
    officeBox(root,4.7,3.8,1.35,21,9.65,2.1,officePalette.shell,.08).name='cash-drawer-cabinet';
    for(let i=0;i<4;i++){
        const y=8.35+i*.83;
        officeBox(root,4.25,.64,1.42,21,y,2.85,officePalette.dark,.05).name=`cash-drawer-${i+1}`;
        officeBox(root,.56,.08,.13,21,y,3.6,blueEdge,.025);
    }
    officeBox(root,4.4,4.4,3.2,23,9.95,7,officePalette.edge,.12).name='cash-vault';
    officeBox(root,1.65,2.7,.18,23,9.8,8.62,officePalette.dark,.06).name='cash-vault-door';
    for(let i=0;i<5;i++){
        const dial=new THREE.Mesh(new THREE.TorusGeometry(.15,.035,8,20),blueEdge);
        dial.position.set(22.55+(i%3)*.42,9.65-Math.floor(i/3)*.48,8.74);officeAdd(dial,root);
    }
    officeBox(root,3.1,2.5,2.4,23,8.95,12,officePalette.dark,.1).name='loss-disposal-bin';
    const binRim=new THREE.MeshStandardMaterial({color:0xea6673,emissive:0x741f31,emissiveIntensity:.5,metalness:.46,roughness:.25});
    officeBox(root,3.2,.15,2.5,23,10.25,12,binRim,.04);
    const label=financeLabel('CUENTA / ARCHIVO',9,.52);label.rotation.x=-Math.PI/2;label.position.set(15,7.86,-8);officeAdd(label,root);
    const vaultLabel=financeLabel('RESERVA DE CAJA  /  RESULTADOS EN VIVO',14,.55,'#9bf4cc');
    vaultLabel.rotation.x=-Math.PI/2;vaultLabel.position.set(17,7.86,14.8);officeAdd(vaultLabel,root);
}

function makeFinanceBillTexture() {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#79aa78';ctx.fillRect(0,0,512,256);
    ctx.strokeStyle='#123e29';ctx.lineWidth=18;ctx.strokeRect(8,8,496,240);
    ctx.strokeStyle='#205e3b';ctx.lineWidth=6;ctx.strokeRect(27,27,458,202);
    ctx.fillStyle='#123e29';ctx.font='bold 52px Georgia';ctx.fillText('UNITED STATES',47,75);
    ctx.font='bold 30px Georgia';ctx.fillText('OF AMERICA',50,111);
    ctx.font='bold 72px Georgia';ctx.fillText('$100',345,94);ctx.fillText('$100',32,220);
    ctx.font='bold 22px sans-serif';ctx.fillText('THE UNITED STATES OF AMERICA',112,218);
    ctx.beginPath();ctx.ellipse(257,143,49,58,0,0,Math.PI*2);ctx.strokeStyle='#28754d';ctx.lineWidth=5;ctx.stroke();
    ctx.beginPath();ctx.arc(257,143,36,0,Math.PI*2);ctx.strokeStyle='#67936e';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#28754d';ctx.font='bold 35px Georgia';ctx.textAlign='center';ctx.fillText('CT',257,155);ctx.textAlign='left';
    const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;return texture;
}

function buildFinanceBots(root) {
    const roles=[
        {id:'analyst',color:0x4269db},
        {id:'tester',color:0x17a88e},
        {id:'manager',color:0xa449cb}
    ];
    const patrol=[
        new THREE.Vector3(7,OFFICE_FLOOR_HEIGHT,4.5),
        new THREE.Vector3(7,OFFICE_FLOOR_HEIGHT,9),
        new THREE.Vector3(7,OFFICE_FLOOR_HEIGHT,14),
        new THREE.Vector3(11,OFFICE_FLOOR_HEIGHT,15),
        new THREE.Vector3(16,OFFICE_FLOOR_HEIGHT,15),
        new THREE.Vector3(19.3,OFFICE_FLOOR_HEIGHT,14),
        new THREE.Vector3(19.3,OFFICE_FLOOR_HEIGHT,10),
        new THREE.Vector3(19.3,OFFICE_FLOOR_HEIGHT,4.5),
        new THREE.Vector3(12,OFFICE_FLOOR_HEIGHT,4.5)
    ];
    roles.forEach((role,index)=>{
        const group=new THREE.Group();group.name=`finance-bot-${role.id}`;group.position.copy(patrol[index*2]);
        const shell=new THREE.MeshPhysicalMaterial({color:role.color,roughness:.2,metalness:.56,clearcoat:1,clearcoatRoughness:.1});
        const face=new THREE.MeshPhysicalMaterial({color:0x071b2e,roughness:.1,metalness:.7,clearcoat:1});
        const core=new THREE.Mesh(new THREE.SphereGeometry(.78,40,32),shell);
        core.position.set(0,1.65,0);core.castShadow=true;core.receiveShadow=true;group.add(core);
        const visor=new THREE.Mesh(new THREE.SphereGeometry(.48,32,20,0,Math.PI,Math.PI*.32,Math.PI*.42),face);
        visor.position.set(0,.02,.57);core.add(visor);
        const eyes=[];
        for(const x of [-.19,.19]){
            const eye=new THREE.Mesh(new THREE.SphereGeometry(.075,16,12),new THREE.MeshStandardMaterial({color:0x9bfff1,emissive:0x32f1dc,emissiveIntensity:2.2,roughness:.15}));
            eye.position.set(x,.12,.84);core.add(eye);eyes.push(eye.material);
        }
        const halo=new THREE.Mesh(new THREE.TorusGeometry(.84,.035,12,64),new THREE.MeshStandardMaterial({color:0x67e8f9,emissive:0x38dbe5,emissiveIntensity:1.5,metalness:.65,roughness:.22}));
        halo.position.y=1.65;halo.rotation.x=Math.PI/2;group.add(halo);
        const carrier=new THREE.Group();carrier.position.set(0,1.12,.94);group.add(carrier);
        officeBox(carrier,.9,.11,.68,0,0,0,officePalette.edge,.07);
        officeBox(carrier,.08,.22,.68,-.4,.13,0,officePalette.cyan,.025);
        officeBox(carrier,.08,.22,.68,.4,.13,0,officePalette.cyan,.025);
        officeAdd(group,root);
        financeBots.push({id:role.id,group,core,visor,eyes,carrier,time:index*.8,source:'live',lastDigit:null,patrol,patrolIndex:index*2,speed:2.3+index*.18,delivery:null});
    });
}

function buildFinanceFloor() {
    officeLevelGroups[2]=new THREE.Group();officeLevelGroups[2].name='upper-finance-floor';scene.add(officeLevelGroups[2]);
    officeBuildGroup=officeLevelGroups[2];
    financeFurniture(officeBuildGroup);buildFinanceBots(officeBuildGroup);
    officeObstacles.push(
        {minX:9,maxX:20,minZ:-4,maxZ:4,floor:2},
        {minX:18.5,maxX:23.5,minZ:1,maxZ:4,floor:2},
        {minX:21,maxX:25,minZ:10.5,maxZ:13.5,floor:2}
    );
    financeFlowGeometry=new THREE.BoxGeometry(.86,.12,.48);
    financeCashMaterial=new THREE.MeshStandardMaterial({color:0x7fc894,roughness:.64,metalness:.08});
    financeDisplays={counted:financeLabel('CAJA FUERTE  $0.00',3.8,.34,'#9bf4cc'),discarded:financeLabel('DESECHO  $0.00',3.2,.34,'#ff9ca5')};
    financeDisplays.counted.position.set(23,12.25,7);officeAdd(financeDisplays.counted,officeBuildGroup);
    financeDisplays.discarded.position.set(23,11.65,12);officeAdd(financeDisplays.discarded,officeBuildGroup);
    financeDrawDisplays();
    officeBuildGroup=officeLevelGroups[1];
    updateOfficeFloorVisibility(1);
}

const buildOfficeArchitectureWithoutFinance=buildRichOfficeArchitecture;
buildRichOfficeArchitecture=function(){
    buildOfficeArchitectureWithoutFinance();
    buildFinanceFloor();
};
const buildOfficeWallScreensWithoutFinance=buildTradingScreens;
buildTradingScreens=function(){
    officeBuildGroup=officeLevelGroups[1];
    buildOfficeWallScreensWithoutFinance();
};

function financeDrawDisplays() {
    if(!financeDisplays.counted)return;
    const draw=(mesh,title,amount,color)=>{
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#081727';ctx.fillRect(0,0,512,96);
        ctx.fillStyle=color;ctx.font='600 27px sans-serif';ctx.fillText(title,18,38);
        ctx.font='bold 30px monospace';ctx.fillText(`$${amount.toFixed(2)}`,18,76);
        const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
        if(mesh.material.map)mesh.material.map.dispose();
        mesh.material.map=texture;mesh.material.needsUpdate=true;
    };
    draw(financeDisplays.counted,'GUARDADO EN CAJA FUERTE',financeVault.counted,'#9bf4cc');
    draw(financeDisplays.discarded,'PÉRDIDAS DESECHADAS',financeVault.discarded,'#ff9ca5');
}

function makeCashBundle(discarded=false) {
    const bundle=new THREE.Group();
    const body=new THREE.Mesh(financeFlowGeometry,discarded?new THREE.MeshStandardMaterial({color:0xc17b71,roughness:.8}):financeCashMaterial);
    body.castShadow=true;bundle.add(body);
    for(let i=-1;i<=1;i++){
        const band=new THREE.Mesh(new THREE.BoxGeometry(.09,.13,.51),new THREE.MeshStandardMaterial({color:discarded?0x573640:0xdcc77a,metalness:.3,roughness:.35}));
        band.position.x=i*.26;bundle.add(band);
    }
    return bundle;
}

function financeDeliveryWaypoints(won) {
    const point=(x,z)=>new THREE.Vector3(x,OFFICE_FLOOR_HEIGHT,z);
    return won
        ? [
            point(12,4),point(18,4),point(19.3,5.5),point(19.3,9.2),point(23,9.2)
        ]
        : [
            point(23,9.2),point(23,11.7)
        ];
}

function dispatchFinanceDelivery() {
    while(financePendingDeliveries.length){
        const bot=financeBots.find(candidate=>!candidate.delivery);
        if(!bot)return;
        const flow=financePendingDeliveries.shift();
        flow.bot=bot;flow.waypoints=financeDeliveryWaypoints(flow.won);flow.waypointIndex=0;
        bot.delivery=flow;financeMoneyFlows.push(flow);
    }
}

function recordMoneyMovement(amount,won) {
    if(!financeFlowGeometry||!financeBots.length||!Number.isFinite(amount)||amount<0)throw new Error('Invalid money movement');
    const bundle=makeCashBundle(!won);bundle.scale.setScalar(.82+Math.min(1.2,Math.log10(amount+1)*.28));
    financePendingDeliveries.push({bundle,won,amount});
    dispatchFinanceDelivery();
}

function finishFinanceDelivery(flow) {
    const bot=flow.bot;
    bot.carrier.remove(flow.bundle);scene.add(flow.bundle);
    const pile=flow.won?financeDeposits:financeTrash;
    const pileOffset=(pile.length%6)*.16;
    flow.bundle.position.set(23+(pileOffset%3)*.18,flow.won?8.95:8.82,flow.won?7.8+pileOffset:11.15+pileOffset);
    flow.bundle.rotation.set(0,0,0);pile.push(flow.bundle);
    if(pile.length>10){
        const oldest=pile.shift();scene.remove(oldest);
        oldest.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();if(mesh.material!==financeCashMaterial)mesh.material.dispose();}});
    }
    if(flow.won)financeVault.counted+=flow.amount;else financeVault.discarded+=flow.amount;
    financeMoneyFlows.splice(financeMoneyFlows.indexOf(flow),1);
    bot.delivery=null;financeDrawDisplays();dispatchFinanceDelivery();
}

function updateFinanceFloor(dt) {
    financeBots.forEach(bot=>{
        bot.time+=dt;
        bot.group.position.y=OFFICE_FLOOR_HEIGHT+.12+Math.sin(bot.time*1.7)*.05;
        let distance=bot.speed*dt,transitions=0;
        while(distance>0&&transitions<bot.patrol.length+1){
            const flow=bot.delivery;
            const target=flow?flow.waypoints[flow.waypointIndex]:bot.patrol[bot.patrolIndex];
            const dx=target.x-bot.group.position.x,dz=target.z-bot.group.position.z;
            const remaining=Math.hypot(dx,dz);
            bot.group.rotation.y=Math.atan2(dx,dz);
            if(remaining<=distance+.001){
                bot.group.position.x=target.x;bot.group.position.z=target.z;distance=Math.max(0,distance-remaining);
                if(flow){
                    if(flow.waypointIndex===0){
                        bot.carrier.add(flow.bundle);flow.bundle.position.set(0,.22,0);flow.carrying=true;
                    }
                    flow.waypointIndex++;
                    if(flow.waypointIndex>=flow.waypoints.length)finishFinanceDelivery(flow);
                }else bot.patrolIndex=(bot.patrolIndex+1)%bot.patrol.length;
                transitions++;
            }else{
                bot.group.position.x+=dx/remaining*distance;bot.group.position.z+=dz/remaining*distance;distance=0;
            }
        }
        const intensity=bot.source==='live'?2.1:.6;
        bot.eyes.forEach((material,index)=>{material.emissiveIntensity=intensity*(.78+Math.sin(bot.time*3+index)*.16);});
    });
}

function updateOfficeRobotSignal(symbol,digit,source) {
    for(const person of people){
        person.lastMarketSignal={symbol,digit,source,at:Date.now()};
        person.lastSignalSource=source;
    }
    financeBots.forEach(bot=>{
        bot.source=source;bot.lastSymbol=symbol;bot.lastDigit=digit;
        bot.eyes.forEach(material=>{
            material.color.set(source==='live'?0x9bfff1:0xf6c66e);
            material.emissive.set(source==='live'?0x32f1dc:0xf59e0b);
        });
    });
}

function updateOfficeFloorVisibility(floor) {
    if(floor!==1&&floor!==2)throw new Error(`Unknown office floor: ${floor}`);
    officeCurrentLevel=floor;
    for(const [level,group] of Object.entries(officeLevelGroups))if(group)group.visible=Number(level)===floor;
    if(typeof people!=='undefined')people.forEach(person=>{person.group.visible=floor===1;});
    financeBots.forEach(bot=>{bot.group.visible=floor===2;});
}

function setOfficeFloorView(floor) {
    updateOfficeFloorVisibility(floor);
    cameraTarget.set(floor===2?17:0,floor===2?9:1.5,floor===2?6:0);
    cameraSpherical=floor===2?{radius:29,theta:.32,phi:1.14}:{radius:43,theta:.22,phi:1.05};
    updateCameraPosition();
    document.querySelectorAll('[data-office-floor]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.officeFloor)===floor)));
}

const setCameraViewWithoutFloor= setCameraView;
setCameraView=function(view){
    setCameraViewWithoutFloor(view);
    const focused=people.find(person=>person.cfg.id===view);
    if(focused){
        if(officeCurrentLevel!==1)updateOfficeFloorVisibility(1);
        updateCameraPosition();
    }else if(view==='overview')setOfficeFloorView(1);
    else if(view==='lounge')setOfficeFloorView(1);
};
