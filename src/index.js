const { createUploadApiModel } = require('./createuploadapimodel.js');
const LocalFilesHandler        = require('./handlers/local.js');
const OvhObjectStorageHandler  = require('./handlers/ovh.js');
const ImageResizer             = require('./generators/imageresizer.js');

module.exports = {
  createUploadApiModel,
  LocalFilesHandler,
  OvhObjectStorageHandler,
  ImageResizer
};
