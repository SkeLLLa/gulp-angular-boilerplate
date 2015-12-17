## Summary
A boilerplate using AngularJS, Browserify and SASS. It was built with usage of AngularJS best practices. Different logical parts of application are divided into separate directories (e.g. Services, Controllers, etc.). Also it built with Google's page speed optimization recomendations in mind, so all data is minified, compressed and production ready, as well as for development mode sourcemaps are included into files to simplify debuggin process.    

## Key features

- Gulp build system
- AngularJS, Angular UI router, MaterializeCss
- Frontend components throug bower
- Sass + SpriteSmith, autoprefixer for older browsers
- Browserify to provide CommonJS modules
- HTML, CSS, JS minification
- Lossy and lossless image optimization through Imagemin and it's plugins (mozjpeg2, zopflipng, etc.)
- Static gzip compression with zopfli algorithm (best compression)
- Source maps for CSS and JS files in development mode
- BrowserSync and watchers for updating application in browser as soon as code was updated
- Npm tasks for easy building/serving application 
- Cache busting plugin
- JS and Sass Codestyle check with JSCS and Sass Lint

## Usage 

1. Clone or download this repository as zip file and extract it into your folder
2. Run npm install insde it (this will also run bower install automatically)
3. Use either:
3.1. gulp tasks with `GULP_ENV=(production|development) and/or GULP_DEBUG=(true|false)` 
3.1.1. `gulp build` - to build project
3.1.2. `gulp watch` - to start browsersync
3.2. npm tasks:
3.2.1. `npm run build` - equivalent to `GULP_ENV=production GULP_DEBUG=false ./node_modules/.bin/gulp build`
3.2.2. `npm run build:dev` - equivalent to `GULP_ENV=development GULP_DEBUG=true ./node_modules/.bin/gulp build`
3.2.3. `npm run build:prod` - equivalent to `GULP_ENV=production GULP_DEBUG=false ./node_modules/.bin/gulp build`
3.2.4. `npm run watch:dev` - equivalent to `GULP_ENV=development GULP_DEBUG=true ./node_modules/.bin/gulp watch`
