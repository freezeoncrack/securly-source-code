define([
    'amd/clients/core', 'amd/logger/logger', 'amd/settings',
    'js/test/mocks/connectionHub', 'jquery', 'underscore',
    "amd/clients/signalr-autotransport2"
], function(
    CoreApiClient, Logger, SETTINGS,
    Hub, $, _,
    AutoTransport
) {
    describe('core api client', function() {
        var client;
        beforeEach(function() {
            client = new CoreApiClient();
        });

        describe('starting', function() {
            var hub, auto, autoDfd;
            beforeEach(function() {
                hub = new Hub();
                autoDfd = $.Deferred();
                auto = {
                    connection: hub,
                    start: function () { return autoDfd;}
                };
                spyOn(auto, "start").andReturn(autoDfd);
                spyOn(AutoTransport, "create").andReturn(auto);
            });

            it('will not init without access token', function() {
                spyOn($, 'hubConnection').andReturn(hub);
                spyOn(client, '_startHubConnection');

                expect(client.initHubConnection).toThrow();
                expect(client._startHubConnection).not.toHaveBeenCalled();
            });

            it('will init with access token', function() {
                spyOn($, 'hubConnection').andReturn(hub);
                spyOn(client, '_startHubConnection');
                hub.createHubProxy.andReturn({});

                client.accessToken = 'nope';
                client.initHubConnection();

                expect($.hubConnection).toHaveBeenCalled();
                expect(client._hubConnection).toBe(hub);
                expect(client._startHubConnection).toHaveBeenCalled();
            });

            it('can attach to switchboard hub for v2 attach', function() {
                spyOn($, 'hubConnection').andReturn(hub);
                hub.createHubProxy.andReturn('proxy');
                spyOn(client, '_startHubConnection');

                client.accessToken = 'nope';
                client.initHubConnection();

                expect(hub.createHubProxy).toHaveBeenCalledWith('switchboard');
                expect(client._hubProxyMonitor).toBe('proxy');
                expect(client._startHubConnection).toHaveBeenCalled();
            });

            it('can not start hub without hub connection', function() {
                expect(client._startHubConnection).toThrow();
            });

            it('can start hub connection', function() {
                spyOn(client, 'subscribe');
                client._hubConnection = hub;
                client._autoTransport = AutoTransport.create();
                hub.start.andReturn(Promise.resolve());

                client._startHubConnection();
                expect(auto.start).toHaveBeenCalled();
            });

            it('can timeout connection', function() {
                client._hubConnection = hub;
                client._autoTransport = AutoTransport.create();
                var callback;
                spyOn(_, 'delay').andCallFake(function(fn, delay) {
                    callback = fn;
                });
                spyOn(client, 'subscribe');
                spyOn(client, 'restart');
                hub.start.andReturn(new $.Deferred());

                client._startHubConnection();
                expect(_.delay).toHaveBeenCalled();
                callback();

                expect(client.restart).toHaveBeenCalled();
            });
        });

        describe('reseting', function() {
            var hub;
            beforeEach(function() {
                hub = new Hub();
            });

            it('will subscribe for reset', function() {
                client._hubProxyMonitor = jasmine.createSpyObj('proxy', ['on']);
                client._hubProxyMonitor.on.andCallFake(function() {
                    return client._hubProxyMonitor;
                });

                client.subscribe();

                expect(client._hubProxyMonitor.on).toHaveBeenCalledWith(
                    'ResetCustomer', client.resetCustomerObserver);
            });

            it('will stop and restart hub', function() {
                client._hubConnection = hub;
                spyOn(client, 'unsubscribe');
                spyOn(client, '_startHubConnection');

                client.resetCustomerObserver();

                expect(client.unsubscribe).toHaveBeenCalled();
                expect(hub.stop).toHaveBeenCalled();
                expect(client._startHubConnection).toHaveBeenCalled();
            });
        });

        describe('stopping', function() {
            it('marks disconnect when stopping', function() {
                spyOn($, 'on');
                spyOn($, 'trigger');

                expect(client._processDisconnect).toBe(true);
                client.stop();
                expect(client._processDisconnect).toBe(false);
            });

            it('marks disconnect when stopping', function() {
                spyOn($, 'on');
                spyOn($, 'trigger');

                client.stop();
                expect($.trigger).toHaveBeenCalledWith(client.events.LEAVE_FROM_ALL);
            });

            it('does not trigger disconnect while already stopping', function() {
                spyOn($, 'on');
                spyOn($, 'trigger');

                client._processDisconnect = false;
                client.stop();

                expect($.on).not.toHaveBeenCalled();
                expect($.trigger).not.toHaveBeenCalled();
            });
        });

        describe('restarting', function() {
            it('restart marks processing disconnect', function() {
                spyOn($, 'on');
                spyOn($, 'trigger');

                expect(client._processDisconnect).toBe(true);
                client.restart();
                expect(client._processDisconnect).toBe(false);
            });

            it('will set processing flag before signalR error', function() {
                spyOn($, 'on');
                spyOn($, 'trigger');
                spyOn(client, 'initHubConnection').andCallFake(function() {
                    throw 'nope';
                });

                client._processDisconnect = false;
                var thrown = false;
                try {
                    client._restartAfterDetach();
                } catch (e) {
                    thrown = e;
                }

                expect(client._processDisconnect).toBe(true);
                expect(thrown).toBe('nope');
            });

            it('can trigger restart', function() {
                spyOn($, 'on');
                spyOn($, 'trigger');
                spyOn(Logger, 'debug');

                client.restart();

                expect(Logger.debug).toHaveBeenCalledWith(
                    'Switchboard restarting');
                expect($.on).toHaveBeenCalledWith(
                    SETTINGS.EVENTS.DID_DETACH_FROM_ALL_BROADCAST,
                    client.didDetachFromAllBroadcastObserverOnRestart);
                expect($.trigger).toHaveBeenCalledWith(
                    client.events.LEAVE_FROM_ALL);
                expect(client._quickRestart).toBe(false);
            });

            it('will not trigger restart while processing disconnect', function() {
                spyOn($, 'on');
                spyOn($, 'trigger');
                spyOn(Logger, 'debug');

                client._processDisconnect = false;
                client.restart();

                expect(Logger.debug).toHaveBeenCalledWith(
                    'Switchboard is already restarting');
                expect($.on).not.toHaveBeenCalledWith();
                expect($.trigger).not.toHaveBeenCalledWith();
            });

            it('can trigger restart quickly', function() {
                spyOn($, 'on');
                spyOn($, 'trigger');
                spyOn(Logger, 'debug');

                client.restart(true);

                expect(Logger.debug).toHaveBeenCalledWith(
                    'Switchboard restarting quickly');
                expect($.on).toHaveBeenCalledWith(
                    SETTINGS.EVENTS.DID_DETACH_FROM_ALL_BROADCAST,
                    client.didDetachFromAllBroadcastObserverOnRestart);
                expect($.trigger).toHaveBeenCalledWith(
                    client.events.LEAVE_FROM_ALL);
                expect(client._quickRestart).toBe(true);
            });

            it('delays restart after detaching from all', function() {
                spyOn(_, 'delay');
                spyOn(client, 'unsubscribe');
                spyOn(client, '_restartAfterDetach');
                client._hubConnection = { stop: $.noop };

                client.didDetachFromAllBroadcastObserverOnRestart();

                expect(client._restartAfterDetach).not.toHaveBeenCalled();
                expect(_.delay).toHaveBeenCalledWith(client._restartAfterDetach, 30000);
            });

            it('restarts immedialetly for quick restart', function() {
                spyOn(_, 'delay');
                spyOn(client, 'unsubscribe');
                spyOn(client, '_restartAfterDetach');
                client._hubConnection = { stop: $.noop };

                client._quickRestart = true;
                client.didDetachFromAllBroadcastObserverOnRestart();

                expect(client._quickRestart).toBe(false);
                expect(client._restartAfterDetach).toHaveBeenCalled();
                expect(_.delay).not.toHaveBeenCalled();
            });

            it('does not restart while stopping', function() {
                spyOn($, 'on');
                spyOn($, 'trigger');

                client.stop();
                client.restart();

                expect($.trigger).toHaveBeenCalledWith(client.events.LEAVE_FROM_ALL);
                expect($.trigger.calls.length).toEqual(1);
            });
        });

        describe("delaySwitchboard", function () {
            var hub;
            beforeEach(function() {
                hub = new Hub();
            });

            it('will subscribe for reset', function() {
                //later test relies on assumptions based on this test
                client._hubProxyMonitor = jasmine.createSpyObj('proxy', ['on']);
                client._hubProxyMonitor.on.andCallFake(function() {
                    return client._hubProxyMonitor;
                });

                client.subscribe();

                expect(client._hubProxyMonitor.on).toHaveBeenCalledWith(
                    'DelaySwitchboard', client.delaySwitchboardObserver);
            });

            it('runs minute long checks till time elapses', function() {
                //test assumes the above has verified we call dealySwitchboardObserverer 
                client._hubConnection = hub;
                spyOn(client, 'unsubscribe');
                spyOn(client, '_startHubConnection');
                var now = 24601;
                spyOn(_, "now").andCallFake(function(){
                    return now;
                });
                spyOn(_, "delay");
                client.delaySwitchboardObserver({
                    delay: 12000000000//time in milliseconds
                });
                expect(_.delay.calls.length).toEqual(1);
                expect(_.delay).toHaveBeenCalledWith(jasmine.any(Function), 60000);
                _.delay.calls[0].args[0]();
                expect(_.delay.calls.length).toEqual(2);
                now += 12000000000;//now equal
                _.delay.calls[1].args[0]();
                expect(client._startHubConnection).toHaveBeenCalled();
                expect(_.delay.calls.length).toEqual(2);//not called again
                
            });
        });
    });
});
