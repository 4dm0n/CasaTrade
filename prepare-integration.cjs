const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'.integration-final');
function edit(file,from,to){const p=path.join(root,file),s=fs.readFileSync(p,'utf8');if(!s.includes(from))throw Error('Missing '+file+': '+from);fs.writeFileSync(p,s.replace(from,to));}
// Reuse the verified kinematics, adapting them to the final project's table and floor groups.
let activities=fs.readFileSync(path.join(__dirname,'office-activities.js'),'utf8');
activities=activities.slice(0,activities.indexOf('const previousActivityMount='));
activities=activities.replaceAll('officeLife.players','officeActivities.players').replaceAll('officeLife.ball','officeLeisure.ball').replaceAll('officeLife.rally','officeLeisure.time');
activities=activities.replace("p.state==='visiting'&&p.group.visible&&p.activity?.kind==='ping'","p.state==='playing'&&p.activity?.kind==='ping'");
activities=activities.replace('bounce.y=1.685','bounce.y=1.67');
activities=activities.replace('officeLeisure.ball.position.copy(sampleRally(leisure.flight,leisure.time));','officeLeisure.table.updateMatrixWorld(true);\n    officeLeisure.ball.position.copy(officeLeisure.table.worldToLocal(sampleRally(leisure.flight,leisure.time)));');
activities=activities.replace('person.snack.geometry.dispose();person.snack.material.dispose();person.snack.parent.remove(person.snack);','if(person.snack){person.snack.geometry.dispose();person.snack.material.dispose();person.snack.parent.remove(person.snack);}');
fs.writeFileSync(path.join(root,'js/scene/office-activities.js'),activities);
edit('index.html','    <script src="js/scene/finance-floor.js"></script>','    <script src="js/scene/finance-floor.js"></script>\n    <script src="js/scene/office-activities.js"></script>\n    <script src="js/scene/office-life.js"></script>');
edit('js/scene/office-scene.js',"if(this.goal.kind==='pingpong'){this.sitAmount=0;this.state='playing';}","if(this.goal.kind==='pingpong'||this.goal.standing){this.sitAmount=0;this.state=this.goal.standing?'visiting':'playing';}");
edit('js/scene/office-scene.js',"const swing=walking?Math.sin(this.time*7+i*Math.PI)*.45:0;","arm.root.rotation.set(0,0,0);arm.elbow.rotation.set(0,0,0);\n            const swing=walking?Math.sin(this.time*7+i*Math.PI)*.45:0;");
edit('js/scene/office-scene.js','officeBox(table,7.25,.08,.08,0,1.68,0,officePalette.white,.01);',`// The net crosses the short dimension, perpendicular to the two players.
    const netCanvas=document.createElement('canvas');netCanvas.width=netCanvas.height=32;
    const netCtx=netCanvas.getContext('2d');netCtx.strokeStyle='#d5e6ed';netCtx.lineWidth=3;netCtx.strokeRect(0,0,32,32);
    const netMap=new THREE.CanvasTexture(netCanvas);netMap.wrapS=netMap.wrapT=THREE.RepeatWrapping;netMap.repeat.set(30,3);
    const net=new THREE.Mesh(new THREE.PlaneGeometry(3.8,.38),new THREE.MeshStandardMaterial({map:netMap,transparent:true,alphaTest:.1,side:THREE.DoubleSide,roughness:.9}));
    net.rotation.y=Math.PI/2;net.position.y=1.75;table.add(net);
    officeBox(table,.028,.028,3.9,0,1.946,0,officePalette.white,.005);
    for(const z of [-1.95,1.95])officeCylinder(table,.025,.45,0,1.75,z);`);
edit('js/app/workspace.js',"globalOrder !== 'work' ? 'Operativa pausada.","!['work','chill'].includes(globalOrder) ? 'Operativa pausada.");
edit('js/app/workspace.js',"if (globalOrder === 'work' && Date.now()-trade.preparedAt<=10000)","if (['work','chill'].includes(globalOrder) && Date.now()-trade.preparedAt<=10000)");
edit('js/app/workspace.js',"else if(globalOrder !== 'work') reason = 'Operativa pausada. Selecciona Full Work para habilitar trades.';","else if(!['work','chill'].includes(globalOrder)) reason = 'Operativa pausada. Selecciona Full Work u Oportunidad para habilitar trades.';");
edit('js/app/workspace.js',"mode:tradingMode};","mode:tradingMode,executionMode:globalOrder==='chill'?'direct':'validated'};");
edit('js/app/workspace.js',"setAgentSpeech('tester',agentPractice.status==='approved'","setAgentSpeech('tester',globalOrder==='chill'?'Modo Oportunidad: entrada directa del analista, sin trades de prueba.':agentPractice.status==='approved'");
edit('js/app/workspace.js',"if(order!=='work'){","if(order!=='work'||agentPractice.trial){");
edit('js/app/workspace.js',"order==='work'?'análisis activo':'operativa pausada'","order==='work'?'análisis y validación activos':order==='chill'?'Oportunidad: entradas directas del analista':'operativa pausada'");
edit('js/app/workspace.js',"recordMoneyMovement(Math.abs(result.profit),result.won);","recordMoneyMovement(Math.abs(result.profit),result.won);\n    if(typeof reactToTrade==='function')reactToTrade(result,t);");
edit('tests/check.cjs',"'js/scene/finance-floor.js']","'js/scene/finance-floor.js','js/scene/office-activities.js','js/scene/office-life.js']");
console.log('Prepared compatible activity geometry and trading integration.');
