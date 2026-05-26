import guid from "/js/mjs/lib/uuid.js";
import AttentionManager from "/js/mjs/qsr/attentionManager.js";
import State from "/js/mjs/qsr/state.js";
import UrlAckPurger from "/js/mjs/urlAckPurger.js";
import AccountsCache from "/js/mjs/utils/accountsCache.js";
import MockStateFrame from "/test/mocks/stateFrame.js";
import MockLockedFrame from "/test/mocks/lockedAttentionFrame.js";
import MockMessageFrame from "/test/mocks/unlockedMessageFrame.js";

describe('AttentionManager', function() {
    var attentionManager, attention, messages;
    var flags, lockingFlag, unlockFlag;

    beforeEach(function() {
        attentionManager = AttentionManager.instance();
        attention = attentionManager.attention;
        messages = attentionManager.messages;

        flags = attention.lockFlags;
        lockingFlag = flags.kAttentionScreen +
            flags.kAttentionKeyboard + flags.kAttentionMouse;
        unlockFlag = flags.kAttentionClear;
    });

    afterEach(function() {
        attentionManager.clear();
        attentionManager.course = undefined;
        AccountsCache._destroy();
    });

    function mockTeacher(first, last, account_id) {
        return {
            account_id: account_id || 123,
            first_name: first === undefined ? 'Teachy' : first,
            last_name: last === undefined ? 'McTeacher' : last
        };
    }

    function mockCourse(name, period, teachers) {
        var teachers = teachers === undefined ? [mockTeacher()] : teachers;
        return {
            roster_id: 42,
            name: name === undefined ? 'Test Class' : name,
            period: period === undefined ? '1' : period,
            teachers: teachers
        };
    }

    it('can fetch instance', function() {
        expect(attentionManager).toBeTruthy();
    });

    it('will reuse instance', function() {
        expect(AttentionManager.instance()).toBe(attentionManager);
    });

    describe('helpers', function() {
        it('can get teacher information', function() {
            var teacher = mockTeacher();
            expect(attentionManager.teacherInfo(teacher)).toBe('Teachy McTeacher');
        });

        it('can get IDs for frame', function() {
            expect(attentionManager.accountIdForFrame()).toBe(undefined);
            expect(attentionManager.accountIdForFrame({
                from_option: 'broadcaster',
                from: '42'
            })).toBe(42);
            expect(attentionManager.accountIdForFrame({
                from_option: 'broadcaster',
                from: 'nope'
            })).toBe(undefined);
            expect(attentionManager.accountIdForFrame({
                account_id: 42
            })).toBe(42);
        });

        it('can get teacher for frame', function() {
            var cache = AccountsCache.instance();
            var teacher = mockTeacher();
            cache.cache(teacher);
            var frame = new MockMessageFrame(guid(), guid(),
                { message: 'hello world' }, teacher.account_id);

            var fetched = attentionManager.teacherForFrame(frame);
            expect(fetched).toBe(teacher);
        });

        it('handles invalid teacher for teacher info', function() {
            expect(attentionManager.teacherInfo()).toBe('');
            expect(attentionManager.teacherInfo(null)).toBe('');
            expect(attentionManager.teacherInfo(false)).toBe('');
            expect(attentionManager.teacherInfo({})).toBe('');
        });

        it('handles teacher info with only first or last name', function() {
            expect(attentionManager.teacherInfo({first_name: 'F'})).toBe('F');
            expect(attentionManager.teacherInfo({last_name: 'L'})).toBe('L');
        });

        it('calling clear removes locking, messages', function() {
            spyOn(attentionManager, 'clearLocking');
            spyOn(messages, 'clear');

            attentionManager.clear();
            expect(attentionManager.clearLocking).toHaveBeenCalled();
            expect(messages.clear).toHaveBeenCalled();
        });

        it('clear locking calls to clear locking', function() {
            spyOn(attentionManager, 'applyLocking');
            attentionManager.clearLocking();
            expect(attentionManager.applyLocking)
                .toHaveBeenCalledWith(unlockFlag);
        });

        it('passes remove to messages', function() {
            spyOn(messages, 'removeMessage');
            attentionManager.removeMessage();
            expect(messages.removeMessage).toHaveBeenCalled();
        });

        it('passes update to messages', function() {
            spyOn(messages, 'updateMessage');
            attentionManager.updateMessage();
            expect(messages.updateMessage).toHaveBeenCalled();
        });

        it('can set course', function() {
            var course = mockCourse();
            expect(attentionManager.course).toBeFalsy();
            attentionManager.setCourse(course);
            expect(attentionManager.course).toBe(course);
        });

        it('will cache teachers when setting course', function() {
            var cache = AccountsCache.instance();
            spyOn(cache, 'cache');
            var course = mockCourse();
            expect(attentionManager.course).toBeFalsy();

            attentionManager.setCourse(course);
            expect(attentionManager.course).toBe(course);
            expect(cache.cache).toHaveBeenCalledWith(course.teachers);
        });

        it('will not set course with the same course', function() {
            var cache = AccountsCache.instance();
            spyOn(cache, 'cache');
            var course = mockCourse();
            attentionManager.course = course;

            attentionManager.setCourse(course);
            expect(attentionManager.course).toBe(course);
            expect(cache.cache).not.toHaveBeenCalled();
        });
    });

    describe('state application', function() {
        it('routes locked messages', function() {
            var frame = new MockLockedFrame(guid(), guid(), {});
            spyOn(attentionManager, 'applyLockingMessage');

            attentionManager.applyState(new MockStateFrame({
                locked_message: frame
            }));
            expect(attentionManager.applyLockingMessage)
                .toHaveBeenCalledWith(frame);
        });

        it('routes non-locked messages', function() {
            var frame = new MockMessageFrame(guid(), guid(), {});
            spyOn(attentionManager, 'applyNonLockingMessage');

            attentionManager.applyState(new MockStateFrame({
                messages: [frame]
            }));
            expect(attentionManager.applyNonLockingMessage)
                .toHaveBeenCalledWith(frame);
        });

        it('routes realtime frame', function() {
            var frame = new MockLockedFrame(guid(), guid(), {});
            spyOn(attentionManager, 'applyFrame');

            attentionManager.applyState(frame);
            expect(attentionManager.applyFrame).toHaveBeenCalledWith(frame);
        });

        it('clears attention without a state', function() {
            spyOn(attentionManager, 'clear');
            spyOn(UrlAckPurger, 'purgeOldAckEntries');

            attentionManager.applyState();
            expect(attentionManager.clear).toHaveBeenCalled();
            expect(UrlAckPurger.purgeOldAckEntries).toHaveBeenCalled();
        });

        it('clears attention with an empty state', function() {
            spyOn(attentionManager, 'clear');
            spyOn(UrlAckPurger, 'purgeOldAckEntries');

            attentionManager.applyState(new MockStateFrame({}));
            expect(attentionManager.clear).toHaveBeenCalled();
            expect(UrlAckPurger.purgeOldAckEntries).toHaveBeenCalled();
        });

        it('empty lock messages clears attention', function() {
            spyOn(attentionManager, 'applyLocking');
            spyOn(UrlAckPurger, 'purgeOldAckEntries');

            attentionManager.applyState(new MockStateFrame({
                locked_message: new MockLockedFrame(guid(), guid(), {})
            }));

            expect(attentionManager.applyLocking).toHaveBeenCalledWith(
                unlockFlag, undefined, jasmine.any(Object));
            expect(UrlAckPurger.purgeOldAckEntries).toHaveBeenCalled();
        });

        it('empty messages clears messages', function() {
            spyOn(messages, 'addMessage');
            spyOn(messages, 'updateMessage');
            spyOn(messages, 'removeMessage');
            spyOn(messages, 'clear');

            attentionManager.applyState(new MockStateFrame({
                messages: []
            }));

            expect(messages.addMessage).not.toHaveBeenCalled();
            expect(messages.updateMessage).not.toHaveBeenCalled();
            expect(messages.removeMessage).not.toHaveBeenCalled();
            expect(messages.clear).toHaveBeenCalled();
        });

        it('blank messages ignored', function() {
            spyOn(messages, 'addMessage');
            spyOn(messages, 'updateMessage');
            spyOn(messages, 'removeMessage');
            spyOn(messages, 'clear');

            attentionManager.applyState(new MockStateFrame({
                messages: [new MockMessageFrame(guid(), guid(), {})]
            }));

            expect(messages.addMessage).not.toHaveBeenCalled();
            expect(messages.updateMessage).not.toHaveBeenCalled();
            expect(messages.removeMessage).not.toHaveBeenCalled();
            expect(messages.clear).not.toHaveBeenCalled();
        });

        it('will add message', function() {
            spyOn(messages, 'addMessage');
            spyOn(messages, 'updateMessage');
            spyOn(messages, 'removeMessage');
            spyOn(messages, 'clear');

            attentionManager.applyState(new MockStateFrame({
                messages: [
                    new MockMessageFrame(guid(), guid(), {
                        message: 'hello world'
                    })
                ]
            }));

            expect(messages.addMessage).toHaveBeenCalled();
            expect(messages.updateMessage).not.toHaveBeenCalled();
            expect(messages.removeMessage).not.toHaveBeenCalled();
            expect(messages.clear).not.toHaveBeenCalled();
        });

        // Invalid state, but testing any way.
        it('will ignore locking frame in messages', function() {
            spyOn(messages, 'addMessage');
            spyOn(messages, 'updateMessage');
            spyOn(messages, 'removeMessage');
            spyOn(messages, 'clear');

            attentionManager.applyState(new MockStateFrame({
                messages: [
                    new MockLockedFrame(guid(), guid(), {
                        lock: 'locked'
                    })
                ]
            }));

            expect(messages.addMessage).not.toHaveBeenCalled();
            expect(messages.updateMessage).not.toHaveBeenCalled();
            expect(messages.removeMessage).not.toHaveBeenCalled();
            expect(messages.clear).not.toHaveBeenCalled();
        });

        it('will ignore empty message', function() {
            spyOn(messages, 'addMessage');
            spyOn(messages, 'updateMessage');
            spyOn(messages, 'removeMessage');
            spyOn(messages, 'clear');

            attentionManager.applyState(new MockStateFrame({
                messages: [new MockMessageFrame(guid(), guid(), {
                    message: ''
                })]
            }));

            expect(messages.addMessage).not.toHaveBeenCalled();
            expect(messages.updateMessage).not.toHaveBeenCalled();
            expect(messages.removeMessage).not.toHaveBeenCalled();
            expect(messages.clear).not.toHaveBeenCalled();
        });

        // Invalid state, but testing any way.
        it('will include ignored lock on message', function() {
            spyOn(messages, 'addMessage');
            spyOn(messages, 'updateMessage');
            spyOn(messages, 'removeMessage');
            spyOn(messages, 'clear');

            attentionManager.applyState(new MockStateFrame({
                messages: [new MockMessageFrame(guid(), guid(), {
                    message: 'hello world',
                    lock: 'locked'
                })]
            }));

            expect(messages.addMessage).toHaveBeenCalled();
            expect(messages.updateMessage).not.toHaveBeenCalled();
            expect(messages.removeMessage).not.toHaveBeenCalled();
            expect(messages.clear).not.toHaveBeenCalled();
        });

        // Invalid state, but testing any way.
        it('will include ignored lock on message', function() {
            spyOn(messages, 'addMessage');
            spyOn(messages, 'updateMessage');
            spyOn(messages, 'removeMessage');
            spyOn(messages, 'clear');

            attentionManager.applyState(new MockStateFrame({
                messages: [new MockMessageFrame(guid(), guid(), {
                    message: 'hello world',
                    lock: 'unlocked'
                })]
            }));

            expect(messages.addMessage).toHaveBeenCalled();
            expect(messages.updateMessage).not.toHaveBeenCalled();
            expect(messages.removeMessage).not.toHaveBeenCalled();
            expect(messages.clear).not.toHaveBeenCalled();
        });

        it('will add multiple messages', function() {
            spyOn(messages, 'addMessage');
            spyOn(messages, 'updateMessage');
            spyOn(messages, 'removeMessage');
            spyOn(messages, 'clear');

            attentionManager.applyState(new MockStateFrame({
                messages: [
                    new MockMessageFrame(guid(), guid(), {
                        message: 'hello world'
                    }),
                    new MockMessageFrame(guid(), guid(), {
                        message: 'goodbye world'
                    })
                ]
            }));

            expect(messages.addMessage).toHaveBeenCalled();
            expect(messages.addMessage.calls.all().length).toBe(2);
            expect(messages.updateMessage).not.toHaveBeenCalled();
            expect(messages.removeMessage).not.toHaveBeenCalled();
            expect(messages.clear).not.toHaveBeenCalled();
        });

        it('will add multiple messages', function() {
            spyOn(messages, 'addMessage');
            spyOn(messages, 'updateMessage');
            spyOn(messages, 'removeMessage');
            spyOn(messages, 'clear');

            attentionManager.applyState(new MockStateFrame({
                messages: [
                    new MockMessageFrame(guid(), guid(), {
                        message: 'hello world',
                        open_urls: true
                    }),
                    new MockMessageFrame(guid(), guid(), {
                        message: 'goodbye world',
                        open_urls: false
                    })
                ]
            }));

            expect(messages.addMessage).toHaveBeenCalled();
            expect(messages.addMessage.calls.all().length).toBe(2);
            expect(messages.addMessage).toHaveBeenCalledWith(
                jasmine.any(String), 'hello world', true, '');
            expect(messages.addMessage).toHaveBeenCalledWith(
                jasmine.any(String), 'goodbye world', false, '');
            expect(messages.updateMessage).not.toHaveBeenCalled();
            expect(messages.removeMessage).not.toHaveBeenCalled();
            expect(messages.clear).not.toHaveBeenCalled();
        });

        it('will apply both empty unlock and clear messages', function() {
            spyOn(attentionManager, 'applyLocking');
            spyOn(messages, 'clear');
            var state = new MockStateFrame({
                locked_message: new MockLockedFrame(guid(), guid(), {}),
                messages: []
            });

            attentionManager.applyState(state);
            expect(attentionManager.applyLocking).toHaveBeenCalledWith(
                unlockFlag, undefined, jasmine.any(Object));
            expect(messages.clear).toHaveBeenCalled();
        });

        it('will apply both unlock and clear messages', function() {
            spyOn(attentionManager, 'applyLocking');
            spyOn(messages, 'clear');
            var state = new MockStateFrame({
                locked_message: new MockLockedFrame(guid(), guid(), {
                    lock: 'unlocked'
                }),
                messages: []
            });

            attentionManager.applyState(state);
            expect(attentionManager.applyLocking).toHaveBeenCalledWith(
                unlockFlag, undefined, jasmine.any(Object));
            expect(messages.clear).toHaveBeenCalled();
        });

        it('will apply locking and messages', function() {
            spyOn(attentionManager, 'applyLockingMessage');
            spyOn(attentionManager, 'applyNonLockingMessage');
            var lockFrame = new MockLockedFrame(guid(), guid(), {
                lock: 'locked',
                message: 'hello world'
            });
            var nonLockFrame = new MockMessageFrame(guid(), guid(), {
                message: 'hello popup'
            });
            var state = new MockStateFrame({
                locked_message: lockFrame,
                messages: [nonLockFrame]
            });

            attentionManager.applyState(state);
            expect(attentionManager.applyLockingMessage)
                .toHaveBeenCalledWith(lockFrame);
            expect(attentionManager.applyNonLockingMessage)
                .toHaveBeenCalledWith(nonLockFrame);
        });

        it('can restore state', function() {
            spyOn(attentionManager, 'applyState');
            var stateObject = {test: 'testing'};
            var state = new State({attention: stateObject});

            attentionManager.restoreState(state);
            expect(attentionManager.applyState).toHaveBeenCalledWith(stateObject);
        });
    });

    describe('realtime application', function() {
        it('routes locked frame', function() {
            var frame = new MockLockedFrame(guid(), guid(), {});
            spyOn(attentionManager, 'applyLockingMessage');

            attentionManager.applyFrame(frame);
            expect(attentionManager.applyLockingMessage).toHaveBeenCalledWith(frame);
        });

        it('routes non-locked frame', function() {
            var frame = new MockMessageFrame(guid(), guid(), {});
            spyOn(attentionManager, 'applyNonLockingMessage');

            attentionManager.applyFrame(frame);
            expect(attentionManager.applyNonLockingMessage).toHaveBeenCalledWith(frame);
        });

        it('"unlocked" lock message clears', function() {
            spyOn(attentionManager, 'applyLocking');

            attentionManager.applyFrame(new MockLockedFrame(
                guid(), guid(), {lock: 'unlocked'}));
            expect(attentionManager.applyLocking).toHaveBeenCalledWith(
                unlockFlag, undefined, jasmine.any(Object));
        });

        it('applies locking frame with message', function() {
            spyOn(attentionManager, 'applyLockingMessage');
            var message = 'hello world';
            var frame = new MockLockedFrame(guid(), guid(), {
                lock: 'locked',
                message: message
            });
            attentionManager.applyFrame(frame);
            expect(attentionManager.applyLockingMessage).toHaveBeenCalledWith(frame);
        });

        it('applies locking frame without message', function() {
            spyOn(attentionManager, 'applyLockingMessage');
            var frame = new MockLockedFrame(guid(), guid(), {
                lock: 'locked',
            });
            attentionManager.applyFrame(frame);
            expect(attentionManager.applyLockingMessage).toHaveBeenCalledWith(frame);
        });
    });

    describe('locking attention', function() {
        it('unlocks with empty message', function() {
            spyOn(attentionManager, 'applyLocking');
            var frame = new MockLockedFrame(guid(), guid(), {});
            attentionManager.applyLockingMessage(frame);
            expect(attentionManager.applyLocking).toHaveBeenCalledWith(
                unlockFlag, undefined, frame);
        });

        it('unlocks with unlock message', function() {
            spyOn(attentionManager, 'applyLocking');
            var frame = new MockLockedFrame(guid(), guid(), {
                lock: 'unlocked'
            });
            attentionManager.applyLockingMessage(frame);
            expect(attentionManager.applyLocking).toHaveBeenCalledWith(
                unlockFlag, undefined, frame);
        });

        it('applies locking with message', function() {
            spyOn(attentionManager, 'applyLocking');
            var message = 'hello world';
            var frame = new MockLockedFrame(guid(), guid(), {
                lock: 'locked',
                message: message
            });
            attentionManager.applyLockingMessage(frame);
            expect(attentionManager.applyLocking).toHaveBeenCalledWith(
                lockingFlag, message, frame);
        });

        it('applies locking without message', function() {
            spyOn(attentionManager, 'applyLocking');
            var frame = new MockLockedFrame(guid(), guid(), {
                lock: 'locked',
            });
            attentionManager.applyLockingMessage(frame);
            expect(attentionManager.applyLocking).toHaveBeenCalledWith(
                lockingFlag, undefined, frame);
        });
    });

    describe('unlocked messages', function() {
        beforeEach(function() {
            AccountsCache.instance().cache({
                account_id: 42,
                first_name: 'Bob',
                last_name: 'Smith'
            });
        });

        afterEach(function() {
            AccountsCache._destroy();
        });

        it('allows opening URLs', function() {
            spyOn(messages, 'addMessage');
            var message = 'Google! https://google.com';

            var frame = new MockMessageFrame(guid(), guid(), {
                message: message,
                open_urls: true
            }, 42);
            attentionManager.applyNonLockingMessage(frame);
            expect(messages.addMessage).toHaveBeenCalledWith(
                jasmine.any(String), message, true, 'Bob Smith');
        });

        it('implicit URL doesn\'t allow opening URLs', function() {
            spyOn(messages, 'addMessage');
            var message = 'Google! https://google.com';

            var frame = new MockMessageFrame(guid(), guid(), {
                message: message
            }, 42);
            attentionManager.applyNonLockingMessage(frame);
            expect(messages.addMessage).toHaveBeenCalledWith(
                jasmine.any(String), message, undefined, 'Bob Smith');
        });

        it('explicit URL disallow doesn\'t allow opening URLs', function() {
            spyOn(messages, 'addMessage');
            var message = 'Google! https://google.com';

            var frame = new MockMessageFrame(guid(), guid(), {
                message: message,
                open_urls: false
            }, 42);
            attentionManager.applyNonLockingMessage(frame);
            expect(messages.addMessage).toHaveBeenCalledWith(
                jasmine.any(String), message, false, 'Bob Smith');
        });
    });

    describe('locking flags', function() {
        it('will exit early for null flag', function() {
            spyOn(attention, 'setBlocking');
            attentionManager.applyLocking();
            attentionManager.applyLocking(null);
            attentionManager.applyLocking(null, null);
            attentionManager.applyLocking(null, '');
            attentionManager.applyLocking(undefined, '');
            expect(attention.setBlocking).not.toHaveBeenCalled();
        });

        it('can apply attention without a message', function() {
            var flag = attention.lockFlags.kAttentionScreen;
            spyOn(attention, 'setBlocking');
            attentionManager.applyLocking(flag);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, undefined, undefined);
        });

        it('can apply locking message', function() {
            var frame = { account_id: 123 };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.applyLocking(flag, message, frame);
            expect(attention.setBlocking).toHaveBeenCalledWith(flag, message, undefined);
        });

        it('can apply locking with course', function() {
            var course = mockCourse();
            var frame = { account_id: 123 };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.setCourse(course);
            attentionManager.applyLocking(flag, message, frame);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, message, 'Your device has been locked by\r\n' +
                'Teachy McTeacher\r\n1 - Test Class');
        });

        it('can apply locking with course with multiple teachers', function() {
            var course = mockCourse(undefined, undefined, [
                mockTeacher(),
                mockTeacher('Jane', 'Doe', 234)
            ]);
            var frame = { account_id: 123 };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.setCourse(course);
            attentionManager.applyLocking(flag, message, frame);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, message, 'Your device has been locked by\r\n' +
                'Teachy McTeacher\r\n1 - Test Class');
        });

        it('can apply locking with co-teacher with course', function() {
            var course = mockCourse(undefined, undefined, [
                mockTeacher(),
                mockTeacher('Jane', 'Doe', 234)
            ]);
            var frame = { account_id: 234 };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.setCourse(course);
            attentionManager.applyLocking(flag, message, frame);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, message, 'Your device has been locked by\r\n' +
                'Jane Doe\r\n1 - Test Class');
        });

        it('can apply locking with only teacher first name', function() {
            var course = mockCourse(undefined, undefined, [
                mockTeacher('Jane', null)
            ]);
            var frame = { account_id: 123 };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.setCourse(course);
            attentionManager.applyLocking(flag, message, frame);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, message, 'Your device has been locked by\r\n' +
                'Jane\r\n1 - Test Class');
        });

        it('can apply locking with only teacher last name', function() {
            var course = mockCourse(undefined, undefined, [
                mockTeacher(null, 'Doe')
            ]);
            var frame = { account_id: 123 };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.setCourse(course);
            attentionManager.applyLocking(flag, message, frame);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, message, 'Your device has been locked by\r\n' +
                'Doe\r\n1 - Test Class');
        });

        it('can apply locking without teacher', function() {
            var course = mockCourse(undefined, undefined, []);
            var frame = { account_id: 123 };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.setCourse(course);
            attentionManager.applyLocking(flag, message);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, message, 'Your device has been locked by\r\n' +
                '\r\n1 - Test Class');
        });

        it('can apply locking with null teachers', function() {
            var course = mockCourse(undefined, undefined, null);
            var frame = { account_id: 123 };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.setCourse(course);
            attentionManager.applyLocking(flag, message, frame);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, message, 'Your device has been locked by\r\n' +
                '\r\n1 - Test Class');
        });

        it('can apply locking without session', function() {
            var course = mockCourse(undefined, null);
            var frame = { account_id: course.teachers[0].account_id };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.setCourse(course);
            attentionManager.applyLocking(flag, message, frame);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, message, 'Your device has been locked by\r\n' +
                'Teachy McTeacher\r\nTest Class');
        });

        it('can apply locking with blank session', function() {
            var course = mockCourse(undefined, '');
            var frame = { account_id: 123 };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.setCourse(course);
            attentionManager.applyLocking(flag, message, frame);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, message, 'Your device has been locked by\r\n' +
                'Teachy McTeacher\r\nTest Class');
        });

        it('can apply locking without class name', function() {
            var course = mockCourse(null);
            var frame = { account_id: 123 };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.setCourse(course);
            attentionManager.applyLocking(flag, message, frame);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, message, 'Your device has been locked by\r\n' +
                'Teachy McTeacher\r\n1');
        });

        it('can apply locking with blank class name', function() {
            var course = mockCourse('');
            var frame = { account_id: 123 };
            var message = 'hello world';
            var flag = 42;
            spyOn(attention, 'setBlocking');
            attentionManager.setCourse(course);
            attentionManager.applyLocking(flag, message, frame);
            expect(attention.setBlocking).toHaveBeenCalledWith(
                flag, message, 'Your device has been locked by\r\n' +
                'Teachy McTeacher\r\n1');
        });
    });
});
