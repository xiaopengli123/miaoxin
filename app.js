App({
  onLaunch() {
    // 首次进入给个默认配置
    if (!wx.getStorageSync('salary_config')) {
      wx.setStorageSync('salary_config', {
        salary: 8000,
        type: 'month',
        workDays: 22,
        workHours: 8,
        startHour: 9
      })
    }
  }
})
