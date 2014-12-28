# json-patch-api

Provides an express middleware for a JSON store that supports real-time client updates using JSON-patch"

[![build status](https://secure.travis-ci.org/allain/json-patch-api.png)](http://travis-ci.org/allain/json-patch-api)

## Installation

This module is installed via npm:

``` bash
$ npm install json-patch-api
```

## Basic Usage

``` js
var jsonPatchApi = require('json-patch-api');

var app = express();
var io = require('socket.io')(server);

app.use('/api', require('json-patch-api')(io));

```

## Middleware Routes

``` HTTP
PUT /api/NAME
```
Stores whatever application/json payload you send it and replaces the current document and returns JSON-PATCH commands that are needed to update the document.

```
GET /api/NAME
```
Returns the current JSON document stored at the api endpoint. And a header `X-Last-Patched` with the epoch time at which the last patch was applied.

```
GET /api/NAME/patches?after=TIMESTAMP
```
Returns a JSON struct which represents a sequence of JSON-PATCH operations which, if repeated sequentially would yield the current state of the document given a snapshot from time TIMESTAMP.

```
POST /api/NAME/patches
```
With a JSON-Patch payload will apply the patch to the current endpoint's state and broadcast it to all listening clients.

## Clients
