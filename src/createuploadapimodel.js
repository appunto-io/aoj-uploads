const kebabCase               = require('lodash.kebabcase');
const fileUpload              = require('express-fileupload');
const { ApiModel, DataModel } = require('@appunto/api-on-json');
const { uploadDataModel }     = require('./model/data.js');
const { uploadApiModel }      = require('./model/api.js');

const {
  DEFAULT_NAME
} = require('./model/constants');

function createUploadApiModel(options = {}) {
  const apiName     = options.apiName || kebabCase(options.collection) || DEFAULT_NAME;
  const tempFileDir = options.tempFileDir || __dirname + '/tmp/';
  const maxSize     = options.maxSize || 500 * 1024 * 1024;

  const dataModel        = new DataModel(uploadDataModel(options));
  const apiFromDataModel = dataModel.toApi();

  const renamedApiFromDataModel = {
    [`/${apiName}`] : apiFromDataModel.get()[`/${kebabCase(options.collection || DEFAULT_NAME)}`]
  };

  const apiModel = new ApiModel(uploadApiModel(options));
  apiModel.addModel(renamedApiFromDataModel);

  apiModel.addMiddleware(fileUpload({
    limits: { fileSize: maxSize + 10 }, // Download some spare bite to let library trig the 413 error
    useTempFiles: true,
    tempFileDir
  })
  ,`/${apiName}`);

  return {apiModel, dataModel};
}

module.exports = {createUploadApiModel}
