/**
 * Created by m03geek on 8/3/15.
 */
'use strict';
var path = require('path'),
	modRewrite = require('connect-modrewrite'),
	bowerFiles = require('main-bower-files'),
	dirs = (function () {
		var workDir = __dirname,
			result = {
				work: workDir,
				tmp: path.join(workDir, '.tmp'),
				src: path.join(workDir, 'src'),
				bower: path.join(workDir, 'vendor'),
				build: path.join(workDir, 'build')
			};
		result.app = path.join(result.src, 'app');
		result.views = path.join(result.app, 'views');
		result.js = path.join(result.app, 'js');
		result.images = path.join(result.app, 'images');
		result.sprites = path.join(result.app, 'images', 'sprites');
		result.vendor = {
			js: path.join(result.app, 'vendor', 'js'),
			css: path.join(result.app, 'vendor', 'css')
		};
		result.scss = path.join(result.app, 'scss');
		return result;
	})(),
	copy = ['*.exe', '*.php', '*.ico', 'favicon*.*'],
	config = {
		dirs: dirs,
		server: {
			name: 'localhost',
			port: 3000,
			root: dirs.build
		},
		modules: {
			gzip: {
				format: 'gzip',                 // output format
				append: true,                   // appends .gz file extension if true
				zopfliOptions: {
					numiterations: 128,         // Maximum amount of times to rerun forward and backward pass to optimize LZ77 compression cost
					blocksplitting: true,       // If true, splits the data in multiple deflate blocks with optimal choice for the block boundaries
					blocksplittinglast: true,   // If true, chooses the optimal block split points only after doing the iterative LZ77 compression.
					blocksplittingmax: 15       // Maximum amount of blocks to split into
				}
			},
			min: {
				html: {
					empty: true,                // do not remove empty attributes
					cdata: false,               // do not strip CDATA from scripts
					comments: false,            // do not remove comments
					conditionals: true,         // do not remove conditional internet explorer comments
					spare: false,               // do not remove redundant attributes
					quotes: false,              // do not remove arbitrary quotes
					loose: false                // preserve one whitespace
				},
				css: {
					sourceMap: false,           // do not create source maps
					advanced: true,             // set to false to disable advanced optimizations - selector & property merging, reduction, etc.
					compatibility: '',          // enables compatibility mode, '' - IE9+, 'ie7' - IE 7, 'ie8' - IE 8
					keepSpecialComments: '0',   // * for keeping all (default), 1 for keeping first one only, 0 for removing all
					rebase: false               // set to false to skip URL rebasing
				},
				js: {
					mangle: true,
					compress: {
						sequences: true,        // join consecutive statemets with the "comma operator"
						properties: true,       // optimize property access: a["foo"] ? a.foo
						dead_code: true,        // discard unreachable code
						drop_debugger: true,    // discard "debugger" statements
						drop_console: true,     // discard "console.*" statements
						unsafe: false,          // some unsafe optimizations
						conditionals: true,     // optimize if-s and conditional expressions
						comparisons: true,      // optimize comparisons
						evaluate: true,         // evaluate constant expressions
						booleans: true,         // optimize boolean expressions
						loops: true,            // optimize loops
						unused: false,          // drop unused variables/functions
						hoist_funs: true,       // hoist function declarations
						hoist_vars: true,       // hoist variable declarations
						if_return: true,        // optimize if-s followed by return/continue
						join_vars: true,        // join var declarations
						cascade: false,         // try to cascade `right` into `left` in sequences
						side_effects: false,    // drop side-effect-free statements
						warnings: false         // warn about potentially
					}
				},
				images: {
					imagemin: {
						progressive: true,
						interlaced: true,
						optimizationLevel: 3,
						svgoPlugins: [{cleanupAttrs: true}]
					},
					mozjpeg: {
						quality: 90,        // Compression quality. Min and max are numbers in range 0 (worst) to 100 (perfect)
						fastcrush: false,   // Disable progressive scan optimization
						progressive: true   // Creates baseline JPEG file if disabled
					},
					jpegoptim: {
						progressive: true,  // Lossless conversion to progressive.
						max: 90             // Compression quality. Min and max are numbers in range 0 (worst) to 100 (perfect)
					},
					zopflipng: {
						'8bit': false,      // Convert 16-bit per channel image to 8-bit per channel
						more: false         // Compress more using more iterations (depending on file size)
					}
				}
			},
			compile: {
				spritesmith: {
					imgName: 'sprite.png',
					imgPath: path.relative(dirs.scss, path.join(dirs.sprites, 'sprite.png')),
					cssName: '_sprite.scss',
					padding: 50,
					algorithm: 'top-down'
				},
				scss: {
					includePaths: [
						require('node-normalize-scss').includePaths
					],       // An array of paths that libsass can look in to attempt to resolve your @import declarations.
					linefeed: 'lf',         // Used to determine whether to use cr, crlf, lf or lfcr sequence for line break.
					precision: 5,           // Used to determine how many digits after the decimal will be allowed.
					outputStyle: 'expanded'   // Determines the output format of the final CSS style. (nested, expanded, compact, compressed)
				},
				autoprefix: {
					browsers: [
						'ie >= 9',
						'ie_mob >= 10',
						'ff >= 30',
						'chrome >= 34',
						'safari >= 5',
						'opera >= 23',
						'ios >= 5',
						'android >= 4.1',
						'bb >= 10'
					]
				},
				combine: {
					beautify: false
				}
			},
			lint: {}
		},
		env: {
			type: {
				DEVELOPMENT: 'development',
				PRODUCTION: 'production'
			},
			debug: {
				ENABLED: true,
				DISABLED: false
			}
		},
		html: {
			src: function () {
				return [
					path.join(dirs.views, '**', '*.html'),
					'!' + path.join(dirs.views, '**', '_*.html'),
					path.join(dirs.app, '*.html'),
					'!' + path.join(dirs.app, '_*.html')
				];
			},
			dst: function () {
				return dirs.build;
			},
			watch: function () {
				return [
					path.join(dirs.views, '**', '*.html'),
					path.join(dirs.app, '*.html')
				];
			},
			actions: function (check) {
				var enabled = ['min', 'gzip', 'version', 'preprocess'];
				if (typeof check === 'undefined') {
					return enabled;
				} else {
					return enabled.indexOf(check) > -1;
				}
			}
		},
		scss: {
			src: function (env, listAll) {
				if (!listAll) {
					return [
						path.join(dirs.scss, '**', '*.scss'),
						'!' + path.join(dirs.scss, '**', '_*.scss')
					];
				} else {
					return [
						path.join(dirs.scss, '**', '*.scss'),
						'!' + path.join(dirs.scss, 'sprites', '**', '*.scss')
					];
				}
			},
			dst: function () {
				return path.join(dirs.build, 'css');
			},
			watch: function () {
				return [
					path.join(dirs.scss, '**', '*.scss')
				];
			},
			actions: function (check) {
				var enabled = ['min', 'gzip', 'autoprefix', 'combine'];
				if (typeof check === 'undefined') {
					return enabled;
				} else {
					return enabled.indexOf(check) > -1;
				}
			}
		},
		js: {
			src: function (env, listAll) {
				if (!listAll) {
					return [path.join(dirs.js, 'main.js')]
				} else {
					return [path.join(dirs.js, '**', '*.js')]
				}
			},
			dst: function (env, lintDst) {
				if (!lintDst) {
					return path.join(dirs.build, 'js');
				} else {
					return dirs.js;
				}
			},
			watch: function () {
				return [path.join(dirs.js, 'main.js')]
			},
			actions: function (check) {
				var enabled = ['min', 'gzip', 'version'];
				if (typeof check === 'undefined') {
					return enabled;
				} else {
					return enabled.indexOf(check) > -1;
				}
			}
		},
		images: {
			src: function (env, isSprite) {
				return isSprite ? [
					path.join(dirs.images, 'sprites', '**', '*.png')
				] : [
					path.join(dirs.images, '**', '*.{png,jpg,gif,svg}'),
					'!' + path.join(dirs.images, 'sprites', '**', '*')
				]
			},
			dst: function (env, isSprite) {
				return isSprite ? path.join(dirs.build, 'images', 'sprites') : path.join(dirs.build, 'images');
			},
			watch: function (env, isSprite) {
				return isSprite ? [
					path.join(dirs.images, 'sprites', '**', '*.png')
				] : [
					path.join(dirs.images, '**', '*'),
					'!' + path.join(dirs.images, 'sprites', '**', '*')
				]
			},
			actions: function (check) {
				var enabled = ['min', 'zopflipng'];
				if (typeof check === 'undefined') {
					return enabled;
				} else {
					return enabled.indexOf(check) > -1;
				}
			}
		},
		fonts: {
			src: function (env) {
				return bowerFiles(['**/*.woff2', '**/*.woff', '**/*.svg', '**/*.eot', '**/*.ttf']);
				//return path.join(dirs.bower, '**', '*.{woff,woff2,svg,eot}')
			},
			dst: function () {
				return path.join(dirs.build, 'font');
			},
			watch: function () {
				return bowerFiles(['**/*.woff2', '**/*.woff'])
			},
			actions: function (check) {
				var enabled = ['gzip'];
				if (typeof check === 'undefined') {
					return enabled;
				} else {
					return enabled.indexOf(check) > -1;
				}
			}
		},
		misc: {
			src: function (env) {
				var res = [];
				copy.forEach(function (ext) {
					res.push(path.join(dirs.src, '**', ext))
				});
				return res;
			},
			dst: function (env) {
				return dirs.build;
			},
			watch: function (env) {
				var res = [];
				copy.forEach(function (ext) {
					res.push(path.join(dirs.src, '**', ext))
				});
				return res;
			}
		}
	};

config.browserSync = {
	options: {
		port: config.server.port,
		ghostMode: {
			clicks: true,
			forms: true,
			scroll: false
		},
		server: {
			baseDir: config.server.root,
			middleware: [
				modRewrite([
					'!\\.[\\w?=&@]+$ /index.html [L]'
				])
			]
		}
	}
};

module.exports = config;
