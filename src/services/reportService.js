import { jsPDF } from 'jspdf'

function getModeLabel(mode) {
  const labels = {
    'calculate-interest': 'Calculate Interest',
    'find-principal': 'Find Principal',
    'find-rate': 'Find Interest Rate',
    'find-time': 'Find Time',
  }

  return labels[mode] || 'Calculate Interest'
}

export function buildProjectionChartData(entry) {
  const principal = Number(entry?.principal)
  const rate = Number(entry?.rate)
  const time = Number(entry?.time)
  const unit = entry?.timeUnit === 'months' || entry?.unit === 'months' ? 'months' : 'years'

  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(time) || time <= 0) {
    throw new Error('A valid calculation is required to create the projection graph.')
  }

  const durationYears = unit === 'months' ? time / 12 : time
  const stepYears = unit === 'months' ? 1 / 12 : 1
  const fullSteps = Math.floor(durationYears / stepYears)
  const years = Array.from({ length: fullSteps + 1 }, (_, index) => Number((index * stepYears).toFixed(10)))

  if (years[years.length - 1] < durationYears) {
    years.push(durationYears)
  }

  return years.map((year) => {
    const amount = principal + (principal * rate * year) / 100
    return {
      year,
      label: Number(year.toFixed(4)).toString(),
      amount,
      interest: amount - principal,
    }
  })
}

function drawProjectionChartCanvas(entry) {
  if (typeof document === 'undefined' || !document.body) {
    throw new Error('The projection graph could not be created in this environment.')
  }

  const data = buildProjectionChartData(entry)
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 720
  canvas.style.position = 'fixed'
  canvas.style.left = '-10000px'
  canvas.style.top = '0'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)

  try {
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Your browser could not prepare the projection graph.')
    }

    const { width, height } = canvas
    const plot = { left: 150, right: width - 65, top: 112, bottom: height - 135 }
    const plotWidth = plot.right - plot.left
    const plotHeight = plot.bottom - plot.top
    const principal = Number(entry.principal)
    const finalAmount = data[data.length - 1].amount
    const spread = finalAmount - principal
    const minAmount = Math.max(0, principal - (spread || principal * 0.1) * 0.12)
    const maxAmount = finalAmount + (spread || principal * 0.1) * 0.12
    const amountRange = maxAmount - minAmount || 1
    const xFor = (year) => plot.left + (year / (data[data.length - 1].year || 1)) * plotWidth
    const yFor = (amount) => plot.bottom - ((amount - minAmount) / amountRange) * plotHeight
    const formatAmount = (amount) => `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.fillStyle = '#17233a'
    context.font = 'bold 30px Arial, sans-serif'
    context.fillText('Simple Interest Projection', plot.left, 42)
    context.fillStyle = '#5c6d84'
    context.font = '20px Arial, sans-serif'
    context.fillText(`Principal ${formatAmount(principal)}   |   Final amount ${formatAmount(finalAmount)}`, plot.left, 68)

    context.font = '17px Arial, sans-serif'
    context.textAlign = 'right'
    context.textBaseline = 'middle'
    context.strokeStyle = '#dce4ef'
    context.lineWidth = 2

    for (let index = 0; index <= 5; index += 1) {
      const fraction = index / 5
      const y = plot.bottom - fraction * plotHeight
      const amount = minAmount + fraction * amountRange
      context.beginPath()
      context.moveTo(plot.left, y)
      context.lineTo(plot.right, y)
      context.stroke()
      context.fillStyle = '#53647b'
      context.fillText(formatAmount(amount), plot.left - 16, y)
    }

    context.strokeStyle = '#8a9ab0'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(plot.left, plot.top)
    context.lineTo(plot.left, plot.bottom)
    context.lineTo(plot.right, plot.bottom)
    context.stroke()

    const labelCount = Math.min(7, data.length)
    context.textAlign = 'center'
    context.textBaseline = 'top'
    context.fillStyle = '#53647b'
    for (let index = 0; index < labelCount; index += 1) {
      const dataIndex = Math.round((index / Math.max(labelCount - 1, 1)) * (data.length - 1))
      const point = data[dataIndex]
      const x = xFor(point.year)
      context.beginPath()
      context.moveTo(x, plot.bottom)
      context.lineTo(x, plot.bottom + 8)
      context.stroke()
      context.fillText(point.year.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''), x, plot.bottom + 16)
    }

    context.save()
    context.translate(36, plot.top + plotHeight / 2)
    context.rotate(-Math.PI / 2)
    context.font = 'bold 19px Arial, sans-serif'
    context.fillStyle = '#26364d'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('Amount (INR)', 0, 0)
    context.restore()

    context.font = 'bold 19px Arial, sans-serif'
    context.fillStyle = '#26364d'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('Time / Year', plot.left + plotWidth / 2, height - 28)

    context.beginPath()
    data.forEach((point, index) => {
      const x = xFor(point.year)
      const y = yFor(point.amount)
      if (index === 0) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    })
    context.strokeStyle = '#1976d2'
    context.lineWidth = 5
    context.lineJoin = 'round'
    context.lineCap = 'round'
    context.stroke()

    data.forEach((point) => {
      context.beginPath()
      context.arc(xFor(point.year), yFor(point.amount), data.length > 36 ? 3 : 5, 0, Math.PI * 2)
      context.fillStyle = '#7b4ee8'
      context.fill()
      context.strokeStyle = '#ffffff'
      context.lineWidth = 2
      context.stroke()
    })

    const image = canvas.toDataURL('image/png')
    if (!image.startsWith('data:image/png;base64,')) {
      throw new Error('The projection graph could not be encoded for the PDF.')
    }

    return image
  } finally {
    canvas.width = 0
    canvas.height = 0
    canvas.remove()
  }
}

export function buildReportFromCalculation(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Select a valid calculation before generating a report.')
  }

  const timeUnit = entry.timeUnit || entry.unit || 'years'
  const projectionData = buildProjectionChartData({ ...entry, timeUnit })
  const graphImage = drawProjectionChartCanvas({ ...entry, timeUnit })
  const finalProjection = projectionData[projectionData.length - 1]

  return {
    id: `report-${Date.now()}`,
    name: 'Simple Interest Calculation Report',
    date: entry.date || new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    type: getModeLabel(entry.mode || 'calculate-interest'),
    principal: Number(entry.principal || 0),
    rate: Number(entry.rate || 0),
    time: Number(entry.time || 0),
    timeUnit,
    interest: finalProjection.interest,
    totalAmount: finalProjection.amount,
    mode: entry.mode || 'calculate-interest',
    status: 'Generated',
    graphImage,
  }
}


export function createReportPdfBlob(report) {
  if (!report || typeof report !== 'object') {
    throw new Error('A calculation report is required before downloading a PDF.')
  }

  const graphImage = report.graphImage || drawProjectionChartCanvas(report)
  if (!graphImage) {
    throw new Error('The projection graph could not be added to the PDF. Please try again.')
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const formatAmount = (value) => `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value) || 0)}`
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 42
  const contentWidth = pageWidth - margin * 2

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F')
  doc.setTextColor(25, 39, 60)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Simple Interest Calculation Report', margin, 58)
  doc.setDrawColor(41, 125, 202)
  doc.setLineWidth(1.5)
  doc.line(margin, 74, pageWidth - margin, 74)

  doc.setFontSize(14)
  doc.text('Calculation Summary', margin, 105)
  doc.setFillColor(245, 248, 252)
  doc.setDrawColor(218, 226, 237)
  doc.roundedRect(margin, 118, contentWidth, 224, 8, 8, 'FD')

  const summaryRows = [
    ['Principal', formatAmount(report.principal)],
    ['Interest Rate', `${Number(report.rate || 0)}%`],
    ['Time', `${Number(report.time || 0)}`],
    ['Time Unit', report.timeUnit || 'years'],
    ['Simple Interest', formatAmount(report.interest)],
    ['Total Amount', formatAmount(report.totalAmount)],
    ['Calculation mode', report.type || getModeLabel(report.mode)],
    ['Calculation date', new Date(report.date || Date.now()).toLocaleString()],
  ]

  doc.setFontSize(10)
  summaryRows.forEach(([label, value], index) => {
    const y = 143 + index * 23
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(83, 100, 123)
    doc.text(label, margin + 16, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(25, 39, 60)
    doc.text(String(value), margin + 190, y, { maxWidth: contentWidth - 210 })
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(25, 39, 60)
  doc.text('Projection Graph', margin, 374)
  const imageProperties = doc.getImageProperties(graphImage)
  const imageWidth = contentWidth
  const imageHeight = imageWidth * (imageProperties.height / imageProperties.width)
  doc.addImage(graphImage, 'PNG', margin, 390, imageWidth, imageHeight, 'projection-graph', 'FAST')

  const detailsY = Math.min(390 + imageHeight + 32, 790)
  doc.setFontSize(11)
  doc.text('Calculation Details', margin, detailsY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date(report.generatedAt || Date.now()).toLocaleString()}`, margin, detailsY + 20)

  return doc.output('blob')
}

export function downloadReport(report) {
  const blob = createReportPdfBlob(report)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeName = (report.name || 'simple-interest-calculation-report')
    .replace(/\s+/g, '-')
    .toLowerCase()

  link.href = url
  link.download = `${safeName}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  return report
}
