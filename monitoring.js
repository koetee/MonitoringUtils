
require('dotenv').config();
const pm2 = require('pm2');
const axios = require('axios');
const os = require('os');
const { exec } = require('child_process');
const { EmbedBuilder, WebhookClient } = require('discord.js');
const webhookUrl = process.env.webhook_uri;

const webhookClient = new WebhookClient({ url: webhookUrl });

let sentMessageId = null;
let selectedProcessIds = [3];

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

async function sendOrUpdateEmbedWebhookMessage(embed1, embed2) {
    try {
        if (sentMessageId) {
            const message = await webhookClient.editMessage(sentMessageId, {
                embeds: [embed1, embed2],
            });

            console.log('Уведомление обновлено');
        } else {
            const message = await webhookClient.send({
                embeds: [embed1, embed2],
            }).then((msg) => {
                sentMessageId = msg.id
                console.log(`Уведомление отправлено ${sentMessageId}`);
            });

        }
    } catch (error) {
        console.error('Ошибка при отправке или обновлении уведомления', error);
    }
}

function getBotStatus() {
    return new Promise((resolve, reject) => {
        pm2.list((err, list) => {
            if (err) {
                reject(err);
                return;
            }

            const botStatus = list.filter(bot => selectedProcessIds.includes(bot.pm_id)).map(bot => ({
                name: bot.name,
                pid: bot.pid,
                memory: `${(bot.monit.memory / 1024 / 1024).toFixed(2)} MB`,
                cpu: bot.monit.cpu,
                restarts: bot.pm2_env.restart_time,
            }));

            resolve(botStatus);
        });
    });
}
async function getServerInfo() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);

    const cpuUsagePercent = await executeCommand('top -bn1 | grep "Cpu(s)" | \
    sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | \
    awk \'{print 100 - $1"%"}\'');

    const diskUsage = await executeCommand('df -h /');
    const diskUsageLines = diskUsage.split('\n');
    const diskUsageValues = diskUsageLines[1].split(/\s+/);

    const totalDiskSpace = diskUsageValues[1];
    const usedDiskSpace = diskUsageValues[2];
    const freeDiskSpace = diskUsageValues[3];
    const diskUsagePercent = diskUsageValues[4];

    const serverUptime = os.uptime();
    const serverLoadAvg = os.loadavg();

    const currentUser = os.userInfo();

    return {
        memoryUsage: `${memoryUsagePercent}% (${(usedMemory / 1024 / 1024).toFixed(2)} MB used)`,
        cpuUsage: `${100 - parseFloat(cpuUsagePercent)}%`,
        diskUsage: `${diskUsagePercent} (${usedDiskSpace} used, ${freeDiskSpace} free)`,

        uptime: `${(serverUptime / 3600).toFixed(2)} ч.`,
        loadAvg: serverLoadAvg.join(', '),
        currentUser: currentUser ? `🧑🏻‍💻 (UID: ${currentUser.uid})` : '❌  (UID: ---)',
    };
}


async function updateWebhookEvery3Minutes() {
    try {
        const botStatus = await getBotStatus();
        const serverMetrics = await getServerInfo();

        const osInfo = new EmbedBuilder()
            .setTitle('Информация о VDS/VPS')
            .addFields(
                { name: '🔒 Использование памяти', value: serverMetrics.memoryUsage, inline: true },
                { name: '💻 Использование CPU', value: serverMetrics.cpuUsage, inline: true },
                { name: '💽 Использование диска', value: serverMetrics.diskUsage, inline: true },
                { name: '⏲️ Время работы сервера', value: serverMetrics.uptime, inline: true },
                { name: '⚙️ Средняя нагрузка', value: serverMetrics.loadAvg, inline: true },
                { name: '👤 Текущий пользователь', value: serverMetrics.currentUser, inline: true },

            )
            .setColor(0x00ff00);
        const fields = botStatus.map(bot => ({
            name: bot.name,
            value: `
          **Память:** ${bot.memory}
          **CPU:** ${bot.cpu} %
          **Перезапусков:** ${bot.restarts}
        `,
            inline: true,
        }));

        const botInfo = {
            title: 'Состояние ботов',
            fields: fields,
            color: 0x00ff00, // Зеленый цвет
            timestamp: new Date().toISOString(),
            thumbnail: {
                url: 'https://cdn.dribbble.com/users/270533/screenshots/3582792/60glow.gif',
            },
        };


        await sendOrUpdateEmbedWebhookMessage(osInfo, botInfo);
    } catch (error) {
        console.error('Ошибка', error);
    }
}


setInterval(updateWebhookEvery3Minutes, 3 * 60 * 1000);

updateWebhookEvery3Minutes();