const CDP = require('chrome-remote-interface');
const fs = require("fs");
const iconv = require('iconv-lite');
const path = require('path');

const argv = process.argv;
if(argv.length != 3) {
    console.error('必须输入文件名');
    return;
}
let fileName = argv[2];

function sleep(time) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, time)
    });
}

const getElementOffset = () => {
    var ques = document.querySelectorAll('div.chat-detail-item:first-child > .chat-item-box:not(.self) .ques');
    for (let i = 0; i < ques.length; i++) {
        var que = ques[i];
        if(que.innerText.indexOf('快递') != -1) {
            function getPosition(element) {
                if(element) {
                    var position = getPosition(element.offsetParent);
                    return { left: element.offsetLeft + position.left, top: element.offsetTop + position.top }
                }
                return { left: 0, top: 0 };
            }
            var position = getPosition(que);
            position.text = que.innerText.trimEnd('\n');
            return JSON.stringify(position);
        }
    }
    return '{}';
};

const getExistText = (text) => {
    var prev = null;
    var i = 0;
    for (var key in rawData.msgStore.msgMap) {
        var element = rawData.msgStore.msgMap[key];
        if(element.content == text && prev) {
            return prev.content;
        }
        prev = element;
        i++;
    }
    return '';
}

const getElementText = () => {
    var element = document.querySelector('div.chat-detail-item:last-child > .chat-item-box:not(.self) .robot-auto-reply');
    if(element) {
        return element.parentElement.children[0].innerText;
    }
    return '';
}

const hasRobot = () => {
    var element = document.querySelector('div.chat-detail-item:first-child > .chat-item-box:not(.self) .robot-auto-reply');
    if(element) {
        return true;
    }
    return false;
}

async function run() {
    let client;
    try {
        // connect to endpoint
        client = await CDP({ local: true });
        // extract domains
        const {Runtime, Page, DOM, Input} = client;
        await Page.enable();
        await DOM.enable();

        async function getExpressInfo(url, timeout = 5000) {
            await Page.navigate({url: url});
            await Page.loadEventFired();
            let obj = await Runtime.evaluate({ expression: 'rawData.store.initDataObj.mall.mallID' });
            await Page.navigate({url: `https://mobile.yangkeduo.com/chat_detail.html?mall_id=${obj.result.value}`});
            await Page.loadEventFired();
            let delay = 500;
            let totalDelay = delay;
            await sleep(delay);
            while(!(await Runtime.evaluate({ expression: `(${hasRobot})()` })).result.value) {
                if(totalDelay >= timeout) {
                    console.log(`未检测到机器人消息, 已超时: ${totalDelay} 毫秒, 放弃`);
                    return '';
                }
                await Page.reload();
                await Page.loadEventFired();
                delay += 500;
                totalDelay += delay;
                console.log(`未检测到机器人消息, 等待 ${delay} 毫秒`);
                await sleep(delay);
            }

            await sleep(1000);
            obj = await Runtime.evaluate({ expression: `(${getElementOffset})()` });
            let position = JSON.parse(obj.result.value);
            if(position.text) {
                obj = await Runtime.evaluate({ expression: `(${getExistText})('${position.text}')` });
                if(!obj.result.value) {
                    await Input.dispatchMouseEvent({ type: 'mousePressed', button: "left", x: position.left+10, y: position.top+10 });
                    await Input.dispatchMouseEvent({ type: 'mouseReleased', button: "left", x: position.left+10, y: position.top+10 });
                    await sleep(1000);
                    obj = await Runtime.evaluate({ expression: `(${getElementText})()` });
                }
                return obj.result.value;
            }
            return '';
        }
        let buffer = Buffer.from(fs.readFileSync(fileName, { encoding: 'binary' }), 'binary');
        let text = iconv.decode(buffer, 'GBK');//使用GBK解码
        let lines = text.split('\r\n');
        let newLines = ['店铺名称,宝贝链接,快递'];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const columns = line.split(',');
            if (columns.length >= 4) {
                let name = columns[2];
                let url = columns[3];
                console.log(`正在采集: ${i}.${name}`)
                let expressInfo = await getExpressInfo(url);
                let matchs = expressInfo.match(/(中通|圆通|申通|邮政|百世|韵达|天天|顺丰)/g);
                expressInfo = (matchs || []).join(',');
                console.log(`快递信息: ${expressInfo}`);
                newLines.push(`${name},${url},${expressInfo}`);
                console.log('-------------------------------------------------');
            }
        }
        
        fs.writeFileSync(`${path.basename(fileName, '.csv')}_快递信息.csv`, iconv.encode(newLines.join('\r\n'), 'GBK'), 'binary');
    } catch (err) {
        console.error(err);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

run();