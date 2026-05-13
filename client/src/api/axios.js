import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // http://localhost:5000/api
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터: 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const storageData = localStorage.getItem('vault-auth')
    if (storageData) {
      try {
        const { state } = JSON.parse(storageData)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      } catch (err) {
        console.error('Error parsing token from storage:', err)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default api
