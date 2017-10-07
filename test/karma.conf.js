var path = require('path')
module.exports = function(config) {
  config.set({
    basePath: '../',
    files: [
      'test/index.js'
    ],
    browsers: ['PhantomJS'],
    frameworks: ['mocha', 'sinon-chai'],
    reporters: ['spec', 'coverage'],
    preprocessors: {
      'test/index.js': ['webpack']
    },
    webpack: {
      module: {
        rules: [
          // instrument only testing sources with Istanbul
          {
            test: /\.js$/,
            use: {
              loader: 'istanbul-instrumenter-loader'
            },
            include: path.resolve('lib/')
          }
        ]
      }
    },
    coverageReporter: {
      // specify a common output directory
      dir: 'coverage',
      subdir: function() {
        return '.'
      },
      reporters: [{
        type: 'lcov',
        file: 'lcov.info'
      }]
    }
  })
}
