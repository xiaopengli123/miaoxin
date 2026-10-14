const money = require('../../utils/money.js')

const RATING_KEY = 'app_rating'
const FEEDBACK_KEY = 'app_feedback_draft'

Page({
  data: {
    salary: 8000,
    type: 'month',
    workDays: 22,
    workHours: 8,
    startHour: 9,
    endHour: 18,
    rating: 0,
    ratingText: '',
    feedback: ''
  },

  onShow() {
    const cfg = money.getConfig()
    const start = Number(cfg.startHour || 9)
    const end = cfg.endHour ? Number(cfg.endHour) : start + Number(cfg.workHours || 8)
    this.setData({ ...cfg, endHour: end })
    this.loadRating()
    this.setData({ feedback: wx.getStorageSync(FEEDBACK_KEY) || '' })
  },

  loadRating() {
    const rating = wx.getStorageSync(RATING_KEY) || 0
    this.setData({
      rating,
      ratingText: rating > 0 ? '感谢你的 ' + rating + ' 星支持！' : ''
    })
  },

  rate(e) {
    const star = Number(e.currentTarget.dataset.star) || 0
    wx.setStorageSync(RATING_KEY, star)
    this.setData({
      rating: star,
      ratingText: '感谢你的 ' + star + ' 星支持！'
    })
  },

  onFeedbackInput(e) {
    this.setData({ feedback: e.detail.value })
    wx.setStorageSync(FEEDBACK_KEY, e.detail.value)
  },

  copyFeedback() {
    const text = (this.data.feedback || '').trim()
    if (!text) {
      wx.showToast({ title: '先写点建议再复制哦', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '建议已复制', icon: 'success' })
      }
    })
  },

  onSalaryInput(e) {
    this.setData({ salary: Number(e.detail.value) || 0 })
  },
  onDaysInput(e) {
    this.setData({ workDays: Number(e.detail.value) || 0 })
  },
  onHoursInput(e) {
    this.setData({ workHours: Number(e.detail.value) || 0 })
  },
  onStartInput(e) {
    this.setData({ startHour: Number(e.detail.value) || 0 })
  },
  onEndInput(e) {
    this.setData({ endHour: Number(e.detail.value) || 0 })
  },
  onTypeChange(e) {
    this.setData({ type: e.detail.value })
  },

  save() {
    wx.setStorageSync('salary_config', {
      salary: this.data.salary,
      type: this.data.type,
      workDays: this.data.workDays,
      workHours: this.data.workHours,
      startHour: this.data.startHour,
      endHour: this.data.endHour
    })
    wx.showToast({ title: '已保存', icon: 'success' })
  }
})
