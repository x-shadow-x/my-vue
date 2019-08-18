const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const rollup = require('rollup').rollup;
const terser = require('terser');
const builds = require('./config.js').getAllBuilds();
let buildList = builds;

if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

if (process.argv[2]) {
    const filters = progress.argv[2].split(',');
    buildList = builds.filter(build => {
        return filters.some(filter => {
            return build.output.file.indexOf(filter) >= 0;
        });
    });
}

// 根据打包列表，调用 buildLib 分别打包不同的代码
function build(buildList) {
    const length = buildList.length;
    let currentIndex = 0;
    const next = () => {
        buildLib(buildList[currentIndex]).then(() => {
            if (currentIndex < length - 1) {
                currentIndex = currentIndex + 1;
                next();
            }
        }).catch(err => {
            console.error(err);
        });
    }
    next();
}

// 打包代码
function buildLib(config) {
    const output = config.output;
    const { file, banner } = output;
    const isProd = /prod/.test(file);
    return rollup(config).then(bundle => {
        return bundle.generate(output);
    }).then(({ output: [{ code }] }) => {
        if (isProd) {
            const minified = terser.minify(code, {
                toplevel: true,
                output: {
                    ascii_only: true
                },
                compress: {
                    pure_funcs: ['makeMap']
                }
            }).code;
            return write(file, `${banner}\n${minified}`, true);
        }
        return write(file, code);
    });
}

function write(dest, code, zip) {
    function report(extract) {
        console.log(
            ...color(path.relative(process.cwd(), dest)),
            getSize(code),
            extract || ''
        );
    }
    return new Promise((resolve, reject) => {
        fs.writeFile(dest, code, err => {

            if (err) {
                return reject(err);
            }
            if (zip) {
                zlib.gzip(code, (err, zipped) => {
                    if (err) {
                        return reject(err);
                    }
                    report(`(gzipped: ${getSize(zipped)})`);
                    resolve();
                });
            }
            report();
            resolve();
        });
    });
}

build(buildList);
// build([buildList[1]]);

function color(content, color = '\x1B[36m%s\x1B[0m') {
    return [color, content];
}

function getSize(code) {
    return `${(code.length / 1024).toFixed(2)}kb`;
}