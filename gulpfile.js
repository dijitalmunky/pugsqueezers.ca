/* eslint-disable import/no-extraneous-dependencies, global-require */
const _ = require('lodash');
const path = require('path');
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
const argv = require('minimist')(process.argv.slice(2));

// register the helpers w/ Handlebars
HandlebarsIntl.registerWith(Handlebars);

const dirs = {
  layout: 'layouts',
  partials: 'partials',
  build: 'docs',
  content: 'content',
  blog: 'content/posts',
};

const bundles = {
  js: 'bundle.js',
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
    pattern: '',
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

function sass(env) {
  return require('metalsmith-sass')({
    sourceMap: env.isDev,
    sourceMapContents: env.isDev,
    sourceComments: env.isDev,
    sourceMapEmbed: env.isDev,
    outputDir: originalPath => originalPath.replace('scss', 'css'),
    outputStyle: env.sassOutput,
    includePaths: [path.join(__dirname, 'node_modules/bootstrap-sass/assets/stylesheets')],
    precision: 8,
  });
}

function layouts() {
  return require('metalsmith-layouts')({
    engine: 'handlebars',
    directory: dirs.layout,
    partials: dirs.partials,
    pattern: ['**/*.hbs', '**/*.html'],
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

function bundlejs(env) {
  return require('metalsmith-rollup')({
    entry: 'content/js/main.js',
    dest: path.join('js', bundles.js),
    sourceMap: env.isDev,
    plugins: [
      require('rollup-plugin-eslint')({
        exclude: 'thirdparty/js/**',
      }),
      require('rollup-plugin-babel')({
        exclude: 'node_modules/**',
      }),
      require('rollup-plugin-node-resolve')({
        // use "module" field for ES6 module if possible
        module: true, // Default: true

        // use "jsnext:main" if possible
        // – see https://github.com/rollup/rollup/wiki/jsnext:main
        jsnext: true,  // Default: false

        // use "main" field or index.js, even if it's not an ES6 module
        // (needs to be converted from CommonJS to ES6
        // – see https://github.com/rollup/rollup-plugin-commonjs
        main: true,  // Default: true

        // some package.json files have a `browser` field which
        // specifies alternative files to load for people bundling
        // for the browser. If that's you, use this option, otherwise
        // pkg.browser will be ignored
        browser: true,  // Default: false

        // not all files you want to resolve are .js files
        extensions: ['.js', '.json'],  // Default: ['.js']

        // whether to prefer built-in modules (e.g. `fs`, `path`) or
        // local ones with the same names
        preferBuiltins: true,  // Default: true
      }),
      require('rollup-plugin-commonjs')({}),
      require('rollup-plugin-uglify')({
        sourceMap: env.isDev,
      }),
    ],
  }, {
    ignoreSources: true,
  });
}

function rollupWorkaround() {
  return require('metalsmith-each')((file, filename) => {
    // workaround an issue in the metalsmith-rollup plugin where it creates the
    // source map in the wrong place.
    if (filename.endsWith('.map') && path.dirname(filename) === '.') {
      return path.join('js', path.basename(filename));
    }

    return filename;
  });
}

function removeExtraJsFiles() {
  return function rmFiles(mfiles, ms, done) {
    setImmediate(done);
    Object.keys(mfiles).forEach((filename) => {
      // workaround another issue in the rollup/metalsmith chain where it doesn't
      // remove imported files from the output directory
      if (filename.endsWith('.js') && path.dirname(filename) === 'js' && path.basename(filename) !== bundles.js) {
        delete mfiles[filename]; // eslint-disable-line no-param-reassign
      }
    });
  };
}

function baseBuild(env) {
  return metalsmith(__dirname)
    .metadata(metadata)
    .source(dirs.content)
    .destination(dirs.build)
    .clean(true)
    .use(sass(env))
    .use(bundlejs(env))
    .use(rollupWorkaround(env))
    .use(removeExtraJsFiles(env))
    .use(markdown(env))
    .use(excerpts(env))
    .use(blogPosts(env))
    .use(permalinks(env))
    .use(layouts(env));
}

function finish(err) {
  if (err) throw err;
}

function build(env) {
  return () => {
    if (!envs[env]) {
      throw new Error(`${env} is not recognized.  Valid environments are ${JSON.stringify(_.keys(envs))}`);
    }

    console.log(`Building for ${env}...`); // eslint-disable-line no-console

    return baseBuild(envs[env])
      .build(finish);
  };
}

function watch() {
  return baseBuild(envs.dev)
    .use(browserSync())
    .build(finish);
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
gulp.task('watch', watch);
gulp.task('build', build(argv.env || 'prod'));

gulp.task('sass-lint', sassLint);
gulp.task('js-lint', jsLint);
gulp.task('json-lint', jsonLint);
gulp.task('md-lint', mdLint);
gulp.task('html-lint', htmlLint);

gulp.task('lint', ['sass-lint', 'js-lint', 'json-lint', 'md-lint', 'html-lint']);
gulp.task('default', ['clean', 'lint'], build(argv.env || 'prod'));
