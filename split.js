const fs = require("fs");
const iconv = require('iconv-lite');
const path = require('path');

const argv = process.argv;
if(argv.length < 3) {
    console.log('请输入分割的文件路径');
    return
}
let fileName = argv[2];
let name = path.basename(fileName, '.csv');
if(argv.length < 4) {
    console.log('请输入分割份数');
    return
}
let dir = path.dirname(fileName) + '\\';
if(dir == '.\\') {
    dir = '';
}

let count = parseInt(argv[3]);
let buffer = Buffer.from(fs.readFileSync(fileName, { encoding: 'binary' }), 'binary');
let text = iconv.decode(buffer, 'GBK');
let lines = text.trim().split('\r\n');
let total = lines.length - 1;
let splitCount = Math.floor(total / count);
let start = 1;
while(total >= splitCount) {
    total -= splitCount;
    if(total < splitCount) {
        splitCount += total;
    }
    let end = start + splitCount;
    let newLines = lines.slice(start, end);
    newLines.unshift([lines[0]]);
    let newName = `${dir}${name}_${start}-${end - 1}.csv`;
    fs.writeFileSync(newName, iconv.encode(newLines.join('\r\n'), 'GBK'), 'binary');
    console.log(`成功分割文件: ${newName}`);
    start = end;
}

// const name = `合并_${new Date().getTime()}.csv`;
// fs.writeFileSync(name, iconv.encode(newLines.join('\r\n'), 'GBK'), 'binary');
// console.log(`合并成功, 文件名: ${name}`);