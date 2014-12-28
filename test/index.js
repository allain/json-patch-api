var assert = require('chai').assert,
    jsonPatchApi = require('..');

describe('json-patch-api', function() {
  it('should return an express Router', function(done) {
    var router = jsonPatchApi(null);
    assert.isNotNull(router);
    done();
  });
});
