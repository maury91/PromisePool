/**
 * Created by maurizio carboni on 30/08/2016.
 */
import gulp from 'gulp'
import sourceMaps from 'gulp-sourcemaps'
import babel from 'gulp-babel'
import path from 'path'

const paths = {
  es6: [ 'src/**/*.js' ],
  json: [ 'src/**/*.json' ],
  es5: 'build',
  // Must be absolute or relative to source map
  sourceRoot: path.join(__dirname, 'src')
};
gulp.task('copy', () => gulp.src(paths.json).pipe(gulp.dest(paths.es5)))
gulp.task('babel', ['copy'], () => gulp.src(paths.es6)
    .pipe(sourceMaps.init())
    .pipe(babel())
    .pipe(sourceMaps.write('.', { sourceRoot: paths.sourceRoot }))
    .pipe(gulp.dest(paths.es5)))
gulp.task('watch', [ 'babel' ], () => {
  gulp.watch(paths.es6, [ 'babel' ])
})
gulp.task('default', [ 'watch' ])
