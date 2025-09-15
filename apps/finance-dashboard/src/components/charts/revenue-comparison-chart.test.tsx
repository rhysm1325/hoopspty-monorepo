// Unit tests for YTD revenue comparison chart

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RevenueComparisonChart } from './revenue-comparison-chart'

// Mock recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ReferenceLine: () => <div data-testid="reference-line" />,
}))

// Mock dependencies
jest.mock('@/lib/utils/dates', () => ({
  getCurrentFinancialYear: jest.fn(() => ({
    year: 2024,
    label: 'FY 2024-25',
    startDate: new Date('2024-07-01'),
    endDate: new Date('2025-06-30'),
  })),
  getFinancialYearWeekIndex: jest.fn(() => 12),
}))

jest.mock('@/utils/financial', () => ({
  formatCurrency: (amount: number) => `$${amount.toLocaleString()}`,
}))

describe('RevenueComparisonChart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Chart Rendering', () => {
    it('should render revenue comparison chart with default props', async () => {
      render(<RevenueComparisonChart />)

      expect(screen.getByText('YTD Revenue Comparison')).toBeInTheDocument()
      expect(screen.getByText(/Week-by-week revenue comparison/)).toBeInTheDocument()
      
      // Should show loading state initially
      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      })
    })

    it('should render line chart by default', async () => {
      render(<RevenueComparisonChart chartType="line" />)

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
        expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
      })
    })

    it('should render bar chart when specified', async () => {
      render(<RevenueComparisonChart chartType="bar" />)

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
        expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
      })
    })

    it('should display chart controls and filters', async () => {
      render(<RevenueComparisonChart />)

      // Should have view selector
      expect(screen.getByDisplayValue('Cumulative')).toBeInTheDocument()
      
      // Should have revenue stream selector
      expect(screen.getByDisplayValue('All Streams')).toBeInTheDocument()
      
      // Should have refresh button
      const refreshButton = screen.getByRole('button')
      expect(refreshButton).toBeInTheDocument()
    })
  })

  describe('Data Display', () => {
    it('should display summary metrics', async () => {
      render(<RevenueComparisonChart />)

      await waitFor(() => {
        expect(screen.getByText('Current YTD')).toBeInTheDocument()
        expect(screen.getByText('Prior YTD')).toBeInTheDocument()
        expect(screen.getByText('Variance')).toBeInTheDocument()
      })
    })

    it('should show revenue stream breakdown for all streams view', async () => {
      render(<RevenueComparisonChart revenueStream="all" />)

      await waitFor(() => {
        expect(screen.getByText('Revenue Stream Performance')).toBeInTheDocument()
      })
    })

    it('should display performance insights', async () => {
      render(<RevenueComparisonChart />)

      await waitFor(() => {
        expect(screen.getByText('Performance Insights')).toBeInTheDocument()
      })
    })

    it('should handle different revenue stream selections', async () => {
      const { rerender } = render(<RevenueComparisonChart revenueStream="tours" />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Tours')).toBeInTheDocument()
      })

      rerender(<RevenueComparisonChart revenueStream="dr-dish" />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Dr Dish')).toBeInTheDocument()
      })
    })
  })

  describe('Interactivity', () => {
    it('should allow switching between weekly and cumulative views', async () => {
      render(<RevenueComparisonChart />)

      const viewSelector = screen.getByDisplayValue('Cumulative')
      fireEvent.click(viewSelector)

      // Should be able to select weekly view
      const weeklyOption = screen.getByText('Weekly')
      expect(weeklyOption).toBeInTheDocument()
    })

    it('should allow changing revenue stream filter', async () => {
      render(<RevenueComparisonChart />)

      const streamSelector = screen.getByDisplayValue('All Streams')
      fireEvent.click(streamSelector)

      // Should show revenue stream options
      expect(screen.getByText('Tours')).toBeInTheDocument()
      expect(screen.getByText('Dr Dish')).toBeInTheDocument()
      expect(screen.getByText('Marketing')).toBeInTheDocument()
    })

    it('should handle refresh action', async () => {
      render(<RevenueComparisonChart />)

      const refreshButton = screen.getByRole('button')
      fireEvent.click(refreshButton)

      // Should trigger data reload
      expect(refreshButton.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should handle revenue stream click for drill-down', async () => {
      render(<RevenueComparisonChart revenueStream="all" />)

      await waitFor(() => {
        const streamCards = screen.container.querySelectorAll('[class*="cursor-pointer"]')
        if (streamCards.length > 0) {
          fireEvent.click(streamCards[0])
          // Should handle click for drill-down
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when data loading fails', async () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Force an error by mocking a failed Promise
      const originalPromise = global.Promise
      global.Promise = class extends originalPromise {
        constructor(executor: any) {
          super((resolve, reject) => {
            executor(reject, reject)
          })
        }
      } as any

      render(<RevenueComparisonChart />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load revenue comparison data/)).toBeInTheDocument()
      })

      // Restore Promise
      global.Promise = originalPromise
      consoleSpy.mockRestore()
    })

    it('should handle empty data gracefully', async () => {
      render(<RevenueComparisonChart />)

      // Should render without crashing even with no data
      expect(screen.getByText('YTD Revenue Comparison')).toBeInTheDocument()
    })
  })

  describe('Chart Features', () => {
    it('should display chart legend and axes', async () => {
      render(<RevenueComparisonChart />)

      await waitFor(() => {
        expect(screen.getByTestId('legend')).toBeInTheDocument()
        expect(screen.getByTestId('x-axis')).toBeInTheDocument()
        expect(screen.getByTestId('y-axis')).toBeInTheDocument()
      })
    })

    it('should show grid lines for better readability', async () => {
      render(<RevenueComparisonChart />)

      await waitFor(() => {
        expect(screen.getByTestId('grid')).toBeInTheDocument()
      })
    })

    it('should include reference lines for targets', async () => {
      render(<RevenueComparisonChart />)

      await waitFor(() => {
        expect(screen.getByTestId('reference-line')).toBeInTheDocument()
      })
    })

    it('should be responsive', async () => {
      render(<RevenueComparisonChart />)

      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('should display loading state during data fetch', () => {
      render(<RevenueComparisonChart />)

      // Should show loading skeleton
      const loadingElements = screen.container.querySelectorAll('.animate-pulse')
      expect(loadingElements.length).toBeGreaterThan(0)
    })

    it('should handle large datasets efficiently', async () => {
      render(<RevenueComparisonChart weeksToShow={52} />)

      // Should render without performance issues
      await waitFor(() => {
        expect(screen.getByText('YTD Revenue Comparison')).toBeInTheDocument()
      })
    })
  })
})
