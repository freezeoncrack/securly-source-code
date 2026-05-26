define([
    'amd/clients/core', 'amd/application', 'amd/broadcast/sessionManager',
    'amd/clients/satellite', 'js/test/mocks/chrome.runtime', 'js/globals',
    'underscore', 'amd/clients/signalr-autotransport2'
], function(
    CoreApiClient, App, BroadcastSessionManager,
    SatelliteApiClient, runtime, ignore,
    _, AutoTransport
) {
    describe('core client error_handling', function () {
        var bsm, client;
        beforeEach(function () {
            spyOn(_, 'delay');
            spyOn($.signalR.fn, "start").andCallFake(function(){
                return $.Deferred();
            });

            spyOn(AutoTransport, "create").andReturn({
                start:function () { 
                    return $.Deferred();
                }
            });

            client = new CoreApiClient();
            client.log = function(message){
                console.log(message);
            };
            client.accessToken = true;
        });

        afterEach(function() {
            client._processDisconnect = false;
            client.unsubscribe();
            if (client._hubConnection) {
                client._hubConnection.stop();
            }

            if (bsm) {
                bsm.unsubscribe();
            }
        });

        it('doesn\'t attempt restart if already restarting' , function(){
            client.initHubConnection();
            var restarts = 0;
            $.on("leave_from_all", function(){
                restarts++;
            });

            client.subscribe = $.noop;
            client.restart();
            expect(client._processDisconnect).toEqual(false);
            expect(restarts).toEqual(1);

            client.restart();

            $.off("leave_from_all");
            expect(client._processDisconnect).toEqual(false);
            expect(restarts).toEqual(1);
        });

        /*it('it restarts when wifi drops', function(){

            var app = new App();

            spyOn(app, '_initClients');

            spyOn(app.bsm, 'init').andCallFake(function(){
                app.bsm._client = new CoreApiClient();
                app.bsm._client.accessToken = 'accessToken';
            });


            app.bsm.init();
            spyOn(app.bsm._client, 'restart');

            var event = document.createEvent('HTMLEvents');
            event.initEvent('offline', true, true);
            document.dispatchEvent(event);

            waitsFor(function(){
                return true;
            });

            runs(function(){
                expect(app.bsm._client.restart.callCount).toEqual(1);
                app.bsm.unsubscribe();
            });
        });*/

        it('it calls restart on signalr disconnect', function(){
            bsm = new BroadcastSessionManager();
            bsm._client = client;
            bsm.subscribe();

            client.accessToken = true;

            spyOn(client, 'restart').andCallFake(function(){
                client._processDisconnect = false;
            });

            client.initHubConnection();

            $(client._hubConnection).triggerHandler('onDisconnect');

            waitsFor(function(){
                return !client._processDisconnect;
            });

            runs(function(){
                expect(client.restart.callCount).toEqual(1);
            });
        });

        it('it does not call restart on signalr error', function(){
            bsm = new BroadcastSessionManager();
            bsm._client = client;
            bsm.subscribe();

            client.accessToken = true;

            spyOn(client, 'restart').andCallFake(function(){
                client._processDisconnect = false;
            });

            client.initHubConnection();

            $(client._hubConnection).triggerHandler('onError', {});

            runs(function(){
                expect(client.restart.callCount).toEqual(0);
            });
        });

        it('it does not call restart on signalr slow connection', function(){
            bsm = new BroadcastSessionManager();
            bsm._client = client;
            bsm.subscribe();

            client.accessToken = true;

            spyOn(client, 'restart').andCallFake(function(){
                client._processDisconnect = false;
            });

            client.initHubConnection();

            $(client._hubConnection).triggerHandler('onConnectionSlow');

            runs(function(){
                expect(client.restart.callCount).toEqual(0);
            });
        });

        it('waits 30 seconds between restarts', function(){
            client._hubConnection = {
                stop: $.noop
            };
            client._hubProxyMonitor = {
                off: $.noop
            };

            spyOn(client, 'unsubscribe');

            client.didDetachFromAllBroadcastObserverOnRestart();
            expect(_.delay).toHaveBeenCalledWith(client._restartAfterDetach, 30000);
        });

    });

    describe('satellite client error_handling', function(){
        var bsm, client, satellite;
        beforeEach(function () {
            spyOn($.signalR.fn, "start").andCallFake(function(){
                return $.Deferred();
            });
            var negotiateJQXhr = $.Deferred().resolve({
                TryWebSockets: false,
                ProtocolVersion:"1.3"
            });
            negotiateJQXhr.abort = $.noop;
            spyOn($, "ajax").andReturn(negotiateJQXhr);
            spyOn($.signalR.transports.webSockets, "start").andReturn($.Deferred());
            spyOn($.signalR.transports.serverSentEvents, "start").andReturn($.Deferred());
            spyOn($.signalR.transports.longPolling, "start").andReturn($.Deferred());

            client = new CoreApiClient();
            satellite = new SatelliteApiClient();
            spyOn(satellite, '_checkHubConnection');
            client.accessToken = true;
            client.initHubConnection();
            satellite.accessToken = true;
            satellite.baseUrl = true;
            satellite.coreAccessToken = client.accessToken;
            satellite._initHubConnection();
        });

        afterEach(function() {
            client.unsubscribe();
            if (client._hubConnection) {
                client._hubConnection.stop();
            }

            satellite.unsubscribe();
            if (satellite._hubConnection) {
                satellite._hubConnection.stop();
            }

            if (bsm) {
                bsm.unsubscribe();
            }
        });

        it('calls restart for error with attach V2', function() {
            bsm = new BroadcastSessionManager();
            bsm._client = client;

            spyOn(client, 'restart').andCallFake(function() {
                client._processDisconnect = false;
            });

            bsm.didReceiveError(new Error('nope'));

            waitsFor(function() {
                return !client._processDisconnect;
            });

            runs(function() {
                expect(client.restart.callCount).toEqual(1);
            });
        });

        it('it calls restart on signalr disconnect', function(){
            bsm = new BroadcastSessionManager();
            bsm._client = client;
            bsm.subscribe();

            spyOn(client, 'restart').andCallFake(function(){
                client._processDisconnect = false;
            });

            $(satellite._hubConnection).triggerHandler('onDisconnect');

            waitsFor(function(){
                return !client._processDisconnect;
            });

            runs(function(){
                expect(client.restart.callCount).toEqual(1);
            });
        });

        it('it does not calls restart on signalr error', function(){
            bsm = new BroadcastSessionManager();
            bsm._client = client;
            bsm.subscribe();

            satellite.accessToken = true;
            satellite.baseUrl = true;

            spyOn(client, 'restart').andCallFake(function(){
                client._processDisconnect = false;
            });

            satellite._initHubConnection();

            $(satellite._hubConnection).triggerHandler('onError');

            runs(function(){
                expect(client.restart.callCount).toEqual(0);
            });
        });

        it('it does not calls restart on signalr slowconnection', function(){
            bsm = new BroadcastSessionManager();
            bsm._client = client;
            bsm.subscribe();

            spyOn(client, 'restart').andCallFake(function(){
                client._processDisconnect = false;
            });

            $(satellite._hubConnection).triggerHandler('onConnectionSlow');

            runs(function(){
                expect(client.restart.callCount).toEqual(0);
            });
        });
    });
});
