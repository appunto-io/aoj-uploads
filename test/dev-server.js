const mongoose              = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { Mongo, DataModel, ApiModel }  = require('@appunto/api-on-json');
const { createUploadApiModel, ImageResizer } = require('../src/index');
const jwtSecret = "--default-jwt-secret--";

let mongoServer = new MongoMemoryServer();

mongoServer
.getConnectionString()
.then(async (mongoUri) => {
  let db = new Mongo(mongoUri);

  const { dataModel : dataModel1, apiModel : apiModel1 } = createUploadApiModel({
    collection  : 'logos',
    accept      : ['image/png', 'image/jpeg'],
    handlerOptions : {
      storagePath : './test/var',
    },
    generator : ImageResizer,
    generatorOptions : {
      sizes : [
        {
          width : 100,
          height : 100,
          id : 'small',
          format : 'jpeg',
          fit : 'inside',
          nameFormat : '{{ base }}.jpeg'
        }
      ]
    }
  });

  const { dataModel : dataModel2, apiModel : apiModel2 } = createUploadApiModel({
    collection  : 'avatars',
    accept      : ['image/png', 'image/jpeg'],
    handlerOptions : {
      storagePath : './test/var',
    },
    generator : ImageResizer,
    generatorOptions : {
      sizes : [
        {
          width : 300,
          height : 300,
          id : 'small',
          format : 'jpeg',
          fit : 'inside',
          nameFormat : '{{ base }}.jpeg'
        }
      ]
    }
  });

  const dataModel = new DataModel(dataModel1, dataModel2);
  const apiModel  = new ApiModel(apiModel1, apiModel2);

  await db.connect();
  await db.init(dataModel);

  server = apiModel.toServer({db, jwtSecret});

  await server.listen(3010);
});
