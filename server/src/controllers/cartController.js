const Cart = require('../models/Cart')
const Product = require('../models/Product')
const Pack = require('../models/Pack')

const POPULATE_FIELDS = 'name nameKo price images stock status sale_type sku heroArt setShort type'

async function populateCart(cart) {
  await cart.populate([
    { path: 'items.product', select: POPULATE_FIELDS },
    { path: 'items.pack', select: POPULATE_FIELDS },
  ])
  return cart
}

// [GET] /api/cart — 내 장바구니 조회
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
    if (!cart) {
      return res.status(200).json({ success: true, data: { items: [], totalPrice: 0 } })
    }
    await populateCart(cart)

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
    const { productId, packId, itemType: rawType, qty = 1, shippingOption = 'standard' } = req.body

    const itemType = rawType || (packId ? 'pack' : 'product')
    const id = itemType === 'pack' ? packId : productId

    if (!id) {
      return res.status(400).json({ success: false, message: '상품 id가 필요합니다.' })
    }

    let entity
    if (itemType === 'pack') {
      entity = await Pack.findById(id)
    } else {
      entity = await Product.findById(id)
    }
    if (!entity) {
      return res.status(404).json({ success: false, message: '상품을 찾을 수 없습니다.' })
    }
    if (entity.status && entity.status !== 'active') {
      return res.status(400).json({ success: false, message: '판매 중인 상품이 아닙니다.' })
    }
    if (entity.stock !== undefined && entity.stock < qty) {
      return res.status(400).json({ success: false, message: '재고가 부족합니다.' })
    }

    let cart = await Cart.findOne({ user: req.user._id })

    const matches = (i) => {
      if (i.itemType !== itemType) return false
      const itemId = itemType === 'pack' ? i.pack : i.product
      return itemId && itemId.toString() === id
    }

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [{
          itemType,
          product: itemType === 'product' ? id : null,
          pack: itemType === 'pack' ? id : null,
          qty,
          shippingOption,
          priceSnapshot: entity.price,
        }],
      })
    } else {
      const existing = cart.items.find(matches)
      if (existing) {
        existing.qty = Math.min(existing.qty + qty, entity.stock || existing.qty + qty)
        existing.shippingOption = shippingOption
      } else {
        cart.items.push({
          itemType,
          product: itemType === 'product' ? id : null,
          pack: itemType === 'pack' ? id : null,
          qty,
          shippingOption,
          priceSnapshot: entity.price,
        })
      }
      await cart.save()
    }

    await populateCart(cart)

    res.status(200).json({
      success: true,
      message: '장바구니에 추가되었습니다.',
      data: { items: cart.items, totalPrice: cart.totalPrice },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// [PUT] /api/cart/:id — 수량/배송옵션 변경 (id는 product or pack id)
const updateItem = async (req, res) => {
  try {
    const { qty, shippingOption, itemType: rawType } = req.body
    const { productId } = req.params  // 라우트 호환: 실제론 product 또는 pack id

    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) {
      return res.status(404).json({ success: false, message: '장바구니가 없습니다.' })
    }

    const item = cart.items.find((i) => {
      const itemId = i.itemType === 'pack' ? i.pack : i.product
      if (rawType && i.itemType !== rawType) return false
      return itemId && itemId.toString() === productId
    })
    if (!item) {
      return res.status(404).json({ success: false, message: '해당 상품이 장바구니에 없습니다.' })
    }

    if (qty !== undefined) {
      const Model = item.itemType === 'pack' ? Pack : Product
      const entity = await Model.findById(productId).select('stock')
      if (qty < 1) {
        return res.status(400).json({ success: false, message: '수량은 1 이상이어야 합니다.' })
      }
      if (entity && entity.stock !== undefined && qty > entity.stock) {
        return res.status(400).json({ success: false, message: '재고가 부족합니다.' })
      }
      item.qty = qty
    }
    if (shippingOption !== undefined) item.shippingOption = shippingOption

    await cart.save()
    await populateCart(cart)

    res.status(200).json({
      success: true,
      message: '장바구니가 업데이트되었습니다.',
      data: { items: cart.items, totalPrice: cart.totalPrice },
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// [DELETE] /api/cart/:id — 특정 아이템 삭제
const removeItem = async (req, res) => {
  try {
    const { productId } = req.params

    const cart = await Cart.findOne({ user: req.user._id })
    if (!cart) {
      return res.status(404).json({ success: false, message: '장바구니가 없습니다.' })
    }

    const before = cart.items.length
    cart.items = cart.items.filter((i) => {
      const itemId = i.itemType === 'pack' ? i.pack : i.product
      return !itemId || itemId.toString() !== productId
    })

    if (cart.items.length === before) {
      return res.status(404).json({ success: false, message: '해당 상품이 장바구니에 없습니다.' })
    }

    await cart.save()
    await populateCart(cart)

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
