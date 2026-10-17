export function errorHandler(error, _request, response, _next) {
  const statusCode = Number.isInteger(error.statusCode)
    ? error.statusCode
    : Number.isInteger(error.status) ? error.status : 500

  response.status(statusCode).json({
    success: false,
    message: error.publicMessage || (statusCode >= 500 ? 'Internal server error' : error.message),
  })
}
