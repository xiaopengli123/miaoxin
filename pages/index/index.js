const money = require('../../utils/money.js')
const ad = require('../../utils/ad.js')

// 牛马视角扎心语录（每 8 秒轮换一句）
const TIPS = [
  '你摸鱼的每一秒，都是白送给公司的钱',
  '现在偷的懒，就是将来少赚的钱',
  '牛马耕地，耕的是自己的未来',
  '你的每一秒都明码标价，别让它溜走',
  '工资买断你白天，别把命也搭进去',
  '上班是给自己攒底气，不是给老板打工',
  '每一秒都在增值，摸鱼就是亏钱',
  '别人一秒钟赚的，可能顶你一分钟'
]

Page({
  data: {
    perSecStr: '0.0000',
    perMin: '0.00',
    hourly: '0.00',
    daily: '0.00',
    monthly: '0',
    earnedStr: '0.00',
    dailyStr: '0.00',
    remainStr: '—',
    remainMoney: '0.00',
    progress: 0,
    statusText: '',
    slogan: '',
    countdownLabel: '距下班还有',
    showAddTip: true,
    bannerAdId: ad.AD.banner
  },

  onShow() {
    this.refresh()
    this.startTick()
    this.checkAddTip()
  },
  onHide() {
    this.stopTick()
  },
  onUnload() {
    this.stopTick()
  },

  refresh() {
    const cfg = money.getConfig()
    this._cfg = cfg
    const r = money.calc(cfg)
    this.setData({
      perSecStr: r.perSec.toFixed(4),
      perMin: r.perMin.toFixed(2),
      hourly: r.hourly.toFixed(2),
      daily: r.daily.toFixed(2),
      monthly: r.monthly.toFixed(0),
      dailyStr: r.daily.toFixed(2)
    })
    this.renderStatus()
  },

  renderStatus() {
    const s = money.todayStatus(this._cfg)
    this._tipTick = (this._tipTick || 0) + 1
    const slogan = TIPS[Math.floor(this._tipTick / 8) % TIPS.length]
    const beforeWork = !s.working && !s.over // 还没到上班时间
    const start = Number(this._cfg.startHour || 9)
    this.setData({
      earnedStr: s.earned.toFixed(2),
      remainStr: beforeWork ? this.formatRemain(start - money.nowHours()) : this.formatRemain(s.remainHours),
      remainMoney: s.remainMoney.toFixed(2),
      progress: s.progress,
      statusText: s.over ? '已下班，今天辛苦了 🎉' : s.working ? '正在赚钱中 💰' : '还没到上班时间',
      countdownLabel: beforeWork ? '距上班还有' : '距下班还有',
      slogan
    })
  },

  formatRemain(hours) {
    if (hours <= 0) {
      return '0 分'
    }
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h > 0) {
      return h + ' 小时 ' + m + ' 分'
    }
    return m + ' 分钟'
  },

  startTick() {
    this.stopTick()
    this.timer = setInterval(() => this.renderStatus(), 1000)
  },
  stopTick() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  goScene() {
    wx.switchTab({ url: '/pages/scene/scene' })
  },
  goSetting() {
    wx.switchTab({ url: '/pages/setting/setting' })
  },
  goPoster() {
    wx.navigateTo({ url: '/pages/poster/poster' })
  },

  checkAddTip() {
    const dismissed = wx.getStorageSync('add_desktop_dismissed')
    this.setData({ showAddTip: !dismissed })
  },
  dismissAddTip() {
    wx.setStorageSync('add_desktop_dismissed', true)
    this.setData({ showAddTip: false })
  },

  onShareAppMessage() {
    return { title: '我每秒赚 ¥' + this.data.perSecStr + '，你呢？', path: '/pages/index/index' }
  }
})
