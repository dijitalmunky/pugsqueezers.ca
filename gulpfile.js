const gulp = require('gulp');
const metalsmith = require('metalsmith');
const excerpts = require('metalsmith-excerpts');
const metadata = require('./metadata');

const dirs = {
  layout: 'layouts',
  partials: 'partials',
  build: 'site',
  content: 'content',
  blog: 'content/posts',
};

const envs = {
  dev: {
    isDev: true,
    sassOutput: 'expanded',
  },
  prod: {
    isDev: false,
    sassOutput: 'compact',
  },
};

function permalinks() {
  return require('metalsmith-permalinks')({
    date: 'YYYY-MM-DD',
    linksets: [{
      match: { collection: 'posts' },
      pattern: 'blog/:publishDate/:title',
    }],
  });
}

function blogPosts() {
  return require('metalsmith-collections')({
    posts: {
      pattern: 'posts/**',
      sortBy: 'publishDate',
      reverse: true,
    },
  });
}

function browserSync() {
  return require('metalsmith-browser-sync')({
    server: dirs.build,
    files: [`${dirs.content}/**/*`, `${dirs.layout}/**/*`, `${dirs.partials}/**/*`],
    logFileChanges: true,
  });
}

function uploadToS3() {
  return require('metalsmith-s3')({
    bucket: 'www.pugsqueezers.ca',
    action: 'write',
    region: 'us-west-2',
  });
}

function sass(env) {
  return require('metalsmith-sass')({
    sourceMap: env.isDev,
    sourceMapContents: env.isDev,
    sourceComments: env.isDev,
    outputDir: (originalPath) => originalPath.replace('scss', 'css'),
    outputStyle: env.sassOutput,
  });
}

function layouts() {
  return require('metalsmith-layouts')({
    engine: 'mustache',
    directory: dirs.layout,
    partials: dirs.partials,
    default: 'default.html',
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
    .source(dirs.content)
    .destination(dirs.build)
    .use(sass(env))
    .use(markdown(env))
    .use(excerpts())
    .use(blogPosts())
    .use(permalinks())
    .use(layouts(env))
    ;
}

function done(err) {
  if (err) throw err;
}

function buildLocal() {
  return baseBuild(envs.dev)
    .build(done);
}

function watch() {
  return baseBuild(envs.dev)
    .use(browserSync())
    .build(done);
}

function deploy() {
  // add ability to specify the AWS creds to use.
  const env = envs.prod;
  return baseBuild(env)
         .use(uploadToS3(env))
         .build(done);
}

gulp.task('deploy', deploy);
gulp.task('watch', watch);
gulp.task('build', buildLocal);
gulp.task('default');
