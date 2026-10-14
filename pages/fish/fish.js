const money = require('../../utils/money.js')
const ad = require('../../utils/ad.js')

const STORAGE_KEY = 'fish_state'

// 摸鱼越久越危险：按分钟分级
function riskLevel(minutes) {
  if (minutes < 15) return { level: 'safe', label: '安全', desc: '领导没注意你，放心摸' }
  if (minutes < 30) return { level: 'warn', label: '警惕', desc: '领导可能随时经过，留意点' }
  if (minutes < 45) return { level: 'danger', label: '危险', desc: '领导开始频繁看过来，注意！' }
  if (minutes < 60) return { level: 'high', label: '高危', desc: '领导就在附近，赶紧切回工作！' }
  return { level: 'caught', label: '被抓边缘', desc: '🚨 已经摸太久了，随时可能被抓！' }
}

// 扎心语录库（按风险等级，轮换播放 = 时刻提醒）
const QUOTES = {
  safe: [
    '摸鱼要有度，领导不是摆设',
    '偷懒一时爽，一直偷懒…容易被抓',
    '你现在偷的懒，领导都看在眼里'
  ],
  warn: [
    '领导的目光，像探照灯一样扫过来',
    '你摸的鱼，领导都记在小本本上',
    '摸鱼超过 15 分钟，就有点危险了'
  ],
  danger: [
    '再不收手，年底绩效见分晓',
    '领导已经起身了，方向：你这边',
    '半个小时的偷懒，够领导起疑心了'
  ],
  high: [
    '别看了，快切回 Excel！',
    '身后有脚步声，还不快装忙？',
    '领导就在十米之内，手机收起来！'
  ],
  caught: [
    '🚨 你已经被领导锁定了！',
    '饭碗悬了，赶紧回去干活！',
    '摸鱼一时爽，绩效火葬场'
  ]
}

// 摸鱼等级称号（按累计偷懒时长）
const TITLES = [
  { max: 30 * 60, title: '🐣 摸鱼萌新' },
  { max: 60 * 60, title: '🐟 摸鱼学徒' },
  { max: 2 * 3600, title: '🦈 摸鱼老手' },
  { max: 3 * 3600, title: '🐙 摸鱼大师' },
  { max: Infinity, title: '👑 摸鱼之王（领导重点关照）' }
]

// 领导出没高危时段（小时制）
const HOT_ZONES = [
  { start: 9.0, end: 9.5, label: '晨会·领导巡视' },
  { start: 11.0, end: 11.5, label: '饭前·领导溜达' },
  { start: 14.0, end: 14.5, label: '午后·领导巡查' },
  { start: 16.5, end: 17.5, label: '下班前·领导突击' }
]

// 摸鱼代价参考商品
const REF_GOODS = { name: '奶茶', price: 18 }

// 休息提醒话术（每工作满 1 小时随机一条）
function restTip(hours) {
  const tips = [
    '已经工作 ' + hours + ' 小时了，起来上个厕所、倒杯水吧 🚻',
    '连续工作 ' + hours + ' 小时，伸个懒腰、活动活动筋骨 🤸',
    '工作 ' + hours + ' 小时了，去茶水间吹会牛皮、换个脑子 ☕',
    '盯屏 ' + hours + ' 小时，眼睛该休息了，望望远处放松一下 👀',
    '久坐 ' + hours + ' 小时，站起来走走，去窗边喘口气 🚶',
    '干了 ' + hours + ' 小时活，该摸 5 分钟鱼回回血了 🐟'
  ]
  return tips[Math.floor(Math.random() * tips.length)]
}

Page({
  data: {
    displayTime: '0 分钟',
    lostMoney: '0.00',
    lostGoods: '0',
    hourly: '0.00',
    riskLevel: 'safe',
    riskLabel: '安全',
    riskDesc: '还没开始偷懒',
    riskPercent: 0,
    fishTitle: '🐣 摸鱼萌新',
    quote: '点「开始偷懒」，看看你能摸多久不被发现',
    hotZone: '',
    running: false,
    working: false,
    workTime: '',
    workRemindIn: '',
    unlocked: false,
    workStatus: 'working'
  },

  onShow() {
    this._r = money.calc(money.getConfig())
    this.load()
    this.startTick()
    this.setData({ unlocked: !!wx.getStorageSync('fish_pro_unlocked') })
  },
  onHide() {
    this.stopTick()
  },
  onUnload() {
    this.stopTick()
  },

  todayStr() {
    const d = new Date()
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
  },
  nowHours() {
    const d = new Date()
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
  },
  workRange() {
    const cfg = money.getConfig()
    return { start: Number(cfg.startHour || 9), end: money.getEndHour(cfg) }
  },
  currentPhase() {
    const { start, end } = this.workRange()
    const nowH = this.nowHours()
    const workLen = (end - start + 24) % 24
    const offset = (nowH - start + 24) % 24
    if (offset < workLen) return 'working'
    if (nowH < start) return 'before'
    return 'after'
  },
  workEndTimeMs() {
    const { start, end } = this.workRange()
    const nowH = this.nowHours()
    const crossMidnight = end <= start // 夜班跨天
    const d = new Date()
    // 跨天且现在是晚上班段，下班在「明天」的 end 点
    if (crossMidnight && nowH >= start) {
      d.setDate(d.getDate() + 1)
    }
    d.setHours(Math.floor(end), Math.round((end - Math.floor(end)) * 60), 0, 0)
    return d.getTime()
  },

  freshState() {
    return {
      date: this.todayStr(),
      totalSeconds: 0,
      running: false,
      startTime: 0,
      working: false,
      workStartTime: 0,
      workTotalSeconds: 0,
      workRemindedHours: 0
    }
  },

  load() {
    const st = wx.getStorageSync(STORAGE_KEY) || {}
    if (st.date !== this.todayStr()) {
      // 新的一天，全部清零
      this._state = this.freshState()
    } else {
      this._state = {
        date: st.date,
        totalSeconds: st.totalSeconds || 0,
        running: !!st.running,
        startTime: st.startTime || 0,
        working: !!st.working,
        workStartTime: st.workStartTime || 0,
        workTotalSeconds: st.workTotalSeconds || 0,
        workRemindedHours: st.workRemindedHours || 0
      }
    }
    this._lastLevel = null
    this._quoteTick = 0
    this.render()
  },

  save() {
    wx.setStorageSync(STORAGE_KEY, {
      date: this._state.date,
      totalSeconds: this._state.totalSeconds,
      running: this._state.running,
      startTime: this._state.startTime,
      working: this._state.working,
      workStartTime: this._state.workStartTime,
      workTotalSeconds: this._state.workTotalSeconds,
      workRemindedHours: this._state.workRemindedHours
    })
  },

  // 本次摸鱼累计秒数（截断到今天下班时间）
  elapsedFish() {
    if (!this._state.running || !this._state.startTime) return 0
    const clamp = Math.min(Date.now(), this.workEndTimeMs())
    return Math.max(0, Math.floor((clamp - this._state.startTime) / 1000))
  },
  // 本次工作累计秒数（截断到今天下班时间）
  elapsedWork() {
    if (!this._state.working || !this._state.workStartTime) return 0
    const clamp = Math.min(Date.now(), this.workEndTimeMs())
    return Math.max(0, Math.floor((clamp - this._state.workStartTime) / 1000))
  },
  currentSeconds() {
    return this._state.totalSeconds + this.elapsedFish()
  },
  currentWorkSeconds() {
    return this._state.workTotalSeconds + this.elapsedWork()
  },

  render() {
    const phase = this.currentPhase()

    // 非上班时间：自动暂停进行中的计时
    if (phase !== 'working') {
      if (this._state.running) {
        this._state.totalSeconds += this.elapsedFish()
        this._state.running = false
        this._state.startTime = 0
        this.save()
      }
      if (this._state.working) {
        this._state.workTotalSeconds += this.elapsedWork()
        this._state.working = false
        this._state.workStartTime = 0
        this.save()
      }
    }

    const sec = this.currentSeconds()
    const minutes = sec / 60
    const hours = sec / 3600
    const lost = hours * this._r.hourly

    let rk, fishTitle, quote, hotZone = '', workTime = '', workRemindIn = '', percent = 0

    if (phase === 'before') {
      rk = { level: 'safe', label: '未上班', desc: '还没到上班时间，摸鱼机制暂停' }
      fishTitle = '⏸️ 未上班'
      quote = '还没到点，先去吃个早餐吧'
    } else if (phase === 'after') {
      rk = { level: 'safe', label: '已下班', desc: '已下班，摸鱼机制暂停，今天辛苦啦' }
      fishTitle = '🏁 已下班'
      quote = '下班了快走，别在工位逗留'
    } else {
      rk = riskLevel(minutes)
      percent = Math.min(100, Math.round((minutes / 60) * 100))

      // 摸鱼等级称号
      fishTitle = TITLES[0].title
      for (const t of TITLES) {
        if (sec < t.max) {
          fishTitle = t.title
          break
        }
      }

      // 扎心语录轮换（高危时换得更快）
      this._quoteTick++
      const quotes = QUOTES[rk.level]
      const interval = rk.level === 'high' || rk.level === 'caught' ? 10 : 20
      quote = sec > 0 ? quotes[Math.floor(this._quoteTick / interval) % quotes.length] : '点「开始偷懒」，看看你能摸多久不被发现'

      // 领导出没高危时段
      const nowH = this.nowHours()
      for (const z of HOT_ZONES) {
        if (nowH >= z.start && nowH < z.end) {
          hotZone = '⚠️ 现在正是「' + z.label + '」时段，领导最活跃！'
          break
        }
      }

      // 工作计时：每累计工作满 1 小时提醒休息
      if (this._state.working) {
        const workSec = this.currentWorkSeconds()
        workTime = this.formatTime(workSec)
        workRemindIn = this.formatTime(3600 - (workSec % 3600))
        const workHours = Math.floor(workSec / 3600)
        if (workHours > this._state.workRemindedHours) {
          this._state.workRemindedHours = workHours
          this.save()
          this.remindRest(workHours)
        }
      }
    }

    // 摸鱼风险升级提醒（仅上班中）
    if (phase === 'working' && this._lastLevel && this._lastLevel !== rk.level && rk.level !== 'safe') {
      wx.vibrateShort()
      wx.showToast({ title: '⚠️ 摸鱼风险升级：' + rk.label, icon: 'none', duration: 1500 })
    }
    this._lastLevel = rk.level

    this.setData({
      displayTime: this.formatTime(sec),
      lostMoney: lost.toFixed(2),
      lostGoods: String(Math.max(0, Math.floor(lost / REF_GOODS.price))),
      hourly: this._r.hourly.toFixed(2),
      riskLevel: rk.level,
      riskLabel: rk.label,
      riskDesc: rk.desc,
      riskPercent: percent,
      fishTitle,
      quote,
      hotZone,
      running: this._state.running,
      working: this._state.working,
      workTime,
      workRemindIn,
      workStatus: phase
    })
  },

  remindRest(hours) {
    wx.vibrateShort()
    wx.showModal({
      title: '⏰ 该摸鱼了',
      content: restTip(hours),
      confirmText: '这就去摸鱼',
      cancelText: '再干一会',
      success: res => {
        if (res.confirm) {
          this.startFish()
        }
      }
    })
  },

  formatTime(sec) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    if (h > 0) {
      return h + ' 小时 ' + m + ' 分'
    }
    return m + ' 分钟'
  },

  startFish() {
    const phase = this.currentPhase()
    if (phase !== 'working') {
      wx.showToast({ title: phase === 'after' ? '下班了，明天再摸' : '还没到上班时间', icon: 'none' })
      return
    }
    if (this._state.running) {
      return
    }
    if (this._state.working) {
      this._state.workTotalSeconds += this.elapsedWork()
      this._state.working = false
      this._state.workStartTime = 0
    }
    this._state.running = true
    this._state.startTime = Date.now()
    this.save()
    this.render()
  },

  stopFish() {
    if (!this._state.running) {
      return
    }
    this._state.totalSeconds += this.elapsedFish()
    this._state.running = false
    this._state.startTime = 0
    // 停止摸鱼 = 自动开始工作计时
    this._state.working = true
    this._state.workStartTime = Date.now()
    this.save()
    this.render()
  },

  addMinutes(e) {
    const phase = this.currentPhase()
    if (phase !== 'working') {
      wx.showToast({ title: phase === 'after' ? '下班了，不用再补记啦' : '还没上班，不能补记', icon: 'none' })
      return
    }
    const min = Number(e.currentTarget.dataset.min) || 0
    this._state.totalSeconds += min * 60
    this.save()
    this.render()
  },

  unlockPro() {
    ad.showRewarded(() => {
      this.setData({ unlocked: true })
      wx.setStorageSync('fish_pro_unlocked', true)
      wx.showToast({ title: '已解锁进阶秘籍', icon: 'success' })
    })
  },

  reset() {
    wx.showModal({
      title: '清空今日摸鱼记录？',
      content: '确定要把今天的摸鱼和工作记录都清零吗？',
      success: res => {
        if (res.confirm) {
          this._state = this.freshState()
          this.save()
          this.render()
        }
      }
    })
  },

  startTick() {
    this.stopTick()
    this.timer = setInterval(() => this.render(), 1000)
  },
  stopTick() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  onShareAppMessage() {
    return { title: '今天又偷懒了…', path: '/pages/index/index' }
  }
})
