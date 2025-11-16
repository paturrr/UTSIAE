const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  let error = {
    status: err.statusCode || 500,
    message: err.message || 'Internal Server Error'
  };
  
  if (err.name === 'CastError') {
    error = {
      status: 400,
      message: 'Invalid ID format'
    };
  }
  
  if (err.code === 11000) {
    error = {
      status: 400,
      message: 'Duplicate field value entered'
    };
  }
  
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = {
      status: 400,
      message: message.join(', ')
    };
  }
  
  res.status(error.status).json({
    error: 'Server Error',
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  errorHandler
};
