import api from './api'

export const toAbsoluteMediaUrl = (url?: string | null) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/images/')) return url

  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
  return `${baseUrl}${url}`
}

export const uploadFile = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data as {
    url: string
    content_type: string
    filename: string
  }
}
