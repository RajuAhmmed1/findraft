import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../utils/api'

export function useApi(endpoint, params = {}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Keep ref in sync so refetch() always has latest params
  const paramsRef = useRef(params)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { paramsRef.current = params }, [JSON.stringify(params)])

  const fetch = useCallback(async (overrideParams) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(endpoint, { params: overrideParams !== undefined ? overrideParams : paramsRef.current })
      setData(res.data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useCrud(endpoint) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const request = useCallback(async (method, id, body) => {
    setLoading(true)
    setError(null)
    try {
      const url = id ? `${endpoint}/${id}` : endpoint
      const res = method === 'delete'
        ? await api.delete(url)
        : await api[method](url, body)
      return res.data
    } catch (e) {
      const msg = e.response?.data?.error || e.message
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  return {
    loading, error,
    create: (body)     => request('post',   null, body),
    update: (id, body) => request('put',    id,   body),
    remove: (id)       => request('delete', id),
  }
}
