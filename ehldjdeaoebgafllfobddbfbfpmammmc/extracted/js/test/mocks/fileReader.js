define([
], function(
) {
    function MockFileReader() {
        this.readAsText = jasmine.createSpy();
    }

    MockFileReader.prototype.error = null;
    MockFileReader.prototype.result = null;
    MockFileReader.prototype.onloadend = null;

    return MockFileReader;
});
