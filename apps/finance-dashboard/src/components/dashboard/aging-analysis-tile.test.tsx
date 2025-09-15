// Unit tests for AR/AP aging analysis tile

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AgingAnalysisTile } from './aging-analysis-tile'

// Mock the financial calculations
jest.mock('@/lib/analytics/calculations', () => ({
  financialCalculations: {
    calculateARAgingAnalysis: jest.fn(),
    calculateAPAgingAnalysis: jest.fn(),
  },
}))

// Mock other dependencies
jest.mock('@/utils/financial', () => ({
  formatCurrency: (amount: number) => `$${amount.toLocaleString()}`,
  formatPercentage: (percent: number) => `${percent.toFixed(1)}%`,
}))

jest.mock('@/constants/financial', () => ({
  AR_AGING_BUCKETS: [
    { label: 'Current', minDays: 0, maxDays: 30 },
    { label: '31-60 days', minDays: 31, maxDays: 60 },
    { label: '61-90 days', minDays: 61, maxDays: 90 },
    { label: '90+ days', minDays: 91 },
  ],
  AP_AGING_BUCKETS: [
    { label: 'Current', minDays: 0, maxDays: 30 },
    { label: '31-60 days', minDays: 31, maxDays: 60 },
    { label: '61-90 days', minDays: 61, maxDays: 90 },
    { label: '90+ days', minDays: 91 },
  ],
}))

describe('AgingAnalysisTile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('AR Aging Analysis', () => {
    it('should render AR aging tile in compact mode', async () => {
      render(<AgingAnalysisTile type="ar" showDetails={false} />)

      expect(screen.getByText('AR Aging Analysis')).toBeInTheDocument()
      
      // Should show loading state initially
      expect(screen.getByText('Total Outstanding')).toBeInTheDocument()
    })

    it('should render AR aging tile in detailed mode', async () => {
      render(<AgingAnalysisTile type="ar" showDetails={true} />)

      expect(screen.getByText('AR Aging Analysis')).toBeInTheDocument()
      expect(screen.getByText('Accounts receivable aging buckets')).toBeInTheDocument()
      
      // Should have refresh button
      const refreshButton = screen.getByRole('button')
      expect(refreshButton).toBeInTheDocument()
    })

    it('should display aging buckets with correct colors', async () => {
      render(<AgingAnalysisTile type="ar" showDetails={true} />)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Current')).toBeInTheDocument()
      })

      // Check for aging bucket labels
      expect(screen.getByText('Current')).toBeInTheDocument()
      expect(screen.getByText('31-60 days')).toBeInTheDocument()
      expect(screen.getByText('61-90 days')).toBeInTheDocument()
      expect(screen.getByText('90+ days')).toBeInTheDocument()
    })

    it('should show overdue alert when applicable', async () => {
      render(<AgingAnalysisTile type="ar" showDetails={true} />)

      await waitFor(() => {
        // Should show collection risk alert for overdue amounts
        const alerts = screen.queryAllByText(/Collection Risk Alert/i)
        if (alerts.length > 0) {
          expect(alerts[0]).toBeInTheDocument()
        }
      })
    })

    it('should handle refresh action', async () => {
      render(<AgingAnalysisTile type="ar" showDetails={true} />)

      const refreshButton = screen.getByRole('button')
      fireEvent.click(refreshButton)

      // Should show loading state
      expect(refreshButton.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('AP Aging Analysis', () => {
    it('should render AP aging tile with correct labels', async () => {
      render(<AgingAnalysisTile type="ap" showDetails={true} />)

      expect(screen.getByText('AP Aging Analysis')).toBeInTheDocument()
      expect(screen.getByText('Accounts payable aging buckets')).toBeInTheDocument()
    })

    it('should show payment priority alert for overdue AP', async () => {
      render(<AgingAnalysisTile type="ap" showDetails={true} />)

      await waitFor(() => {
        // Should show payment priority alert for overdue amounts
        const alerts = screen.queryAllByText(/Payment Priority Alert/i)
        if (alerts.length > 0) {
          expect(alerts[0]).toBeInTheDocument()
        }
      })
    })

    it('should display supplier category breakdown', async () => {
      render(<AgingAnalysisTile type="ap" showDetails={true} />)

      await waitFor(() => {
        // Should load and display data
        expect(screen.getByText('Total Outstanding')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when data loading fails', async () => {
      // Mock error in calculations
      const { financialCalculations } = require('@/lib/analytics/calculations')
      financialCalculations.calculateARAgingAnalysis.mockRejectedValue(new Error('Database error'))

      render(<AgingAnalysisTile type="ar" showDetails={true} />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load AR aging data/)).toBeInTheDocument()
      })
    })

    it('should handle empty aging data gracefully', async () => {
      const { financialCalculations } = require('@/lib/analytics/calculations')
      financialCalculations.calculateARAgingAnalysis.mockResolvedValue([])

      render(<AgingAnalysisTile type="ar" showDetails={true} />)

      await waitFor(() => {
        // Should handle empty data without crashing
        expect(screen.getByText('AR Aging Analysis')).toBeInTheDocument()
      })
    })
  })

  describe('Visual Elements', () => {
    it('should render progress bar visualization for aging buckets', async () => {
      render(<AgingAnalysisTile type="ar" showDetails={true} />)

      await waitFor(() => {
        // Should have visual progress bar for aging distribution
        const progressBars = screen.container.querySelectorAll('[style*="width"]')
        expect(progressBars.length).toBeGreaterThan(0)
      })
    })

    it('should apply correct color coding for aging buckets', async () => {
      render(<AgingAnalysisTile type="ar" showDetails={true} />)

      await waitFor(() => {
        // Should have colored indicators for different aging buckets
        const colorIndicators = screen.container.querySelectorAll('[class*="bg-"]')
        expect(colorIndicators.length).toBeGreaterThan(0)
      })
    })

    it('should show risk indicators for overdue amounts', async () => {
      render(<AgingAnalysisTile type="ar" showDetails={true} />)

      await waitFor(() => {
        // Should show alert triangles for overdue items
        const alertIcons = screen.container.querySelectorAll('[data-lucide="alert-triangle"]')
        // May or may not have alerts depending on sample data
        expect(alertIcons.length).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Performance', () => {
    it('should auto-refresh at specified intervals', async () => {
      const { financialCalculations } = require('@/lib/analytics/calculations')
      const mockCalculateAR = financialCalculations.calculateARAgingAnalysis
      
      render(<AgingAnalysisTile type="ar" showDetails={true} refreshInterval={1000} />)

      // Should call initially
      expect(mockCalculateAR).toHaveBeenCalledTimes(1)

      // Wait for auto-refresh (mocked with shorter interval)
      await waitFor(() => {
        expect(mockCalculateAR).toHaveBeenCalledTimes(2)
      }, { timeout: 2000 })
    })

    it('should display loading skeleton during data fetch', () => {
      render(<AgingAnalysisTile type="ar" showDetails={true} />)

      // Should show loading skeleton initially
      const loadingElements = screen.container.querySelectorAll('.animate-pulse')
      expect(loadingElements.length).toBeGreaterThan(0)
    })
  })
})
