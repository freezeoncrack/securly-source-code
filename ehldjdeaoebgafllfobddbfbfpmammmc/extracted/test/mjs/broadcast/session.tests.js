     
import CoreApiClient from "/js/mjs/clients/core.js"; 
import App from  "/js/mjs/application.js"; 
import BroadcastSession from "/js/mjs/broadcast/session.js"; 
import SatelliteApiClient from "/js/mjs/clients/satellite.js"; 
// import ignore from "/js/globals.js"; 
import $ from "/js/lib/jquery-2.1.1.min.js";//used for $.Deferred
import CabraSessionFactory from "/js/mjs/cabra/sessionFactory.js";
import BaseCabraSession from "/js/mjs/cabra/session.js"; 
import cabraEvents from "/js/mjs/cabra/cabraSession.events.js"; 
import SETTINGS from "/js/mjs/settings.js";
import MockBroadcastFrameCommand from "/js/test/mocks/broadcastFrameCommand.js"; 
import guid from "/js/mjs/lib/uuid.js"; 
import Pubsub from "/js/mjs/sandbox.js";
import eventAggregator from "/js/mjs/utils/eventAggregator.js";
describe('broadcastSession basics', function() {
    var session;
    beforeEach(function() {
        jasmine.clock().install();
        eventAggregator.removeAllListeners();
        session = new BroadcastSession();
    });
    afterEach(function(){
        jasmine.clock().uninstall();
        eventAggregator.removeAllListeners();
    });

    it('can construct session with version and token', function() {
        session = new BroadcastSession('testing');
        expect(session.coreAccessToken).toBe('testing');

        session = new BroadcastSession();
        expect(session.coreAccessToken).toBe(undefined);
    });

    it('_allCabras contains all cabras', function() {
        session.pendingCabras['111'] = 'test-111';
        session.pendingCabras['222'] = 'test-222';
        session.pendingCabras['333'] = 'test-333';
        session.activeCabras['444'] = 'test-444';
        session.activeCabras['555'] = 'test-555';

        var cabras = session._allCabras();
        expect(Object.keys(cabras).length).toEqual(5);

        var key;
        for (key in session.pendingCabras) {
            expect(cabras.hasOwnProperty(key)).toBe(true);
        }
        for (key in session.activeCabras) {
            expect(cabras.hasOwnProperty(key)).toBe(true);
        }
    });

    it('can initialize session', function() {
        spyOn(session, 'initParams');

        session.init({});

        expect(session.initParams).toHaveBeenCalled();
        expect(session._client).toBeTruthy();
    });

    it('can initialize session for V2 attach', function() {
        spyOn(session, 'initParams');
        session.coreAccessToken = 'testing';

        session.init({});

        expect(session.initParams).toHaveBeenCalled();
        expect(session._client).toBeTruthy();
        expect(session.accessToken).toBe('testing');
    });

    it('can copy init parameters', function() {
        session.test = null;
        session.testKey = null;
        session.initParams({
            test: 'test',
            test_key: 'test_value',
            other_key: 'nope'
        });

        expect(session.test).toBe('test');
        expect(session.testKey).toBe('test_value');
        expect(session.otherKey).toBe(undefined);
        expect(session.other_key).toBe(undefined);
    });

    it('will throw for bad parameters in init', function() {
        function init(params) {
            return session.initParams.bind(session, params);
        }

        expect(init({url: false})).toThrow();
        expect(init({broadcast_id: false})).toThrow();
        expect(init({broadcast_id: undefined})).toThrow();
        expect(init({broadcast_id: null})).toThrow();
        expect(init({broadcast_id: ''})).toThrow();

        expect(init({broadcast_id: 'testing'})).not.toThrow();
        expect(init({test_key: ''})).not.toThrow();
    });

    it('will allow empty token for attach V2', function() {
        expect(session.initParams.bind(session, {access_token: ''})).not.toThrow();
    });
});

describe('exit cabras', function() {
    var broadcast;
    var cabraId;
    beforeEach(function() {
        cabraId = 0;
        broadcast = new BroadcastSession();
    });

    var mockCabra = function(failLeave) {
        return {
            cabraId: '' + (++cabraId),
            events: {},
            once: function(name, callback) {
                this.events[name] = callback;
                return this;
            },
            leave: function() {
                var fn = failLeave ?
                    cabraEvents.CabraSessionDidFailToLeaveEvent :
                    cabraEvents.CabraSessionDidLeaveEvent;
                var callback = this.events[fn];
                delete this.events[fn];
                callback(this.cabraId);
            }
        };
    };

    it('exits with no cabras', async function() {
        var success = null;
        await broadcast._exitCabras().then(
            function() { success = true; },
            function() { success = false; }
        );
        expect(success).toBe(true);        
    });

    it('rejects exit with thrown error', async function() {
        spyOn(broadcast, '_allCabras').and.callFake(function() {
            throw 'nope';
        });

        var success = null;
        await broadcast._exitCabras().then(
            function() { success = true; },
            function() { success = false; }
        );
        expect(success).toBe(false);        
    });

    it('exits active cabra', async function() {
        var cabra = mockCabra();
        broadcast.activeCabras[cabra.cabraId] = cabra;

        spyOn(cabra, 'leave').and.callThrough();

        var success = null;
        await broadcast._exitCabras().then(
            function() { success = true; },
            function() { success = false; }
        );
        expect(success).toBe(true);
        expect(cabra.leave).toHaveBeenCalled();
    });

    it('exits pending cabra', async function() {
        var cabra = mockCabra();
        broadcast.pendingCabras[cabra.cabraId] = cabra;

        spyOn(cabra, 'leave').and.callThrough();

        var success = null;
        await broadcast._exitCabras().then(
            function() { success = true; },
            function() { success = false; }
        );
        expect(success).toBe(true);
        expect(cabra.leave).toHaveBeenCalled();
    });

    it('exits and removes all cabras', async function() {
        var i, cabra, bucket;
        var cabras = [];

        for (i = 0; i < 5; i++) {
            cabra = mockCabra();
            spyOn(cabra, 'leave').and.callThrough();
            bucket = i % 2 === 0 ? 'activeCabras' : 'pendingCabras';
            broadcast[bucket][cabra.cabraId] = cabra;
            cabras.push(cabra);
        }

        var success = null;
        await broadcast._exitCabras().then(
            function() { success = true; },
            function() { success = false; }
        );
        expect(success).toBe(true);
        expect(Object.keys(broadcast.activeCabras).length).toEqual(0);
        expect(Object.keys(broadcast.pendingCabras).length).toEqual(0);
        cabras.forEach(function(cabra) {
            expect(cabra.leave).toHaveBeenCalled();
        });
    });

    it('rejects failed cabra leave', async function() {
        var cabra = mockCabra(true);
        broadcast.activeCabras[cabra.cabraId] = cabra;

        spyOn(cabra, 'leave').and.callThrough();

        var success = null;
        await broadcast._exitCabras().then(
            function() { success = true; },
            function() { success = false; }
        );
        expect(success).toBe(false);
        expect(cabra.leave).toHaveBeenCalled();
    });

    it('does not pass when failing cabra leave', async function() {
        var cabras = [mockCabra(), mockCabra(true)];
        spyOn(broadcast, '_allCabras').and.returnValue(cabras);

        var success = null;
        await broadcast._exitCabras().then(
            function() { success = true; },
            function() { success = false; }
        );
        expect(success).toBe(false);
    });
});

describe("broadcastSession", function () {
    var broadcast;
    var instruction;
    var attachDfd;
    var pubsub;
    beforeEach(function () {
        broadcast = new BroadcastSession();
        instruction = {
            broadcast_id: "B40aDCA571D",
            access_token: "111111111111",
            url: "https://localhost:8282/USE-MOCK",
            roster: {}
        };
        broadcast.init(instruction);
        pubsub = new Pubsub().init();
    });

    describe("attach process", function () {
        it('will choose core token for attach V2', function() {
            spyOn(broadcast, 'didAttachToBroadcast');
            spyOn(broadcast, 'didFailToAttachToBroadcast');

            broadcast._client = jasmine.createSpyObj('client', ['init', 'attach']);
            broadcast._client.init.and.returnValue(Promise.resolve());
            broadcast._client.attach.and.returnValue(new Promise(()=>{}));//dont resolve as thats not the test

            broadcast.coreAccessToken = 'core';
            broadcast.accessToken = 'token';
            
            broadcast.attach();

            expect(broadcast._client.init).toHaveBeenCalledWith({
                broadcastId: broadcast.broadcastId,
                baseUrl: broadcast.url,
                coreAccessToken: 'core'
            });
        });

        it('subscribes to pubsub events before signalr init' , function(){
            spyOn(broadcast._client, "init").and.callFake(function () {
                expect(eventAggregator.on).toHaveBeenCalledWith("B40aDCA571D/open_object", jasmine.any(Function));
                expect(eventAggregator.on).toHaveBeenCalledWith("B40aDCA571D/broadcast_end", jasmine.any(Function));
                return $.Deferred();
            });
            spyOn(eventAggregator, "on");
            broadcast.attach();
            expect(broadcast._client.init).toHaveBeenCalled();
        });
        
        it("calls attach if init succeeds", function () {
            spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve({}));
            attachDfd = $.Deferred();
            spyOn(broadcast._client, "attach").and.returnValue(attachDfd);
            spyOn(eventAggregator, "on");
            
            broadcast.attach();
            //base assumptions
            expect(broadcast._client.init).toHaveBeenCalled();
            expect(eventAggregator.on).toHaveBeenCalledWith("B40aDCA571D/open_object", jasmine.any(Function));
            expect(broadcast._client.attach).toHaveBeenCalled();
        });

        it("enters open_objects that were received on attach", function () {
            //https://github.com/DyKnow/DyKnowMe/issues/5327
            spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve({}));
            attachDfd = $.Deferred();
            spyOn(broadcast._client, "attach").and.returnValue(attachDfd);
            spyOn(broadcast._client, "enterCabra").and.returnValue($.Deferred());
            spyOn(CabraSessionFactory, "getCabraSession").and.callFake(function(name, cabraId, rules, satelliteAPIClient ) {
                var c = new BaseCabraSession();
                c.init(name, cabraId, rules, satelliteAPIClient);
                return c;
            });
            spyOn(eventAggregator, "on");
            
            broadcast.attach();
            attachDfd.resolve({
                broadcast_objects: [{
                    object_id: "111111",
                    cabra_id: 1,
                    cabra_name: "love"
                },
                {
                object_id: "222222",
                cabra_id: 2,
                cabra_name: "basketball"
                }
                ],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        },
                        cabra_rules: []
                    },
                    { 
                        cabra_id: 2,
                        cabra: {
                            name: "basketball"
                        },
                        cabra_rules: []
                    }
                ]
            });
            expect(broadcast._client.enterCabra).toHaveBeenCalledWith("111111");
            expect(broadcast._client.enterCabra).toHaveBeenCalledWith("222222");
            //and that we only called it exactly 2 times
            expect(broadcast._client.enterCabra).toHaveBeenCalledTimes(2);
            expect(CabraSessionFactory.getCabraSession.calls.all()[0].args.slice(0,2)).toEqual(["love", "111111"]);
            expect(CabraSessionFactory.getCabraSession.calls.all()[1].args.slice(0,2)).toEqual(["basketball", "222222"]);
            //and that we only called it exactly 2 times
            expect(CabraSessionFactory.getCabraSession).toHaveBeenCalledTimes(2);

        });
        
        it("enters open_objects that were received before attach returned", function () {
            //https://github.com/DyKnow/DyKnowMe/issues/5327
            spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve({}));
            attachDfd = $.Deferred();
            spyOn(broadcast._client, "attach").and.returnValue(attachDfd);
            spyOn(broadcast._client, "enterCabra").and.returnValue($.Deferred());
            spyOn(CabraSessionFactory, "getCabraSession").and.callFake(function(name, cabraId, rules, satelliteAPIClient ) {
                var c = new BaseCabraSession();
                c.init(name, cabraId, rules, satelliteAPIClient);
                return c;
            });
            spyOn(eventAggregator, "on");
            
            broadcast.attach();
            var openObjectCallback = eventAggregator.on.calls.all().filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
            openObjectCallback({
                cabra_id: "111111",
                cabra_name: "love"
            });
            openObjectCallback({
                cabra_id: "222222",
                cabra_name: "basketball"
            });
            //attach hit the race condition returning no braodcast_objects!!
            attachDfd.resolve({
                broadcast_objects: [],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        }
                    },
                    { 
                        cabra_id: 2,
                        cabra: {
                            name: "basketball"
                        }
                    }
                ]
            });
            expect(broadcast._client.enterCabra).toHaveBeenCalledWith("111111");
            expect(broadcast._client.enterCabra).toHaveBeenCalledWith("222222");
            //and that we only called it exactly 2 times
            expect(broadcast._client.enterCabra).toHaveBeenCalledTimes(2);
            expect(CabraSessionFactory.getCabraSession.calls.all()[0].args.slice(0,2)).toEqual(["love", "111111"]);
            expect(CabraSessionFactory.getCabraSession.calls.all()[1].args.slice(0,2)).toEqual(["basketball", "222222"]);
            //and that we only called it exactly 2 times
            expect(CabraSessionFactory.getCabraSession).toHaveBeenCalledTimes(2);
        });
        
        it("does not enter open_objects if already open", function () {
            //https://github.com/DyKnow/DyKnowMe/issues/5327
            spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve({}));
            attachDfd = $.Deferred();
            spyOn(broadcast._client, "attach").and.returnValue(attachDfd);
            spyOn(broadcast._client, "enterCabra").and.returnValue($.Deferred());
            spyOn(CabraSessionFactory, "getCabraSession").and.callFake(function(name, cabraId, rules, satelliteAPIClient ) {
                var c = new BaseCabraSession();
                c.init(name, cabraId, rules, satelliteAPIClient);
                return c;
            });
            spyOn(eventAggregator, "on");
            
            broadcast.attach();
            attachDfd.resolve({
                broadcast_objects: [{
                    object_id: "111111",
                    cabra_id: 1,
                    cabra_name: "love"
                },
                {
                object_id: "222222",
                cabra_id: 2,
                cabra_name: "basketball"
                }
                ],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        }
                    },
                    { 
                        cabra_id: 2,
                        cabra: {
                            name: "basketball"
                        }
                    }
                ]
            });
            
            var openObjectCallback = eventAggregator.on.calls.all().filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
            openObjectCallback({
                cabra_id: "111111",
                cabra_name: "love"
            });
            openObjectCallback({
                cabra_id: "222222",
                cabra_name: "basketball"
            });
            
            expect(broadcast._client.enterCabra).toHaveBeenCalledWith("111111");
            expect(broadcast._client.enterCabra).toHaveBeenCalledWith("222222");
            //and that we only called it exactly 2 times
            expect(broadcast._client.enterCabra).toHaveBeenCalledTimes(2);
            expect(CabraSessionFactory.getCabraSession.calls.all()[0].args.slice(0,2)).toEqual(["love", "111111"]);
            expect(CabraSessionFactory.getCabraSession.calls.all()[1].args.slice(0,2)).toEqual(["basketball", "222222"]);
            //and that we only called it exactly 2 times
            expect(CabraSessionFactory.getCabraSession).toHaveBeenCalledTimes(2);
        });
        
        it("does not double open received open_objects before attach returned", function () {
            //https://github.com/DyKnow/DyKnowMe/issues/5327
            spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve({}));
            attachDfd = $.Deferred();
            spyOn(broadcast._client, "attach").and.returnValue(attachDfd);
            spyOn(broadcast._client, "enterCabra").and.returnValue($.Deferred());
            spyOn(CabraSessionFactory, "getCabraSession").and.callFake(function(name, cabraId, rules, satelliteAPIClient ) {
                var c = new BaseCabraSession();
                c.init(name, cabraId, rules, satelliteAPIClient);
                return c;
            });
            spyOn(eventAggregator, "on");
            
            broadcast.attach();
            var openObjectCallback = eventAggregator.on.calls.all().filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
            openObjectCallback({
                cabra_id: "111111",
                cabra_name: "love"
            });
            openObjectCallback({
                cabra_id: "222222",
                cabra_name: "basketball"
            });
            attachDfd.resolve({
                broadcast_objects: [{
                    object_id: "111111",
                    cabra_id: 1,
                    cabra_name: "love"
                },
                {
                object_id: "222222",
                cabra_id: 2,
                cabra_name: "basketball"
                }
                ],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        }
                    },
                    { 
                        cabra_id: 2,
                        cabra: {
                            name: "basketball"
                        }
                    }
                ]
            });
                            
            expect(broadcast._client.enterCabra).toHaveBeenCalledWith("111111");
            expect(broadcast._client.enterCabra).toHaveBeenCalledWith("222222");
            //and that we only called it exactly 2 times
            expect(broadcast._client.enterCabra).toHaveBeenCalledTimes(2);
            expect(CabraSessionFactory.getCabraSession.calls.all()[0].args.slice(0,2)).toEqual(["love", "111111"]);
            expect(CabraSessionFactory.getCabraSession.calls.all()[1].args.slice(0,2)).toEqual(["basketball", "222222"]);
            //and that we only called it exactly 2 times
            expect(CabraSessionFactory.getCabraSession).toHaveBeenCalledTimes(2);
        });
        
        it ("does not double open received open_objects after attach returned", function () {
            //https://github.com/DyKnow/DyKnowMe/issues/5327
            spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve({}));
            attachDfd = $.Deferred();
            spyOn(broadcast._client, "attach").and.returnValue(attachDfd);
            spyOn(broadcast._client, "enterCabra").and.returnValue($.Deferred());
            spyOn(CabraSessionFactory, "getCabraSession").and.callFake(function(name, cabraId, rules, satelliteAPIClient ) {
                var c = new BaseCabraSession();
                c.init(name, cabraId, rules, satelliteAPIClient);
                return c;
            });
            spyOn(eventAggregator, "on");
            //attach calls and returns
            broadcast.attach();
            attachDfd.resolve({
                broadcast_objects: [{
                    object_id: "111111",
                    cabra_id: 1,
                    cabra_name: "love"
                },
                {
                object_id: "222222",
                cabra_id: 2,
                cabra_name: "basketball"
                }
                ],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        }
                    },
                    { 
                        cabra_id: 2,
                        cabra: {
                            name: "basketball"
                        }
                    }
                ]
            });
            //and yet realtime pushes these out anyway
            var openObjectCallback = eventAggregator.on.calls.all().filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
            openObjectCallback({
                cabra_id: "111111",
                cabra_name: "love"
            });
            openObjectCallback({
                cabra_id: "222222",
                cabra_name: "basketball"
            });
            openObjectCallback({
                cabra_id: "111111",
                cabra_name: "love"
            });
            openObjectCallback({
                cabra_id: "222222",
                cabra_name: "basketball"
            });
                            
            expect(broadcast._client.enterCabra).toHaveBeenCalledWith("111111");
            expect(broadcast._client.enterCabra).toHaveBeenCalledWith("222222");
            //and that we only called it exactly 2 times
            expect(broadcast._client.enterCabra).toHaveBeenCalledTimes(2);
            expect(CabraSessionFactory.getCabraSession.calls.all()[0].args.slice(0,2)).toEqual(["love", "111111"]);
            expect(CabraSessionFactory.getCabraSession.calls.all()[1].args.slice(0,2)).toEqual(["basketball", "222222"]);
            //and that we only called it exactly 2 times
            expect(CabraSessionFactory.getCabraSession).toHaveBeenCalledTimes(2);
        });
    });
    
    describe("pending cabra transition", function () {
        var enterCabraDfd;
        beforeEach(function () {
            spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve({}));
            attachDfd = $.Deferred();
            spyOn(broadcast._client, "attach").and.returnValue(attachDfd);
            enterCabraDfd = $.Deferred();
            spyOn(broadcast._client, "enterCabra").and.returnValue(enterCabraDfd);
            spyOn(CabraSessionFactory, "getCabraSession").and.callFake(function(name, cabraId, rules, satelliteAPIClient ) {
                var c = new BaseCabraSession();
                c.init(name, cabraId, rules, satelliteAPIClient);
                return c;
            });
            spyOn(eventAggregator, "on");
        });
        
        it("does not add cabras to the pendingcabra list if already pending (attach)", function (){
            //not entirely sure about this requirement
            broadcast.pendingCabras["111111"] = new BaseCabraSession();
            broadcast.attach();
            attachDfd.resolve({
                broadcast_objects: [{
                    object_id: "111111",
                    cabra_id: 1,
                    cabra_name: "love"
                }
                ],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        }
                    }
                ]
            });
            expect(Object.keys(broadcast.pendingCabras).length).toEqual(1);
        });
        
        it("does not add cabras to the pendingcabra list if already pending (realtime)", function (){
            broadcast.pendingCabras["111111"] = new BaseCabraSession();
            broadcast.attach();
            attachDfd.resolve({
                broadcast_objects: [],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        }
                    }
                ]
            });
            var openObjectCallback = eventAggregator.on.calls.all().filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
            openObjectCallback({
                cabra_id: "111111",
                cabra_name: "love"
            });

            expect(Object.keys(broadcast.pendingCabras).length).toEqual(1);
        });
        
        it("does not add cabras to the pendingcabra list if already open (attach)", function () {
                //not entirely sure about this requirement
            broadcast.activeCabras["111111"] = new BaseCabraSession();
            broadcast.attach();
            attachDfd.resolve({
                broadcast_objects: [{
                    object_id: "111111",
                    cabra_id: 1,
                    cabra_name: "love"
                }
                ],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        }
                    }
                ]
            });
            expect(Object.keys(broadcast.pendingCabras).length).toEqual(0);             
        });

        it("does not add cabras to the pendingcabra list if already open (realtime)", function () {
            broadcast.activeCabras["111111"] = new BaseCabraSession();
            broadcast.attach();
            attachDfd.resolve({
                broadcast_objects: [],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        }
                    }
                ]
            });
            var openObjectCallback = eventAggregator.on.calls.all().filter(function(c){return c.args[0] === "B40aDCA571D/open_object";})[0].args[1];//second arg
            openObjectCallback({
                cabra_id: "111111",
                cabra_name: "love"
            });

            expect(Object.keys(broadcast.pendingCabras).length).toEqual(0);             
        });
        
        it("moves from pending to active on enter success", function () {
            //add through attach to ensure it's wired up
            broadcast.attach();
            attachDfd.resolve({
                broadcast_objects: [{
                    object_id: "111111",
                    cabra_id: 1,
                    cabra_name: "love"
                }
                ],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        }
                    }
                ]
            });              
            broadcast.pendingCabras["111111"].emitEvent(cabraEvents.CabraSessionDidEnterEvent, ["111111"]);
            expect(Object.keys(broadcast.pendingCabras).length).toEqual(0);
            expect(Object.keys(broadcast.activeCabras).length).toEqual(1);
        });
        
    });
    
    describe("cabra fails to enter handles teardown", function(){
        beforeEach(function () {
            spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve({}));
            attachDfd = $.Deferred();
            spyOn(broadcast._client, "attach").and.returnValue(attachDfd);
            spyOn(broadcast._client, "enterCabra").and.returnValue($.Deferred().reject());
            spyOn(CabraSessionFactory, "getCabraSession").and.callFake(function(name, cabraId, rules, satelliteAPIClient ) {
                var c = new BaseCabraSession();
                c.init(name, cabraId, rules, satelliteAPIClient);
                return c;
            });
            spyOn(eventAggregator, "on");
        });
        
        it("broadcast.didReceiveError was called on enter cabra failure", async function() {
            var err = null;
            var timed_out = false;
            var wasCalled = false;
            var timeout = 0;
            broadcast.attach();
            var continueDfd = $.Deferred();
            spyOn(broadcast,"_cabraDidFailToEnter").and.callFake(function(cabra){
                delete broadcast.pendingCabras[cabra.cabra_id];
                wasCalled = true;
                continueDfd.resolve();
            });
            attachDfd.resolve({
                broadcast_objects: [{
                    object_id: "111111",
                    cabra_id: 1,
                    cabra_name: "love"
                }
                ],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        }
                    }
                ]
            });  
            await continueDfd;
            expect(Object.keys(broadcast.pendingCabras).length).toEqual(0);
            expect(Object.keys(broadcast.activeCabras).length).toEqual(0);
            expect(wasCalled).toEqual(true);   
        });
                
    });
    
    describe("unsupported by client but supported by server cabra tests", function () {
        beforeEach(function () {
            spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve({}));
            attachDfd = $.Deferred();
            spyOn(broadcast._client, "attach").and.returnValue(attachDfd);
        });
        
        it("does not fail attach if cabraSessionFactory returns null", function () {
            spyOn(broadcast._client, "enterCabra").and.returnValue($.Deferred());
            spyOn(CabraSessionFactory, "getCabraSession").and.callFake(function(name, cabraId, rules, satelliteAPIClient ) {
                return null;
            });
            spyOn(eventAggregator, "on");
            spyOn(broadcast, "didFailToAttachToBroadcast");
            
            broadcast.attach();
            attachDfd.resolve({
                broadcast_objects: [{
                    object_id: "111111",
                    cabra_id: 1,
                    cabra_name: "love"
                }
                ],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        },
                        cabra_rules: []
                    },
                    { 
                        cabra_id: 2,
                        cabra: {
                            name: "basketball"
                        },
                        cabra_rules: []
                    }
                ]
            });
            expect(broadcast._client.enterCabra).toHaveBeenCalledTimes(0);
            expect(CabraSessionFactory.getCabraSession).toHaveBeenCalledTimes(1);
            expect(broadcast.didFailToAttachToBroadcast).not.toHaveBeenCalled();
        });
        
        it("does fail attach if cabraSessionFactory throws", function () {
            spyOn(broadcast._client, "enterCabra").and.returnValue($.Deferred());
            spyOn(CabraSessionFactory, "getCabraSession").and.callFake(function(name, cabraId, rules, satelliteAPIClient ) {
                throw new Error("omg dedz");
            });
            spyOn(eventAggregator, "on");
            spyOn(broadcast, "didFailToAttachToBroadcast");
            
            broadcast.attach();
            attachDfd.resolve({
                broadcast_objects: [{
                    object_id: "111111",
                    cabra_id: 1,
                    cabra_name: "love"
                }
                ],
                broadcast_id: "B40aDCA571D",
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 1,
                        cabra: {
                            name: "love"
                        },
                        cabra_rules: []
                    },
                    { 
                        cabra_id: 2,
                        cabra: {
                            name: "basketball"
                        },
                        cabra_rules: []
                    }
                ]
            });
            expect(broadcast._client.enterCabra).toHaveBeenCalledTimes(0);
            expect(CabraSessionFactory.getCabraSession).toHaveBeenCalledTimes(1);
            expect(broadcast.didFailToAttachToBroadcast).toHaveBeenCalled();
        });
    });
    
    describe("exceptions during open_object command", function () {
        beforeEach(function () {
            spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve({}));
            attachDfd = $.Deferred();
            spyOn(broadcast._client, "attach").and.returnValue(attachDfd);
        });
        
        it("open_object throws fatal error", function () {
            var cabraUUID = guid(),
                error = new Error("yolo"),
                open = new MockBroadcastFrameCommand(broadcast.broadcastId, "open_object", cabraUUID, "dyknow.me/screen_shot", cabraUUID);
            
            spyOn(eventAggregator, "trigger").and.callThrough();
            spyOn(broadcast, "_createCabraFromBroadcastObject").and.callFake(function(broadcastObject) {
                throw error;
            });
            
            broadcast.attach();
            attachDfd.resolve({
                broadcast_objects: [],
                broadcast_id: broadcast.broadcastId,
                access_token: "111111111111",
                supported_cabras: [
                    { 
                        cabra_id: 15,
                        cabra: {
                            name: "dyknow.me/screen_shot"
                        }
                    }
                ]
            });
            
            //TODO: make this less awful.  this is the way it goes for now because this is what the satellite.js is eventing
            eventAggregator.trigger(broadcast.broadcastId + "/" + SETTINGS.EVENTS.OPEN_OBJECT, [open]);
            expect(eventAggregator.trigger).toHaveBeenCalledWith(SETTINGS.EVENTS.FATAL_ERROR, [error]);
        });
    });

    describe("open_object command sent", function () {
        var attachDfd;
        var supported_cabras = [{"cabra_id":15,"cabra":{"cabra_id":15,"name":"dyknow.me/screen_shot","version":1,"visible":"broadcaster","updated":"2023-04-21T13:10:36.3183001+00:00"},"cabra_rules":[{"cabra_id":15,"from":"broadcaster","to":"participants","archive_sent":"none","archive_received":"none","mime_type":"","payload_id":"75e132cf-8371-49b5-bdaa-69785ff4c998"},{"cabra_id":15,"from":"participant","to":"broadcaster","archive_sent":"none","archive_received":"none","mime_type":"","payload_id":"b55d0618-4c7b-4698-9c79-7785c1d19fe5"},{"cabra_id":15,"from":"broadcaster","to":"none","archive_sent":"broadcaster","archive_received":"none","mime_type":"","payload_id":"6f89ddde-f106-4661-896d-7444b2671aef"}]},{"cabra_id":16,"cabra":{"cabra_id":16,"name":"dyknow.me/application_blocking","version":1,"visible":"broadcaster","updated":"2023-04-21T13:10:36.3183001+00:00"},"cabra_rules":[{"cabra_id":16,"from":"broadcaster","to":"participants","archive_sent":"none","archive_received":"none","mime_type":"","payload_id":"5dae016d-0b6e-4f3e-9f73-2d8428e35715"}],"control":true},{"cabra_id":18,"cabra":{"cabra_id":18,"name":"dyknow.me/participant_activity_monitor","version":1,"visible":"broadcaster","updated":"2023-04-21T13:10:36.3183001+00:00"},"cabra_rules":[{"cabra_id":18,"from":"participant","to":"broadcaster","archive_sent":"none","archive_received":"broadcaster","mime_type":"","payload_id":"39c4f580-5f5b-417f-8b55-b432802aa1d9"}]},{"cabra_id":19,"cabra":{"cabra_id":19,"name":"dyknow.me/participant_status_monitor","version":1,"visible":"anyone","updated":"2023-04-21T13:10:36.3183001+00:00"},"cabra_rules":[{"cabra_id":19,"from":"participant","to":"broadcaster","archive_sent":"none","archive_received":"broadcaster","mime_type":"text/csv","payload_id":"5f735fc1-a3a0-4971-97c0-90a4024b589a"},{"cabra_id":19,"from":"broadcaster","to":"participants","archive_sent":"none","archive_received":"none","mime_type":"","payload_id":"6c704f01-0443-4633-b420-90a9dc1ef308"},{"cabra_id":19,"from":"participant","to":"participant","archive_sent":"none","archive_received":"none","mime_type":"","payload_id":"8489c53c-9c74-4e8d-9be2-c832358999b7"}],"control":true},{"cabra_id":20,"cabra":{"cabra_id":20,"name":"dyknow.me/assessment_monitor","version":1,"visible":"anyone","updated":"2023-04-21T13:10:36.3183001+00:00"},"cabra_rules":[{"cabra_id":20,"from":"broadcaster","to":"participants","archive_sent":"none","archive_received":"none","mime_type":"","payload_id":"256d8517-9a0c-460b-8d6d-af3dcb4c908f"},{"cabra_id":20,"from":"broadcaster","to":"broadcaster","archive_sent":"none","archive_received":"none","mime_type":"","payload_id":"84f388e5-60c1-41b2-9ff9-0f2256d40985"},{"cabra_id":20,"from":"participant","to":"broadcaster","archive_sent":"none","archive_received":"broadcaster","mime_type":"text/csv","payload_id":"17234e38-3d04-43a3-9d7a-ff0e7913da59"},{"cabra_id":20,"from":"participant","to":"participant","archive_sent":"none","archive_received":"none","mime_type":"","payload_id":"148ea40d-bd69-4492-8e22-2414829ad76e"}],"control":true},{"cabra_id":21,"cabra":{"cabra_id":21,"name":"dyknow.me/attention_monitor","version":1,"visible":"anyone","updated":"2023-04-21T13:10:36.3183001+00:00"},"cabra_rules":[{"cabra_id":21,"from":"broadcaster","to":"participants","archive_sent":"broadcaster","archive_received":"none","mime_type":"text/csv","payload_id":"35b75155-44f9-4a83-aa7d-80d6fd371bcf"},{"cabra_id":21,"from":"broadcaster","to":"participants","archive_sent":"broadcaster","archive_received":"none","mime_type":"text/csv","payload_id":"5927bfeb-0fdb-49ea-ad1a-cd57194c301b"},{"cabra_id":21,"from":"participant","to":"participant","archive_sent":"none","archive_received":"none","mime_type":"text/csv","payload_id":"416ea7f8-4cd0-4f0e-82e4-aeb1b5057b8f"}],"control":true},{"cabra_id":22,"cabra":{"cabra_id":22,"name":"dyknow.me/direct_control_monitor","version":1,"visible":"broadcaster","updated":"2023-04-21T13:10:36.3183001+00:00"},"cabra_rules":[{"cabra_id":22,"from":"broadcaster","to":"participant","archive_sent":"broadcaster","archive_received":"none","mime_type":"application/json","payload_id":"adc7d240-ad92-4e5c-95cb-99162fa76fd9"},{"cabra_id":22,"from":"participant","to":"broadcaster","archive_sent":"none","archive_received":"broadcaster","mime_type":"application/json","payload_id":"2acea8b4-ca57-4d24-bb74-823cb525fa75"},{"cabra_id":22,"from":"broadcaster","to":"participant","archive_sent":"broadcaster","archive_received":"none","mime_type":"application/json","payload_id":"897caa1c-43e8-46de-b159-e54efd495187"}],"control":true}];
        beforeEach(function (){
            eventAggregator.removeAllListeners();//ensure clean
            attachDfd = $.Deferred();
            spyOn(broadcast._client, "attach").and.returnValue(attachDfd);
            spyOn(broadcast._client, "init").and.returnValue($.Deferred().resolve());
            spyOn(CabraSessionFactory, "getCabraSession").and.callFake(function(name, cabraId, rules, satelliteAPIClient ) {
                var c = new BaseCabraSession();
                c.init(name, cabraId, rules, satelliteAPIClient);
                spyOn(c, "enter");
                return c;
            });
            broadcast.attach();
        });
        afterEach(function () {
            eventAggregator.removeAllListeners();//ensure clean
        });

        it("will open multiple cabraSessions", function () {
            attachDfd.resolve({
                broadcast_id: "B40aDCA571D",
                broadcast_user_type: "participant",
                supported_cabras: supported_cabras
            });
            eventAggregator.trigger("B40aDCA571D/open_object", [{
                cabra_name:"dyknow.me/screen_shot",cabra_id:15
            }]);
            eventAggregator.trigger("B40aDCA571D/open_object", [{
                cabra_name:"dyknow.me/application_blocking",cabra_id:16
            }]);
            eventAggregator.trigger("B40aDCA571D/open_object", [{
                cabra_name:"dyknow.me/participant_activity_monitor","cabra_id":18
            }]);
            //we were called 3 times and each entered
            expect(CabraSessionFactory.getCabraSession).toHaveBeenCalledTimes(3);
            expect(CabraSessionFactory.getCabraSession.calls.all()[0].returnValue.enter).toHaveBeenCalled();
            expect(CabraSessionFactory.getCabraSession.calls.all()[1].returnValue.enter).toHaveBeenCalled();
            expect(CabraSessionFactory.getCabraSession.calls.all()[2].returnValue.enter).toHaveBeenCalled();
        });

        it("will open multiple cabraSessions after duplicates", function () {
            attachDfd.resolve({
                broadcast_id: "B40aDCA571D",
                broadcast_user_type: "participant",
                supported_cabras: supported_cabras
            });
            eventAggregator.trigger("B40aDCA571D/open_object", [{
                cabra_name:"dyknow.me/screen_shot",cabra_id:15
            }]);
            //duplicate open gets ignored and doesnt end up dropping all the rest
            eventAggregator.trigger("B40aDCA571D/open_object", [{
                cabra_name:"dyknow.me/screen_shot",cabra_id:15
            }]);
            eventAggregator.trigger("B40aDCA571D/open_object", [{
                cabra_name:"dyknow.me/application_blocking",cabra_id:16
            }]);
            eventAggregator.trigger("B40aDCA571D/open_object", [{
                cabra_name:"dyknow.me/participant_activity_monitor","cabra_id":18
            }]);
            //we were called 3 times and each entered
            expect(CabraSessionFactory.getCabraSession).toHaveBeenCalledTimes(3);
            expect(CabraSessionFactory.getCabraSession.calls.all()[0].returnValue.enter).toHaveBeenCalled();
            expect(CabraSessionFactory.getCabraSession.calls.all()[1].returnValue.enter).toHaveBeenCalled();
            expect(CabraSessionFactory.getCabraSession.calls.all()[2].returnValue.enter).toHaveBeenCalled();
        });

        it("will open multiple cabraSessions even if the attach comes second", function () {
            eventAggregator.trigger("B40aDCA571D/open_object", [{
                cabra_name:"dyknow.me/screen_shot",cabra_id:15
            }]);
            attachDfd.resolve({
                broadcast_id: "B40aDCA571D",
                broadcast_user_type: "participant",
                supported_cabras: supported_cabras,
                broadcast_objects:[]
            });
            eventAggregator.trigger("B40aDCA571D/open_object", [{
                cabra_name:"dyknow.me/application_blocking",cabra_id:16
            }]);
            eventAggregator.trigger("B40aDCA571D/open_object", [{
                cabra_name:"dyknow.me/participant_activity_monitor","cabra_id":18
            }]);
            //we were called 3 times and each entered
            expect(CabraSessionFactory.getCabraSession).toHaveBeenCalledTimes(3);
            expect(CabraSessionFactory.getCabraSession.calls.all()[0].returnValue.enter).toHaveBeenCalled();
            expect(CabraSessionFactory.getCabraSession.calls.all()[1].returnValue.enter).toHaveBeenCalled();
            expect(CabraSessionFactory.getCabraSession.calls.all()[2].returnValue.enter).toHaveBeenCalled();
        });
    });
});