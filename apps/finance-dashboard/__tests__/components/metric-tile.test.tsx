// Unit tests for MetricTile component

import { render, screen } from '@testing-library/react'
import { MetricTile } from '@/components/ui/metric-tile'

describe('MetricTile Component', () => {
  test('renders basic metric tile correctly', () => {
    render(<MetricTile title="Cash Position" value={284295} currency />)

    expect(screen.getByText('Cash Position')).toBeInTheDocument()
    expect(screen.getByText('A$284,295.00')).toBeInTheDocument()
  })

  test('displays positive change indicator correctly', () => {
    render(
      <MetricTile
        title="YTD Revenue"
        value={302053}
        currency
        change={{
          value: '+8.4%',
          type: 'positive',
          label: 'vs last FY',
        }}
      />
    )

    expect(screen.getByText('YTD Revenue')).toBeInTheDocument()
    expect(screen.getByText('A$302,053.00')).toBeInTheDocument()
    expect(screen.getByText('↗ +8.4% vs last FY')).toBeInTheDocument()

    // Check for positive change styling
    const changeElement = screen.getByText('↗ +8.4% vs last FY')
    expect(changeElement).toHaveClass('text-green-600')
  })

  test('displays negative change indicator correctly', () => {
    render(
      <MetricTile
        title="Outstanding AR"
        value={65000}
        currency
        change={{
          value: '-12.5%',
          type: 'negative',
          label: 'from last month',
        }}
      />
    )

    expect(screen.getByText('↘ -12.5% from last month')).toBeInTheDocument()

    // Check for negative change styling
    const changeElement = screen.getByText('↘ -12.5% from last month')
    expect(changeElement).toHaveClass('text-red-600')
  })

  test('displays neutral change indicator correctly', () => {
    render(
      <MetricTile
        title="DSO"
        value="12 days"
        change={{
          value: 'stable',
          type: 'neutral',
        }}
      />
    )

    expect(screen.getByText('DSO')).toBeInTheDocument()
    expect(screen.getByText('12 days')).toBeInTheDocument()
    expect(screen.getByText('→ stable')).toBeInTheDocument()

    // Check for neutral change styling
    const changeElement = screen.getByText('→ stable')
    expect(changeElement).toHaveClass('text-gray-600')
  })

  test('handles non-currency values correctly', () => {
    render(<MetricTile title="Gross Margin" value="94.1%" />)

    expect(screen.getByText('Gross Margin')).toBeInTheDocument()
    expect(screen.getByText('94.1%')).toBeInTheDocument()

    // Should not format as currency
    expect(screen.queryByText('A$94.1%')).not.toBeInTheDocument()
  })

  test('displays loading state correctly', () => {
    render(<MetricTile title="Cash Position" value={0} loading />)

    // Should show skeleton loading animation
    const loadingElement = screen.getByTestId('metric-tile')?.parentElement
    expect(loadingElement).toHaveClass('animate-pulse')

    // Should not show actual values during loading
    expect(screen.queryByText('Cash Position')).not.toBeInTheDocument()
  })

  test('applies custom className correctly', () => {
    const { container } = render(
      <MetricTile title="Test Metric" value={1000} className="custom-class" />
    )

    const metricTile = container.firstChild
    expect(metricTile).toHaveClass('custom-class')
  })

  test('handles large numbers correctly', () => {
    render(<MetricTile title="Large Amount" value={1234567890} currency />)

    // Should format large numbers with proper separators
    expect(screen.getByText('A$1,234,567,890.00')).toBeInTheDocument()
  })

  test('handles zero and negative values correctly', () => {
    render(<MetricTile title="Zero Value" value={0} currency />)

    expect(screen.getByText('A$0.00')).toBeInTheDocument()

    // Test negative value
    const { rerender } = render(
      <MetricTile title="Negative Value" value={-1500} currency />
    )

    expect(screen.getByText('-A$1,500.00')).toBeInTheDocument()
  })

  test('handles missing change label gracefully', () => {
    render(
      <MetricTile
        title="Revenue"
        value={100000}
        currency
        change={{
          value: '+10%',
          type: 'positive',
          // No label provided
        }}
      />
    )

    expect(screen.getByText('↗ +10%')).toBeInTheDocument()
  })
})
