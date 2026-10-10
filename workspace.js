const tickWindow = [];
let pendingTrade = null;
let fallbackTimer = null;
let lastTickAt = 0;
let tickSource = 'Esperando conexión';
let currentTab = 'analysis-panel';

function feedback(message) {
    document.getElementById('action-feedback').textContent = message;
}
function openTab(id) {
    if(id==='invoice-modal') {
        if(tradeHistory.length<2) { feedback('El recibo requiere dos trades cerrados.'); return; }
        showInvoiceModal();
    }
    currentTab = id;
    document.querySelectorAll('.workspace-panel').forEach(p => p.hidden = p.id !== id);
    document.querySelectorAll('#tabs button').forEach(b => {
        b.setAttribute('aria-selected', String(b.dataset.panel === id));
        b.tabIndex = b.dataset.panel === id ? 0 : -1;
    });
}
function analysisSnapshot() {
    return TradeAnalysis.analyze(tickWindow, document.getElementById('contract-type').value,
        Number(document.getElementById('contract-digit').value), minConfidence);
}
function renderAnalysis(message) {
    const a = analysisSnapshot();
    document.getElementById('sample-size').textContent = `${a.size}/100`;
    document.getElementById('observed-rate').textContent = `${a.frequency.toFixed(1)}%`;
    document.getElementById('data-source').textContent = tickSource;
    document.getElementById('digit-bars').innerHTML = a.counts.map((n,d) => `<div class="digit-column"><span>${n}</span><div class="digit-bar" style="height:${a.size ? n / Math.max(...a.counts,1) * 76 : 3}px"></div>${d}</div>`).join('');
    document.getElementById('analysis-message').textContent = message || (pendingTrade ? 'Trade preparado. Esperando el siguiente tick para resolver el contrato.' : globalOrder !== 'work' ? 'Operativa pausada. La recepción de ticks y el análisis continúan.' : a.size < 30 ? `Recolectando datos: faltan ${30-a.size} ticks para analizar.` : a.eligible ? 'Filtro de frecuencia cumplido. El próximo ciclo podrá preparar un trade.' : `Entrada descartada: frecuencia ${a.frequency.toFixed(1)}% inferior al filtro ${minConfidence}%.`);
}
function receiveTick(quote, precision, source) {
    if (tickSource !== source) { tickWindow.length = 0; pendingTrade = null; }
    tickSource = source;
    lastTickAt = Date.now();
    lastPrice = wsPrice;
    wsPrice = quote;
    const formatted = quote.toFixed(precision);
    currentDigit = Number(formatted.slice(-1));
    document.getElementById('ws-price').textContent = formatted;
    document.getElementById('ws-digit').textContent = `Ld: ${currentDigit}`;
    priceHistory.push(quote);
    if (priceHistory.length > 35) priceHistory.shift();
    if (pendingTrade) {
        const trade = pendingTrade;
        pendingTrade = null;
        if (globalOrder === 'work') settlePendingTrade(trade);
    }
    tickWindow.push(currentDigit);
    if (tickWindow.length > 100) tickWindow.shift();
    renderAnalysis();
}
function settlePendingTrade(t) {
    const result = TradeAnalysis.settle(currentDigit,t.contract,t.target,t.stake,t.multiplier);
    currentBalance = Math.round((currentBalance + result.profit)*100)/100;
    document.getElementById('input-balance').value = currentBalance.toFixed(2);
    updateAccountValues();
    tradeHistory.unshift({ id:tradeHistory.length+1,time:new Date().toLocaleTimeString(),agent:`Carlos & Sofía · ${t.source}`,type:`${t.contract} ${t.target}`,digitResult:currentDigit,stake:t.stake,confidence:t.frequency,isWon:result.won,payout:result.profit });
    renderTradeHistory();
    validationRounds++;
    addAgentChatMessage('Sofía', 'Validación de trade', `Dígito ${currentDigit}: ${t.contract} ${t.target}. Resultado ${result.profit.toFixed(2)} USD; frecuencia previa ${t.frequency.toFixed(1)}%.`, result.won ? 'success':'danger','TRADE');
    const person = people.find(p=>p.cfg.id==='tester');
    if(person) spawnFloatingMoneyBadge(person.group.position,Math.abs(result.profit),result.won);
    feedback(`Trade #${tradeHistory.length} cerrado: ${result.profit.toFixed(2)} USD. Consulta Historial.`);
    if(validationRounds>=2) { feedback('Dos trades cerrados. El comprobante está disponible en la pestaña Recibo.'); validationRounds=0; }
}
recordTradeOperation = function () {
    const a = analysisSnapshot();
    let reason = '';
    if (pendingTrade) reason = 'Ya hay un trade esperando el siguiente tick.';
    else if(globalOrder !== 'work') reason = 'Operativa pausada. Selecciona Full Work para habilitar trades.';
    else if(Date.now()-lastTickAt>5000) reason='Sin ticks recientes. Esperando la fuente de datos.';
    else if(a.size<30) reason=`Muestra insuficiente: ${a.size}/30 ticks mínimos.`;
    else if(!a.eligible) reason=`Sin entrada: frecuencia ${a.frequency.toFixed(1)}% < filtro ${minConfidence}%.`;
    else if(!Number.isFinite(currentStake)||currentStake<=0||!Number.isFinite(currentBalance)||currentStake>currentBalance) reason='Revisa el saldo y el stake: deben ser positivos y el saldo debe cubrir la inversión.';
    if(reason) { renderAnalysis(reason); feedback(reason); return; }
    const contract=document.getElementById('contract-type').value;
    const target=Number(document.getElementById('contract-digit').value);
    pendingTrade={contract,target,stake:currentStake,multiplier:getOverUnderPayoutMultiplier(contract,target),frequency:a.frequency,source:tickSource};
    renderAnalysis();
    feedback('Análisis validado. Trade preparado para el siguiente tick.');
    addAgentChatMessage('Carlos','Análisis estadístico',`${a.size} ticks; frecuencia observada ${a.frequency.toFixed(1)}%. Preparando ${contract} ${target} por $${currentStake.toFixed(2)}.`, 'info','TRADE');
};
triggerCoherentDocumentHandover = function () { if(globalOrder==='work' && !pendingTrade) recordTradeOperation(); };
setupDerivWebSocket = function () {
    try {
        const ws=new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
        const timeout=setTimeout(()=>{ if(!websocketConnected) { ws.close(); fallbackPriceSimulation(); } },8000);
        ws.onopen=()=>ws.send(JSON.stringify({ticks:'R_10',subscribe:1}));
        ws.onmessage=e=>{
            let data; try { data=JSON.parse(e.data); } catch { return; }
            if(data.error) { ws.close(); fallbackPriceSimulation(); return; }
            if(!data.tick || !Number.isFinite(data.tick.quote)) return;
            clearTimeout(timeout); clearInterval(fallbackTimer); fallbackTimer=null;
            websocketConnected=true;
            document.getElementById('ws-indicator').className='w-3 h-3 rounded-full bg-emerald-500';
            receiveTick(data.tick.quote,Number.isInteger(data.tick.pip_size)?data.tick.pip_size:2,'Deriv · ticks en vivo');
        };
        ws.onerror=()=>{ ws.close(); };
        ws.onclose=()=>{ clearTimeout(timeout); websocketConnected=false; fallbackPriceSimulation(); };
    } catch { fallbackPriceSimulation(); }
};
fallbackPriceSimulation=function () {
    if(fallbackTimer) return;
    websocketConnected=false;
    document.getElementById('ws-indicator').className='w-3 h-3 rounded-full bg-amber-500';
    feedback('Fuente en modo demo: ticks generados localmente.');
    fallbackTimer=setInterval(()=>receiveTick(wsPrice+(Math.random()-.5)*1.8,2,'Demo · ticks sintéticos'),1000);
};
const originalOrder=setGlobalOrder;
setGlobalOrder=function(order) { originalOrder(order); if(order!=='work')pendingTrade=null; renderAnalysis(); feedback(`Orden aplicada: ${order==='work'?'análisis activo':'operativa pausada'}.`); document.querySelectorAll('#orders button').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('onclick').includes(`'${order}'`)))); };
const originalReset=resetSimulation;
resetSimulation=function() { pendingTrade=null; tickWindow.length=0; originalReset(); closeInvoiceModal(); renderAnalysis(); feedback('Sesión de trades reiniciada. Recolectando una nueva muestra.'); };
toggleAgentChatPanel=()=>openTab('agent-chat-panel');
toggleHistoryPanel=()=>openTab('history-panel');
const originalSidebar=openSidebar;
openSidebar=function(person) { selectedAgent=person; originalSidebar(person); openTab('agent-sidebar'); feedback(`Agente seleccionado: ${person.cfg.name}.`); };
closeSidebar=()=>openTab('analysis-panel');
closeInvoiceModal=()=>openTab('analysis-panel');
const originalCamera=setCameraView;
setCameraView=function(view) { originalCamera(view); feedback(`Vista de cámara: ${view}.`); };

function mountWorkspace() {
    const config=document.getElementById('config-widget');
    const orders=document.querySelector('button[onclick="setGlobalOrder(\'work\')"]').parentElement;
    const cameras=document.querySelector('button[onclick="setCameraView(\'overview\')"]').parentElement;
    orders.id='orders'; cameras.id='cameras';
    const workspace=document.createElement('main'); workspace.id='workspace';
    workspace.innerHTML=`<section id="stage" aria-label="Oficina 3D"><div class="stage-label">CASA TRADE / OPERATIONS DECK<small>Arrastra para orbitar · rueda para acercar · selecciona un agente</small></div><div id="stage-footer"></div></section><section id="dock" aria-label="Centro de control"><div class="dock-heading">CENTRO DE CONTROL <span style="color:#fbbf24;font-size:9px">/ CUENTA DEMO</span></div><nav id="tabs" role="tablist" aria-label="Paneles de trabajo"></nav><section id="analysis-panel" class="workspace-panel"><h2 style="font-size:20px;font-weight:800">Inteligencia de mercado</h2><p class="fine-print" id="data-source">Esperando conexión</p><div class="metric-grid"><div class="metric"><small>TICKS EN LA MUESTRA</small><strong id="sample-size">0/100</strong></div><div class="metric"><small>FRECUENCIA OBSERVADA</small><strong id="observed-rate">0.0%</strong></div></div><p class="fine-print">Distribución del último dígito · ventana de 100 ticks</p><div id="digit-bars"></div><div id="analysis-message" role="status"></div><button class="primary-action" id="analyze-now">Analizar ahora ↗</button><p class="fine-print">01 · Recibir al menos 30 ticks<br>02 · Comparar la frecuencia con el filtro<br>03 · Resolver el trade con el siguiente tick</p><p class="fine-print" style="margin-top:16px">La frecuencia histórica no es una probabilidad predictiva. Cuenta demo: saldo virtual; no se envían órdenes al broker.</p></section><div id="action-feedback" role="status" aria-live="polite">Sistema listo. Conectando fuente de ticks…</div></section>`;
    document.body.append(workspace);
    document.getElementById('stage').prepend(document.getElementById('canvas-container'));
    document.getElementById('stage-footer').append(orders,cameras);
    const dock=document.getElementById('dock');
    const tabs=[['analysis-panel','Análisis'],['config-widget','Contrato'],['agent-chat-panel','Chat'],['history-panel','Historial'],['agent-sidebar','Agentes'],['invoice-modal','Recibo']];
    tabs.forEach(([id,label],i)=>{
        const panel=document.getElementById(id); panel.classList.add('workspace-panel'); panel.setAttribute('role','tabpanel'); panel.setAttribute('aria-labelledby',`tab-${id}`);
        if(i) dock.insertBefore(panel,document.getElementById('action-feedback'));
        const b=document.createElement('button'); b.textContent=label;b.dataset.panel=id;b.id=`tab-${id}`;b.setAttribute('role','tab');b.setAttribute('aria-controls',id);b.onclick=()=>openTab(id);
        b.onkeydown=e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;openTab(tabs[n][0]);document.getElementById(`tab-${tabs[n][0]}`).focus();}};
        document.getElementById('tabs').append(b);
    });
    document.querySelectorAll('#agent-chat-panel button,#history-panel button').forEach(b=>{b.onclick=()=>openTab('analysis-panel');b.setAttribute('aria-label','Volver al análisis');});
    const list=document.createElement('div'); list.id='agent-list';
    peopleConfig.forEach(cfg=>{const b=document.createElement('button');b.textContent=`${cfg.name} · ${cfg.role}`;b.onclick=()=>{const p=people.find(p=>p.cfg.id===cfg.id);if(p)openSidebar(p);};list.append(b);});
    document.getElementById('agent-sidebar').prepend(list);
    document.getElementById('analyze-now').onclick=()=>recordTradeOperation();
    config.addEventListener('input',()=>{pendingTrade=null;renderAnalysis();feedback('Parámetros actualizados. Se recalculará la siguiente entrada.');});
    config.addEventListener('change',()=>{pendingTrade=null;renderAnalysis();});
    document.getElementById('input-confidence').previousElementSibling.firstElementChild.textContent='Filtro de frecuencia observada';
    openTab('analysis-panel');renderAnalysis();
    new ResizeObserver(()=>{
        document.body.style.setProperty('--header-height',`${document.querySelector('header').offsetHeight}px`);
        if(renderer){const stage=document.getElementById('stage'); camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);}
    }).observe(workspace);
    new ResizeObserver(()=>document.body.style.setProperty('--header-height',`${document.querySelector('header').offsetHeight}px`)).observe(document.querySelector('header'));
}
window.onload=()=>{mountWorkspace();try {init3D();} catch(error) {feedback('No se pudo iniciar la escena 3D. Revisa WebGL y la carga de dependencias.');console.error(error);} };
