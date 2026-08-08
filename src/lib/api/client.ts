import axios from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'


const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const client = axios.create({
  baseURL: BASE_URL,
})


client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { useAuthStore } = require('@/store/auth.store')
  const accessToken = useAuthStore.getState().accessToken

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

let isRefreshing = false

let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

client.interceptors.response.use(

  (response: AxiosResponse) => response,

  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return client(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    const { useAuthStore } = require('@/store/auth.store')
    const { refreshToken, setTokens, clear, sessionId } = useAuthStore.getState()

    if (!refreshToken) {
      clear()
      processQueue(new Error('Sin refresh token'), null)
      isRefreshing = false
      if (typeof window !== 'undefined') window.location.href = '/login'
      return Promise.reject(error)
    }

    try {

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refreshToken,
        sessionId: sessionId,
       })

      setTokens(data.access_token, data.refresh_token, data.session_id)

      originalRequest.headers.Authorization = `Bearer ${data.access_token}`
      processQueue(null, data.access_token)

      return client(originalRequest)
    } catch (refreshError) {

      clear()
      processQueue(refreshError, null)
      if (typeof window !== 'undefined') window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)