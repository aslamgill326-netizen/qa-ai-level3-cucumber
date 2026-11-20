module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    requireModule: ['ts-node/register'],
    require: ['src/support/world.ts', 'src/support/hooks.ts', 'src/steps/**/*.ts'],
    format: ['progress', 'json:reports/cucumber/results.json', 'html:reports/cucumber/cucumber.html'],
    formatOptions: { snippetInterface: 'async-await' },
    parallel: 0,
    retry: 0,
    publishQuiet: true,
    worldParameters: { baseURL: process.env.BASE_URL || 'https://automationexercise.com' },
  },
};
