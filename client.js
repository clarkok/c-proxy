"use strict";

var common = require('./common.js');

var http = require('http');
var url = require('url');

var config = common.get_config();

// four en/decrypt functions created by four factory
var encrypt = common.Encryptor(config.algorithm, config.password);
var decrypt = common.Decryptor(config.algorithm, config.password);
var encrypt_buffer = common.BufferEncryptor(config.algorithm, config.password);
var decrypt_buffer = common.BufferDecryptor(config.algorithm, config.password);

// verification string is generated
var verification = encrypt(config.password);

// socket to connect with remote server
var socket = require('socket.io-client')('http://' + config.server + ':' + config.remote_port);

// all response are kept here, with a unique id as key
var request_pool = {};

socket.on('connect', function () {

  // verification succeed
  socket.on('ack', function () {
    common.log('Connected');

    // client scoping counter
    var id = 0;

    socket.on('res-stat', function (data) {
      var headers = JSON.parse(decrypt(data.h));
      request_pool[data.id].writeHead(data.c, headers);
    });

    socket.on('res-data', function (data) {
      var chunk = decrypt_buffer(data.d);
      request_pool[data.id].write(chunk);
    });

    socket.on('res-end', function (data) {
      var id = data.id;
      request_pool[id].end();
      delete request_pool[id];
    });

    var server = http.createServer(function (req, res) {
      common.log(req.method + ':' + req.url);

      // store the reference of response
      request_pool[++id] = res;

      var parsed = url.parse(req.url);

      if (parsed.path == '/proxy.pac') {
        common.log('Request for pac');
        require('fs').readFile(common.PAC_PATH, function (err, data) {
          if (err) {
            res.writeHead(500, {});
            res.write(err);
            res.end();
          }
          else {
            res.writeHead(200, {});
            res.write(data);
            res.end();
          }
        });

        return;
      }

      var option = {
        hostname : parsed.hostname,
        port : parseInt(parsed.port, 10),
        method : req.method,
        path : parsed.path,
        headers : req.headers,
        auth : parsed.auth
      };

      socket.emit('req-new', {
        v : verification,
        id : id,
        o : encrypt(JSON.stringify(option))
      });

      req.on('data', function (ch) {
        socket.emit('req-data', {
          v : verification,
          id : id,
          d : encrypt_buffer(ch)
        });
      });

      req.on('end', function () {
        socket.emit('req-end', {
          v : verification,
          id : id
        })
      });
    }).listen(config.local_port);

    require('./pac.js').update();
  });

  // When refused by the remote server
  socket.on('rfs', function (data) {
    console.log(data.msg);
    process.exit(-1);
  });

  // Sending verification string to the remote server
  socket.emit('vrf', {
    v : verification
  });

  socket.on('reconnect_attempt', function () {
    common.log(' - Reconnecting');
  });

  socket.on('reconnect_error', function () {
    common.log(' -   failed');
  });

  socket.on('reconnect_failed', function () {
    common.log(' - Failed to connect to server, exiting');
    process.exit(-1);
  });
});
