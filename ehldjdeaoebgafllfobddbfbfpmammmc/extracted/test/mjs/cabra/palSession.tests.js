
import PalSession from "/js/mjs/cabra/palSession.js"; 
import logger from "/test/mocks/logger.js"; 
import Sandbox from "/js/mjs/sandbox.js";     
import MockCabraInfo from "/test/mocks/cabraInfo.js"; 
import chrome from "/test/mocks/chrome.js";
import blockingEvents from "/js/mjs/cabra/helper/blocking.events.js";
import deferred from "/js/mjs/utils/deferred.js";
function noop(){}
function nextTick(){ return deferred.get().resolve();}

async function waitFor(func){
    while(!func()){
        await deferred.get().resolve();//tight loop
    }
}
describe('palSession', function () {
    var palSession;
    var sandbox;
    var frameQueue;
    var constants = {
        
    };
    
    beforeEach(function () {
        frameQueue = [];
        sandbox = new Sandbox().init();
        sandbox._reset();
        chrome.useMock();
        logger.useMock();
        palSession = new PalSession();
        
        palSession.init("dyknow.me/participant_activity_monitor", 18, [], {addCabraFrame:noop, enterCabra: noop});
        spyOn(palSession._client, "addCabraFrame").and.callFake(function (){ 
            var dfd = deferred.get();
            frameQueue.push(dfd);
            return dfd;    
        });
        spyOn(palSession._client, "enterCabra").and.returnValue(deferred.get().resolve());
        
        palSession.didEnterCabra(new MockCabraInfo());
    });
    
    afterEach(function(){
        sandbox._reset();
        chrome.resetMock();
    });

    function whenCalled(spy){
        var dfd = deferred.get();
        spy.and.callFake(function (){
            dfd.resolve();
            var newDfd = deferred.get();
            frameQueue.push(newDfd);
            return newDfd;
        });
        return dfd;
    }

    it("queues up posts instead of posting immediately", async function () {
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(1);
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-still-off-task.com"});
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(1);
        await await frameQueue[0].resolve();
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(2);//remember this is cumulative
        await await frameQueue[1].resolve();
        await await frameQueue[2].resolve();
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(3);
        
    });

    it("drains queue on fatal errors as well", async function () {
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(1);
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-still-off-task.com"});
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(1);
        palSession._client.addCabraFrame.calls.mostRecent().returnValue.reject();
        await whenCalled(palSession._client.addCabraFrame);
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(2);//remember this is cumulative
        palSession._client.addCabraFrame.calls.mostRecent().returnValue.reject();
        await whenCalled(palSession._client.addCabraFrame);
        palSession._client.addCabraFrame.calls.mostRecent().returnValue.reject();
        await waitFor(()=>!palSession._sending);
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(3);
        
    });

    it("queues up posts next time after the last drain finishes", async function () {
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
        frameQueue[0].resolve();
        await waitFor(()=>!palSession._sending);
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(1);
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
        frameQueue[1].resolve();
        await waitFor(()=>!palSession._sending);
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(2);
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-still-off-task.com"});
        frameQueue[2].resolve();
        await waitFor(()=>!palSession._sending);
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(3);
    });

    it("queues up posts next time after the last drain finishes after errors", async function () {
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
        frameQueue[0].reject();
        await waitFor(()=>!palSession._sending);
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(1);
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
        frameQueue[1].reject();
        await waitFor(()=>!palSession._sending);
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(2);
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-still-off-task.com"});
        frameQueue[2].reject();
        await waitFor(()=>!palSession._sending);
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(3);
    });

    it("FIXAFTER-DYK-415: queues up posts next time after the last drain finishes after js errors", async function () {
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
        //some bozo has this error that only throws once. it's totally
        //our fault, but it'd be kind of nice if we recovered from it
        //note: this is a patch until DYK-415 gets fixed
        Object.defineProperty(palSession, "cabraId", { get: function () { 
            delete this.cabraId;//so we dont throw again
            this.cabraId = "whatever";
            throw new Error("blow up on this js error");
        }});
        try
        {
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-gonna-error.com"});
            frameQueue[0].resolve();//this one's gonna dequeue but get an error. oh no!
            await waitFor(()=>!palSession._sending);
        }
        catch (err){
            //dont care about this but it's noteworthy that we arent gonna get 
            if (err.message === "FAIL") {throw err;}
        }
        //this here is negotiable, but I expect the unhandled error gets tossed 
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(1);            
        //this immediately goes through because there's nothing in the queue
        //and it reset on the sending bit            
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-else-off-task.com"});
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(2);            
        frameQueue[1].resolve();
        await whenCalled(palSession._client.addCabraFrame);
        //note one of these blew up so 
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(3);            
    });

    it("FIXAFTER-DYK-415: skips poison but tries to finish remaining messages now", async function () {
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
        //some bozo has this error that only throws once. it's totally
        //our fault, but it'd be kind of nice if we recovered from it
        //note: this is a patch until DYK-415 gets fixed
        Object.defineProperty(palSession, "cabraId", { get: function () { 
            delete this.cabraId;//so we dont throw again
            this.cabraId = "whatever";
            throw new Error("blow up on this js error");
        }});
        try
        {
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-gonna-error.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
            sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
            frameQueue[0].resolve();//this one's gonna dequeue but get an error. oh no!
            await whenCalled(palSession._client.addCabraFrame);
        }
        catch (err){
            //dont care about this but it's noteworthy that we arent gonna get 
            if (err.message === "FAIL") {throw err;}
        }
        //the error gets tossed but we moved onto the 3rd in the queue
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(2);
        frameQueue[1].resolve();
        await whenCalled(palSession._client.addCabraFrame);
        frameQueue[2].resolve();
        await waitFor(()=>!palSession._sending);
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(3);           
    });

    it("drains the queue on exit", async function (){
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"something-off-task.com"});
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
        sandbox.publish(blockingEvents.block_url, { blocked: "blocked", url:"wont-send.com"});
        palSession.willLeaveCabra();
        await await frameQueue[0].resolve();
        //should not call the next one
        expect(palSession._client.addCabraFrame.calls.all().length).toEqual(1);            
    });

    it("sends up the tab_id as part of the payload", function () {
        sandbox.publish(blockingEvents.block_url, { 
            blocked: "blocked", 
            url:"something-off-task.com", 
            tab_id: 99
        });
        expect(palSession._client.addCabraFrame.calls.mostRecent().args[3]).toEqual({
            name: "Chrome",
            identifier: "Chrome",
            url: "something-off-task.com",
            title: "", 
            blocked: "blocked",
            tab_id: 99
        });
    });


});