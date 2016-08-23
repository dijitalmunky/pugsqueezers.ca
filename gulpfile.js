const metadata = require('./metadata');
const metalsmith = require('metalsmith');
const excerpts = require('metalsmith-excerpts');
const gulp = require('gulp');
const sasslint = require('gulp-sass-lint');
const mdlint = require('gulp-remark-lint-dko');
const jslint = require('gulp-eslint');
const jsonlint = require('gulp-jsonlint');
const bootlint = require('gulp-bootlint');
const del = require('del');
const Handlebars = require('handlebars');
const HandlebarsIntl = require('handlebars-intl');

// register the helpers w/ Handlebars
HandlebarsIntl.registerWith(Handlebars);

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
      match: {
        collection: 'posts',
      },
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
    engine: 'handlebars',
    directory: dirs.layout,
    partials: dirs.partials,
    pattern: ['**/*.md', '**/*.hbs', '**/*.html'],
    rename: true,
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
    .use(layouts(env));
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

function clean() {
  return del([
    // here we use a globbing pattern to match everything inside the `mobile` folder
    dirs.build,
  ]);
}

function sassLint() {
  return gulp.src([
    '*.s+(a|c)ss',
    `${dirs.content}/**/*.s+(a|c)ss`,
    `${dirs.partials}/**/*.s+(a|c)ss`,
    `${dirs.layout}/**/*.s+(a|c)ss`,
  ]).pipe(sasslint())
    .pipe(sasslint.format())
    .pipe(sasslint.failOnError());
}

function jsonLint() {
  return gulp.src([
    '*.json',
    `${dirs.content}/**/*.json`,
    `${dirs.partials}/**/*.json`,
    `${dirs.layout}/**/*.json`,
  ]).pipe(jsonlint())
    .pipe(jsonlint.reporter())
    .pipe(jsonlint.failOnError());
}

function jsLint() {
  return gulp.src([
    '*.js',
    `${dirs.content}/**/*.js`,
    `${dirs.partials}/**/*.js`,
    `${dirs.layout}/**/*.js`,
  ]).pipe(jslint())
    .pipe(jslint.format())
    .pipe(jslint.failAfterError());
}

function mdLint() {
  return gulp.src([
    '*.md',
    `${dirs.content}/**/*.md`,
    `${dirs.partials}/**/*.md`,
    `${dirs.layout}/**/*.md`,
  ]).pipe(mdlint())
    .pipe(mdlint.report());
}

function htmlLint() {
  return gulp.src([
    '*.html',
    `${dirs.content}/**/*.html`,
// temporarily disabled because html-lint errors on these because they are not full html files
//    `${dirs.partials}/**/*.html`,
    `${dirs.layout}/**/*.html`,
  ]).pipe(bootlint());
}

gulp.task('clean', clean);
gulp.task('deploy', deploy);
gulp.task('watch', watch);
gulp.task('build', buildLocal);

gulp.task('sass-lint', sassLint);
gulp.task('js-lint', jsLint);
gulp.task('json-lint', jsonLint);
gulp.task('md-lint', mdLint);
gulp.task('html-lint', htmlLint);

gulp.task('lint', ['sass-lint', 'js-lint', 'json-lint', 'md-lint', 'html-lint']);
gulp.task('default', ['clean', 'lint'], buildLocal);
