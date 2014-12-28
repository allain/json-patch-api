var debug = require('debug')('json-patch-api:store');
var jiff = require('jiff');

var mongojs = require('mongojs');

var db = mongojs('localhost/api-test', ['snapshots', 'patches']);

function objectHash(obj) {
  return obj.id || obj._id || obj.hash || JSON.stringify(obj);
}

var stores = {};

module.exports = function(io) {
  return function(name) {
    var store = stores[name];
    if (!store) {
      store = stores[name] = new Store(name, io);
    }
    return store;
  };
};

function Store(name, io) {
  var self = this;
  var snapshot;

  var patchesIO = io.of('/patches/' + name);

  this.snapshot = function(cb) {
    if (snapshot !== undefined) return cb(null, snapshot);

    db.snapshots.findOne({name: name}, processSnapshot);

    function processSnapshot(err, snapshotDoc) {
      if (err) return cb(err);

      snapshot = snapshotDoc;

      if (snapshot) return cb(null, snapshot);

      db.snapshots.insert({name: name, doc: {}}, handleInserted);
    }

    function handleInserted(err) {
      if (err) return cb(err);

      db.snapshots.findOne({name: name}, processSnapshot);
    }
  };

  // Process an updated doc, recording and streaming patches, then updating the snapshot
  this.update = function(updatedDoc, cb) {
    var now = Date.now();
    var diff;

    this.snapshot(processUpdate);

    function processUpdate(err, snapshot) {
      if (err) return cb(err);

      diff = jiff.diff(snapshot.doc || {}, updatedDoc, objectHash);

      if (diff.length === 0) {
        return cb(null, []);
      }

      self.patch(diff, cb);
    }
  };

  this.patch = function(patch, cb) {
    var now;
    var newDoc;

    if (patch.length === 0) return cb(null, []);

    this.snapshot(applyPatch);

    function applyPatch(err, snapshot) {
      now = Date.now();
      newDoc = snapshot.doc;

      try {
        newDoc = jiff.patch(patch, snapshot.doc);

        // No Exception thrown, patches are good, record them in DB in bulk operation
        db.patches.insert({snapshotId: snapshot._id, ts: now, diff: patch}, updateSnapshotDoc);
      } catch(e) {
        cb(e);
      }
    }

    function updateSnapshotDoc(err, savedPatch) {
      if (err) return cb(err);

      patchesIO.emit('patch', {
        ts: savedPatch.ts,
        diff: savedPatch.diff
      });

      snapshot.doc = newDoc;

      snapshot.ts = now;

      db.snapshots.update({_id: snapshot._id}, {$set: {doc: newDoc, ts: now}}, respond);
    }

    function respond(err) {
      if (err) return cb(err);

      cb(null, patch);
    }
  };

  this.patches = function(after, cb) {
    this.snapshot(findSnapshotPatches);

    function findSnapshotPatches(err, snapshot) {
      if (err) return cb(err);

      db.patches.find({snapshotId: snapshot._id, ts: {$gt: after}}).sort('ts', respond);
    }

    function respond(err, patches) {
      if (err) return cb(err);

      var result = patches.map(function(patch) {
        return {
          ts: patch.ts,
          diff: patch.diff
        };
      });

      cb(null, result);
    }
  };
}
