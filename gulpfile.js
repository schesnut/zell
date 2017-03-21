var gulp = require('gulp');
var sass = require('gulp-sass');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var browserSync = require('browser-sync');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');
var spritesmith = require('gulp.spritesmith');
var gulpIf = require('gulp-if');
var nunjucksRender = require('gulp-nunjucks-render');
var data = require('gulp-data');
var fs = require('fs');
var defaults = {
    path: 'app/templates/'
  };
var del = require('del');
var runSequence = require('run-sequence');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var scssLint = require('gulp-scss-lint');
var sassLint = require('gulp-sass-lint');
var Server = require('karma').Server;

gulp.task('sass', function() {
        'use strict';
        return gulp.src('app/scss/**/*.scss')
        .pipe(customPlumber('Error Running Sass'))
        .pipe(sourcemaps.init())
        .pipe(sass({
            precision: 2, // Sets precision to 2
            // includes bower_components as a import location
            includePaths: ['app/bower_components']
          }))
        // Compiles Sass to CSS with gulp-sass
        .pipe(autoprefixer({
            browsers: ['> 1%', 'last 2 versions', 'Firefox ESR', 'Opera 12.1', 'ie 9']
          }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('app/css'))
        .pipe(browserSync.reload({
            stream: true
          }));
      });

gulp.task('watch-js', ['lint:js'], browserSync.reload);

gulp.task('watch', function() {
    'use strict';
    gulp.watch('app/scss/**/*.scss', ['sass', 'lint:sass']);
    gulp.watch('app/js/**/*.js', ['watch-js']);
    // Reloads the browser when a HTML file is saved
    gulp.watch('app/*.html', browserSync.reload);
    // Other watchers
    gulp.watch([
        'app/pages/**/*.+(html|nunjucks)',
        'app/templates/**/*',
        'app/data.json'
    ], ['nunjucks']);
  });

function customPlumber(errTitle) {
  'use strict';
  return plumber({
        errorHandler: notify.onError({
            // Customizing error title
            title: errTitle || 'Error running Gulp',
            message: 'Error: <%= error.message %>',
            sound: 'submarine'
          })
      });
}

gulp.task('browserSync', function() {
    'use strict';
    browserSync({
        /*proxy: 'cheesehost:80',*/
        browser: ['google chrome', 'firefox', 'safari'],
        server: {
            baseDir: 'app'
          }
      });
  });

gulp.task('sprites', function() {
    'use strict';
    gulp.src('app/images/sprites/**/*')
        .pipe(spritesmith({
            cssName: '_sprites.scss',
            imgName: 'sprites.png',
            imgPath: '../images/sprites.png',
            retinaSrcFilter: 'app/images/sprites/*@2x.png',
            retinaImgName: 'sprites@2x.png',
            retinaImgPath: '../images/sprites@2x.png'
          }))
        .pipe(gulpIf('*.png', gulp.dest('app/images')))
        .pipe(gulpIf('*.scss', gulp.dest('app/scss')));
  });

gulp.task('nunjucks', function() {
        'use strict';
        // Gets .html and .nunjucks files in pages
        return gulp.src('app/pages/**/*.+(html|nunjucks)')
        .pipe(customPlumber('Error Running Nunjucks'))
        // Adding data to Nunjucks
        .pipe(data(function() {
            return JSON.parse(fs.readFileSync('./app/data.json'));
          }))
        // Renders template with nunjucks
        .pipe(nunjucksRender(defaults))
        // output files in app folder
        .pipe(gulp.dest('app'))
        // rest of nunjucks task
        .pipe(browserSync.reload({
            stream: true
          }));
      });

gulp.task('clean:dev', function() {
    'use strict';
    return del.sync([
        'app/css',
        // 'app/*.html'
    ]);
  });

// Consolidated dev phase task
gulp.task('default', function(callback) {
    'use strict';
    runSequence('clean:dev', ['sprites', 'lint:js', 'lint:sass'], ['sass', 'nunjucks'], ['browserSync', 'watch'],
        callback
    );
  });

gulp.task('lint:js', function() {
        'use strict';
        return gulp.src('app/js/**/*.js')
        // Catching errors with customPlumber
        .pipe(customPlumber('JSHint Error'))
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        // Adding JSCS to lint:js task
        .pipe(jshint.reporter('fail', {
            ignoreWarning: true,
            ignoreInfo: true
          }))
        .pipe(jscs({
            // Fix errors
            fix: true,
            // This is needed to make fix work
            configPath: '.jscsrc'
          }))
        // Overwrite source files
        .pipe(gulp.dest('app/js'));
      });

gulp.task('lint:scss', function() {
    'use strict';
    return gulp.src('app/scss/**/*.scss')
        // Linting files with SCSSLint
        .pipe(scssLint({
          config: '.scss-lint.yml'
        }));
  });

gulp.task('lint:sass', function() {
    'use strict';
    return gulp.src('app/scss/**/*.scss')
        // Linting files with SassLint
        .pipe(sassLint({
            options: {
                formatter: 'stylish',
                'merge-default-rules': true
              },
            config: '.sass-lint.yml'
          }))

        .pipe(sassLint.format())
        .pipe(sassLint.failOnError());
  });

gulp.task('test', function(done) {
    'use strict';
    new Server({
        configFile: process.cwd() + '/karma.conf.js',
        singleRun: true
      }, done).start();
  });

gulp.task('dev-ci', function(callback) {
    runSequence(
        'clean:dev', ['sprites', 'lint:js', 'lint:scss'], ['sass', 'nunjucks'],
        callback
    );
})
