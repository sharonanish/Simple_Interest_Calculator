export function notFoundHandler(_request, response) {
  response.status(404).json({
    success: false,
    message: 'Route not found',
  })
}
