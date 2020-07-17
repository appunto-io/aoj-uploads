const fs = require('fs');

const LocalFilesHandler = require('../handlers/local');


const {
  NO_CONSTRAINTS,
  DEFAULT_NAME,
  DEFAULT_FIELD
} = require('./constants');

/*
Verifies that file is available in request body, that its size is ok and
that thet mime type is allowed.
 */
const verifyFile = (options) => async (data, flow, meta) => {
  console.info('uploadModel.verifyFile()');

  let {accept, fileField, maxSize} = options;

  fileField = fileField || DEFAULT_FIELD;

  if (accept) {
    accept = Array.isArray(accept) ? accept : [accept];
  }
  else {
    accept = NO_CONSTRAINTS;
  }

  maxSize = parseInt(maxSize, 10) || NO_CONSTRAINTS;

  const { request = {} } = meta;

  const { files = {} }   = request.native || {};
  const file             = files[fileField];

  if (!file) {
    const filesKeys = Object.keys(files).join(', ');

    console.warn(
      'uploadModel.verifyFile(): no file was found in request body. ' +
      `The following fields where found in request.files: [${filesKeys}]. ` +
      `Server expected the key '${fileField}'`
    );

    return flow.stop(400, 'Unable to find a file in request body');
  }

  if (maxSize !== NO_CONSTRAINTS && file.size > maxSize) {
    fs.unlink(file.tempFilePath, (err)=> {
      if (err) {
        console.warn(`uploadModel.verifyFile(): unable to remove file '${file.tempFilePath}'`);
      }
    });
    return flow.stop(413, `Maximum allowed file size is ${maxSize}`);
  }

  if (accept !== NO_CONSTRAINTS && accept.indexOf(file.mimetype) === -1) {
    fs.unlink(file.tempFilePath, (err)=> {
      if (err) {
        console.warn(`uploadModel.verifyFile(): unable to remove file '${file.tempFilePath}'`);
      }
    });

    console.info(`File format '${file.mimetype}' is not allowed. Accepted formats are : ${accept.join(', ')}`);
    return flow.stop(415, `File format '${file.mimetype}' is not allowed. Accepted formats are : ${accept.join(', ')}`);
  }

  return flow.continue({file});
};

/*
Store file in the provided storage path
 */
const storeFile = (options) => async (data, flow, meta) => {
  console.info('uploadModel.storeFile()');

  const { file }    = data;
  let handler       = options.handler;

  if (!handler) {
    console.warn('uploadModel.storeFile(): Upload handler is not defined, using default LocalFilesHandler');
    handler = LocalFilesHandler;
  }

  const uploadPath      = file.tempFilePath;
  const ownerId         = meta.auth.accountId || null;

  try {
    return flow.continue({
      name        : file.name,
      ownerId     : ownerId,
      storageName : await handler.store(uploadPath, options.handlerOptions || {}),
      mime        : file.mimetype,
      size        : file.size
    });
  }
  catch (error) {
    console.error(`uploadModel.storeFile(): the following error occurred during file upload: ${error}`);

    return flow.stop(400, 'Unable to store uploaded file');
  }
};


const deleteFile = (options) => async (data, flow, meta) => {
  console.info('UploadModel.deleteFile()');

  let { collection } = options;
  const { db } = meta.environment || {};

  let handler = options.handler;

  if (!handler) {
    console.warn('uploadModel.getFile(): Upload handler is not defined, using default LocalFilesHandler');
    handler = LocalFilesHandler;
  }

  collection = collection || DEFAULT_NAME;

  const id                   = meta.request.params.id || null;
  const document             = await db.readOne(collection, id);

  await handler.del(document, options.handlerOptions || {});

  return flow.continue(data);
};


const getFile = (options) => async (data, flow, meta) => {
  console.info('UploadModel.getFile()');

  let { collection } = options;
  const { db } = meta.environment || {};
  let handler = options.handler;

  if (!handler) {
    console.warn('uploadModel.getFile(): Upload handler is not defined, using default LocalFilesHandler');
    handler = LocalFilesHandler;
  }

  collection = collection || DEFAULT_NAME;

  const id = meta.request.params.id || null;

  if (!id) {
    console.error('uploadModel.getFile(): file id not specified.');

    return flow.stop(404);
  }

  try {
    const document = await db.readOne(collection, id);

    if (document) {
      const { name, mime } = document;
      const disposition = options.attachment ? `attachment; filename="${encodeURIComponent(name)}"` : 'inline';

      meta.response.headers['Content-Disposition'] = disposition;
      meta.response.headers['Content-Type']        = mime;
      meta.response.headers['Cache-Control']       = 'max-age=86400';

      return flow.continue(await handler.get(document, options.handlerOptions || {}));
    }

    return flow.stop(404);
  }
  catch (error) {
    console.error(
      `uploadModel.getFile(): the following error occurred while fetching file ${id} ` +
      `of collection ${collection}. ${error}`
    );

    return flow.stop(400, error);
  }
};

module.exports = {
  verifyFile,
  storeFile,
  deleteFile,
  getFile
}
