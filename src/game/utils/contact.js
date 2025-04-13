
export const findContact = (contacts, targetBodyId) => {
    const c = contacts.find((c) => {
        if (c.bi.id !== targetBodyId && c.bj.id !== targetBodyId) return false;
        return (c.bi.collisionFilterGroup & c.bj.collisionFilterMask)===c.bi.collisionFilterGroup && (c.bj.collisionFilterGroup & c.bi.collisionFilterMask)===c.bj.collisionFilterGroup;
    });
    if (!c) return null;
    return {
        contact: c,
        target: c.bi.id == targetBodyId ?  c.bi : c.bj,
        body: c.bi.id == targetBodyId ?  c.bj : c.bi,
    }
}
