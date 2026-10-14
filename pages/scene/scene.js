const money = require('../../utils/money.js')

const SCENES = [
  { id: 'commute', icon: '🚇', name: '通勤路上', minutes: 40, tip: '上班路上，价值也在涨' },
  { id: 'coffee', icon: '☕', name: '喝杯咖啡', minutes: 5, tip: '放松一下，钱照赚' },
  { id: 'meeting', icon: '📋', name: '开个会', minutes: 60, tip: '会议时间，也在产生价值' },
  { id: 'slack', icon: '📱', name: '摸鱼一下', minutes: 10, tip: '摸鱼 10 分钟 = 少赚这么多' },
  { id: 'overtime', icon: '🌙', name: '加个班', minutes: 60, tip: '多干 1 小时，多赚这些' },
  { id: 'sleep', icon: '😴', name: '睡一觉', minutes: 480, tip: '你睡觉时，一天的价值也在累积' }
]

const DEFAULT_GOODS = [
  { icon: '🧋', name: '一杯奶茶', price: 18 },
  { icon: '🍜', name: '一顿外卖', price: 35 },
  { icon: '🎬', name: '一张电影票', price: 50 },
  { icon: '👟', name: '一双运动鞋', price: 500 },
  { icon: '📱', name: '一部手机', price: 5000 },
  { icon: '💻', name: '一台电脑', price: 8000 },
  { icon: '🚗', name: '一辆代步车', price: 100000 },
  { icon: '🏠', name: '一套小户型', price: 2000000 }
]

const GOODS_KEY = 'goods_list'

// 消费视角扎心语录（每 6 秒轮换一句）
const SLOGANS = [
  '你花的不是钱，是命',
  '每一笔消费，都在消耗你的上班时间',
  '冲动消费前，想想这要白干几天',
  '工资是拿时间换的，花的时候掂量掂量',
  '钱难赚，时间更难赚',
  '买之前先算算，别让血汗钱打水漂'
]

Page({
  data: {
    perMin: '0.0000',
    computed: [],
    goods: [],
    lifeEarn: '0',
    adding: false,
    newName: '',
    newPrice: '',
    slogan: ''
  },

  onShow() {
    this.refresh()
    this.startSloganTick()
  },
  onHide() {
    this.stopSloganTick()
  },
  onUnload() {
    this.stopSloganTick()
  },

  startSloganTick() {
    this.stopSloganTick()
    this._sloganTick = 0
    this.setData({ slogan: SLOGANS[0] })
    this.sloganTimer = setInterval(() => {
      this._sloganTick++
      this.setData({ slogan: SLOGANS[this._sloganTick % SLOGANS.length] })
    }, 6000)
  },
  stopSloganTick() {
    if (this.sloganTimer) {
      clearInterval(this.sloganTimer)
      this.sloganTimer = null
    }
  },

  refresh() {
    const r = money.calc(money.getConfig())
    const computed = SCENES.map(s => ({
      ...s,
      amount: money.fmt(r.perMin * s.minutes)
    }))
    const goods = this.loadGoods().map(g => ({
      ...g,
      work: money.costToWork(g.price, r.hourly)
    }))
    const lifeEarn = (r.monthly * 12 * 40 / 10000).toFixed(0)
    this.setData({ perMin: r.perMin.toFixed(4), computed, goods, lifeEarn })
  },

  loadGoods() {
    let goods = wx.getStorageSync(GOODS_KEY)
    if (!goods || !goods.length) {
      goods = DEFAULT_GOODS
      wx.setStorageSync(GOODS_KEY, goods)
    }
    return goods
  },

  toggleAdd() {
    this.setData({ adding: !this.data.adding })
  },
  onNameInput(e) {
    this.setData({ newName: e.detail.value })
  },
  onPriceInput(e) {
    this.setData({ newPrice: e.detail.value })
  },

  addGoods() {
    const name = (this.data.newName || '').trim()
    const price = Number(this.data.newPrice)
    if (!name || !price || price <= 0) {
      wx.showToast({ title: '填好名称和价格', icon: 'none' })
      return
    }
    const goods = this.loadGoods()
    goods.push({ icon: '🛍️', name, price })
    wx.setStorageSync(GOODS_KEY, goods)
    this.setData({ adding: false, newName: '', newPrice: '' })
    this.refresh()
  },

  removeGoods(e) {
    const name = e.currentTarget.dataset.name
    let goods = this.loadGoods()
    goods = goods.filter(g => g.name !== name)
    wx.setStorageSync(GOODS_KEY, goods)
    this.refresh()
  },

  onShareAppMessage() {
    return { title: '算算你的一秒值多少钱', path: '/pages/index/index' }
  }
})
