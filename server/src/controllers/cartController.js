const Cart = require('../models/Cart')
const Product = require('../models/Product')

// [GET] /api/cart — 내 장바구니 조회
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name nameKo price images stock status sale_type sku')

    if (!cart) {
      return res.status(200).json({ success: true, data: { items: [], totalPrice: 0 } })
    }

    res.status(200).json({
      success: true,
      data: {
        _id: cart._id,
        items: cart.items,
        totalPrice: cart.totalPrice,
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// [POST] /api/cart — 아이템 추가
const addItem = async (req, res) => {
  try {
    const { productId, qty = 1, shippingOption = 'standard' } = req.body

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ success: false, message: '상품을 찾을 수 없습니다.' })
    }
    if (product.status !== 'active') {
      return res.status(400).json({ success: false, message: '판매 중인 상품이 아닙니다.' })
    }
    if (product.stock < qty) {
      return res.status(400).json({ success: false, message: '재고가 부족합니다.' })
    }

    let cart = await Cart.findOne({ user: req.user._id })

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [{ product: productId, qty, shippingOption, priceSnapshot: product.price }],
      })
    } else {
      const existing = cart.items.find((i) => i.product.toString() === productId)
      if (existing) {
        existing.qty = Math.min(existing.qty + qty, product.stock)
        existing.shippingOption = shippingOption
      } else {
        cart.items.push({ product: productId, qty, shippingOption, priceSnapshot: product.price })
      }
      await cart.save()
    }

    await cart.populate('items.product', 'name nameKo price images stock status sale_type sku')

    res.status(200).json({
      success: true,
      message: '장바구니에 추가되었습니다.',
      data: { items: cart.items, totalPrice: cart.totalPrice },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// [PUT] /api/cart/:productId — 수량/배송옵션 변경
const updateItem = async (req, res) => {
  try {
    const { qty, shippingOption } = req.body
    const { productId } = req.params

    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) {
      return res.status(404).json({ success: false, message: '장바구니가 없습니다.' })
    }

    const item = cart.items.find((i) => i.product.toString() === productId)
    if (!item) {
      return res.status(404).json({ success: false, message: '해당 상품이 장바구니에 없습니다.' })
    }

    if (qty !== undefined) {
      const product = await Product.findById(productId).select('stock')
      if (qty < 1) {
        return res.status(400).json({ success: false, message: '수량은 1 이상이어야 합니다.' })
      }
      if (product && qty > product.stock) {
        return res.status(400).json({ success: false, message: '재고가 부족합니다.' })
      }
      item.qty = qty
    }
    if (shippingOption !== undefined) item.shippingOption = shippingOption

    await cart.save()
    await cart.populate('items.product', 'name nameKo price images stock status sale_type sku')

    res.status(200).json({
      success: true,
      message: '장바구니가 업데이트되었습니다.',
      data: { items: cart.items, totalPrice: cart.totalPrice },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// [DELETE] /api/cart/:productId — 특정 아이템 삭제
const removeItem = async (req, res) => {
  try {
    const { productId } = req.params

    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) {
      return res.status(404).json({ success: false, message: '장바구니가 없습니다.' })
    }

    const before = cart.items.length
    cart.items = cart.items.filter((i) => i.product.toString() !== productId)

    if (cart.items.length === before) {
      return res.status(404).json({ success: false, message: '해당 상품이 장바구니에 없습니다.' })
    }

    await cart.save()
    await cart.populate('items.product', 'name nameKo price images stock status sale_type sku')

    res.status(200).json({
      success: true,
      message: '아이템이 삭제되었습니다.',
      data: { items: cart.items, totalPrice: cart.totalPrice },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// [DELETE] /api/cart — 장바구니 전체 비우기
const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user._id })
    res.status(200).json({ success: true, message: '장바구니가 비워졌습니다.' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart }
