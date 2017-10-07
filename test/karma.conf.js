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
      'test/index.js': ['webpack', 'coverage']
    },
    coverageReporter: {
      // specify a common output directory
      dir: '/coverage',
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
