const mongoose              = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { Mongo }  = require('@appunto/api-on-json');
const { createUploadApiModel, ImageResizer } = require('../src/index');
const jwtSecret = "--default-jwt-secret--";

let mongoServer = new MongoMemoryServer();

mongoServer
.getConnectionString()
.then(async (mongoUri) => {
  let db = new Mongo(mongoUri);

  const { dataModel, apiModel } = createUploadApiModel({
    apiName     : 'apiName',
    collection  : 'secondTestTable',
    accept      : ['image/png', 'image/jpeg'],
    fileField   : 'uploadfilefield',
    maxSize     : 500000000,
    attachment  : true,
    handlerOptions : {
      storagePath : './test/var',
    },
    generator : ImageResizer,
    generatorOptions : {
      sizes : [
        {
          width : 50,
          height : 50,
          id : 'tiny',
          format : 'png',
          nameFormat : '{{ name }}{{ ext }}'
        },
        {
          width : 300,
          height : 300,
          id : 'small',
          format : 'jpeg',
          fit : 'outside',
          position : 'left bottom',
          nameFormat : '{{ base }}.jpeg'
        }
      ]
    }
  });

  await db.connect();
  await db.init(dataModel);


  server = apiModel.toServer({db, jwtSecret});

  await server.listen(3010);
});
