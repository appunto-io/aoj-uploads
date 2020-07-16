const { createUploadApiModel } = require('./createuploadapimodel.js');
const LocalFilesHandler        = require('./handlers/local.js');
const OvhObjectStorageHandler  = require('./handlers/ovh.js');

module.exports = {
  createUploadApiModel,
  LocalFilesHandler,
  OvhObjectStorageHandler
};
