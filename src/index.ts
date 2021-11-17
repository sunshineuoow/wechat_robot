#!/usr/bin/env -S node --no-warnings --loader ts-node/esm
import 'dotenv/config'
import {ScanStatus, WechatyBuilder, log} from 'wechaty';
import qrcodeTerminal from 'qrcode-terminal';
import dayjs from 'dayjs';
import axios from 'axios';
import type {Holiday} from './typings';
const schedule = require('node-schedule')

const groupName = ['我没有猫小分队'];

const bot = WechatyBuilder.build({
  name: 'huiji-wechat-bot',
  puppet: 'wechaty-puppet-wechat'
});

bot.on('scan', (qrcode, status) => {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    // const qrcodeImageUrl = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`
    qrcodeTerminal.generate(qrcode, { small: true, })
  }
});

bot.on('login', async (user) => {
  log.info('HuijiBot', '%s login', user);
  groupName.forEach(sendMessageToGroup);
});

await bot.start()

const sendMessageToGroup = async (group: string) => {
  schedule.scheduleJob('0 0 9 * * 1-5', async () => {
    const room = await bot.Room.find(group);
    const message = await getHolidayMessage();
    log.info('HuijiBot', `send message at ${dayjs().format('YYYY-MM-DD HH:mm:ss')} to ${group}`)
    await room?.say(message);
  })
}

const getHolidayMessage = async () => {
  const now = dayjs();
  const currentYearData = await getHolidayData(now.year())
    .then(list => list.filter(holiday => dayjs(holiday.date.toString()).isAfter(now)))
  const nextYearData = await getHolidayData(now.year()+1).then(list => list.sort((a, b) => a.date - b.date));
  const result = [...currentYearData, ...nextYearData].slice(0, 5);
  return `【摸鱼办公室】${now.month()+1}月${now.date()}日\n`+
    `早上好，摸鱼人，工作再累，一定不要忘记摸鱼哦\n`+
    `有事没事起身去茶水间去厕所去廊道走走，别老在工位上坐着\n`+
    `钱是老板的，命是自己的\n`+
    `${result.map(holiday => `距离${holiday.holiday_cn}还有${dayjs(holiday.date.toString()).diff(now, 'day')}天`).join('\n')}`
}

const getHolidayData = (year: number) => {
  type Resp = {code: string; msg: string; data: { list: Holiday[]}};
  return axios.get<Resp>('https://api.apihubs.cn/holiday/get', {params: {
      year: year,
      holiday: [22,15,44,55,77,88,66].join(','),
      holiday_legal: 1,
      cn: 1
    }}).then(resp => resp.data.data.list.filter(day => day.holiday_today === 1))
}