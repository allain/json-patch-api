var express = require('express');
var debug = require('debug')('json-patch-api');
var xtend = require('xtend');

var defaultOptions = {
  mongourl: 'localhost/json-api'
};

module.exports = function(io, options) {
  var router = express.Router();

  options = xtend({}, defaultOptions, options || {});

  var stores = require('./store.js')(io, {
    mongourl: options.mongourl
  });

  router.get('/:name', function(req, res) {
    var store = stores(req.params.name);

    store.snapshot(function(err, snapshot) {
      if (err) {
        return res.status(500).json(err);
      }

      res.set('X-Last-Patch', snapshot.ts || 0);
      res.json(snapshot.doc || {});
    });
  });

  router.get('/:name/patches', function(req, res) {
    var store = stores(req.params.name);

    store.patches(parseInt(req.query.after || '0', 10), function(err, patches) {
      if (err) {
        return res.status(500).json(err);
      }

      res.json(patches);
    });
  });

  router.post('/:name/patches', function(req, res) {
    var store = stores(req.params.name);

    var patch = req.body;
    if (!Array.isArray(patch)) {
      return res.status(400).json({error: 'malformed patch'});
    }

    store.patch(patch, function(err, patch) {
      if (err) {
        debug('error applying patch', err);
        return res.status(500).json(err);
      }

      res.end();
    });
  });

  router.put('/:name', function(req, res) {
    var store = stores(req.params.name);

    store.update(req.body, function(err, diff) {
      if (err) {
        return res.status(500).json(err);
      }

      if (diff.length) {
        res.status(200).json(diff);
      } else {
        res.status(204).send('No Change');
      }
    });
  });

  return router;
};
