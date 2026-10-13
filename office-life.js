// Activities share physical destinations, props and the existing navigation system.
const officeLife={time:0,order:null,players:[],rally:0,doorTime:0,visitor:null,door:null,ball:null};
const priorBuildPeopleLife=buildPeople;
buildPeople=function(){
    priorBuildPeopleLife();
    // Hex palette is authored in sRGB; light calculations use linear colors.
    const converted=new Set();
    scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m?.isMeshStandardMaterial&&!converted.has(m)){m.color.convertSRGBToLinear();converted.add(m);}});
};
function lifeTarget(id,x,z,yaw,kind='visit') {
    return {id,position:new THREE.Vector3(x,0,z),approach:new THREE.Vector3(x,0,z),yaw,kind,standing:true,occupant:null};
}
function say(person,text,seconds=4){
    if(!person?.bubbleElement)return;
    person.bubbleElement.textContent=text;person.bubbleElement.style.opacity='1';person.speechUntil=officeLife.time+seconds;
}
function reactToTrade(result,trade){
    for(const p of people.filter(p=>!p.cfg.isClient&&p.group.visible)){
        p.reaction={won:result.won,until:officeLife.time+3.2};
        say(p,tradeVoice(p,result,trade));
        if(typeof addAgentChatMessage==='function'&&p.cfg.duty)
            addAgentChatMessage(p.cfg.name,p.cfg.role,tradeVoice(p,result,trade),result.won?'success':'danger','REACCIÓN · '+officeDuties[p.cfg.duty].label,p.cfg.id);
    }
}
function updateTeamCount(){
    const present=people.filter(p=>p.group.visible);
    document.getElementById('people-count').textContent=`${present.length} presentes`;
    document.getElementById('people-count').title=`${present.filter(p=>!p.cfg.isClient).length} agentes · ${present.filter(p=>p.cfg.isClient).length} clientes`;
    document.querySelectorAll('#agent-list button').forEach((b,i)=>{b.disabled=!people[i]?.group.visible;b.style.opacity=b.disabled?'.4':'1';});
}
const priorMountLife=mountWorkspace;
mountWorkspace=function(){
    priorMountLife();
    const button=document.createElement('button');button.id='chat-latest';button.className='secondary-action';button.textContent='↓ Ir al último mensaje';
    button.onclick=()=>{const c=document.getElementById('chat-messages-container');c.scrollTop=c.scrollHeight;document.getElementById('agent-chat-panel').scrollTop=0;};
    document.getElementById('agent-chat-panel').append(button);
};
const priorChatRender=renderAgentChatMessages;
renderAgentChatMessages=function(){
    const c=document.getElementById('chat-messages-container');
    const atBottom=c.scrollHeight-c.scrollTop-c.clientHeight<45,top=c.scrollTop;
    priorChatRender();c.scrollTop=atBottom?c.scrollHeight:top;
};

const priorArchitectureLife=buildRichOfficeArchitecture;
buildRichOfficeArchitecture=function(){
    priorArchitectureLife();
    renderer.toneMappingExposure=1.18;
    const hemi=scene.children.find(o=>o.isHemisphereLight);if(hemi)hemi.intensity=1.2;
    // Real luminaires with a diffuser and bounded light pools; only the sun casts shadows.
    const diffuser=new THREE.MeshStandardMaterial({color:0xe5f4ff,emissive:0xc6e5ff,emissiveIntensity:1.5,roughness:.4});
    for(const [x,z] of [[-22.5,-13],[-22.5,2],[0,-11],[0,-3],[22,-13],[22,3]]){
        officeBox(scene,4.2,.15,.7,x,7.1,z,officePalette.edge);
        officeBox(scene,3.9,.04,.55,x,7,z,diffuser);
        for(const dx of [-1.7,1.7])officeCylinder(scene,.018,2.1,x+dx,8.2,z);
        const light=new THREE.PointLight(0xd5eaff,.7,19,2);light.position.set(x,6.5,z);scene.add(light);
    }
    // A procedural sky shader and a street grid with varied buildings, windows and parks.
    const sky=new THREE.Mesh(new THREE.SphereGeometry(210,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(0x28436b)},horizon:{value:new THREE.Color(0x99bbcc)}},vertexShader:'varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;uniform vec3 top;uniform vec3 horizon;void main(){float h=clamp(normalize(v).y,0.,1.);gl_FragColor=vec4(mix(horizon,top,pow(h,.55)),1.);}'}));scene.add(sky);
    scene.background=new THREE.Color(0x789bad);scene.fog=new THREE.Fog(0x789bad,100,205);
    const city=new THREE.Group();scene.add(city);
    const pavement=new THREE.MeshStandardMaterial({color:0x35434f,roughness:.98});
    officeBox(city,290,.3,290,0,-5,0,pavement);
    const windowCanvas=document.createElement('canvas');windowCanvas.width=128;windowCanvas.height=256;
    const ctx=windowCanvas.getContext('2d');ctx.fillStyle='#263f52';ctx.fillRect(0,0,128,256);
    for(let x=6;x<128;x+=16)for(let y=6;y<256;y+=18){ctx.fillStyle=(x+y)%5?'#779eaf':'#d8cda5';ctx.fillRect(x,y,7,9);}
    const texture=new THREE.CanvasTexture(windowCanvas);texture.encoding=THREE.sRGBEncoding;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    const building=new THREE.MeshStandardMaterial({map:texture,roughness:.55,metalness:.3});
    for(let x=-120;x<=120;x+=20)for(let z=-120;z<=120;z+=20){
        if(Math.abs(x)<52&&Math.abs(z)<52)continue;
        const h=9+Math.abs((x*13+z*7)%37);
        const mesh=new THREE.Mesh(new THREE.BoxGeometry(11,h,12),building);mesh.position.set(x,h/2-4.8,z);city.add(mesh);
    }
    const lane=new THREE.MeshBasicMaterial({color:0xc4b995});
    for(let n=-110;n<130;n+=20){officeBox(city,270,.015,.12,0,-4.82,n,lane,.004);officeBox(city,.12,.015,270,n,-4.82,0,lane,.004);}
    // Keep the lighting portable on integrated GPUs: no full-scene cubemap pass.
    scene.add(new THREE.AmbientLight(0xbad9ed,.35));
    // Solid entrance and a swinging leaf, placed at the navigable front boundary.
    for(const x of [-25.3,-22.7])officeBox(scene,.18,4.3,.22,x,2.15,20.8,officePalette.edge);
    officeBox(scene,2.8,.18,.22,-24,4.25,20.8,officePalette.edge);
    const pivot=new THREE.Group();pivot.position.set(-25.2,0,20.8);scene.add(pivot);
    officeBox(pivot,2.4,4,.12,1.2,2,0,new THREE.MeshStandardMaterial({color:0x37687c,metalness:.5,roughness:.28,transparent:true,opacity:.7}));
    officeBox(pivot,.08,.6,.1,2.1,1.9,.12,officePalette.white);officeLife.door=pivot;
    const sign=officeLabel('EXIT / RECEPTION',3,.5);sign.position.set(-24,4.8,20.95);scene.add(sign);
    officeLife.exit=lifeTarget('exit',-24,20,0,'exit');
    officeLife.boards=[lifeTarget('board-0',-8,-16.6,Math.PI),lifeTarget('board-1',0,-16.6,Math.PI),lifeTarget('board-2',8,-16.6,Math.PI)];
    officeLife.manager=lifeTarget('manager-visitor',11.6,-4.4,-Math.PI/2,'conversation');
    // Table-tennis court in the west break area: the player anchors sit beyond the two ends.
    const blue=new THREE.MeshStandardMaterial({color:0x125e78,roughness:.72});
    const courtX=-22.5,courtZ=13.5;
    officeBox(scene,4,.14,6,courtX,1.52,courtZ,blue);officeBox(scene,4,.016,.045,courtX,1.602,courtZ,officePalette.white);
    for(const x of [courtX-1.92,courtX+1.92])officeBox(scene,.045,.016,5.9,x,1.602,courtZ,officePalette.white);
    for(const z of [courtZ-2.95,courtZ+2.95])officeBox(scene,3.9,.016,.045,courtX,1.602,z,officePalette.white);
    for(const x of [courtX-1.5,courtX+1.5])for(const z of [courtZ-2,courtZ+2])officeBox(scene,.12,1.4,.12,x,.72,z,officePalette.edge);
    const netCanvas=document.createElement('canvas');netCanvas.width=netCanvas.height=32;
    const netContext=netCanvas.getContext('2d');netContext.strokeStyle='#cedee4';netContext.lineWidth=2;
    netContext.strokeRect(0,0,32,32);
    const netTexture=new THREE.CanvasTexture(netCanvas);netTexture.wrapS=netTexture.wrapT=THREE.RepeatWrapping;netTexture.repeat.set(32,3);
    const net=new THREE.Mesh(new THREE.PlaneGeometry(4,.38),new THREE.MeshStandardMaterial({map:netTexture,transparent:true,alphaTest:.15,roughness:.9,side:THREE.DoubleSide}));net.position.set(courtX,1.80,courtZ);scene.add(net);
    officeBox(scene,4.1,.028,.028,courtX,1.99,courtZ,officePalette.white,.005);
    for(const x of [courtX-2.05,courtX+2.05])officeCylinder(scene,.025,.45,x,1.80,courtZ,officePalette.edge);
    officeObstacles.push({minX:courtX-2.5,maxX:courtX+2.5,minZ:courtZ-3,maxZ:courtZ+3});
    officeLife.pingSeats=[lifeTarget('ping-a',courtX,courtZ-3.8,0,'ping'),lifeTarget('ping-b',courtX,courtZ+3.8,Math.PI,'ping')];
    officeLife.ball=new THREE.Mesh(new THREE.SphereGeometry(.095,12,8),new THREE.MeshStandardMaterial({color:0xffeccb,roughness:.45}));officeLife.ball.visible=false;scene.add(officeLife.ball);
    officePalette.cushion.roughness=.95;officePalette.edge.metalness=.65;officePalette.shell.roughness=.5;
};

function assignActivities(){
    officeLife.order=globalOrder;officeLife.players=[];officeLife.visitor=null;
    const resting=people.filter(p=>p.group.visible&&(globalOrder==='rest_all'||globalOrder==='rest_half'&&p.index%2===1));
    const shuffled=resting.slice();
    for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
    if(shuffled.length>=4)officeLife.players=shuffled.slice(0,2);
    const available=shuffled.filter(p=>!officeLife.players.includes(p));
    const eaters=available.slice(0,Math.max(1,Math.ceil(available.length/3)));
    people.forEach(p=>{
        p.activity=null;p.visitTimer=8+Math.random()*24;
        const player=officeLife.players.indexOf(p);
        if(player>=0)p.activity={kind:'ping',target:officeLife.pingSeats[player]};
        else if(eaters.includes(p))p.activity={kind:'eat',target:p.rest};
    });
    if(typeof resetRally==='function')resetRally();

}
const oldDesiredLife=Person3D.prototype.desiredSeat;
Person3D.prototype.desiredSeat=function(){return this.activity?.target || oldDesiredLife.call(this);};
const oldUpdateLife=Person3D.prototype.update;
Person3D.prototype.update=function(dt){
    if(!this.lifeInitialized){
        this.lifeInitialized=true;this.visitTimer=12+this.index*4+Math.random()*15;
        this.paddle=new THREE.Group();this.arms[1].elbow.add(this.paddle);this.paddle.position.set(0,-.75,0);
        const disk=new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.065,20),new THREE.MeshStandardMaterial({color:0xb93249,roughness:.8}));disk.rotation.x=Math.PI/2;this.paddle.add(disk);
        officeBox(this.paddle,.07,.3,.07,0,.22,0,officePalette.edge);this.paddle.visible=false;
        this.snack=new THREE.Mesh(new THREE.SphereGeometry(.17,12,8),new THREE.MeshStandardMaterial({color:0xdfb35c,roughness:.92}));this.snack.scale.set(1,.5,1);this.snack.position.set(0,-.72,.02);this.arms[0].elbow.add(this.snack);this.snack.visible=false;
    }
    if(!this.group.visible){
        this.visitTimer-=dt;
        if(this.visitTimer<=0){this.group.visible=true;this.activity=null;this.goal=null;this.state='standing';this.visitTimer=15+Math.random()*20;officeLife.doorTime=3;updateTeamCount();say(this,'De vuelta en la oficina.');}
        return;
    }
    if(this.cfg.isClient&&!globalOrder.startsWith('rest')){
        this.visitTimer-=dt;
        if(this.visitTimer<=0&&(this.state==='seated'||this.state==='visiting')){
            if(this.activity?.kind==='exit'){
                this.group.visible=false;this.bubbleElement.style.display='none';if(this.seat)this.seat.occupant=null;this.seat=null;this.sitAmount=0;this.goal=null;
                this.visitTimer=20+Math.random()*25;officeLife.doorTime=3;
                if(followedAgent===this){followedAgent=null;setCameraView('overview');}updateTeamCount();return;
            }
            if(officeLife.visitor===this)officeLife.visitor=null;
            const roll=Math.random();
            if(roll<.22)this.activity={kind:'exit',target:officeLife.exit};
            else if(roll<.5&&!officeLife.visitor){officeLife.visitor=this;this.activity={kind:'conversation',target:officeLife.manager};}
            else if(roll<.83){const target=officeLife.boards.find(t=>!people.some(p=>p!==this&&p.activity?.target===t));this.activity=target?{kind:'board',target}:null;}
            else this.activity=null;
            this.visitTimer=10+Math.random()*15;this.activitySpoken=false;
        }
    }
    oldUpdateLife.call(this,dt);
    if(this.state==='visiting'){
        this.statusText=this.activity?.kind==='ping'?'Jugando ping pong':this.activity?.kind==='conversation'?'Conversando con el gerente':this.activity?.kind==='exit'?'Saliendo por recepción':'Consultando los tableros';
        if(!this.activitySpoken&&this.activity?.kind==='conversation'){
            say(this,'¿Cómo va el balance de la sesión?');say(people.find(p=>p.cfg.id==='manager'),`Balance ${usd(currentBalance)} · ${tradeHistory.length} trades cerrados.`);this.activitySpoken=true;
        }
        if(this.activity?.kind==='exit')officeLife.doorTime=2;
    }
    this.paddle.visible=this.activity?.kind==='ping'&&this.state==='visiting';
    this.snack.visible=this.activity?.kind==='eat'&&this.isSitting;
    if(typeof updateEatingPose==='function')updateEatingPose(this,dt);
    if(typeof updatePingPose==='function')updatePingPose(this);
    if(this.reaction){
        if(officeLife.time>=this.reaction.until)this.reaction=null;
        else if(!this.isWalking&&!this.snack.visible&&!this.paddle.visible){
            if(this.reaction.won){this.arms[0].root.rotation.x=-2.3;this.arms[0].elbow.rotation.x=-.5;this.headRoot.rotation.x=-.06;}
            else{this.headRoot.rotation.x=.25;this.arms[0].root.rotation.x=-.9;this.arms[0].elbow.rotation.x=-1.8;}
            this.statusText=this.reaction.won?'Trade ganado · celebrando':'Trade perdido · revisando';
        }
    }else if(!this.snack.visible)this.headRoot.rotation.x=0;
    if(this.cfg.duty&&this.isSitting&&!this.reaction&&!this.snack.visible&&!this.paddle.visible){
        // Cada oficio gesticula distinto mientras trabaja en su sala.
        const t=officeLife.time*2+this.index;
        if(this.cfg.duty==='over'||this.cfg.duty==='under'){
            this.arms[1].root.rotation.x=-1.45+Math.sin(t)*.3;
            this.arms[1].elbow.rotation.x=-.5+Math.sin(t*.7)*.2;
            this.headRoot.rotation.y=Math.sin(t*.5)*.12;
        } else if(this.cfg.duty==='cyber'){
            this.headRoot.rotation.y=Math.sin(t*.35)*.42;
        } else if(this.cfg.duty==='admin'){
            this.arms[0].root.rotation.x=-1.1+Math.abs(Math.sin(t*.9))*-.7;
            this.arms[0].elbow.rotation.x=-.9+Math.sin(t*1.3)*.25;
        } else if(this.cfg.duty==='server'){
            this.headRoot.rotation.x=Math.sin(t*.55)*.13;
        } else if(this.cfg.duty==='macro'){
            this.headRoot.rotation.y=-.18+Math.sin(t*.3)*.2;
        }
    }
};
Person3D.prototype.triggerRandomThought=function(){
    if(this.cfg.isClient)say(this,this.activity?.kind==='board'?'Revisando las estadísticas del tablero.':'Consultando la sesión.',3);
    else{const s=chooseSelection();say(this,this.cfg.id==='analyst'?s?`Evaluando ${s.contract} ${s.target}.`:'Esperando una señal.':this.cfg.id==='tester'?globalOrder==='chill'?'Oportunidad: tester omitido.':'Comprobando las últimas 20 lecturas.':`${tradeHistory.length} trades en la sesión.`,3);}
};
Person3D.prototype.updateSpeechBubblePosition=function(){
    if(!this.group.visible||officeLife.time>(this.speechUntil||0)){this.bubbleElement.style.display='none';return;}
    const stage=document.getElementById('stage'),bounds=stage.getBoundingClientRect();
    const point=new THREE.Vector3();this.headRoot.getWorldPosition(point);point.y+=.7;point.project(camera);
    if(point.z>1||point.z< -1||Math.abs(point.x)>.95||Math.abs(point.y)>.95){this.bubbleElement.style.display='none';return;}
    if(this.bubbleElement.parentElement!==stage)stage.append(this.bubbleElement);
    Object.assign(this.bubbleElement.style,{display:'block',left:`${(point.x*.5+.5)*bounds.width}px`,top:`${(-point.y*.5+.5)*bounds.height}px`,maxWidth:'160px',fontSize:'10px',fontWeight:'500',zIndex:'5'});
};
const priorBadgesLife=updateFloatingBadges;
updateFloatingBadges=function(){
    priorBadgesLife();
    const now=performance.now(),dt=Math.min((now-(officeLife.last||now))/1000,.05);officeLife.last=now;officeLife.time+=dt;
    if(officeLife.order!==globalOrder)assignActivities();
    officeLife.doorTime=Math.max(0,officeLife.doorTime-dt);
    if(officeLife.door)officeLife.door.rotation.y=THREE.MathUtils.lerp(officeLife.door.rotation.y,officeLife.doorTime>0?-Math.PI/2:0,Math.min(1,dt*4));
    if(typeof updateLeisureActivities==='function')updateLeisureActivities(dt);
    for(const p of people)if(p.cfg.duty&&p.group.visible)dutyTick(p,dt);
    if(officeLife.time>(officeLife.nextCount||0)){officeLife.nextCount=officeLife.time+1;updateTeamCount();}
};

// ── Oficios por sala: lecturas reales del feed, cada uno con su voz ──────────
const officeDuties={
    over:{label:'Rango 0-3 · OVER',accent:'#38bdf8'},
    under:{label:'Rango 7-9 · UNDER',accent:'#f472b6'},
    server:{label:'Racks y latencia',accent:'#34d399'},
    cyber:{label:'Perímetro y anomalías',accent:'#22d3ee'},
    macro:{label:'Sesgo macro',accent:'#818cf8'},
    admin:{label:'Recibos y cierres',accent:'#fbbf24'}
};
const officePersonas={
    analyst:{emoji:'📈',tone:'técnico y directo'},
    tester:{emoji:'🧪',tone:'escéptico, exige muestras'},
    manager:{emoji:'🎩',tone:'institucional, habla del equipo'},
    over:{emoji:'🔵',tone:'metódico, cita su rango'},
    under:{emoji:'🔴',tone:'impaciente, cita su rango'},
    server:{emoji:'🛠️',tone:'operativo, habla de latencia'},
    cyber:{emoji:'🛡️',tone:'paranoico, vigila anomalías'},
    macro:{emoji:'🌍',tone:'académico, contexto global'},
    admin:{emoji:'🧾',tone:'burócrata, cuadra cuentas'},
    client:{emoji:'💼',tone:'formal, pregunta por su capital'}
};
function personaKey(person){
    const id=typeof person==='string'?person:person?.cfg?.id;
    if(!id)return 'macro';
    if(id.startsWith('client'))return 'client';
    if(id==='analyst')return 'analyst';
    if(id==='tester')return 'tester';
    if(id==='manager')return 'manager';
    if(id==='over-scout')return 'over';
    if(id==='under-scout')return 'under';
    if(id==='server-ops')return 'server';
    if(id==='cyber-ops')return 'cyber';
    if(id==='macro-analyst')return 'macro';
    if(id==='admin-ops')return 'admin';
    return 'macro';
}
function personaEmoji(person){return officePersonas[personaKey(person)].emoji;}
function tradingMarket(){
    if(typeof marketBook==='undefined')return null;
    return [...marketBook.values()].find(m=>m.digits.length>=10)||null;
}
function dutyReading(person){
    const market=tradingMarket();
    const digits=market?market.digits.slice(-30):[];
    const prices=market?market.prices.slice(-35):[];
    const duty=person.cfg.duty;
    if(duty==='over'||duty==='under'){
        const low=duty==='over'?0:7,high=duty==='over'?3:9,barrier=duty==='over'?3:7;
        const inside=digits.filter(d=>d>=low&&d<=high).length;
        const pct=digits.length?Math.round(inside/digits.length*100):0;
        return {text:`${pct}% en ${low}-${high}`,alert:pct>=45&&pct<=55,
            message:`Ventana ${low}-${high}: ${pct}% de las últimas ${digits.length} lecturas. ${pct>=40?`Mantengo ${person.cfg.contract} ${barrier} en vigilancia.`:`Rango frío: no fuerzo ${person.cfg.contract} ${barrier}.`}`};
    }
    if(duty==='server'){
        const age=market?Math.max(0,Date.now()-market.lastTickAt):0;
        const latency=(age/1000).toFixed(1);
        return {text:`latencia ${latency}s`,alert:age>3500,
            message:age>3500?`Latencia ${latency}s en el feed: reviso el enlace antes de que se caiga la muestra.`:`Latencia ${latency}s y ${digits.length} lecturas estables en los racks.`};
    }
    if(duty==='cyber'){
        const counts=Array(10).fill(0);digits.forEach(d=>counts[d]++);
        const expected=digits.length/10||1;
        const deviation=Math.max(...counts.map(c=>Math.abs(c-expected)));
        const risky=deviation>expected*.6;
        return {text:`desvío ${deviation.toFixed(1)}`,alert:risky,
            message:risky?`Desviación de ${deviation.toFixed(1)} ticks sobre lo uniforme: perímetro bajo revisión.`:`Desviación de ${deviation.toFixed(1)} ticks sobre lo uniforme. Perímetro estable en ${digits.length} lecturas.`};
    }
    if(duty==='macro'){
        const first=prices[0],last=prices.at(-1);
        const drift=first?((last-first)/first*100):0;
        const bias=digits.filter(d=>d>=5).length;
        return {text:`${drift>=0?'+':''}${drift.toFixed(3)}%`,drift,
            message:`Sesión ${drift>=0?'+':''}${drift.toFixed(3)}% en ${prices.length} ticks, con ${bias} lecturas altas en la ventana. Contexto ${Math.abs(drift)>.05?'con impulso':'lateral'}.`};
    }
    if(duty==='admin'){
        const wins=tradeHistory.filter(t=>t.isWon).length;
        const pnl=tradeHistory.reduce((sum,t)=>sum+t.payout,0);
        return {text:`${tradeHistory.length} cerrados`,alert:pnl<0,
            message:`${tradeHistory.length} contratos cerrados y ${wins} a favor. Balance de sesión ${usd(pnl)}; cuadro los recibos.`};
    }
    return null;
}
function tradeVoice(person,result,trade){
    const key=personaKey(person);
    if(key==='manager')return result.won?`PnL ${usd(result.profit)}: buena ejecución, equipo.`:`PnL ${usd(result.profit)}. Revisemos esta entrada sin dramatizar.`;
    if(key==='analyst')return result.won?`${trade.contract} ${trade.target} entró limpio con el dígito ${trade.digitResult??''}.`:`${trade.contract} ${trade.target} falló; recalibro el filtro.`;
    if(key==='tester')return trade.executionMode==='direct'?'Esta entrada fue directa del analista: no la validé yo.':result.won?'Muestra comprobada y ganada.':'Muestra comprobada y perdida; la anoto.';
    if(key==='over')return result.won?`Mi rango 0-3 aguantó: ${trade.contract} ${trade.target} a favor.`:`El rango 0-3 no se sostuvo en ${trade.contract} ${trade.target}.`;
    if(key==='under')return result.won?`Rango 7-9 confirmado: ${trade.contract} ${trade.target} pagado.`:`Rango 7-9 flojo; el ${trade.contract} ${trade.target} se fue.`;
    if(key==='server')return `Racks sin incidencias; el contrato cerró en ${result.won?'verde':'rojo'}.`;
    if(key==='cyber')return result.won?'Sin anomalías en la ejecución.':'Anomalía registrada en el cierre; reviso el registro.';
    if(key==='macro')return result.won?'El sesgo macro acompañó la entrada.':'El sesgo macro iba en contra; lo anoto.';
    if(key==='admin')return `Recibo ${result.won?'a favor':'con pérdida'} archivado: ${usd(result.profit)}.`;
    return result.won?'Cerrado a favor.':'Cerrado con pérdida.';
}
function dutyTick(person,dt){
    if(!person.cfg.duty||!person.isSitting)return;
    if(person.dutyTimer===undefined)person.dutyTimer=5+Math.random()*7;
    person.dutyTimer-=dt;
    if(person.dutyTimer>0)return;
    person.dutyTimer=11+Math.random()*11;
    const reading=dutyReading(person);
    if(!reading)return;
    person.dutyReading=reading;
    say(person,reading.message,5.5);
    person.reaction=null;
    const duty=officeDuties[person.cfg.duty];
    if(typeof spawnSignalBadge==='function')spawnSignalBadge(person,reading.text,duty.accent);
    if(typeof addAgentChatMessage==='function')
        addAgentChatMessage(person.cfg.name,person.cfg.role,reading.message,reading.alert?'warning':'info',`LECTURA · ${duty.label}`,person.cfg.id);
}
