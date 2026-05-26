define([], function(){
    if (! window.chrome){ window.chrome = {};}
    if (! window.chrome.desktopCapture){ window.chrome.desktopCapture = {};}
    function reset(){
        window.chrome.desktopCapture = jasmine.createSpyObj('window.chrome.desktopCapture', ['chooseDesktopMedia', 'cancelChooseDesktopMedia']);
        window.chrome.desktopCapture.chooseDesktopMedia.andReturn(123);
    }
    if(!window.chrome.desktopCapture){
        reset();
    }
    return {
        reset: reset
    };
});

