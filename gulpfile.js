const gulp = require('gulp');
const metalsmith = require('metalsmith');
const metadata = require('./metadata');

function uploadToS3() {
  return require('metalsmith-s3')({
    bucket: 'www.pugsqueezers.ca',
    action: 'write',
    region: 'us-west-2',
  });
}

function sass(env) {
  const isDev = env === 'dev';
  return require('metalsmith-sass')({
    sourceMap: isDev,
    sourceMapContents: isDev,
    sourceComments: isDev,
    outputDir: (originalPath) => originalPath.replace('scss', 'css'),
    outputStyle: isDev ? 'expanded' : 'compact',
  });
}

function layouts() {
  return require('metalsmith-layouts')({
    engine: 'mustache',
    directory: 'layouts',
    partials: 'partials',
    default: 'default.html',
    pattern: '*.html',
  });
}

function markdown() {
  return require('metalsmith-markdown')({
    gfm: true,
    tables: true,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: true,
  });
}

function baseBuild(env) {
  return metalsmith(__dirname)
    .metadata(metadata)
    .source('content')
    .destination('site')
    .clean(env !== 'dev')
    .use(markdown(env))
    .use(layouts(env))
    .use(sass(env))
    ;
}

function done(err) {
  if (err) throw err;
  console.log('Build completed.');
}

function buildLocal() {
  return baseBuild('dev')
    .build(done);
}

function deploy() {
  // add ability to specify the AWS creds to use.
  const env = 'prod';
  return baseBuild(env)
         .use(uploadToS3(env))
         .build(done);
}

gulp.task('deploy', deploy);
gulp.task('default', buildLocal);
