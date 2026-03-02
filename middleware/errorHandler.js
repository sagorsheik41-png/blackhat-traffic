/**
 * Global error handler middleware.
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err.stack || err.message || err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    if (req.accepts('html')) {
        return res.status(statusCode).render('errors/error', {
            user: req.user || null,
            statusCode,
            message: process.env.NODE_ENV === 'production' && statusCode === 500
                ? 'Something went wrong'
                : message,
        });
    }

    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production' && statusCode === 500
            ? 'Internal Server Error'
            : message,
    });
};

module.exports = errorHandler;
