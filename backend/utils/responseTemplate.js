const responseTemplate = {
    success: (message = 'Success', data = []) => ({
      status: true,
      message,
      data
    }),
  
  
    error: (message = 'Error occurred', data = []) => ({
      status: false,
      message,
      data
    }),
  
    validationError: (errors = []) => ({
      status: false,
      message: 'Validation failed',
      data: errors
    }),
  
    notFound: (message = 'Resource not found') => ({
      status: false,
      message,
      data: []
    }),
  
    unauthorized: (message = 'Unauthorized access') => ({
      status: false,
      message,
      data: []
    }),
  
    forbidden: (message = 'Access forbidden') => ({
      status: false,
      message,
      data: []
    })
  };
  
  module.exports = responseTemplate;
  
  