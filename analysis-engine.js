/* Pure, deterministic statistics for the paper-trading workspace. */
(function (root) {
    function analyze(digits, type, target, threshold) {
        const counts = Array(10).fill(0);
        digits.forEach(d => counts[d]++);
        const matches = digits.filter(d => type === 'OVER' ? d > target : d < target).length;
        const frequency = digits.length ? matches / digits.length * 100 : 0;
        return { counts, size: digits.length, frequency, eligible: digits.length >= 30 && frequency >= threshold };
    }
    function settle(digit, type, target, stake, multiplier) {
        const won = type === 'OVER' ? digit > target : digit < target;
        return { won, profit: won ? stake * (multiplier - 1) : -stake };
    }
    function nextStake(base, factor, losses) {
        if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(factor) || factor < 1 || factor > 10) return NaN;
        return Math.round(base * Math.pow(factor, losses) * 100) / 100;
    }
    function rankMarkets(markets, threshold, now = Date.now()) {
        const candidates = [];
        for (const market of markets) {
            if (now - market.lastTickAt > 5000 || market.digits.length < 100 || market.source !== 'live') continue;
            for (const type of ['OVER', 'UNDER']) {
                if (!market.types.includes(type)) continue;
                for (let target = 0; target <= 9; target++) {
                    const outcomes = type === 'OVER' ? 9 - target : target;
                    if (outcomes <= 0) continue;
                    const a = analyze(market.digits, type, target, threshold);
                    if (!a.eligible) continue;
                    // Compare deviation from the uniform baseline, not raw frequency:
                    // otherwise the easiest barrier would nearly always win the ranking.
                    const baseline = outcomes * 10;
                    candidates.push({ symbol: market.symbol, contract: type, target, ...a, baseline, score: a.frequency - baseline });
                }
            }
        }
        return candidates.sort((a,b) => b.score-a.score || b.frequency-a.frequency || a.symbol.localeCompare(b.symbol) || a.contract.localeCompare(b.contract) || a.target-b.target);
    }
    const api = { analyze, settle, nextStake, rankMarkets };
    if (typeof module !== 'undefined') module.exports = api;
    else root.TradeAnalysis = api;
})(globalThis);
