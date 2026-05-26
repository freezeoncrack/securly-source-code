define([
], function(
) {
    function MockFileWriter() {
        this.onwriteend = null;
        this.onerror = null;
        this.position = 0;
    }

    MockFileWriter.prototype.write = function(data) {
        this.position = data.size;
        this.onwriteend();
    };

    MockFileWriter.prototype.seek = function(position) {
        this.position = position;
    };

    MockFileWriter.prototype.truncate = function(size) {
        this.position = Math.min(size, this.position);
        this.onwriteend();
    };

    return MockFileWriter;
});
