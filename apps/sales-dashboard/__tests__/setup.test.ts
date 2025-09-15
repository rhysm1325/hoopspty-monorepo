// Basic test to verify Jest setup is working

describe('Sales Dashboard Test Setup', () => {
  it('should have Jest configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should have access to test utilities', () => {
    expect(global.ResizeObserver).toBeDefined()
    expect(global.IntersectionObserver).toBeDefined()
    expect(global.fetch).toBeDefined()
  })

  it('should have environment variables set for testing', () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
    expect(process.env.AIRCALL_API_ID).toBeDefined()
  })
})
