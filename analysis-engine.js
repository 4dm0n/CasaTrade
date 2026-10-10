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
    const api = { analyze, settle };
    if (typeof module !== 'undefined') module.exports = api;
    else root.TradeAnalysis = api;
})(globalThis);
