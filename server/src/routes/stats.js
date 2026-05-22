const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const Pack = require('../models/Pack')
const Order = require('../models/Order')
const User = require('../models/User')
const AuctionApplication = require('../models/AuctionApplication')

// [GET] /api/stats/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const LOW_STOCK = 3

    const [
      auctionProducts,
      totalProducts,
      totalPacks,
      lowStockProducts,
      lowStockPacks,
      pendingAuctions,
      todayOrdersAgg,
      unpaidOrders,
      shippingDue,
      newUsersToday,
      byStatusAgg,
    ] = await Promise.all([
      Product.find({ sale_type: 'auction', status: 'active' })
        .select('nameKo name currentBid bidCount watchers endsAt')
        .sort({ endsAt: 1 })
        .limit(10),
      Product.countDocuments({ status: 'active' }),
      Pack.countDocuments({ status: 'active' }),
      Product.countDocuments({ status: 'active', stock: { $lte: LOW_STOCK } }),
      Pack.countDocuments({ status: 'active', stock: { $lte: LOW_STOCK } }),
      AuctionApplication.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfDay }, status: { $nin: ['cancelled', 'refunded'] } } },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      ]),
      Order.countDocuments({ status: 'pending_payment', createdAt: { $lte: dayAgo } }),
      // shippingDue = 송장 등록 전 (preparing) — 송장 등록 액션 대기열
      Order.countDocuments({ status: 'preparing' }),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      // 상태별 전체 카운트 (대시보드 관리 큐 카드용)
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ])

    const totalBidValue = auctionProducts.reduce((s, c) => s + (c.currentBid || 0), 0)
    const todayOrders = todayOrdersAgg[0]?.count || 0
    const todayRevenue = todayOrdersAgg[0]?.revenue || 0

    // 상태별 카운트 객체 (key = order status enum 값)
    const byStatus = byStatusAgg.reduce((acc, d) => {
      acc[d._id] = d.count
      return acc
    }, {})
    const totalOrders = Object.values(byStatus).reduce((s, c) => s + c, 0)

    res.json({
      success: true,
      data: {
        // 라이브 경매
        activeAuctions: auctionProducts.length,
        totalBidValue,
        auctions: auctionProducts,
        // 카탈로그
        totalProducts,
        totalPacks,
        lowStockCount: lowStockProducts + lowStockPacks,
        // 거래
        pendingAuctions,
        todayOrders,
        todayRevenue,
        unpaidOrders,
        shippingDue,
        byStatus,
        totalOrders,
        // 회원
        newUsersToday,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
