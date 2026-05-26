define([], function() {
    if(!window.chrome.extension) {
        window.chrome.extension = jasmine.createSpyObj(
            'window.chrome.extension',
            ['getURL']
        );
    }
    return window.chrome.extension;
});
