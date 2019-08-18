const path = require('path');
const buble = require('rollup-plugin-buble');
const replace = require('rollup-plugin-replace');

const banner = `/*emmmmmm~还没想好写什么*/`;

const resolve = filePath => {
    return path.resolve(__dirname, '../', filePath);
};

const builds = {
    'es-dev': {
        entry: resolve('src/index.js'),
        file: resolve('dist/es-dev.js'),
        format: 'es',
        env: 'development',
        banner
    }, 'es-prod': {
        entry: resolve('src/index.js'),
        file: resolve('dist/es-prod.js'),
        format: 'es',
        env: 'production',
        banner
    }, 'cjs-dev': {
        entry: resolve('src/index.js'),
        file: resolve('dist/cjs-dev.js'),
        format: 'cjs',
        env: 'development',
        banner
    }, 'cjs-prod': {
        entry: resolve('src/index.js'),
        file: resolve('dist/cjs-prod.js'),
        format: 'cjs',
        env: 'production',
        banner
    }, 'amd-dev': {
        entry: resolve('src/index.js'),
        file: resolve('dist/amd-dev.js'),
        format: 'amd',
        env: 'development',
        banner
    }, 'amd-prod': {
        entry: resolve('src/index.js'),
        file: resolve('dist/amd-prod.js'),
        format: 'amd',
        env: 'production',
        banner
    }, 'umd-dev': {
        entry: resolve('src/index.js'),
        file: resolve('dist/umd-dev.js'),
        format: 'umd',
        env: 'development',
        banner
    }, 'umd-prod': {
        entry: resolve('src/index.js'),
        file: resolve('dist/umd-prod.js'),
        format: 'umd',
        env: 'production',
        banner
    }, 'iife-dev': {
        entry: resolve('src/index.js'),
        file: resolve('dist/iife-dev.js'),
        format: 'iife',
        env: 'development',
        banner
    }, 'iife-prod': {
        entry: resolve('src/index.js'),
        file: resolve('dist/iife-prod.js'),
        format: 'iife',
        env: 'production',
        banner
    }
};

function genConfig(target) {
    if (builds[target]) {
        const opts = builds[target];
        const vars = {
            'process.env.NODE_ENV': opts.env
        };
        const config = {
            input: opts.entry,
            output: {
                file: opts.file,
                format: opts.format,
                sourceMap: true,
                name: opts.moduleName || 'Vue',
                banner: opts.banner,
            },
            external: opts.external || {},
            plugins: [
                replace(vars)
            ].concat(opts.plugins || [])
        };
        if (opts.transpile !== false) {
            config.plugins.push(buble())
        }

        return config;
    }
    return {};
}

if (process.env.TARGET) {
    module.exports = genConfig(process.env.TARGET)
} else {
    exports.getBuild = genConfig
    exports.getAllBuilds = () => Object.keys(builds).map(genConfig)
}