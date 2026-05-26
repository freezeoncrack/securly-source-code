define([
], function(
) {
    function file(name, isDirectory) {
        var fileObject = jasmine.createSpyObj('fileObject',
            ['createWriter', 'file']);
        fileObject.name = name;
        fileObject.isDirectory = isDirectory === true;
        return fileObject;
    }

    function logFile(date) {
        date = date || new Date();
        return file(date.toJSON() + '.txt');
    }

    return {
        file: file,
        logFile: logFile
    };
});
