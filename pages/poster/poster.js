const money = require('../../utils/money.js')

const QUOTES = [
  '你摸鱼的每一秒，都是白送给公司的钱',
  '现在偷的懒，就是将来少赚的钱',
  '牛马耕地，耕的是自己的未来',
  '你的每一秒都明码标价，别让它溜走'
]

Page({
  data: {
    posterImg: ''
  },

  onReady() {
    this.draw()
  },

  draw() {
    const r = money.calc(money.getConfig())
    const perSec = r.perSec.toFixed(4)
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
    const W = 375
    const H = 500
    const ctx = wx.createCanvasContext('poster', this)

    // 背景
    ctx.setFillStyle('#14100A')
    ctx.fillRect(0, 0, W, H)
    // 顶部金条
    ctx.setFillStyle('#FFD666')
    ctx.fillRect(0, 0, W, 6)
    // 边框
    ctx.setStrokeStyle('#FFD666')
    ctx.setLineWidth(2)
    ctx.strokeRect(12, 12, W - 24, H - 24)

    // 标题
    ctx.setTextAlign('center')
    ctx.setFillStyle('#FFD666')
    ctx.setFontSize(22)
    ctx.fillText('我的每一秒都在赚钱', W / 2, 70)

    // 大数字
    ctx.setFontSize(52)
    ctx.fillText('¥ ' + perSec, W / 2, 142)
    ctx.setFontSize(16)
    ctx.setFillStyle('#E0C060')
    ctx.fillText('元 / 秒', W / 2, 170)

    // 分隔线
    ctx.setStrokeStyle('#4A3E16')
    ctx.setLineWidth(1)
    ctx.beginPath()
    ctx.moveTo(40, 198)
    ctx.lineTo(W - 40, 198)
    ctx.stroke()

    // 换算四行
    const rows = [
      ['1 分钟', '¥' + r.perMin.toFixed(2)],
      ['1 小时', '¥' + r.hourly.toFixed(2)],
      ['1 天', '¥' + r.daily.toFixed(2)],
      ['1 个月', '¥' + r.monthly.toFixed(0)]
    ]
    let y = 238
    ctx.setFontSize(18)
    rows.forEach(row => {
      ctx.setTextAlign('left')
      ctx.setFillStyle('#C0C0C5')
      ctx.fillText(row[0], 52, y)
      ctx.setTextAlign('right')
      ctx.setFillStyle('#FFE9A8')
      ctx.fillText(row[1], W - 52, y)
      y += 36
    })

    // 语录
    ctx.setTextAlign('center')
    ctx.setFillStyle('#8A8A8F')
    ctx.setFontSize(13)
    ctx.fillText('“' + quote + '”', W / 2, y + 24)

    // 底部
    ctx.setFillStyle('#FFD666')
    ctx.setFontSize(22)
    ctx.fillText('秒 薪', W / 2, H - 54)
    ctx.setFillStyle('#8A8A8F')
    ctx.setFontSize(12)
    ctx.fillText('算算你的一秒值多少钱', W / 2, H - 30)

    ctx.draw(false, () => {
      wx.canvasToTempFilePath({
        canvasId: 'poster',
        success: res => this.setData({ posterImg: res.tempFilePath }),
        fail: () => {}
      }, this)
    })
  },

  save() {
    const img = this.data.posterImg
    if (!img) {
      wx.showToast({ title: '海报生成中，稍等', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: img,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail: () => {
        wx.showToast({ title: '保存失败，请授权相册权限', icon: 'none' })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '我每秒赚 ¥' + money.calc(money.getConfig()).perSec.toFixed(4) + '，你呢？',
      path: '/pages/index/index'
    }
  }
})
