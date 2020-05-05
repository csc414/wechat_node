const fs = require("fs");
const iconv = require('iconv-lite');

const argv = process.argv;
let columnIndex = [];
if(argv.length > 2) {
    columnIndex = eval(argv[2]);
}

let columnCount = undefined;
if(argv.length > 3) {
    columnCount = parseInt(argv[3]);
}

let keys = {};

function getKey(columns) {
    let key = '';
    columnIndex.forEach(i => {
        key += columns[i];
    });
    return key;
}

function hasKey(key) {
    return keys.hasOwnProperty(key);
}

function setKey(key) {
    keys[key] = true;
}

const newLines = [];
let files = fs.readdirSync('combine');
files.forEach(file => {
    let buffer = Buffer.from(fs.readFileSync(`combine/${file}`, { encoding: 'binary' }), 'binary');
    let text = iconv.decode(buffer, 'GBK');
    let lines = text.split('\r\n');
    lines.forEach(line => {
        if(!line.trim()) {
            return;
        }
        const columns = line.split(',', columnCount);
        if(columnCount && columns.length != columnCount) {
            return;
        }

        let key = getKey(columns);
        if(!hasKey(key)) {
            newLines.push(line);
            setKey(key);
        }
    });
});

const name = `合并_${new Date().getTime()}.csv`;
fs.writeFileSync(name, iconv.encode(newLines.join('\r\n'), 'GBK'), 'binary');
console.log(`合并成功, 文件名: ${name}`);