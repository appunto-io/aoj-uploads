const fs = require('fs');

const LocalFilesHandler = require('../handlers/local');


const {
  NO_CONSTRAINTS,
  DEFAULT_NAME,
  DEFAULT_FIELD
} = require('./constants');

/*
Verifies that file is available in request body, that its size is ok and
that the mime type is allowed.
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

  return flow.continue({ file });
};

/*
  Generate different variants of uploaded file if a generator is provided
*/
const generateVariants = (options) => async (data, flow, meta) => {
  const { file } = data;
  let variants = [], cleanup = () => {};

  if (options.generator) {
    try {
      const generated = await options.generator(file, options.generatorOptions || {});
      variants = generated.variants;
      cleanup  = generated.cleanup;
    }
    catch(error) {
      console.error(`uploadModel.generateVariants(): the following error occurred in generator: ${error}`);
    }
  }

  return flow.continue({file, variants, variantsCleanup : cleanup});
};

/*
Store file in the provided storage path
 */
const storeFile = (options) => async (data, flow, meta) => {
  console.info('uploadModel.storeFile()');

  let handler = options.handler;

  if (!handler) {
    console.warn('uploadModel.storeFile(): Upload handler is not defined, using default LocalFilesHandler');
    handler = LocalFilesHandler;
  }

  const { file, variants = [], variantsCleanup = () => {} } = data;
  const ownerId    = meta.auth.accountId || null;

  try {
    const storageName = await handler.store(file.tempFilePath, options.handlerOptions || {});
    const variantsNames = await Promise.all(variants.map(
      variant => handler.store(variant.tempFilePath, options.handlerOptions || {})
    ));

    // Cleanup before continuing
    try {
      fs.unlink(file.tempFilePath, err => {/* do nothing, file might just be moved */});
      variantsCleanup();
    }
    catch(error) {
      console.warn(`uploadModel.storeFile(): cleanup failed due to following error: ${error}`);
    }

    return flow.continue({
      name        : file.name,
      ownerId     : ownerId,
      storageName : storageName,
      mimetype    : file.mimetype,
      size        : file.size,
      variants    : variants.map((variant, index) => ({
        variantId   : variant.variantId,
        name        : variant.name || file.name,
        storageName : variantsNames[index],
        size        : variant.size,
        mimetype    : variant.mimetype || file.mimetype
      }))
    });
  }
  catch (error) {
    console.error(`uploadModel.storeFile(): the following error occurred during file upload: ${error}`);

    return flow.stop(400, 'Unable to store uploaded file');
  }
};

/*
 Retrieve file
*/
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

  const id        = meta.request.params.id;
  const variantId = meta.request.params.variantId;

  if (!id) {
    console.error('uploadModel.getFile(): file id not specified.');

    return flow.stop(404);
  }

  try {
    const document = await db.readOne(collection, id);

    if (document) {
      let { name, mimetype, storageName, variants = [] } = document;

      if (variantId) {
        const storedVariant = variants.find(variant => variant.variantId === variantId);

        if (storedVariant) {
          name        = storedVariant.name,
          mimetype    = storedVariant.mimetype,
          storageName = storedVariant.storageName
        }
        else {
          return flow.stop(404);
        }
      }

      const disposition = options.attachment ? `attachment; filename="${encodeURIComponent(name)}"` : 'inline';
      meta.response.headers['Content-Disposition'] = disposition;
      meta.response.headers['Content-Type']        = mimetype;
      meta.response.headers['Cache-Control']       = 'max-age=86400';

      return flow.continue(await handler.get(storageName, options.handlerOptions || {}));
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

/*
  Deletes a stored file
*/
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

  await handler.del(document.storageName, options.handlerOptions || {});
  await Promise.all((document.variants || []).map(
    variant => handler.del(variant.storageName, options.handlerOptions || {})
  ));

  return flow.continue(data);
};


module.exports = {
  verifyFile,
  generateVariants,
  storeFile,
  deleteFile,
  getFile
}
