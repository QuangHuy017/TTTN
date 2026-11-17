export function notFound(req, res) {
  res.status(404).json({ message: 'API not found.' });
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.parse.failed' ? 400 : error.status || 500;
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Ảnh vượt quá 10 MB. Vui lòng chọn ảnh nhỏ hơn.' });
  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 ? 'Internal server error.' : error.message });
}

