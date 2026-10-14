const money = require('../../utils/money.js')

const OVERTIME_RATES = [
  { id: 'workday', name: '工作日加班', rate: 1.5, tip: '×1.5' },
  { id: 'weekend', name: '休息日加班', rate: 2, tip: '×2' },
  { id: 'holiday', name: '法定节假日', rate: 3, tip: '×3' }
]

// 五险一金个人缴纳比例（固定项）
const PENSION = 0.08
const MEDICAL = 0.02
const UNEMPLOY = 0.005

// 节假日列表（公历；农历节日已按日历换算，清明按 4/5 估算）
const HOLIDAYS = [
  { name: '元旦', date: '2027-01-01' },
  { name: '春节', date: '2027-02-06' },
  { name: '清明', date: '2027-04-05' },
  { name: '劳动节', date: '2027-05-01' },
  { name: '端午', date: '2027-06-09' },
  { name: '中秋', date: '2027-09-15' },
  { name: '国庆', date: '2027-10-01' },
  { name: '元旦', date: '2028-01-01' }
]

// 税前月薪 → 到手明细（五险一金 + 个税）
function netFromGross(gross, housingRatioPct) {
  const housingRatio = housingRatioPct / 100
  const pension = gross * PENSION
  const medical = gross * MEDICAL
  const unemploy = gross * UNEMPLOY
  const housing = gross * housingRatio
  const insuranceTotal = pension + medical + unemploy + housing
  const taxable = gross - insuranceTotal - 5000
  let tax = 0
  if (taxable > 0) {
    if (taxable <= 3000) tax = taxable * 0.03
    else if (taxable <= 12000) tax = taxable * 0.10 - 210
    else if (taxable <= 25000) tax = taxable * 0.20 - 1410
    else if (taxable <= 35000) tax = taxable * 0.25 - 2660
    else if (taxable <= 55000) tax = taxable * 0.30 - 4410
    else if (taxable <= 80000) tax = taxable * 0.35 - 7160
    else tax = taxable * 0.45 - 15160
  }
  const net = gross - insuranceTotal - tax
  return { pension, medical, unemploy, housing, insuranceTotal, taxable, tax, net }
}

// 已知到手月薪，反推税前月薪（二分法）
function grossFromNet(net, housingRatioPct) {
  if (!net || net <= 0) return 0
  let lo = net
  let hi = net * 2
  while (netFromGross(hi, housingRatioPct).net < net) hi *= 2
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (netFromGross(mid, housingRatioPct).net < net) lo = mid
    else hi = mid
  }
  return Math.round((lo + hi) / 2)
}

Page({
  data: {
    hourly: '0.00',
    overtimeRates: OVERTIME_RATES,
    overtimeHours: 2,
    overtimeRate: 1.5,
    overtimeMoney: '0.00',
    overtimeEquiv: '3.0 小时',
    pretax: 8000,
    settingNet: '0',
    housingRatio: 12,
    pension: '0.00',
    medical: '0.00',
    unemploy: '0.00',
    housing: '0.00',
    insuranceTotal: '0.00',
    taxable: '0.00',
    tax: '0.00',
    net: '0.00',
    holidayName: '元旦',
    holidayDays: '0',
    weekendDays: '0'
  },

  onShow() {
    const r = money.calc(money.getConfig())
    this._hourly = r.hourly
    this._settingNet = r.monthly // 设置里的到手月薪，首页「今日已赚」也基于它
    // 税前月薪默认由到手月薪反推；用户手动改过则尊重手动值
    const savedPretax = Number(wx.getStorageSync('calc_pretax'))
    const pretax = savedPretax > 0 ? savedPretax : grossFromNet(r.monthly, this.data.housingRatio)
    this.setData({
      hourly: r.hourly.toFixed(2),
      settingNet: r.monthly.toFixed(0),
      pretax
    })
    this.calcOvertime()
    this.calcTax()
    this.calcHoliday()
  },

  onHoursInput(e) {
    this.setData({ overtimeHours: Number(e.detail.value) || 0 })
    this.calcOvertime()
  },
  onRateChange(e) {
    this.setData({ overtimeRate: Number(e.detail.value) || 1.5 })
    this.calcOvertime()
  },
  calcOvertime() {
    const hours = this.data.overtimeHours
    const rate = this.data.overtimeRate
    const pay = this._hourly * hours * rate
    this.setData({
      overtimeMoney: pay.toFixed(2),
      overtimeEquiv: (hours * rate).toFixed(1) + ' 小时'
    })
  },

  onPretaxInput(e) {
    const v = Number(e.detail.value) || 0
    this.setData({ pretax: v })
    wx.setStorageSync('calc_pretax', v)
    this.calcTax()
  },
  onHousingInput(e) {
    this.setData({ housingRatio: Number(e.detail.value) || 0 })
    this.calcTax()
  },
  calcTax() {
    const r = netFromGross(this.data.pretax, this.data.housingRatio)
    this.setData({
      pension: r.pension.toFixed(2),
      medical: r.medical.toFixed(2),
      unemploy: r.unemploy.toFixed(2),
      housing: r.housing.toFixed(2),
      insuranceTotal: r.insuranceTotal.toFixed(2),
      taxable: r.taxable.toFixed(2),
      tax: r.tax.toFixed(2),
      net: r.net.toFixed(2)
    })
  },

  calcHoliday() {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let holidayName = '元旦'
    let holidayDays = 0
    let found = false
    for (const h of HOLIDAYS) {
      const d = new Date(h.date.replace(/-/g, '/'))
      if (d >= today) {
        holidayName = h.name
        holidayDays = Math.ceil((d - today) / 86400000)
        found = true
        break
      }
    }
    if (!found) {
      holidayName = '暂无'
      holidayDays = 0
    }
    const day = now.getDay()
    let weekendDays = (6 - day + 7) % 7
    if (weekendDays === 0) weekendDays = 7
    this.setData({
      holidayName,
      holidayDays: String(holidayDays),
      weekendDays: String(weekendDays)
    })
  }
})
