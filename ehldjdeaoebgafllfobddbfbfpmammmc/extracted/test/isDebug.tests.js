import isDebug from "../js/isDebug.js";
describe("isDebug", function () {
    it("is true", function () {
        expect(isDebug.debug).toEqual(true);
    });
});