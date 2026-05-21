const express = require('express')
const router = express.Router()
const Product = require('../models/Product')
const Pack = require('../models/Pack')

// [GET] /api/stats/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date()

    const [
      auctionProducts,
      totalProducts,
      totalPacks,
    ] = await Promise.all([
      Product.find({ sale_type: 'auction', status: 'active' }).select('nameKo currentBid bidCount watchers endsAt'),
      Product.countDocuments({ status: 'active' }),
      Pack.countDocuments({ status: 'active' }),
    ])

    const totalBidValue = auctionProducts.reduce((s, c) => s + (c.currentBid || 0), 0)

    res.json({
      success: true,
      data: {
        activeAuctions: auctionProducts.length,
        totalBidValue,
        totalProducts,
        totalPacks,
        auctions: auctionProducts,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
