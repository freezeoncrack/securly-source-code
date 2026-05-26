define(['amd/cabra/sessionFactory'], function(factory) {
    describe('sessionFactory', function () {
        var conversationid1 = "11111111-1111-1111-1111-111111111111";
        var conversationid2 = "22222222-2222-2222-2222-222222222222";
        
        it("returns null for unknown cabras", function () {
            var cabraSession = factory.getCabraSession("lolwut?", "12345", [], null); 
            expect(cabraSession).toEqual(null);
        });
   });
});