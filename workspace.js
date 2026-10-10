const tickWindow = [];
let pendingTrade = null;
let fallbackTimer = null;
let lastTickAt = 0;
let tickSource = 'Esperando conexión';
let currentTab = 'analysis-panel';
let tradingMode = 'manual';
let lossStreak = 0;
let martingaleFactor = 1;
let selectedCandidate = null;
let balanceEditing = false;

function usd(value) { return Number.isFinite(value) ? value.toLocaleString('en-US',{style:'currency',currency:'USD'}) : '—'; }
function nextTradeStake() { return TradeAnalysis.nextStake(currentStake,martingaleFactor,lossStreak); }
function manualSelection() {
    return {symbol:document.getElementById('market-select')?.value || 'R_10',contract:document.getElementById('contract-type').value,target:Number(document.getElementById('contract-digit').value)};
}
function chooseSelection() {
    if(pendingTrade)return pendingTrade;
    if(tradingMode==='manual')return manualSelection();
    return TradeAnalysis.rankMarkets([...marketBook.values()],minConfidence)[0] || null;
}
function selectionLabel(s) { return s ? `${marketBook.get(s.symbol)?.name || s.symbol} · ${s.contract} ${s.target}` : 'Buscando una entrada que cumpla el filtro'; }

function updateTradeStats() {
    const pnl=tradeHistory.reduce((sum,t)=>sum+Math.round(t.payout*100),0)/100;
    const wins=tradeHistory.filter(t=>t.isWon).length;
    document.getElementById('display-pnl').textContent=`${pnl>0?'+':''}${usd(pnl)}`;
    document.getElementById('display-pnl').dataset.sign=pnl<0?'negative':'positive';
    document.getElementById('stats-trades').textContent=`${tradeHistory.length} trades · ${wins} ganados · ${tradeHistory.length-wins} perdidos`;
    document.getElementById('history-pnl').textContent=`${pnl>0?'+':''}${usd(pnl)}`;
    document.getElementById('history-pnl').dataset.sign=pnl<0?'negative':'positive';
    document.getElementById('history-winrate').textContent=tradeHistory.length ? `${(wins/tradeHistory.length*100).toFixed(1)}%` : '—';
    document.getElementById('history-wins').textContent=String(wins);
    document.getElementById('history-losses').textContent=String(tradeHistory.length-wins);
    document.getElementById('history-summary-caption').textContent=`${tradeHistory.length} contratos cerrados · Winrate: ganados / total`;
    document.getElementById('display-balance').textContent=usd(currentBalance);
    document.getElementById('display-stake').textContent=usd(currentStake);
    document.getElementById('next-stake').textContent=usd(nextTradeStake());
    document.getElementById('loss-streak').textContent=`${lossStreak} pérdidas consecutivas`;
    const selection=chooseSelection() || manualSelection();
    const mult=getOverUnderPayoutMultiplier(selection.contract,selection.target);
    document.getElementById('estimated-payout').textContent=`${usd(nextTradeStake()*(mult-1))} neto estimado`;
    if(!balanceEditing)document.getElementById('input-balance').value=currentBalance.toFixed(2);
}
updateAccountValues=function() {
    currentStake=Number(document.getElementById('input-stake').value);
    updateTradeStats();
};
function cancelPendingForSettings() {
    if(pendingTrade){pendingTrade=null;feedback('Entrada pendiente cancelada al cambiar la configuración.');}
}
function setTradingMode(mode) {
    cancelPendingForSettings();tradingMode=mode;selectedCandidate=null;
    document.getElementById('manual-contract-fields').disabled=mode==='auto';
    document.getElementById('manual-mode').setAttribute('aria-pressed',String(mode==='manual'));
    document.getElementById('auto-mode').setAttribute('aria-pressed',String(mode==='auto'));
    document.getElementById('mode-description').textContent=mode==='manual'
        ? 'Opera exclusivamente el mercado y Over/Under seleccionados, si cumplen el filtro.'
        : 'Compara todas las volatilidades disponibles, incluidas 1s. Selección estadística con 100 ticks por mercado; un trade a la vez.';
    renderAnalysis();updateTradeStats();feedback(mode==='manual'?'Modo manual: contrato y mercado fijos.':'Selección automática activa: comparando mercados con el mismo filtro.');
}

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
    const selection=chooseSelection();
    const m=selection && marketBook.get(selection.symbol);
    return TradeAnalysis.analyze(m?.digits || [],selection?.contract || 'OVER',selection?.target ?? 6,minConfidence);
}
function displayedMarket() {
    const selection=chooseSelection();
    if(selection)return marketBook.get(selection.symbol);
    // Receiving data is independent of whether an entry passes the filter.
    return [...marketBook.values()].filter(m=>m.source==='live').sort((a,b)=>b.lastTickAt-a.lastTickAt || b.digits.length-a.digits.length)[0] || marketBook.get('R_10');
}
function renderAnalysis(message) {
    selectedCandidate=chooseSelection();
    const active=displayedMarket();
    const preview=selectedCandidate || manualSelection();
    const a = TradeAnalysis.analyze(active?.digits || [],preview.contract,preview.target,minConfidence);
    document.getElementById('sample-size').textContent = `${a.size}/100`;
    document.getElementById('observed-rate').textContent = `${a.frequency.toFixed(1)}%`;
    document.getElementById('data-source').textContent = active ? `${active.name} · ${active.source==='live'?'Ticks en vivo':active.source==='demo'?'Ticks demo':'Esperando ticks'}` : discoveryStatus;
    document.getElementById('feed-status').textContent=discoveryStatus;
    document.getElementById('data-source').textContent += tradingMode==='auto' && !selectedCandidate ? ' · vista de seguimiento, sin entrada elegida' : '';
    document.getElementById('active-contract').textContent=selectionLabel(selectedCandidate);
    document.getElementById('contract-selection').textContent=selectionLabel(selectedCandidate);
    const ready=[...marketBook.values()].filter(m=>m.source==='live'&&m.digits.length>=100&&Date.now()-m.lastTickAt<5000).length;
    document.getElementById('market-coverage').textContent=`${ready}/${marketBook.size} mercados con 100 ticks recientes · ${tradingMode==='auto'?'selección automática':'selección manual'}`;
    document.getElementById('selection-reason').textContent=tradingMode==='auto'
        ? selectedCandidate ? `Frecuencia ${a.frequency.toFixed(1)}% · filtro ${minConfidence}% · mayor desviación observada frente a la distribución uniforme. No implica ventaja futura.` : 'Esperando 100 ticks por mercado y una frecuencia que cumpla el filtro. Los datos demo no participan en la selección automática.'
        : `Contrato fijo: ${selectionLabel(manualSelection())}. No se cambia de barrera ni mercado automáticamente.`;
    document.getElementById('digit-bars').innerHTML = a.counts.map((n,d) => `<div class="digit-column"><span>${n}</span><div class="digit-bar" style="height:${a.size ? n / Math.max(...a.counts,1) * 76 : 3}px"></div>${d}</div>`).join('');
    document.getElementById('analysis-message').textContent = message || (pendingTrade ? `Trade preparado: ${selectionLabel(pendingTrade)} por ${usd(pendingTrade.stake)}. Esperando su siguiente tick.` : !websocketConnected && tradingMode==='auto' ? 'Esperando conexión y ticks en vivo. La selección automática no usa datos demo.' : globalOrder !== 'work' ? 'Operativa pausada. La recepción de ticks y el análisis continúan.' : !selectedCandidate ? `Recibiendo datos. Sin entrada que cumpla el filtro ${minConfidence}% en los mercados preparados.` : !active || Date.now()-active.lastTickAt>5000 ? 'Sin ticks recientes para el mercado seleccionado.' : a.size < 30 ? `Recolectando datos: faltan ${30-a.size} ticks para analizar.` : a.eligible ? 'Filtro de frecuencia cumplido. El próximo ciclo podrá preparar un trade.' : `Entrada descartada: frecuencia ${a.frequency.toFixed(1)}% inferior al filtro ${minConfidence}%.`);
    if(active && active.prices.length) {
        tickSource=active.source;lastTickAt=active.lastTickAt;
        wsPrice=active.quote;currentDigit=active.digits.at(-1);
        tickWindow.splice(0,tickWindow.length,...active.digits);
        priceHistory=active.prices.slice(-35);
        document.getElementById('ws-price').textContent=active.quote.toFixed(active.precision);
        document.getElementById('ws-digit').textContent=`Ld: ${currentDigit}`;
    }
    document.getElementById('header-market').textContent=active ? `${active.name} · TRADES` : 'VOLATILIDADES · TRADES';
    document.getElementById('ws-indicator').className=`w-3 h-3 rounded-full ${active?.source==='live' && Date.now()-active.lastTickAt<5000?'bg-emerald-500':'bg-amber-500'}`;
    updateTradeStats();
}
function receiveTick(quote, precision, source, symbol='R_10', identity='') {
    if(!Number.isFinite(quote)||!Number.isInteger(precision)||precision<0||precision>10)return;
    const m=ensureMarket(symbol);
    if(identity && m.lastIdentity===identity)return;
    if(m.source!==source) {
        m.digits.length=0;m.prices.length=0;
        if(pendingTrade?.symbol===symbol)pendingTrade=null;
    }
    m.lastIdentity=identity;m.source=source;m.lastTickAt=Date.now();m.quote=quote;m.precision=precision;m.sequence++;
    const digit=Number(quote.toFixed(precision).slice(-1));
    if (pendingTrade?.symbol===symbol && m.sequence>pendingTrade.sequence) {
        const trade = pendingTrade;
        pendingTrade = null;
        if (globalOrder === 'work' && Date.now()-trade.preparedAt<=10000) settlePendingTrade(trade,digit);
    }
    m.digits.push(digit);m.prices.push(quote);
    if(m.digits.length>100)m.digits.shift();
    if(m.prices.length>35)m.prices.shift();
    renderAnalysis();
}
function settlePendingTrade(t,digit) {
    const result = TradeAnalysis.settle(digit,t.contract,t.target,t.stake,t.multiplier);
    result.profit=Math.round(result.profit*100)/100;
    currentBalance = Math.round((currentBalance + result.profit)*100)/100;
    lossStreak=result.won?0:lossStreak+1;
    tradeHistory.unshift({ id:tradeHistory.length+1,time:new Date().toLocaleTimeString(),agent:`${marketBook.get(t.symbol)?.name || t.symbol} · ${t.source==='live'?'Live':'Demo'} · ${t.mode==='auto'?'Auto':'Manual'}`,symbol:t.symbol,contract:t.contract,target:t.target,multiplier:t.multiplier,type:`${t.contract} ${t.target}`,digitResult:digit,stake:t.stake,confidence:t.frequency,isWon:result.won,payout:result.profit });
    updateTradeStats();
    renderTradeHistory();
    validationRounds++;
    addAgentChatMessage('Sofía', 'Validación de trade', `${selectionLabel(t)} · dígito ${digit}. Resultado ${result.profit.toFixed(2)} USD; stake ${usd(t.stake)}; frecuencia previa ${t.frequency.toFixed(1)}%.`, result.won ? 'success':'danger','TRADE');
    const person = people.find(p=>p.cfg.id==='tester');
    if(person) spawnFloatingMoneyBadge(person.group.position,Math.abs(result.profit),result.won);
    feedback(`Trade #${tradeHistory.length} cerrado: ${result.profit.toFixed(2)} USD. Consulta Historial.`);
    if(validationRounds>=2) { feedback('Dos trades cerrados. El comprobante está disponible en la pestaña Recibo.'); validationRounds=0; }
}
recordTradeOperation = function () {
    const selection=chooseSelection();
    const market=selection && marketBook.get(selection.symbol);
    const a = analysisSnapshot();
    const stake=nextTradeStake();
    let reason = '';
    if (pendingTrade) reason = 'Ya hay un trade esperando el siguiente tick.';
    else if(balanceEditing) reason='Finaliza la edición del balance antes de abrir un trade.';
    else if(globalOrder !== 'work') reason = 'Operativa pausada. Selecciona Full Work para habilitar trades.';
    else if(!selection) reason='Ningún mercado cumple el filtro automático con 100 ticks recientes.';
    else if(!market || Date.now()-market.lastTickAt>5000) reason='Sin ticks recientes. Esperando la fuente de datos.';
    else if(market.source==='live'&&!market.types.includes(selection.contract)) reason='Este contrato no está disponible para el mercado seleccionado.';
    else if(selection.contract==='OVER'&&selection.target===9 || selection.contract==='UNDER'&&selection.target===0) reason='Esta barrera no tiene dígitos ganadores. Selecciona otra.';
    else if(a.size<30) reason=`Muestra insuficiente: ${a.size}/30 ticks mínimos.`;
    else if(!a.eligible) reason=`Sin entrada: frecuencia ${a.frequency.toFixed(1)}% < filtro ${minConfidence}%.`;
    else if(!Number.isFinite(stake)||stake<=0||!Number.isFinite(currentBalance)||stake>currentBalance) reason='Entrada bloqueada: el balance debe cubrir el siguiente stake y la martingala debe estar entre x1 y x10.';
    if(reason) { renderAnalysis(reason); feedback(reason); return; }
    const {contract,target,symbol}=selection;
    pendingTrade={contract,target,symbol,stake,multiplier:getOverUnderPayoutMultiplier(contract,target),frequency:a.frequency,source:market.source,sequence:market.sequence,preparedAt:Date.now(),mode:tradingMode};
    renderAnalysis();
    feedback('Análisis validado. Trade preparado para el siguiente tick.');
    addAgentChatMessage('Carlos','Análisis estadístico',`${selectionLabel(pendingTrade)} · ${a.size} ticks; frecuencia observada ${a.frequency.toFixed(1)}%. Preparando trade por ${usd(stake)}.`, 'info','TRADE');
};
triggerCoherentDocumentHandover = function () { if(globalOrder==='work' && !pendingTrade) recordTradeOperation(); };
setupDerivWebSocket = connectMarketFeed;
fallbackPriceSimulation = startOfflineFeed;
const originalOrder=setGlobalOrder;
setGlobalOrder=function(order) { originalOrder(order); if(order!=='work')pendingTrade=null; renderAnalysis(); feedback(`Orden aplicada: ${order==='work'?'análisis activo':'operativa pausada'}.`); document.querySelectorAll('#orders button').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('onclick').includes(`'${order}'`)))); };
const originalReset=resetSimulation;
resetSimulation=function() {
    pendingTrade=null; tickWindow.length=0; lossStreak=0;martingaleFactor=1;balanceEditing=false;
    for(const m of marketBook.values()){m.digits.length=0;m.prices.length=0;m.lastTickAt=0;}
    document.getElementById('input-martingale').value='1';
    document.getElementById('market-select').value='R_10';
    document.getElementById('balance-editor').hidden=true;
    originalReset();setTradingMode('manual');updateTradeStats();closeInvoiceModal();renderAnalysis();
    feedback('Sesión de trades reiniciada. Recolectando una nueva muestra.');
};
toggleAgentChatPanel=()=>openTab('agent-chat-panel');
toggleHistoryPanel=()=>openTab('history-panel');
const originalSidebar=openSidebar;
openSidebar=function(person) { selectedAgent=person; originalSidebar(person); openTab('agent-sidebar'); feedback(`Agente seleccionado: ${person.cfg.name}.`); };
closeSidebar=()=>openTab('analysis-panel');
closeInvoiceModal=()=>openTab('analysis-panel');
const originalInvoice=showInvoiceModal;
showInvoiceModal=function() {
    originalInvoice();
    const trades=tradeHistory.slice(0,2).reverse();
    document.getElementById('rec-contract').textContent=trades.map(t=>`${t.symbol} ${t.type}`).join(' / ');
    document.getElementById('rec-stake').textContent=trades.map(t=>usd(t.stake)).join(' / ');
    document.getElementById('rec-payout-rate').textContent=trades.map(t=>`+${((t.multiplier-1)*100).toFixed(1)}%`).join(' / ');
};
const originalCamera=setCameraView;
setCameraView=function(view) { originalCamera(view); feedback(`Vista de cámara: ${view}.`); };

function mountContractControls(config) {
    config.innerHTML=`<div class="contract-title"><div><p class="eyebrow">GESTIÓN DE CUENTA</p><h2>Contrato & estadísticas</h2></div><span class="account-tag">USD</span></div>
        <div class="metric-grid account-metrics"><div class="metric"><small>BALANCE</small><button id="balance-value" aria-label="Balance"><strong id="display-balance">$10,000.00</strong></button></div><div class="metric"><small>PNL DE LA SESIÓN</small><strong id="display-pnl">$0.00</strong></div></div>
        <div id="balance-editor" hidden><label for="input-balance">Balance (USD)</label><input id="input-balance" type="number" min="0" step="0.01" value="10000"><p class="fine-print">Enter para aplicar · Escape para cancelar</p></div>
        <p id="stats-trades" class="fine-print">0 trades · 0 ganados · 0 perdidos</p>
        <div class="risk-grid"><div><label for="input-stake">STAKE BASE <span id="display-stake">$10.00</span></label><input type="number" id="input-stake" min="0.01" step="0.01" value="10"></div><div><label for="input-martingale">MARTINGALA · MULTIPLICADOR</label><div class="factor-input"><span>×</span><input id="input-martingale" type="number" min="1" max="10" step="0.1" value="1"></div></div></div>
        <div class="next-stake-row"><div><span>Siguiente stake</span><p id="loss-streak">0 pérdidas consecutivas</p></div><strong id="next-stake">$10.00</strong></div>
        <p class="fine-print">x1 mantiene el stake. Tras perder se multiplica por el factor elegido (hasta x10); al ganar vuelve al stake base.</p>
        <div class="mode-switch" role="group" aria-label="Selección de contrato"><button id="manual-mode" aria-pressed="true">Manual</button><button id="auto-mode" aria-pressed="false">Selección automática</button></div>
        <p id="mode-description" class="fine-print">Opera exclusivamente el mercado y Over/Under seleccionados, si cumplen el filtro.</p><p id="contract-selection" class="fine-print" style="color:var(--cyan);margin-top:8px"></p>
        <fieldset id="manual-contract-fields"><label for="market-select">MERCADO</label><select id="market-select"><option value="R_10">Volatility 10</option></select><div class="risk-grid"><div><label for="contract-type">CONTRATO</label><select id="contract-type"><option value="OVER">DIGIT OVER</option><option value="UNDER">DIGIT UNDER</option></select></div><div><label for="contract-digit">BARRERA</label><select id="contract-digit">${Array.from({length:10},(_,i)=>`<option value="${i}" ${i===6?'selected':''}>${i}</option>`).join('')}</select></div></div></fieldset>
        <div class="filter-heading"><label for="input-confidence">Filtro de frecuencia observada</label><span id="display-confidence">75%</span></div><input type="range" id="input-confidence" min="50" max="99" value="75">
        <p class="fine-print">El mismo filtro se aplica en ambos modos. Automático usa un motor estadístico, sin un modelo de IA conectado.</p>
        <div class="payout-row"><span>Payout de referencia</span><strong id="estimated-payout"></strong></div>
        <button id="contract-analyze" class="primary-action">Analizar entrada ↗</button><button id="reset-account" class="secondary-action">Restablecer sesión</button>`;
    const balance=document.getElementById('input-balance');
    const finishBalance=apply=>{
        if(!balanceEditing)return;
        if(apply) {
            const value=Number(balance.value);
            if(balance.value.trim()==='' || !Number.isFinite(value)||value<0){balance.setCustomValidity('Introduce un balance válido, mayor o igual a cero.');balance.reportValidity();return;}
            currentBalance=Math.round(value*100)/100;
            cancelPendingForSettings();feedback('Balance actualizado. El PnL de los trades se conserva.');
        }
        balance.setCustomValidity('');balanceEditing=false;document.getElementById('balance-editor').hidden=true;updateTradeStats();
    };
    document.getElementById('balance-value').onclick=e=>{
        if(e.detail!==3)return;
        cancelPendingForSettings();
        balanceEditing=true;balance.value=currentBalance.toFixed(2);
        document.getElementById('balance-editor').hidden=false;balance.focus();balance.select();
    };
    balance.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();finishBalance(true);}if(e.key==='Escape'){e.preventDefault();finishBalance(false);}};
    balance.onblur=()=>finishBalance(true);
    balance.oninput=()=>balance.setCustomValidity('');
    document.getElementById('input-stake').oninput=()=>{
        cancelPendingForSettings();lossStreak=0;updateAccountValues();renderAnalysis();
        feedback(Number.isFinite(currentStake)&&currentStake>0?'Stake base actualizado. Secuencia de martingala restablecida.':'Introduce un stake mayor que cero.');
    };
    const factor=document.getElementById('input-martingale');
    factor.oninput=()=>{
        cancelPendingForSettings();lossStreak=0;
        martingaleFactor=factor.value===''?NaN:Math.min(10,Math.max(1,Number(factor.value)));
        if(factor.value!=='' && Number.isFinite(martingaleFactor) && (Number(factor.value)<1 || Number(factor.value)>10))factor.value=String(martingaleFactor);
        updateTradeStats();feedback('Martingala actualizada. Secuencia restablecida al stake base.');
    };
    document.getElementById('manual-mode').onclick=()=>setTradingMode('manual');
    document.getElementById('auto-mode').onclick=()=>setTradingMode('auto');
    ['market-select','contract-type','contract-digit'].forEach(id=>document.getElementById(id).onchange=()=>{
        cancelPendingForSettings();renderAnalysis();updateTradeStats();feedback(`Contrato manual: ${selectionLabel(manualSelection())}.`);
    });
    document.getElementById('input-confidence').oninput=()=>{cancelPendingForSettings();updateConfidenceValue();renderAnalysis();updateTradeStats();};
    document.getElementById('contract-analyze').onclick=()=>{recordTradeOperation();openTab('analysis-panel');};
    document.getElementById('reset-account').onclick=()=>resetSimulation();
    refreshMarketOptions();
}

function mountWorkspace() {
    const config=document.getElementById('config-widget');
    mountContractControls(config);
    const orders=document.querySelector('button[onclick="setGlobalOrder(\'work\')"]').parentElement;
    const cameras=document.querySelector('button[onclick="setCameraView(\'overview\')"]').parentElement;
    orders.id='orders'; cameras.id='cameras';
    const workspace=document.createElement('main'); workspace.id='workspace';
    workspace.innerHTML=`<section id="stage" aria-label="Oficina 3D"><div class="stage-label">CASA TRADE / OPERATIONS DECK<small>Arrastra para orbitar · rueda para acercar · selecciona un agente</small></div><div id="stage-footer"></div></section><section id="dock" aria-label="Centro de control"><div class="dock-heading">CENTRO DE CONTROL <span style="color:#fbbf24;font-size:9px">/ CUENTA DEMO</span></div><nav id="tabs" role="tablist" aria-label="Paneles de trabajo"></nav><section id="analysis-panel" class="workspace-panel"><h2 style="font-size:20px;font-weight:800">Inteligencia de mercado</h2><p class="fine-print" id="data-source">Esperando conexión</p><div class="feed-status-row"><span id="feed-status" role="status">Conectando mercados…</span><button id="reconnect-feed" type="button">Reconectar</button></div><div class="selection-card"><strong id="active-contract"></strong><p id="market-coverage" class="fine-print"></p><p id="selection-reason" class="fine-print"></p></div><div class="metric-grid"><div class="metric"><small>TICKS EN LA MUESTRA</small><strong id="sample-size">0/100</strong></div><div class="metric"><small>FRECUENCIA OBSERVADA</small><strong id="observed-rate">0.0%</strong></div></div><p class="fine-print">Distribución del último dígito · ventana de 100 ticks</p><div id="digit-bars"></div><div id="analysis-message" role="status"></div><button class="primary-action" id="analyze-now">Analizar ahora ↗</button><p class="fine-print">01 · Recibir al menos 30 ticks<br>02 · Comparar la frecuencia con el filtro<br>03 · Resolver el trade con el siguiente tick</p><p class="fine-print" style="margin-top:16px">La frecuencia histórica no es una probabilidad predictiva. Cuenta demo: saldo virtual; no se envían órdenes al broker.</p></section><div id="action-feedback" role="status" aria-live="polite">Sistema listo. Conectando fuente de ticks…</div></section>`;
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
    document.getElementById('reconnect-feed').onclick=()=>{connectMarketFeed();renderAnalysis();feedback('Reconectando la fuente pública de ticks…');};
    
    document.getElementById('input-confidence').previousElementSibling.firstElementChild.textContent='Filtro de frecuencia observada';
    openTab('analysis-panel');renderAnalysis();updateTradeStats();
    new ResizeObserver(()=>{
        document.body.style.setProperty('--header-height',`${document.querySelector('header').offsetHeight}px`);
        if(renderer){const stage=document.getElementById('stage'); camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);}
    }).observe(workspace);
    new ResizeObserver(()=>document.body.style.setProperty('--header-height',`${document.querySelector('header').offsetHeight}px`)).observe(document.querySelector('header'));
}
window.onload=()=>{mountWorkspace();try {init3D();} catch(error) {feedback('No se pudo iniciar la escena 3D. Revisa WebGL y la carga de dependencias.');console.error(error);} };
