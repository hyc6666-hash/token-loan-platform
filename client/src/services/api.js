/**
 * API 服务层
 * 
 * 教学说明：
 * 将所有API调用集中在一个文件中管理，好处：
 * 1. 统一处理请求头（如添加token）
 * 2. 统一处理错误（如401跳转登录）
 * 3. 修改接口地址只需改一处
 * 4. 方便后续替换为其他HTTP库
 */

// 教学说明：
// 环境变量让同一份代码在不同环境使用不同的API地址：
// - 本地开发：Vite代理 /api → localhost:3001
// - 线上部署：直接访问Render后端的完整URL
// Vite中，以 VITE_ 开头的环境变量会暴露给前端代码
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// 封装fetch请求
async function request(url, options = {}) {
  const token = localStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  })

  const data = await response.json()

  if (!response.ok) {
    // 401未授权 → 清除token
    if (response.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    throw new Error(data.error || '请求失败')
  }

  return data
}

// ============ 认证 API ============
export const authApi = {
  register: (formData) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(formData)
  }),
  login: (phone, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password })
  }),
  getMe: () => request('/auth/me')
}

// ============ 申请 API ============
export const applicationApi = {
  submit: (formData) => request('/applications', {
    method: 'POST',
    body: JSON.stringify(formData)
  }),
  getMy: () => request('/applications/my'),
  getById: (id) => request(`/applications/${id}`),
  withdraw: (id) => request(`/applications/${id}/withdraw`, { method: 'PATCH' })
}

// ============ 计算器 API ============
export const calculatorApi = {
  estimate: (params) => request('/calculator/estimate', {
    method: 'POST',
    body: JSON.stringify(params)
  })
}

// ============ 内容 API ============
export const contentApi = {
  getPolicies: () => request('/content/policies'),
  getProducts: () => request('/content/products'),
  getCases: () => request('/content/cases')
}

// ============ 管理 API ============
export const adminApi = {
  getStats: () => request('/admin/stats'),
  getApplications: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/admin/applications${query ? '?' + query : ''}`)
  },
  reviewApplication: (id, status, review_note) => request(`/admin/applications/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ status, review_note })
  }),
  getUsers: () => request('/admin/users'),
  toggleUserStatus: (id, status) => request(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  })
}
