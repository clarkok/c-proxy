"use strict";

var GFWLIST_URL = 'http://autoproxy-gfwlist.googlecode.com/svn/trunk/gfwlist.txt';

var common = require('./common.js');
var http = require('http');
var url = require('url');

var config = common.get_config();

var SKELETON = [
  'var proxy = "PROXY ' + config.client + ':' + config.local_port + ';";',
  'var domain_patten = /(\\w+\\.){1,}(com|co|jp|tw|us|org|so|mil|ru|tv|xxx|fm|za|info|biz|net|ru|au|de|hk|io|is|li|uk|gov)/;',
  'var direct = "DIRECT;";',
  'function FindProxyForURL (url, host) {',
  '  url = url.match(domain_patten)[0]',
  '  while (url) {',
  '    if (domains[url])',
  '      return proxy;',
  '    url = url.match(/(?:\\w+\\.)(.*)/);',
  '    if (!url) break;',
  '    url = url[1];',
  '  }',
  '  return direct;',
  '}'
].join('\n');

var write_pac = function (domains, cb) {
  var fs = require('fs');
  var file = fs.openSync(common.PAC_PATH, 'w+');
  fs.writeSync(file, 'var domains = ' + JSON.stringify(domains) + ';\n');
  fs.writeSync(file, SKELETON);
  fs.closeSync(file);
  common.log('Updated Successfully');
  
  if (cb)
    cb(true);
};

var process_gfw_list = function (data, cb) {
  var original = new Buffer(data, 'base64').toString('ascii');

  var rules = original.split('\n');

  var domain_patten = /(\w+\.){1,}(com|co|jp|tw|us|org|so|mil|ru|tv|xxx|fm|za|info|biz|net|ru|au|de|hk|io|is|li|uk|gov)/;

  var domains = {};

  rules.map(function (r) {
    return r.trim();
  }).filter(function (r) {
    return r.length > 0 && r[0] != '!' && r[0] != '@';
  }).map(function (r) {
    var res = r.match(domain_patten);
    return res ? res[0] : null;
  }).filter(function (r) {
    return r && r.length;
  }).forEach(function (r) {
    domains[r] = 1;
  });

  write_pac(domains, cb);
};

exports.update = function (cb) {
  common.log('Updating PAC');

  http.request({
    hostname : '127.0.0.1',
    port : config.local_port,
    path : GFWLIST_URL,
    method : 'GET',
    headers : {
      Host : url.parse(GFWLIST_URL).host
    }
  }, function (res) {
    if (res.statusCode != 200)
      return cb(res);

    var data = new Buffer('');

    res.on('data', function (chunk) {
      data += chunk;
    });

    res.on('end', function () {
      return process_gfw_list(data, cb);
    });
  }).end();
}
