import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { getFromStorage, removeFromStorage } from '../utils'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

// List of public endpoints that don't require session token
const PUBLIC_ENDPOINTS = [
  '/PasswordAuthentication/register',
  '/PasswordAuthentication/authenticate',
  '/EmailVerification/requestVerification',
  '/EmailVerification/verifyEmail'
]

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60 seconds to allow for LLM generation
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to automatically add session token
apiClient.interceptors.request.use(
  (config) => {
    const isPublic = PUBLIC_ENDPOINTS.some((endpoint) => config.url?.endsWith(endpoint))

    if (!isPublic) {
      const session = getFromStorage('session', null)
      
      if (session) {
        // ✅ Add session to Authorization header (preferred method)
        config.headers.Authorization = `Bearer ${session}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor (for handling common response patterns)
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    // Clear stale session only on authentication failures (not timeouts or gateway errors)
    if (error.response?.status === 401) {
      removeFromStorage('session')
      removeFromStorage('user')

      // Redirect to login if not already there
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }

    // Log gateway timeouts for debugging
    if (error.response?.status === 504) {
      console.warn('[ApiService] 504 Gateway Timeout - Backend may be spinning up from sleep')
    }

    return Promise.reject(error)
  },
)

// Generic API service class
export class ApiService {
  /**
   * Make a POST request to a concept endpoint
   * Based on the API structure rules from the spec file:
   * - All endpoints use POST method
   * - URL structure: /{conceptName}/{actionOrQueryName}
   * - Request body is a single JSON object
   * - Authenticated endpoints automatically include session token
   */
  static async callConceptAction<T = any>(
    conceptName: string,
    actionName: string,
    data: Record<string, any> = {},
  ): Promise<T> {
    try {
      const endpoint = actionName ? `/${conceptName}/${actionName}` : `/${conceptName}`
      const fullUrl = `${API_BASE}${endpoint}`
      const response = await apiClient.post(endpoint, data)
      // Unwrap { msg: {...} } wrapper from Requesting concept
      const responseData = response.data
      if (responseData && typeof responseData === 'object' && 'msg' in responseData) {
        return responseData.msg as T
      }
      return responseData
    } catch (error: any) {
      // Enhanced error logging for 404s and 504s
      if (error.response?.status === 404) {
        console.error(`[ApiService] 404 Error - Endpoint not found: ${API_BASE}/${conceptName}/${actionName}`)
        console.error(`[ApiService] API_BASE_URL: ${import.meta.env.VITE_API_BASE_URL || 'NOT SET (using default /api)'}`)
        console.error(`[ApiService] Full URL attempted: ${API_BASE}/${conceptName}/${actionName}`)
        console.error(`[ApiService] If deployed, ensure VITE_API_BASE_URL environment variable is set to your backend URL`)
      } else if (error.response?.status === 504) {
        console.error(`[ApiService] 504 Gateway Timeout - Backend server is taking too long to respond`)
        console.error(`[ApiService] This often happens when Render services are spinning up from sleep`)
        console.error(`[ApiService] Full URL attempted: ${API_BASE}/${conceptName}/${actionName}`)
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error(`[ApiService] Request timeout - Backend did not respond within ${apiClient.defaults.timeout}ms`)
        console.error(`[ApiService] Full URL attempted: ${API_BASE}/${conceptName}/${actionName}`)
      }
      throw error
    }
  }

  /**
   * Generic GET request (if needed for non-concept endpoints)
   */
  static async get<T = any>(endpoint: string): Promise<T> {
    try {
      const response = await apiClient.get(endpoint)
      return response.data
    } catch (error) {
      throw error
    }
  }

  /**
   * Generic POST request
   */
  static async post<T = any>(endpoint: string, data: any = {}): Promise<T> {
    try {
      const response = await apiClient.post(endpoint, data)
      return response.data
    } catch (error) {
      throw error
    }
  }

    /**
   * FileUploading concept helpers
   */
  static async requestUploadURL(session: string, filename: string, contentType?: string): Promise<{ file: string; uploadURL: string; contentType?: string } | { error: string }> {
    const payload: any = { session, filename };
    if (contentType) {
      payload.contentType = contentType;
    }
    return await ApiService.callConceptAction('FileUploading', 'requestUploadURL', payload);
  }

  static async confirmUpload(file: string): Promise<{ file: string } | { error: string }> {
    return await ApiService.callConceptAction('FileUploading', 'confirmUpload', { file });
  }

  static async getDownloadURL(file: string): Promise<{ downloadURL: string } | { error: string }> {
    return await ApiService.callConceptAction('FileUploading', '_getDownloadURL', { file });
  }
}

export default apiClient