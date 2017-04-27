var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');
var webpack = require('webpack');
var config = require('./webpack.config');
var s3Router = require('./s3Router');

var app = express();

var compiler = webpack(config);

app.use(require('webpack-dev-middleware')(compiler, {
    noInfo: true,
    publicPath: config.output.publicPath
}));
app.use(require('webpack-hot-middleware')(compiler));

app.use(function(req, res, next) {
  console.log(req.path);
  next();
});

app.use(bodyParser.json());

app.use('/s3', s3Router({
  bucket: 'com.weiksner.mp3',
  ACL: 'public-read'
}))

app.use('/', express.static(path.join(__dirname, '/build')));
app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, '/src/index.html'));
});

var port = process.env.PORT || 8080;

app.listen(port);
console.log('Listening on port', port);
