import filesystemLog from "/js/mjs/filesystem.js";


await filesystemLog.init();
var fileEntries = await filesystemLog.getFilesBetweenDates(new Date("2023-04-21"), new Date("2023-04-22"));
var fileData = await filesystemLog.readFile(fileEntries[fileEntries.length -1]);
var fileBlob = new Blob([fileData]);
document.getElementById("logspot").textContent = await fileBlob.text();
