export function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

export function formatExp(num, prec = 3) {
    try {
        return Number(num).toExponential(prec);
    } catch (e) {
        return String(num);
    }
}
