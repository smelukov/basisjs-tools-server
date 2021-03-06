var path = require('path');
var resolve = require('resolve');
var clap = require.main.require('clap');


function applyConfig(command, config, configPath){
  if (configPath)
    config.base = path.resolve(configPath, config.base || '');

  for (var name in config)
    if (command.hasOption(name))
      command.setOption(name, config[name]);

  ['ignore', 'rewrite'].forEach(function(name){
    if (config[name])
      command.values[name] = config[name];
  });

  return command;
}

function normOptions(options){
  options.base = path.normalize(path.resolve(options.base || '') + '/'); // [base]

  if (!options.cache)
  {
    options.readCache = false;
    options.resCache = false;
  }

  if (options.index)
    options.index = path.normalize(path.resolve(options.base, options.index) + '/');

  options.ignore = !Array.isArray(options.ignore) ? [] : options.ignore.map(function(p){
    return path.resolve(options.base, p);
  });

  var plugins = Array.isArray(options.plugins) ? options.plugins : [];
  options.plugins = plugins.map(function(config){
    if (!config)
      return false;

    if (typeof config == 'string')
      config = { name: config };
    else
      config.ignore = Array.isArray(config.ignore)
        ? config.ignore.map(function(fileMask){
            return options.configPath_ ? path.resolve(options.configPath_, fileMask) : fileMask;
          })
        : false;

    config.name = config.name || config.filename;
    config.filename = resolve.sync(config.filename || config.name, { basedir: process.cwd() });

    return config;
  }).filter(Boolean);

  return options;
}

module.exports = clap.create('server')
  .description('Launch dev-server')

  .init(function(){
    var config = this.context.config = this.root.getConfig(this.values);

    if (config)
    {
      applyConfig(this, config.data[this.name] || {}, config.path);
      if (config.data.plugins)
      {
        this.values.plugins = config.data.plugins;
        this.values.configPath_ = config.path;
      }
    }

    if (!config || !config.editor)
    {
      var globalConfig = this.root.globalConfig;
      if (globalConfig)
      {
        var editor = globalConfig.get('editor');
        if (editor)
          this.values.editor = editor;
      }
    }
  })

  .option('-b, --base <path>', 'base path for path resolving (current path by default)')
  .option('-p, --port <n>', 'listening port (default 8000)', function(value){
    return isNaN(value) ? 0 : Number(value);
  }, 8000)
  .option('-n, --no-sync', 'don\'t listen fs changes')
  .option('--inspect <url>', 'use inspecting script (url will be injected into page)')
  .option('-i, --index <relpath>', 'build index file on start which contains all .js, .css and .json files for path (relative to base)')
  .option('--no-gzip', 'disallow gzip for response')
  .option('--no-cache', 'don\'t use any cache')
  .option('--no-res-cache', 'don\'t use resource map for hot start')
  .option('--no-read-cache', 'don\'t use read file content')
  .option('--verbose', 'verbose log message output')
  .option('--dev', 'developer mode (use non build version of devtool client)')
  .option('--no-color', 'suppress color output')
  .option('-e, --editor <command>', 'specify command on openFile request')

  .action(function(){
    var config = this.context.config;

    if (this.values.verbose && config && config.filename)
      console.log('Config: ' + config.filename);

    require('./index.js').launch.call(this, this.values);
  });

module.exports.norm = normOptions;
