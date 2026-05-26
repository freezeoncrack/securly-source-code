require.config({
    paths: {
        underscore: "/js/amd/lib/underscore",
        amd: "/js/amd"
    }
});


define(['amd/sandbox', 'amd/settings'], function(Sandbox, SETTINGS){
    var sandbox = new Sandbox().init();
    function showLoginError(error) {
        $('#error').text(error).show();
    }
    var requestPending = false;
    $('#dyknowlogin').click(function(){
       $('#loginform').toggle();
    });
    $('#submit').on('click', function(e){
        $('#error').hide();
        e.stopPropagation();
        e.preventDefault();

        if (requestPending) {
            return;
        }


        if ($(this).parent('form')[0].checkValidity()) {
            var $username = $('#username').val(),
                $password = $('#password').val(),
                $vanity = $('#vanity').val();

            requestPending = true;
            sandbox.publish(SETTINGS.EVENTS.FORM_LOGIN, { "username": $username, "password" : $password, "vanity": $vanity.split(".")[0]  });
        }
    });


    sandbox.subscribe(SETTINGS.EVENTS.LOG_IN_SUCCESS, function(){
        requestPending = false;
        $(window).off('unload');
        window.close();
    });

    sandbox.subscribe(SETTINGS.EVENTS.CALL_LOGIN_FORM, function(){
        //someone else is opening us again. close this one so we dont' end up with two.
        $(window).off('unload');
        window.close();
    });

    sandbox.subscribe(SETTINGS.EVENTS.LOG_IN_ERROR, function(error){
        requestPending = false;
        showLoginError((error.error_description) ? error.error_description : error.error);
    });

    $('#google').click(function(){
        sandbox.publish(SETTINGS.EVENTS.GOOGLE_LOGIN);
    });

    $(window).on('unload', function (event) {
        sandbox.publish(SETTINGS.EVENTS.CALL_LOGIN_FORM);
    });

    sandbox.publish(SETTINGS.EVENTS.LOG_IN_FORM_READY);
});


