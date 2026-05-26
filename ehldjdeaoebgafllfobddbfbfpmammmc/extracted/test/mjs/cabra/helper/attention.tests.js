import Attention from "/js/mjs/cabra/helper/attention.js";
import Logger from "/js/mjs/logger/logger.js";
import WindowKeepAliveManager from "/js/mjs/windowKeepAliveManager.js";

describe('Attention', function () {
    var attention = null,
        lockFlags = null;
    
    beforeEach(function () {
        attention = new Attention();
        lockFlags = attention.lockFlags;
        Logger.debug = $.noop;
        Logger.info = $.noop;
        Logger.warn = $.noop;
        Logger.error = $.noop;
        
        spyOn(WindowKeepAliveManager, 'addKeepAlive');
        spyOn(WindowKeepAliveManager, 'removeKeepAlive');
    });
    
    it("testAttentionScreenKeyboardMouseLock", function () {
        attention.setBlocking((lockFlags.kAttentionScreen + lockFlags.kAttentionKeyboard + lockFlags.kAttentionMouse), "Attention Please");
        expect(attention.areDisplaysBlocked()).toBe(true);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("Attention Please");
        expect(attention.details).toEqual("");
    });

    it("testAttentionScreenKeyboardMouseLockIncludesDetail", function () {
        attention.setBlocking((lockFlags.kAttentionScreen + lockFlags.kAttentionKeyboard + lockFlags.kAttentionMouse), "Attention Please", "Your device has been locked by\r\nMr. Teacher\r\n1 - My Class");
        expect(attention.areDisplaysBlocked()).toBe(true);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("Attention Please");
        expect(attention.details).toEqual("Your device has been locked by\r\nMr. Teacher\r\n1 - My Class");
    });
    
    it("testAttentionScreenKeyboardMouseLock_ChangeMessage", function () {
        attention.setBlocking((lockFlags.kAttentionScreen + lockFlags.kAttentionKeyboard + lockFlags.kAttentionMouse), "Attention Please");
        expect(attention.areDisplaysBlocked()).toBe(true);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("Attention Please");
        expect(attention.details).toEqual("");
        
        attention.setBlocking((lockFlags.kAttentionScreen + lockFlags.kAttentionKeyboard + lockFlags.kAttentionMouse), "Attention Please Again");
        expect(attention.areDisplaysBlocked()).toBe(true);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("Attention Please Again");
        expect(attention.details).toEqual("");
    });
    
    it("testAttentionScreen", function () {
        attention.setBlocking(lockFlags.kAttentionScreen, "Attention Please");
        expect(attention.areDisplaysBlocked()).toBe(true);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("Attention Please");
        expect(attention.details).toEqual("");
    });
    
    it("testAttentionKeyboardMouseLock", function () {
        attention.setBlocking((lockFlags.kAttentionKeyboard + lockFlags.kAttentionMouse));
        expect(attention.areDisplaysBlocked()).toBe(false);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("");
        expect(attention.details).toEqual("");
    });
    
    it("testAttentionKeyboardMouseLock_HasMessage", function () {
        attention.setBlocking((lockFlags.kAttentionKeyboard + lockFlags.kAttentionMouse), "Attention Please");
        expect(attention.areDisplaysBlocked()).toBe(false);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("");
        expect(attention.details).toEqual("");
    });
    
    it("testAttentionKeyboardLock", function () {
        attention.setBlocking(lockFlags.kAttentionKeyboard);
        expect(attention.areDisplaysBlocked()).toBe(false);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("");
        expect(attention.details).toEqual("");
    });
    
    it("testAttentionKeyboardLock_HasMessage", function () {
        attention.setBlocking(lockFlags.kAttentionKeyboard, "Attention Please");
        expect(attention.areDisplaysBlocked()).toBe(false);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("");
        expect(attention.details).toEqual("");
    });
    
    it("testAttentionMouseLock", function () {
        attention.setBlocking(lockFlags.kAttentionMouse);
        expect(attention.areDisplaysBlocked()).toBe(false);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("");
        expect(attention.details).toEqual("");
    });
    
    it("testAttentionMouseLock_HasMessage", function () {
        attention.setBlocking(lockFlags.kAttentionMouse, "Attention Please");
        expect(attention.areDisplaysBlocked()).toBe(false);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("");
        expect(attention.details).toEqual("");
    });
    
    it("testAttentionClear", function () {
        attention.setBlocking((lockFlags.kAttentionScreen + lockFlags.kAttentionKeyboard + lockFlags.kAttentionMouse), "Attention Please");
        expect(attention.areDisplaysBlocked()).toBe(true);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("Attention Please");
        expect(attention.details).toEqual("");
        
        attention.setBlocking(lockFlags.kAttentionClear);
        expect(attention.areDisplaysBlocked()).toBe(false);
        expect(attention.areInputsLocked()).toBe(false);
        expect(attention.message).toEqual("");
        expect(attention.details).toEqual("");
    });
    
    it("testAttentionInvalidFlagClears", function () {
        attention.setBlocking((lockFlags.kAttentionScreen + lockFlags.kAttentionKeyboard + lockFlags.kAttentionMouse), "Attention Please");
        expect(attention.areDisplaysBlocked()).toBe(true);
        expect(attention.areInputsLocked()).toBe(true);
        expect(attention.message).toEqual("Attention Please");
        expect(attention.details).toEqual("");
        
        attention.setBlocking(1234);
        expect(attention.areDisplaysBlocked()).toBe(false);
        expect(attention.areInputsLocked()).toBe(false);
        expect(attention.message).toEqual("");
        expect(attention.details).toEqual("");
    });
});