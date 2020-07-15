const {
  verifyFile,
  storeFile,
  deleteFile,
  getFile
} = require('./library.js');

const uploadApiModel = (options = {}) => {
  const apiName = options.apiName || kebabCase(options.collection) || DEFAULT_NAME;

  return ({
    [`/${apiName}`] : {
      handlers : {
        'POST' : [
          verifyFile(options),
          storeFile(options)
        ]
      },
      '/:id' : {
        auth : {
          'PUT'   : false,
          'PATCH' : false
        },
        handlers : {
          'DELETE' : [
            deleteFile(options)
          ]
        },
        '/binary' : {
          auth : {
            'read'  : false,
            'write' : false,
            'GET'   : {requiresAuth : false}
          },
          handlers : {
            'GET' : [getFile(options)]
          }
        }
      }
    }
  });
}



module.exports = {uploadApiModel};
