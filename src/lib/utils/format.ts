const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

export const formatCurrency = (value: number) => currencyFormatter.format(Math.round(value))

export const formatPercent = (value: number) => percentFormatter.format(value)

export const formatNumber = (value: number) => numberFormatter.format(Math.round(value))

export const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 1,
  }).format(value)
