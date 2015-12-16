/**
 * Created by m03geek on 8/3/15.
 */
'use strict';

var browserSync = require('browser-sync').create(),
	browserify = require('browserify'),
	watchify = require('watchify'),
	source = require('vinyl-source-stream'),
	buffer = require('vinyl-buffer'),
	merge = require('merge-stream'),
	mpipe = require('multipipe'),
	runSequence = require('run-sequence'),
	gulp = require('gulp'),
	$ = require('gulp-load-plugins')(),
	pJson = require('./package.json'),
	config = require('./gulpconf'),
	del = require('del'),
	path = require('path'),
	extend = require('extend'),
	debowerify = require('debowerify'),
	ngAnnotate = require('browserify-ngannotate'),

	env = (function (env) {
		var e = {
			debug: Boolean(env.GULP_DEBUG),
			type: env.GULP_ENV || config.env.type.DEVELOPMENT
		};
		console.log('Environment:\n', e);
		return e;
	})(process.env),

	isTaskEnabled = function (type, taskName) {
		return config[type] && config[type].actions && config[type].actions(taskName);
	},
	tasks = {
		check: {
			js: function () {
				return gulp.src(config.js.src(env, true))
					.pipe($.jscs({fix: true}))
					.pipe($.jscs.reporter())
					.pipe(gulp.dest(config.js.dst(true)));
			},
			scss: function () {
				return gulp.src(config.scss.src(env, true))
						.pipe($.debug())
					.pipe($.sassLint())
					.pipe($.sassLint.format())
			}
		},
		build: {
			html: function () {
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
			scss: function () {
				var taskType = 'scss';
				return gulp.src(config.scss.src(env), {base: path.join(config.dirs.app, 'scss')})
					.pipe($.if(env.debug, $.sourcemaps.init()))
					.pipe($.sass(config.modules.compile.scss).on('error', $.sass.logError))
					.pipe($.if(env.debug, $.sourcemaps.write()))
					.pipe($.if(isTaskEnabled('autoprefix', taskType),
						$.autoprefixer(config.modules.compile.autoprefix)
					))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'min'),
						$.minifyCss(config.modules.min.css)
					))
					.pipe(gulp.dest(config.scss.dst(env)))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'gzip'),
						$.zopfli(config.modules.gzip)
					))
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'gzip'),
						gulp.dest(config.scss.dst(env))
					));
			},
			fonts: function () {
				var taskType = 'fonts';
				return gulp.src(config.fonts.src(env), {base: config.dirs.bower})
					.pipe($.flatten({includeParents: -1}))
					.pipe(gulp.dest(config.fonts.dst()))
					.pipe($.if((env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'gzip')), mpipe(
						$.zopfli(config.modules.gzip),
						gulp.dest(config.fonts.dst())
					)));
			},
			js: function () {
				var taskType = 'js';
				return browserify({
					entries: config.js.src(env),
					debug: env.debug,
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
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'gzip'), mpipe(
						$.zopfli(config.modules.gzip),
						gulp.dest(config.js.dst(env))
					)));
			},
			images: function () {
				var taskType = 'images',
					plugins = [],
					imageminOptions = config.modules.min.images.imagemin;
				if (isTaskEnabled(taskType, 'zopflipng')) {
					plugins.push(require('imagemin-zopfli')(config.modules.min.images.zopflipng));
				}
				if (isTaskEnabled(taskType, 'mozjpeg')) {
					plugins.push(require('imagemin-mozjpeg')(config.modules.min.images.mozjpeg));
				}
				if (isTaskEnabled(taskType, 'zopflipng')) {
					plugins.push(require('imagemin-jpegoptim')(config.modules.min.images.jpegoptim));
				}
				imageminOptions.plugins = plugins;
				return gulp.src(config.images.src(env, false), {base: path.join(config.dirs.app, 'images')})
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'min'),
						$.imagemin(imageminOptions)
					))
					.pipe(gulp.dest(config.images.dst(env, false)));

			},
			sprites: function () {
				var taskType = 'images',
					plugins = [],
					spriteData, cssStream, imgStream,
					imageminOptions = config.modules.min.images.imagemin;
				if (isTaskEnabled(taskType, 'zopflipng')) {
					plugins.push(require('imagemin-zopfli')(config.modules.min.images.zopflipng));
				}
				imageminOptions.plugins = plugins;

				spriteData = gulp.src(config.images.src(env, true))
					.pipe($.spritesmith(config.modules.compile.spritesmith));

				imgStream = spriteData.img
					.pipe(buffer())
					.pipe($.if(env.type === config.env.type.PRODUCTION && isTaskEnabled(taskType, 'min'),
						$.imagemin(imageminOptions)
					))
					.pipe(gulp.dest(path.join(config.dirs.build, 'images', 'sprites')));
				cssStream = spriteData.css.pipe(gulp.dest(path.join(config.dirs.scss, 'sprites')));

				return merge(imgStream, cssStream);
			},
			misc: function () {
				return gulp.src(config.misc.src(env), {base: path.join(config.dirs.src)})
					.pipe($.if(env.type === config.env.type.DEVELOPMENT, $.changed(config.misc.dst(env))))
					.pipe(gulp.dest(config.misc.dst(env)));
			}
		},
		watch: {
			html: function () {
				var taskType = 'html';
				return $.watch(config.html.watch(env), {name: 'html', base: config.dirs.app})
					.pipe($.tap(function (file) {
						var src;
						if (/^_\w+/.test(path.basename(file.path))) {
							src = config.html.src(env);
						} else {
							src = file.path;
						}
						gulp.src(src)
							.pipe($.if(isTaskEnabled(taskType, 'version'),
								$.replace('@@version@@', pJson.version)))
							.pipe($.if(isTaskEnabled(taskType, 'preprocess'),
								$.preprocess({context: env})))
							.pipe(gulp.dest(config.html.dst(env)))
							.pipe($.debug({title: 'Reloading:'}))
							.pipe(browserSync.stream({once: true}));
					}));
			},
			js: function () {
				var taskType = 'js',
					b = browserify({
						entries: config.js.watch(env),
						cache: {},
						debug: env.debug,
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
							.pipe(browserSync.stream({once: true}));
					};
				bundler.on('update', function () {
					rebundle()
				}).on('time', function (time) {
					$.util.log('Rebundle', $.util.colors.cyan('\'js\''), 'in', $.util.colors.magenta(Math.round(time / 10) / 100 + ' s'));
				});
				return rebundle();
			},
			sprite: function () {
				var spriteData, imgStream, cssStream;
				$.watch(config.images.watch(env, true), {name: 'sprite'})
					.pipe($.spritesmith(config.modules.compile.spritesmith));
				spriteData = gulp.src(config.images.src(env, true))
					.pipe($.spritesmith(config.modules.compile.spritesmith));
				imgStream = spriteData.img
					.pipe(buffer())
					.pipe(gulp.dest(path.join(config.dirs.build, 'images', 'sprites')));
				cssStream = spriteData.css.pipe(gulp.dest(path.join(config.dirs.scss, 'modules')));

				return merge(imgStream, cssStream).pipe($.debug({title: 'Reloading:'}))
					.pipe(browserSync.stream({once: true}));
			},
			scss: function () {
				return $.watch(config.scss.watch(env), {base: path.join(config.dirs.app, 'scss'), name: 'scss'})
					.pipe($.sass(config.modules.compile.scss).on('error', $.sass.logError))
					.pipe(gulp.dest(config.scss.dst(env)))
					.pipe($.debug({title: 'Reloading:'}))
					.pipe(browserSync.stream({once: true}));
			},
			images: function () {
				return $.watch(config.images.watch(env, false), {
						base: path.join(config.dirs.app, 'images'),
						name: 'images'
					})
					.pipe(gulp.dest(config.images.dst(env, false)))
					.pipe($.debug({title: 'Reloading:'}))
					.pipe(browserSync.stream({once: true}))
			},
			fonts: function () {
				return $.watch(config.fonts.src(env), {name: 'fonts', base: config.dirs.bower})
					.pipe($.flatten({includeParents: -1}))
					.pipe(gulp.dest(config.fonts.dst()))
					.pipe(browserSync.stream({once: true}));
			},
			misc: function () {
				return $.watch(config.misc.src(env), function () {
					gulp.start('_misc');
				});
			}
		}
	};

gulp.task('version:bump:fix', function () {               //Use this task if you fixed something
	gulp.src(['./bower.json', './package.json'])
		.pipe($.bump())
		.pipe(gulp.dest('./'));
});

gulp.task('version:bump:add', function () {               //Use this task if you've added something new
	gulp.src(['./bower.json', './package.json'])
		.pipe($.bump({type: 'minor'}))
		.pipe(gulp.dest('./'));
});

gulp.task('version:bump:breaking', function () {          //Use this task if you've added something not compatible with old code, api, etc.
	gulp.src(['./bower.json', './package.json'])
		.pipe($.bump({type: 'major'}))
		.pipe(gulp.dest('./'));
});

gulp.task('_browsersync', ['_build:sprite', '_build:html', '_build:scss', '_build:images', '_build:fonts'], function () {
	browserSync.init(config.browserSync.options);
});

gulp.task('_build:html', function () {
	return tasks.build.html();
});
gulp.task('_build:scss', ['_build:sprite'], function () {
	return tasks.build.scss();
});
gulp.task('_build:js', function () {
	return tasks.build.js();
});
gulp.task('_build:images', function () {
	return tasks.build.images();
});
gulp.task('_build:sprite', function () {
	return tasks.build.sprites();
});
gulp.task('_build:fonts', function () {
	return tasks.build.fonts();
});
gulp.task('_build:misc', function () {
	return tasks.build.misc();
});

gulp.task('_check:js', function () {
	return tasks.check.js();
});
gulp.task('_check:scss', function () {
	return tasks.check.scss();
});

gulp.task('_watch:html', ['_build:html'], function () {
	return tasks.watch.html();
});
gulp.task('_watch:scss', ['_build:scss', '_build:sprite'], function () {
	return tasks.watch.scss();
});
gulp.task('_watch:js', function () {
	return tasks.watch.js();
});
gulp.task('_watch:images', ['_build:images', '_build:sprite'], function () {
	return tasks.watch.images();
});
gulp.task('_watch:misc', ['_build:misc'], function () {
	return tasks.watch.misc();
});
gulp.task('_watch:sprite', function () {
	return tasks.watch.sprite();
});
gulp.task('_watch:fonts', ['_build:fonts'], function () {
	return tasks.watch.fonts();
});

gulp.task('_watch:all', ['_watch:html', '_watch:js', '_watch:images', '_watch:sprite', '_watch:scss', '_watch:fonts'], function () {
});

gulp.task('_build:all', ['_build:sprite', '_build:html', '_build:js', '_build:images', '_build:scss', '_build:fonts'], function () {
});

gulp.task('clean', function (callback) {
	del(config.dirs.build, {dot: true}, callback);
});
gulp.task('watch', ['_browsersync', '_watch:all']);
gulp.task('build', function(callback) {
	runSequence('_build:all', callback);
});
