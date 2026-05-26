
var accountId = 0;

function MockAccount(info) {
    info = typeof info === 'number' ? {account_id: info} : info || {};

    this.account_id = info.account_id || (++accountId);
    this.first_name = info.first_name || ('First' + this.account_id);
    this.last_name = info.last_name || ('Last' + this.account_id);
}

/**
 * Helper method to mock multiple accounts.
 */
MockAccount.mockAccounts = function(count) {
    var accounts = [];
    for (var i = 0; i < count; i++) { accounts.push(new MockAccount()); }
    return accounts;
};

export default MockAccount;
