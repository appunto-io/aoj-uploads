const mongoose              = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { Mongo }  = require('@appunto/api-on-json');
const { createUploadApiModel } = require('../src/index');

const jwtSecret = "--default-jwt-secret--";

let mongoServer = new MongoMemoryServer();

mongoServer
.getConnectionString()
.then(async (mongoUri) => {
  let db = new Mongo(mongoUri);

  const { dataModel, apiModel } = createUploadApiModel({
    apiName     : 'apiName',
    collection  : 'secondTestTable',
    accept      : 'application/pdf',
    fileField   : 'uploadfilefield',
    maxSize     : 1500000,
    attachment  : true,
    handlerOptions : {
      storagePath : './test/var',
    }
  });

  await db.connect();
  await db.init(dataModel);


  server = apiModel.toServer({db, jwtSecret});

  await server.listen(3003);
});
