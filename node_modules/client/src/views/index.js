export function configure(aurelia) {

  Promise.config({warnings:false})
  console.log = console.log.bind(console)

  aurelia.use
    .standardConfiguration()
    .plugin('aurelia-animator-css')
    .globalResources('client/src/resources/value-converters')

  aurelia.start().then(a => a.setRoot('client/src/views/routes'));
}
