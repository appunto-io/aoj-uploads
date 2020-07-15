const fs     = require('fs');
const mv     = require('mv');
const uuidv1 = require('uuid/v1');

const {
  NO_CONSTRAINTS,
  DEFAULT_NAME
} = require('./constants');

const renamePromise = (oldPath, newPath) => new Promise((resolve, reject) => {
  mv(oldPath, newPath, (err) => {
    if (err) {reject(err);}
    else     {resolve();}
  });
});


const readPromise = (path) => new Promise((resolve, reject) => {
  fs.readFile(path, (err, data) => {
    if (err) {reject(err);}
    else     {resolve(data);}
  });
});


/*
Verifies that file is available in request body, that its size is ok and
that thet mime type is allowed.
 */
const verifyFile = (options) => async (data, flow, meta) => {
  console.info('uploadModel.verifyFile()');

  let {accept, fileField, maxSize} = options;

  fileField = fileField || 'file';

  if (accept) {
    accept = Array.isArray(accept) ? array : [array];
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

  if (accept !== NO_CONSTRAINTS && accept.indexOf(file.type) === -1) {
    fs.unlink(file.tempFilePath, (err)=> {
      if (err) {
        console.warn(`uploadModel.verifyFile(): unable to remove file '${file.tempFilePath}'`);
      }
    });
    return flow.stop(415, `File format '${file.type}' is not allowed. Accepted formats are : ${accept.join(', ')}`);
  }

  return flow.continue({file});
};

/*
Store file in the provided storage path
 */
const storeFile = (options) => async (data, flow, meta) => {
  console.info('uploadModel.storeFile()');

  const { file }    = data;
  const storagePath = options.storagePath || './';

  if (!options.storagePath) {
    console.warn(
      'uploadModel.storeFile(): storage folder not specified, using "./" instead. ' +
      'Please set options.storagePath="/path/to/your/storage/folder/".'
    );
  }

  const uuid            = uuidv1();
  const uploadPath      = file.tempFilePath;
  const destinationPath = `${storagePath}/${uuid}`;
  const ownerId         = meta.auth.accountId || null;

  try {
    console.log(file)
    await renamePromise(uploadPath, destinationPath);

    return flow.continue({
      name        : file.name,
      ownerId     : ownerId,
      storageName : uuid,
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

  const { storagePath, collection } = options;
  const { db } = meta.environment || {};

  const id                   = meta.request.params.id || null;
  const document             = await db.readOne(collection, id);
  const { storageName = '' } = document;

  const storageFile = `${storagePath}/${storageName}`;

  if (!options.storagePath) {
    console.error(
      'uploadModel.deleteFile(): storage folder not specified. ' +
      `Unable to delete file ${storageName} from ${options.collection} storage. ` +
      'Please set options.storagePath="/path/to/your/storage/folder/".'
    );
  }
  else {
    fs.unlinkSync(storageFile);
  }

  return flow.continue(data);
};


const getFile = (options) => async (data, flow, meta) => {
  console.info('UploadModel.getFile()');

  let { storagePath, collection, attachment } = options;
  const { db } = meta.environment || {};

  collection = collection || DEFAULT_NAME;

  const id = meta.request.params.id || null;

  if (!options.storagePath) {
    console.error(
      'uploadModel.getFile(): storage folder not specified. Unable to serve requested file. ' +
      'Please set options.storagePath="/path/to/your/storage/folder/".'
    );

    return flow.stop(404, 'Unable to find storage folder');
  }

  if (!options.storagePath) {
    console.error('uploadModel.getFile(): file id not specified.');

    return flow.stop(404);
  }

  try {
    const document = await db.readOne(collection, id);

    if (document) {
      const { storageName, name, mime } = document;

      const storageFile = `${storagePath}/${storageName}`;
      const data        = await readPromise(storageFile);

      const disposition = attachment ? `attachment; filename="${encodeURIComponent(name)}"` : 'inline';

      meta.response.headers['Content-Disposition'] = disposition;
      meta.response.headers['Content-Type'] = mime;
      meta.response.headers['Cache-Control'] = 'max-age=86400';
      meta.response.sendRaw = true;

      return flow.continue(data);
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
