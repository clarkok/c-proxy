"use strict";

var common = require('./common.js');

var DEFAULT_CONFIG = require('./default_config.json');

var config_file_path = process.argv.length > 2 ? process.argv[2] : null;
var config = config_file_path ? require(config_file_path) : {};

config.expand(DEFAULT_CONFIG);

var http = require('http');
var url = require('url');

var encrypt = common.Encryptor(config.algorithm, config.password);
var decrypt = common.Decryptor(config.algorithm, config.password);

var encrypt_buffer = common.BufferEncryptor(config.algorithm, config.password);
var decrypt_buffer = common.BufferDecryptor(config.algorithm, config.password);

var verification = encrypt(config.password);

var socket = require('socket.io-client')('http://' + config.server + ':' + config.remote_port);

var request_pool = {};

socket.on('connect', function () {
  socket.on('ack', function () {
    common.log('Connected');

    var id = 0;

    socket.on('res-stat', function (data) {
      var id = data.id;
      var code = data.c;
      var headers = JSON.parse(decrypt(data.h));

      request_pool[id].writeHead(code, headers);
    });

    socket.on('res-data', function (data) {
      var id = data.id;
      var chunk = decrypt_buffer(data.d);

      request_pool[id].write(chunk);
    });

    socket.on('res-end', function (data) {
      var id = data.id;

      request_pool[id].end();

      delete request_pool[id];
    });

    http.createServer(function (req, res) {
      common.log(req.method + ':' + req.url);

      request_pool[++id] = res;

      var parsed = url.parse(req.url);

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
  });
  socket.on('rfs', function (data) {
    console.log(data.msg);
    process.exit(-1);
  });
  socket.emit('vrf', {
    v : verification
  });
});
