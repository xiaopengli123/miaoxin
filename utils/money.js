// 工资换算工具

const DEFAULTS = { salary: 8000, type: 'month', workDays: 22, workHours: 8, startHour: 9 }

// 读取配置，缺省给默认值
function getConfig() {
  const saved = wx.getStorageSync('salary_config') || {}
  return Object.assign({}, DEFAULTS, saved)
}

// 根据配置算出各级时间价值（单位：元）
function calc(config) {
  const monthly = config.type === 'year' ? config.salary / 12 : config.salary
  const hourly = monthly / (config.workDays * config.workHours) // 时薪
  const perMin = hourly / 60 // 每分钟
  const perSec = perMin / 60 // 每秒
  const daily = monthly / config.workDays // 日薪
  return { monthly, hourly, perMin, perSec, daily }
}

// 当前时刻（小时，带小数）
function nowHours() {
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
}

// 下班时间：优先用配置的 endHour，否则按 上班时间 + 工作时长 推导
function getEndHour(config) {
  const start = Number(config.startHour || 9)
  if (config.endHour) {
    return Number(config.endHour)
  }
  return start + Number(config.workHours || 8)
}

// 今日工作状态：已赚、距下班、进度
function todayStatus(config) {
  const r = calc(config)
  const start = Number(config.startHour || 9)
  const end = getEndHour(config)
  const now = nowHours()
  // 用「时钟偏移」统一处理白班和夜班跨天（如 20:00 上班、次日 04:00 下班）
  const workLen = (end - start + 24) % 24 // 每班工作时长
  const offset = (now - start + 24) % 24 // 当前时刻相对上班的偏移（小时）

  let earned, remainHours, working, over, remainMoney
  if (offset < workLen) {
    // 工作中（含跨天凌晨）
    earned = offset * r.hourly
    remainHours = workLen - offset
    remainMoney = remainHours * r.hourly
    working = true
    over = false
  } else if (now < start) {
    // 还没上班（跨天时的休息时段也算，下一班是今晚 start）
    earned = 0
    remainHours = start - now
    remainMoney = r.daily
    working = false
    over = false
  } else {
    // 已下班
    earned = r.daily
    remainHours = 0
    remainMoney = 0
    working = false
    over = true
  }
  const progress = r.daily > 0
    ? Math.max(0, Math.min(100, Math.round((earned / r.daily) * 100)))
    : 0
  return {
    earned,
    remainHours,
    remainMoney,
    working,
    over,
    progress
  }
}

// 一个价格 = 你工作多久（按 8 小时工作日折算）
function costToWork(price, hourly) {
  if (!hourly || hourly <= 0) {
    return '—'
  }
  const hours = price / hourly
  if (hours < 1) {
    return Math.max(1, Math.round(hours * 60)) + ' 分钟'
  }
  if (hours < 8) {
    return hours.toFixed(1) + ' 小时'
  }
  const days = hours / 8
  if (days < 250) {
    return days.toFixed(1) + ' 个工作日'
  }
  return (days / 250).toFixed(1) + ' 年'
}

// 金额格式化，保留两位小数
function fmt(n) {
  return Number(n).toFixed(2)
}

module.exports = { getConfig, calc, todayStatus, costToWork, nowHours, fmt, getEndHour }
