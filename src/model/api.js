const kebabCase = require('lodash.kebabcase');

const {
  DEFAULT_NAME
} = require('./constants');

const {
  verifyFile,
  generateVariants,
  storeFile,
  deleteFile,
  getFile,
  handlePost
} = require('./library.js');

const uploadApiModel = (options = {}) => {
  const apiName = options.apiName || kebabCase(options.collection) || DEFAULT_NAME;

  return ({
    [`/${apiName}`] : {
      handlers : {
        'POST' : [
          verifyFile(options),
          generateVariants(options),
          storeFile(options),
          handlePost(options)
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
          },
          '/:variantId' : {
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
    }
  });
}



module.exports = {uploadApiModel};
