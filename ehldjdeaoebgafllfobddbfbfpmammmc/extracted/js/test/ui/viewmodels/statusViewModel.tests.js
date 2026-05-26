define([
    'amd/lib/knockout','viewmodels/statusViewModel', 'amd/sandbox', 
    'js/test/mocks/chrome.storage'
], 
function(
    ko, Status, Sandbox,
    storage
    ){
        describe('status view model', function() {
            beforeEach(function(){
               storage.local.mock();
            });
            afterEach(function() {
            });
            it("A student with no issues should show the In Class issue", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"class_status":"open","students":[{"account_id":2265764,"email":"huntertest@dyknow.com","first_name":"Hunter","last_name":"Dell"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":true,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":2265764,"Satellite_Failed":false,"OAuth_Error":false,"Login_Portal":false,"Classroom_Name":"Hunter's Test Class"}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("Student In Class");
            });
            it("A login portal should show the Server Error issue", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"class_status":"open","students":[{"account_id":2265764,"email":"huntertest@dyknow.com","first_name":"Hunter","last_name":"Dell"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":true,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":2265764,"Satellite_Failed":false,"OAuth_Error":false,"Login_Portal":true,"Classroom_Name":"Hunter's Test Class"}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("Server Error");
            });
            it("An OAuth error should show the OAuth Error issue", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"class_status":"open","students":[{"account_id":2265764,"email":"huntertest@dyknow.com","first_name":"Hunter","last_name":"Dell"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":true,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":2265764,"Satellite_Failed":false,"OAuth_Error":true,"Login_Portal":false,"Classroom_Name":"Hunter's Test Class"}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("Server Error");
            });
            it("Failing to pass IDN results in User Does Not Exist in Dyknow Error", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"class_status":"open","students":[{"account_id":2918368,"username":"richardchambers","first_name":"Tricky","last_name":"Rick"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":false,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":0,"Satellite_Failed":false,"OAuth_Error":false,"Login_Portal":false,"Classroom_Name":"Hunter's Test Class"}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("User Does Not Exist in Dyknow");
            });
            it("IP Restrictions shows the Restricted Network issue", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"resolution":1,"class_status":"open","students":[{"account_id":2918368,"username":"richardchambers","first_name":"Tricky","last_name":"Rick"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":true,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":0,"Satellite_Failed":false,"OAuth_Error":false,"Login_Portal":false,"Classroom_Name":"Hunter's Test Class"}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("Connected to Restricted Network");
            });
            it("A user not assigned to a HC shows the Not Assigned issue", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"class_status":"open","students":[{"account_id":2918368,"username":"richardchambers","first_name":"Tricky","last_name":"Rick"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":true,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":0,"Satellite_Failed":false,"OAuth_Error":false,"Login_Portal":false,"Classroom_Name":"Hunter's Test Class"}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("Logged in as Someone Else");
            });
            it("A HC with no students assigned shows the No Students Assigned issue", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"class_status":"open","students":[],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":true,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":0,"Satellite_Failed":false,"OAuth_Error":false,"Login_Portal":false,"Classroom_Name":"Hunter's Test Class"}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("No Students Assigned");
            });
            it("A HC for a class that has ended shows the Class Ended issue", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"class_status":"closed","students":[{"account_id":2918368,"username":"richardchambers","first_name":"Tricky","last_name":"Rick"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":true,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":0,"Satellite_Failed":false,"OAuth_Error":false,"Login_Portal":false,"Classroom_Name":"Hunter's Test Class"}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("Class Ended");
            });
            it("IP restrictions + not in dyknow should show both issues", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"resolution":1,"class_status":"open","students":[{"account_id":2265764,"email":"huntertest@dyknow.com","first_name":"Hunter","last_name":"Dell"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":false,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":2265764,"Satellite_Failed":false,"OAuth_Error":false,"Login_Portal":false,"Classroom_Name":"Hunter's Test Class"}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("Connected to Restricted Network");
                expect(vm.healthCheckSecondaryIssue()).toEqual("User Does Not Exist in Dyknow");
            });
            it("IP restrictions + not assigned should show both issues", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"resolution":1,"class_status":"open","students":[{"account_id":2265764,"email":"bademail@dyknow.com","first_name":"Hunter","last_name":"Dell"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":true,"IDN_Username":"huntertest@dyknow.com_g","IDN_AccountID":2265764,"Satellite_Failed":false,"OAuth_Error":false,"Login_Portal":false,"Classroom_Name":"Hunter's Test Class"}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("Connected to Restricted Network");
                expect(vm.healthCheckSecondaryIssue()).toEqual("Logged in as Someone Else");
            });
            it("Issues getting the class_name should show Unknown Issue issues", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"class_status":"open","students":[{"account_id":2265764,"email":"huntertest@dyknow.com","first_name":"Hunter","last_name":"Dell"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":true,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":2265764,"Satellite_Failed":false,"OAuth_Error":false,"Login_Portal":false,"Classroom_Name":null}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("Unknown Issue");
            });
            it("A satelitte server error should show the Sat Server issue", function() {
                var elem = document.createElement("div");
                elem.id = "healthCheck";
                document.body.appendChild(elem);
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                var obj = {"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"class_status":"open","students":[{"account_id":2265764,"username":"hthornsberry","first_name":"Hunter","last_name":"Dell","email":"huntertest@dyknow.com"},{"account_id":2918368,"username":"richardchambers","first_name":"Tricky","last_name":"Rick"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":true,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":2265764,"Satellite_Failed":true,"OAuth_Error":false,"Login_Portal":false,"Classroom_Name":null}};
                codeenteredsuccess(obj);
                expect(vm.healthCheckIssue()).toEqual("Server Error");
            });
            it("times out and declares updates about needing to reinstall if we cant get anything", function () {
                jasmine.Clock.useMock();
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                jasmine.Clock.tick(10000);
                jasmine.Clock.tick(10000);
                jasmine.Clock.tick(10000);
                jasmine.Clock.tick(5000);
                expect(vm.healthCheckIssue()).toEqual("Extension Not Responding");
                expect(vm.needReinstall()).toEqual(true);
                expect(vm.showActionButton()).toEqual(true);
                expect(vm.restartDyknowButtonText()).toEqual("Restart Dyknow");
            });

            it("doesnt time out if get the response", function () {
                jasmine.Clock.useMock();
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var codeenteredsuccess = sanbox.subscribe.calls[0].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                codeenteredsuccess({"health_check_id":22194,"health_check_code":"9CDY","roster_id":2402402,"class_status":"open","students":[{"account_id":2265764,"email":"huntertest@dyknow.com","first_name":"Hunter","last_name":"Dell"}],"ip_address":"71.201.102.39","IDN":{"IDN_InFlight":false,"IDN_Passed":true,"IDN_Username":"huntertest@dyknow.com","IDN_AccountID":2265764,"Satellite_Failed":false,"OAuth_Error":false,"Login_Portal":false,"Classroom_Name":null}});
                jasmine.Clock.tick(10000);
                jasmine.Clock.tick(10000);
                jasmine.Clock.tick(10000);
                jasmine.Clock.tick(5000);
                expect(vm.healthCheckIssue()).not.toEqual("Extension Not Responding");
                expect(vm.needReinstall()).toEqual(false);
            });

            it("doesnt time out if we cancel", function () {
                jasmine.Clock.useMock();
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                vm.cancelHealthCheck();
                jasmine.Clock.tick(10000);
                jasmine.Clock.tick(10000);
                jasmine.Clock.tick(10000);
                jasmine.Clock.tick(5000);
                expect(vm.healthCheckIssue()).not.toEqual("Extension Not Responding");
                expect(vm.needReinstall()).toEqual(false);
            });


            it("doesnt time out if out code was bad", function () {
                jasmine.Clock.useMock();
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var badCodeCallback = sanbox.subscribe.calls[1].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                badCodeCallback();
                jasmine.Clock.tick(15000);
                jasmine.Clock.tick(35000);
                expect(vm.healthCheckIssue()).not.toEqual("Extension Not Responding");
                expect(vm.needReinstall()).toEqual(false);
            });
            it("doesnt time out if there was a server issue", function () {
                jasmine.Clock.useMock();
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var serverErrorCallback = sanbox.subscribe.calls[2].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                serverErrorCallback();
                jasmine.Clock.tick(15000);
                jasmine.Clock.tick(35000);
                expect(vm.healthCheckIssue()).not.toEqual("Extension Not Responding");
                expect(vm.needReinstall()).toEqual(false);
            });
            it("doesnt time out if there was a codeenterednointernet", function () {
                jasmine.Clock.useMock();
                var sanbox = new Sandbox();
                spyOn(sanbox, "subscribe");
                spyOn(sanbox, "publish");
                var vm = new Status();
                var serverErrorCallback = sanbox.subscribe.calls[3].args[1];
                vm.startHealthCheck();
                vm.healthCheckCodeText("ABCD");
                vm.validateHealthCheckCode();
                serverErrorCallback();
                jasmine.Clock.tick(15000);
                jasmine.Clock.tick(35000);
                expect(vm.healthCheckIssue()).not.toEqual("Extension Not Responding");
                expect(vm.needReinstall()).toEqual(false);
            });
        });
    });