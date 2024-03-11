var gulp = require('gulp');
var concat = require('gulp-concat');
var terser = require('gulp-terser');

var jsCFLogsFiles = ['remove-pii.js', 'cf-logs.js'],
    jsWAFLogsFiles = ['remove-pii.js', 'waf-logs.js'],
    jsDest = './';

gulp.task('cf-logs', function() {
    return gulp.src(jsCFLogsFiles)
      .pipe(concat('cf-logs.min.js'))
      .pipe(terser())
      .pipe(gulp.dest(jsDest));
});

gulp.task('waf-logs', function() {
    return gulp.src(jsWAFLogsFiles)
      .pipe(concat('waf-logs.min.js'))
      .pipe(terser())
      .pipe(gulp.dest(jsDest));
});
