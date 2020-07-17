const fs     = require('fs');
const mv     = require('mv');
const uuidv1 = require('uuid/v1');

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



const LocalFilesHandler = {
  store : async (uploadPath, options) => {
    const storagePath = options.storagePath || './';

    if (!options.storagePath) {
      console.warn(
        'uploadModel.storeFile(): storage folder not specified, using "./" instead. ' +
        'Please set options.storagePath="/path/to/your/storage/folder/".'
      );
    }

    const uuid            = uuidv1();
    const destinationPath = `${storagePath}/${uuid}`;

    await renamePromise(uploadPath, destinationPath);

    return uuid;
  },

  get : async (storageName, options) => {
    if (!options.storagePath) {
      console.error(
        'uploadModel.getFile(): storage folder not specified. Unable to serve requested file. ' +
        'Please set options.storagePath="/path/to/your/storage/folder/".'
      );

      throw 'Unable to find storage folder';
    }

    const storageFile = `${options.storagePath}/${storageName}`;
    const data        = await readPromise(storageFile);

    return data;
  },

  del : async (storageName, options) => {
    const storageFile = `${options.storagePath}/${storageName}`;

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
  }
};

module.exports = LocalFilesHandler;
