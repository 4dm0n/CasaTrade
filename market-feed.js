// Discover supported volatility markets. Keep each stream isolated by symbol.
const marketBook = new Map();
let marketSocket = null;
let marketReconnect = null;
let marketWatchdog = null;
let feedGeneration = 0;
let discoveryStatus = 'Conectando mercados…';
const marketEndpoints = [
    'wss://api.derivws.com/trading/v1/options/ws/public'
];

function ensureMarket(symbol, name = symbol) {
    if (!marketBook.has(symbol)) marketBook.set(symbol, {
        symbol, name, digits: [], prices: [], lastTickAt: 0, quote: 0,
        precision: 2, source: '', sequence: 0, lastIdentity: '', types: [], status: 'Esperando datos'
    });
    return marketBook.get(symbol);
}
ensureMarket('R_10', 'Volatility 10');

function refreshMarketOptions() {
    const select = document.getElementById('market-select');
    if (!select) return;
    const value = select.value || 'R_10';
    select.replaceChildren(...[...marketBook.values()].map(m => {
        const option = document.createElement('option');
        option.value=m.symbol; option.textContent=`${m.name}${m.types.length ? '' : ' · pendiente'}`;
        return option;
    }));
    select.value=marketBook.has(value) ? value : 'R_10';
}

function connectMarketFeed() {
    const generation = ++feedGeneration;
    clearTimeout(marketReconnect);
    clearInterval(marketWatchdog);
    if (marketSocket) marketSocket.close();
    websocketConnected=false;
    pendingTrade=null;
    for(const m of marketBook.values())m.lastTickAt=0;
    discoveryStatus='Consultando volatilidades disponibles…';
    let ws;
    try { ws = new WebSocket(marketEndpoints[(generation-1)%marketEndpoints.length]); }
    catch { startOfflineFeed(); scheduleReconnect(); return; }
    marketSocket=ws;
    const timeout=setTimeout(()=>{if(generation===feedGeneration && !websocketConnected) ws.close();},12000);
    const send=message=>{if(ws.readyState===1)ws.send(JSON.stringify(message));};
    ws.onopen=()=>send({active_symbols:'brief'});
    ws.onmessage=event=>{
        if(generation!==feedGeneration) return;
        let data; try {data=JSON.parse(event.data);} catch {return;}
        if(data.error) {
            const symbol=data.echo_req?.contracts_for || data.echo_req?.ticks || data.echo_req?.ticks_history;
            if(symbol && marketBook.has(symbol)) {
                const m=marketBook.get(symbol);m.status=`${data.error.code || 'Error'}: ${data.error.message || 'No disponible'}`;m.types=[];
                refreshMarketOptions();
            } else discoveryStatus=`Error de datos: ${data.error.message || data.error.code}`;
            renderAnalysis();return;
        }
        if(Array.isArray(data.active_symbols)) {
            const symbols=data.active_symbols.map(m=>({...m,symbol:m.underlying_symbol || m.symbol,name:m.underlying_symbol_name || m.display_name})).filter(m=>/^(R_\d+|1HZ\d+V)$/.test(m.symbol) && !m.is_trading_suspended && m.exchange_is_open!==0);
            discoveryStatus=`${symbols.length} volatilidades detectadas · verificando contratos`;
            symbols.forEach(info=>{
                const m=ensureMarket(info.symbol,info.name);m.name=info.name || info.symbol;
                if(info.pip_size>0 && info.pip_size<1)m.precision=Math.round(-Math.log10(info.pip_size));
                send({contracts_for:info.symbol});
            });
            refreshMarketOptions();
        }
        if(data.contracts_for) {
            const symbol=data.echo_req?.contracts_for;
            if(!symbol) return;
            const m=ensureMarket(symbol);
            // This app settles at one tick. Exclude contracts whose minimum is longer.
            const available=(data.contracts_for.available || []).filter(c=>c.min_contract_duration==='1t');
            m.types=['OVER','UNDER'].filter(type=>available.some(c=>c.contract_type===`DIGIT${type}`));
            m.status=m.types.length?'Recolectando ticks':'Sin Over/Under de 1 tick';
            if(m.types.length)send({ticks_history:symbol,count:100,end:'latest',style:'ticks',subscribe:1});
            refreshMarketOptions();
        }
        if(data.history && data.echo_req?.ticks_history) {
            const m=ensureMarket(data.echo_req.ticks_history);
            const precision=Number.isInteger(data.pip_size)?data.pip_size:m.precision;
            const prices=data.history.prices;
            if(!Array.isArray(prices)||!prices.length||!prices.every(Number.isFinite))return;
            // Bootstrap statistics only. Historical ticks never resolve pending trades.
            m.precision=precision;m.source='live';m.quote=prices.at(-1);
            m.digits=prices.slice(-100).map(p=>Number(p.toFixed(precision).slice(-1)));
            m.prices=prices.slice(-35);m.lastTickAt=0;
            m.lastIdentity=`${data.history.times?.at(-1)}:${m.quote}`;
            m.status='Muestra cargada · esperando tick en vivo';
            renderAnalysis();
        }
        if(data.tick && Number.isFinite(data.tick.quote)) {
            clearTimeout(timeout);websocketConnected=true;
            clearInterval(fallbackTimer);fallbackTimer=null;
            const tick=data.tick;
            ensureMarket(tick.symbol).status='Ticks en vivo';
            discoveryStatus='Conectado · recibiendo ticks en vivo';
            receiveTick(tick.quote,Number.isInteger(tick.pip_size)?tick.pip_size:2,'live',tick.symbol,`${tick.epoch}:${tick.quote}`);
        }
    };
    ws.onerror=()=>{discoveryStatus='No se pudo abrir la conexión pública de datos.';ws.close();};
    ws.onclose=()=>{
        clearTimeout(timeout);
        if(generation!==feedGeneration)return;
        websocketConnected=false;
        if(pendingTrade) {pendingTrade=null;feedback('Conexión interrumpida. Entrada pendiente cancelada.');}
        startOfflineFeed();scheduleReconnect();
    };
    marketWatchdog=setInterval(()=>{
        if(generation!==feedGeneration)return;
        if(pendingTrade && Date.now()-pendingTrade.preparedAt>10000) {pendingTrade=null;feedback('Entrada cancelada: el mercado dejó de enviar ticks.');}
        const fresh=[...marketBook.values()].some(m=>m.source==='live' && Date.now()-m.lastTickAt<8000);
        if(websocketConnected && !fresh)ws.close();
        send({ping:1});renderAnalysis();
    },4000);
}
function scheduleReconnect() {
    clearTimeout(marketReconnect);
    marketReconnect=setTimeout(connectMarketFeed,15000);
}
function startOfflineFeed() {
    discoveryStatus='Sin conexión · reconexión automática';
    if(fallbackTimer)return;
    fallbackTimer=setInterval(()=>{
        // Local demo is confined to the selected manual market, never ranked as live.
        if(tradingMode==='auto') {renderAnalysis();return;}
        const symbol=document.getElementById('market-select').value;
        const m=ensureMarket(symbol);
        if(m.source==='live' && Date.now()-m.lastTickAt<8000)return;
        receiveTick((m.quote||6452.12)+(Math.random()-.5)*1.8,2,'demo',symbol);
    },1000);
}
