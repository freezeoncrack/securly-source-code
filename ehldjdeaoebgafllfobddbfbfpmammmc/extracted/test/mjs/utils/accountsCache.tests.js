import AccountsCache from "/js/mjs/utils/accountsCache.js";
import MockAccount from "/test/mocks/account.js"    ;
describe('AccountsCache', function() {
    afterEach(function() {
        AccountsCache._destroy();
    });

    it('can construct instance', function() {
        var instance = new AccountsCache();
        expect(instance).toBeTruthy();
    });

    it('can retrieve shared instance', function() {
        var instance = AccountsCache.instance();
        expect(instance).toBeTruthy();
    });

    it('retrieves the same shared instance', function() {
        var instance1 = AccountsCache.instance();
        var instance2 = AccountsCache.instance();
        expect(instance1).toBe(instance2);
    });

    it('can find account index for attributes', function() {
        var accounts = MockAccount.mockAccounts(4);
        var instance = AccountsCache.instance();
        instance.accounts = accounts;

        expect(instance.findIndex('account_id', accounts[0].account_id)).toBe(0);
        expect(instance.findIndex('account_id', accounts[2].account_id)).toBe(2);
        expect(instance.findIndex('first_name', accounts[1].first_name)).toBe(1);
        expect(instance.findIndex('last_name', accounts[3].last_name)).toBe(3);
        expect(instance.findIndex('test', 'testing')).toBe(undefined);
        expect(instance.findIndex('account_id', -1)).toBe(undefined);
    });

    it('can find account by id', function() {
        var accounts = MockAccount.mockAccounts(4);
        var instance = AccountsCache.instance();
        instance.accounts = accounts;

        accounts.forEach(function(account, index) {
            expect(instance.accountIndex(account.account_id)).toBe(index);
        });

        expect(instance.accountIndex('nope')).toBe(undefined);
        expect(instance.accountIndex(-1)).toBe(undefined);
        expect(instance.accountIndex(undefined)).toBe(undefined);
    });

    it('can retrieve account at index', function() {
        var accounts = MockAccount.mockAccounts(4);
        var instance = AccountsCache.instance();
        instance.accounts = accounts;

        accounts.forEach(function(account) {
            var index = instance.accountIndex(account.account_id);
            expect(instance.getAtIndex(index)).toBe(account);
        });

        expect(instance.getAtIndex('nope')).toBe(undefined);
        expect(instance.getAtIndex(-1)).toBe(undefined);
        expect(instance.getAtIndex(undefined)).toBe(undefined);
    });

    it('can retrieve accounts', function() {
        var accounts = MockAccount.mockAccounts(4);
        var instance = AccountsCache.instance();
        instance.accounts = accounts;

        accounts.forEach(function(account) {
            expect(instance.getAccount(account.account_id)).toBe(account);
        });

        expect(instance.getAccount('nope')).toBe(undefined);
        expect(instance.getAccount(-1)).toBe(undefined);
        expect(instance.getAccount(undefined)).toBe(undefined);
    });

    it('can cache account', function() {
        var instance = AccountsCache.instance();
        var account = new MockAccount();

        expect(instance.accounts.length).toBe(0);
        expect(instance.getAccount(account.account_id)).toBe(undefined);

        instance.cache(account);
        expect(instance.accounts.length).toBe(1);
        expect(instance.getAccount(account.account_id)).toBe(account);

        instance.cache(account);
        expect(instance.accounts.length).toBe(1);
        expect(instance.getAccount(account.account_id)).toBe(account);
    });

    it('can cache accounts', function() {
        var accounts = MockAccount.mockAccounts(4);
        var instance = AccountsCache.instance();
        instance.accounts = accounts;

        expect(instance.accounts.length).toBe(4);
        instance.cache(accounts);
        expect(instance.accounts.length).toBe(4);

        var account = accounts[2];
        accounts = MockAccount.mockAccounts(4);

        instance.cache(accounts);
        expect(instance.accounts.length).toBe(8);
        expect(instance.accountIndex(account.account_id)).toBe(2);
        expect(instance.accountIndex(accounts[1].account_id)).toBe(5);
    });
});
