module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/dominio/**/*.js',
    'src/api/**/*.js',
    'src/datos/**/*.js'
  ],
  coverageThreshold: {
    global: { statements: 70, branches: 70, functions: 70, lines: 70 }
  },
  coverageReporters: ['text-summary', 'json-summary']
};
