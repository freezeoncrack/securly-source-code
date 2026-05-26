define(['amd/clients/healthCheck', 'amd/logger/logger', 'jquery'], function(HealthCheckClient, Logger, $) {
    describe('api', function () {
        var client;
        
        beforeEach(function () {
            client = new HealthCheckClient();
            
            Logger.debug = $.noop;
            Logger.info = $.noop;
            Logger.warn = $.noop;
            Logger.error = $.noop;
        });
        it("getHealthCheck has a code",function() {
            expect(client.getHealthCheckByCode).toThrow("getHealthCheckByCode called without a request");
        });

        it("deviceResolution has a resolutionRequest", function() {
            expect(client.deviceResolution).toThrow("deviceResolution called without a request");
        });
    });
});