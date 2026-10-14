// 广告位管理：流量主开通后（累计 1000 UV），把 adUnitId 填进 AD 配置即可生效。
// 没填时自动降级为「直接解锁」，不影响开发调试和体验。
const AD = {
  rewarded: '', // 激励视频广告位 ID
  banner: ''    // banner 广告位 ID
}

let rewardedAd = null
let rewardCallback = null

function getRewardedAd() {
  if (!AD.rewarded) {
    return null
  }
  if (!rewardedAd) {
    rewardedAd = wx.createRewardedVideoAd({ adUnitId: AD.rewarded })
    rewardedAd.onClose(res => {
      const cb = rewardCallback
      rewardCallback = null
      if (res && res.isEnded) {
        if (cb) cb()
      } else {
        wx.showToast({ title: '看完广告才能解锁哦', icon: 'none' })
      }
    })
  }
  return rewardedAd
}

// 播放激励视频：看完回调 onReward；未配置或加载失败时直接回调（开发模式）
function showRewarded(onReward) {
  const ad = getRewardedAd()
  if (!ad) {
    if (onReward) onReward()
    return
  }
  rewardCallback = onReward
  ad.show().catch(() => {
    ad.load()
      .then(() => ad.show())
      .catch(() => {
        rewardCallback = null
        if (onReward) onReward()
      })
  })
}

module.exports = { AD, showRewarded }
