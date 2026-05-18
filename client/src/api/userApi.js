import api from './axios'

// 회원가입
export const registerUser = (userData) => api.post('/users', userData)

// 로그인
export const loginUser = (credentials) => api.post('/users/login', credentials)

// 특정 유저 조회
export const getUserById = (id) => api.get(`/users/${id}`)

// 유저 정보 수정
export const updateUser = (id, userData) => api.put(`/users/${id}`, userData)

// 위시리스트 추가
export const addToWishlist = (userId, cardId) =>
  api.post(`/users/${userId}/wishlist/${cardId}`)

// 위시리스트 제거
export const removeFromWishlist = (userId, cardId) =>
  api.delete(`/users/${userId}/wishlist/${cardId}`)

// 내 정보 조회 (토큰 필요)
export const getMe = () => api.get('/users/me')

// 이메일 중복 확인 (public)
export const checkEmailAvailable = (email) =>
  api.get('/users/check-email', { params: { email } })
