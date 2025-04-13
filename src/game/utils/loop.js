const TICK_RATE = 30
let tickLengthMs = 1000 / TICK_RATE

export const loop = () => { 
    let id = null; 
    const cycle = (tick) => {
        id = setTimeout(() => cycle(tick), tickLengthMs);
        tick()
        id.ref()
        return () => clearTimeout(id);
    }
    return cycle;
}
