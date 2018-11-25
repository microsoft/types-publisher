function detest(o: { [s: string]: () => void }) {
    for (const k in o) {
        test(k, o[k])
    }
}
detest({
    simpleSum() {
        expect(1 + 2).toBe(3);
    },
    ['even simpler sum']() {
        expect(1 + 1).toBe(2);
    }
})
