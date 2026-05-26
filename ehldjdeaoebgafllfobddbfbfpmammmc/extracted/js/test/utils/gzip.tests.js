define([
    'amd/lib/pako'
], function(
    pako
){
    describe("pako-testing", function(){
        it("can round trip this stuff like a boss", function () {           
            var test = { my: 'super', puper: [456, 567], awesome: 'pako' };
            var binary = pako.gzip(JSON.stringify(test), { level: 9 });            
            var restored = JSON.parse(pako.ungzip(binary, { to: 'string' }));
            expect(restored).toEqual(test);
        });
    });
});