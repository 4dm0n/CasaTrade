/* Pure, deterministic statistics for the paper-trading workspace. */
(function (root) {
    // Turbo works on a short, fast sample instead of the 100-tick baseline.
    const TURBO_WINDOW = 30;
    const TURBO_MIN_SAMPLE = 30;
    // An entry is only worth taking inside this window around the chosen
    // filter: with 77 selected, nothing is prepared between 72 and 82.
    const BAND = 5;

    function bandRange(threshold, band = BAND) {
        return {
            low: band > 0 ? Math.max(0, threshold - band) : 0,
            high: band > 0 ? Math.min(100, threshold + band) : 100
        };
    }
    function inBand(frequency, threshold, band = BAND) {
        if (!Number.isFinite(frequency)) return false;
        const range = bandRange(threshold, band);
        return frequency >= range.low && frequency <= range.high;
    }

    function analyze(digits, type, target, threshold) {
        const counts = Array(10).fill(0);
        digits.forEach(d => counts[d]++);
        const matches = digits.filter(d => type === 'OVER' ? d > target : d < target).length;
        const frequency = digits.length ? matches / digits.length * 100 : 0;
        // The band is the whole gate: with the filter at 77 a 75% reading is
        // still a valid entry, only readings outside 72-82 are discarded.
        return { counts, size: digits.length, frequency, eligible: digits.length >= 30 && inBand(frequency, threshold) };
    }
    function settle(digit, type, target, stake, multiplier) {
        const won = type === 'OVER' ? digit > target : digit < target;
        return { won, profit: won ? stake * (multiplier - 1) : -stake };
    }
    function nextStake(base, factor, losses) {
        if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(factor) || factor < 1 || factor > 10) return NaN;
        return Math.round(base * Math.pow(factor, losses) * 100) / 100;
    }

    // Per-digit counts, observed rate, and how long each digit has been absent.
    function tickStats(digits) {
        const counts = Array(10).fill(0), lastSeen = Array(10).fill(-1);
        digits.forEach((d, i) => { counts[d]++; lastSeen[d] = i; });
        const size = digits.length;
        return {
            size, counts, lastSeen,
            rate: digits.map((_, d) => size ? counts[d] / size * 100 : 0),
            gap: lastSeen.map(index => index < 0 ? size : size - 1 - index)
        };
    }

    // The three fast tick strategies, each expressed as a signed percentage.
    // hot        : digit appeared more/less than the uniform 10% rate.
    // reversion  : digit is overdue relative to its expected gap.
    // momentum   : the newest slice leans high or low versus the whole window.
    function turboSignals(digits, window = TURBO_WINDOW) {
        const slice = digits.slice(-window);
        const stats = tickStats(slice);
        const size = slice.length;
        const hot = stats.rate.map(rate => rate - 10);
        const reversion = stats.gap.map(gap => size ? gap / size * 100 - 10 : 0);
        const recent = slice.slice(-Math.min(8, size));
        const recentHigh = recent.length ? recent.filter(d => d >= 5).length / recent.length : .5;
        const baselineHigh = size ? slice.filter(d => d >= 5).length / size : .5;
        return { size, hot, reversion, momentum: (recentHigh - baselineHigh) * 100, recentHigh, baselineHigh };
    }

    function winningDigits(type, target) {
        const winners = [];
        for (let digit = 0; digit <= 9; digit++) if (type === 'OVER' ? digit > target : digit < target) winners.push(digit);
        return winners;
    }

    function byStrategy(a, b) {
        return b.strategy - a.strategy || b.frequency - a.frequency || a.target - b.target
            || a.contract.localeCompare(b.contract) || a.symbol.localeCompare(b.symbol);
    }

    // Blend of the three strategies into a single score for one market.
    // requireTypes keeps the live contract whitelist; demo markets carry no
    // contract metadata, so they are ranked on their digits alone.
    function rankTurbo(market, threshold, now = Date.now(), window = TURBO_WINDOW, requireTypes = true, band = BAND) {
        if (!market || now - market.lastTickAt > 5000) return [];
        const digits = market.digits.slice(-window);
        if (digits.length < TURBO_MIN_SAMPLE) return [];
        const signals = turboSignals(digits, window);
        const candidates = [];
        for (const type of ['OVER', 'UNDER']) {
            if (requireTypes && !market.types.includes(type)) continue;
            for (let target = 0; target <= 9; target++) {
                const winners = winningDigits(type, target);
                if (!winners.length) continue;
                const a = analyze(digits, type, target, threshold);
                if (!inBand(a.frequency, threshold, band)) continue;
                const mean = values => winners.reduce((sum, d) => sum + values[d], 0) / winners.length;
                const hot = mean(signals.hot) / 10;
                const reversion = mean(signals.reversion) / 10;
                const momentum = (type === 'OVER' ? signals.momentum : -signals.momentum) / 100;
                const strategy = .45 * hot + .30 * reversion + .25 * momentum;
                candidates.push({
                    symbol: market.symbol, contract: type, target, ...a, strategy, window: digits.length,
                    source: market.source, signals: { hot, reversion, momentum }
                });
            }
        }
        return candidates.sort(byStrategy);
    }

    function rankTurboAll(markets, threshold, now = Date.now(), window = TURBO_WINDOW) {
        const candidates = [];
        for (const market of markets) {
            for (const candidate of rankTurbo(market, threshold, now, window, market.source === 'live')) candidates.push(candidate);
        }
        return candidates.sort(byStrategy);
    }

    function rankMarkets(markets, threshold, now = Date.now(), band = BAND) {
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
                    if (!inBand(a.frequency, threshold, band)) continue;
                    // Compare deviation from the uniform baseline, not raw frequency:
                    // otherwise the easiest barrier would nearly always win the ranking.
                    const baseline = outcomes * 10;
                    candidates.push({ symbol: market.symbol, contract: type, target, ...a, baseline, score: a.frequency - baseline });
                }
            }
        }
        return candidates.sort((a,b) => b.score-a.score || b.frequency-a.frequency || a.symbol.localeCompare(b.symbol) || a.contract.localeCompare(b.contract) || a.target-b.target);
    }
    const api = { analyze, settle, nextStake, rankMarkets, tickStats, turboSignals, winningDigits, rankTurbo, rankTurboAll, bandRange, inBand, TURBO_WINDOW, TURBO_MIN_SAMPLE, BAND };
    if (typeof module !== 'undefined') module.exports = api;
    else root.TradeAnalysis = api;
})(globalThis);
