/**
 * Created by m03geek on 8/3/15.
 */
'use strict';

var browserSync = require('browser-sync'),
	browserify = require('browserify'),
	ngAnnotate = require('browserify-ngannotate'),
	watchify = require('watchify'),
	source = require('vinyl-source-stream'),
	buffer = require('vinyl-buffer'),
	runSequence = require('run-sequence'),
	gulp = require('gulp'),
	$ = require('gulp-load-plugins')(),
	pJson = require('./package.json'),
	config = require('./gulpconf'),
	del = require('del'),
	path = require('path'),
	debowerify = require('debowerify'),
	ngAnnotate = require('browserify-ngannotate'),
	activeEnv = {                 //Default active environment
		type: 'prod',
		debug: true
	},
	isTaskEnabled = function (type, taskName) {
		return config[type] && config[type].actions && config[type].actions(taskName);
	},
	tasks = {
		build: {
			html: function (env) { // env: {type:'prod',debug:false}
				var taskType = 'html';
				return gulp.src(config.html.src(env), {base: config.dirs.app})
					.pipe($.changed(config.html.dst(env)))
					.pipe($.if(isTaskEnabled(taskType, 'version'),
						$.replace('@@version@@', pJson.version)))
					.pipe($.if(isTaskEnabled(taskType, 'preprocess'),
						$.preprocess({context: env})))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'min'),
						$.minifyHtml(config.modules.min.html)))
					.pipe(gulp.dest(config.html.dst(env)))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'gzip'),
						$.zopfli(config.modules.gzip)))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'gzip'),
						gulp.dest(config.html.dst(env))));
			},
			scss: function (env) {
				var taskType = 'scss';
				return gulp.src(config.scss.src(env), {base: path.join(config.dirs.app, 'scss')})
					.pipe($.sass(config.modules.compile.scss))
					.pipe($.if(isTaskEnabled('autoprefix', taskType),
						$.autoprefixer(config.modules.compile.autoprefix)
					))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled('min', taskType),
						$.minifyCss(config.modules.min.css)
					))
					.pipe(gulp.dest(config.scss.dst(env)))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled('gzip', taskType),
						$.zopfli(config.modules.gzip)
					))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled('gzip', taskType),
						gulp.dest(config.scss.dst(env))
					));
			},
			js: function (env) {
				var taskType = 'js';
				return browserify({
					entries: config.js.src(env),
					debug: true,
					cache: {},
					packageCache: {},
					fullPaths: true
				})
					.transform(debowerify)
					.transform(ngAnnotate)
					.transform('brfs')
					.transform('bulkify')
					.bundle()
					.pipe(source('main.js'))
					.pipe(buffer())
					.pipe($.debug())
					.pipe($.if(isTaskEnabled(taskType, 'version'),
						$.replace('@@version@@', pJson.version)))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'min'),
						$.streamify($.uglify(config.modules.min.js).on('error', $.util.log))))
					.pipe(gulp.dest(config.js.dst(env)))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'gzip'),
						$.zopfli(config.modules.gzip)))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'gzip'),
						gulp.dest(config.js.dst(env))));
			}
		},
		watch: {
			html: function (env) {
				return $.watch(config.html.watch(env), {name: 'html', base: config.dirs.app})
					.pipe($.tap(function (file) {
						var src;
						if (/^_\w+/.test(path.basename(file.path))) {
							//partial page
							src = config.html.src(env);
						} else {
							//single page
							src = file.path;
						}
						gulp.src(src)
							.pipe($.if(isTaskEnabled(taskType, 'version'),
								$.replace('@@version@@', pJson.version)))
							.pipe($.if(isTaskEnabled(taskType, 'preprocess'),
								$.preprocess({context: env})))
							.pipe(gulp.dest(config.html.dst(env)))
							.pipe($.debug({title: 'Reloading:'}))
							.pipe(browserSync.reload({stream: true}));
					}));
			},
			js: function (env) {
				var taskType = 'js',
					b = browserify({
						entries: config.js.watch(env),
						cache: {},
						packageCache: {},
						fullPaths: true
					}, watchify.args),
					bundler = watchify(b),
					rebundle = function () {
						return bundler
							.transform(debowerify)
							.transform(ngAnnotate)
							.transform('brfs')
							.transform('bulkify')
							.bundle().on('error', $.util.log)
							.pipe(source('main.js'))
							.pipe(buffer())
							.pipe($.if(isTaskEnabled(taskType, 'version'),
								$.replace('@@version@@', pJson.version)))
							.pipe(gulp.dest(config.js.dst(env)))
							.pipe(browserSync.reload({stream: true, once: true}));
					};
				bundler.on('update', function () {rebundle()}).on('time', function (time) {
					$.util.log('Rebundle', $.util.colors.cyan('\'js\''), 'in', $.util.colors.magenta(Math.round(time / 10) / 100 + ' s'));
				});
				return rebundle();
			}
		}
	};

gulp.task('test:dev', function (cb) {
	activeEnv.type = 'dev';
	runSequence('_build:js', cb);
	//gulp.start('_build:js');
});

gulp.task('_build:html', function () {
	return tasks.build.html(activeEnv);
});
gulp.task('_watch:html', ['_build:html'], function () {
	return tasks.watch.html(activeEnv);
});

gulp.task('_build:scss', function () {
	return tasks.build.scss(activeEnv);
});

gulp.task('_watch:scss', function () {
	//return tasks.build.scss(activeEnv);
});

gulp.task('_build:js', function () {
	return tasks.build.js(activeEnv);
});

gulp.task('_watch:js', function () {
	return tasks.watch.js(activeEnv);
});

gulp.task('_watch:all', ['_watch:html'], function() {});
