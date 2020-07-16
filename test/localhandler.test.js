const mongoose              = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { Mongo, DataModel }  = require('@appunto/api-on-json');
const { createUploadApiModel } = require('../src/index');

const {
  defaultTestSuite,
  testSuiteWithOptions,
  jwtSecret } = require('./all-generic.js');

describe('aoj-uploads test suite mongoose', async function() {
  before((done) => {
    this.mongoServer = new MongoMemoryServer();
    this.mongoServer
    .getConnectionString()
    .then(async (mongoUri) => {
      let dbTestSuite1 = new Mongo(mongoUri);
      let dbTestSuite2 = new Mongo(mongoUri);

      const { dataModel : dataModel1, apiModel : apiModel1 } = createUploadApiModel({storagePath : './test/var'});
      const { dataModel : dataModel2, apiModel : apiModel2 } = createUploadApiModel({
        apiName     : 'apiName',
        collection  : 'secondTestTable',
        accept      : 'application/pdf',
        fileField   : 'uploadfilefield',
        maxSize     : 1500000,
        storagePath : './test/var',
        attachment  : true
      });

      await dbTestSuite1.connect();
      await dbTestSuite2.connect();

      await dbTestSuite1.init(dataModel1);
      await dbTestSuite2.init(dataModel2);


      this.server1  = apiModel1.toServer({db : dbTestSuite1, jwtSecret});
      this.server2  = apiModel2.toServer({db : dbTestSuite2, jwtSecret});

      await this.server1.listen(3003);
      await this.server2.listen(3004);

      done();
    });
  });
  after(async () => {
    await this.server1.close();
    // await this.server2.close();
    await mongoose.disconnect();
    await this.mongoServer.stop();
  });

  defaultTestSuite(3003);
  testSuiteWithOptions(3004);
});
