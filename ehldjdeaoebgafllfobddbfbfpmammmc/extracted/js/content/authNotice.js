require.config({
    paths: {
        underscore: '/js/amd/lib/underscore',
        amd: '/js/amd'
    }
});

define([
    'amd/sandbox',
    'amd/settings'
], function(
    Sandbox,
    SETTINGS
) {
    var sandbox = new Sandbox().init();
    var recalled = false;
    var $accept = $('#accept');

    $accept.click(function(eventObject) {
        $accept.attr('disabled', 'disabled');

        eventObject.stopPropagation();
        eventObject.preventDefault();

        sandbox.publish(SETTINGS.EVENTS.AUTH_NOTICE_ACCEPTED);
        $(window).off('focusout blur unload');
        window.close();
    });

    var recallAuthForm = function() {
        // Guard to prevent multiple recalls.
        if (recalled) { return true; }
        recalled = true;
        sandbox.publish(SETTINGS.EVENTS.CALL_AUTH_NOTICE_FORM);
    };

    if (document.hidden) {
        recallAuthForm();
        return;
    }

    $(window).on('focusout blur unload', recallAuthForm);
    $(document).on('visibilitychange', function() {
        if (document.hidden) { recallAuthForm(); }
    });
});
