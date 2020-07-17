require('dotenv').config()
const mongoose              = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { Mongo, DataModel }  = require('@appunto/api-on-json');
const { createUploadApiModel, OvhObjectStorageHandler } = require('../src/index');

const {
  defaultTestSuite,
  jwtSecret } = require('./all-generic.js');

describe('aoj-uploads test suite mongoose', async function() {
  before((done) => {
    this.mongoServer = new MongoMemoryServer();
    this.mongoServer
    .getConnectionString()
    .then(async (mongoUri) => {
      let db = new Mongo(mongoUri);

      const { dataModel, apiModel } = createUploadApiModel({
        handler : OvhObjectStorageHandler,
        handlerOptions : {
          ovhUsername  : process.env.OVH_USERNAME,
          ovhPassword  : process.env.OVH_PASSWORD,
          ovhTenantId  : process.env.OVH_TENANTID,
          ovhRegion    : process.env.OVH_REGION,
          ovhContainer : process.env.OVH_CONTAINER
        }
      });

      await db.connect();
      await db.init(dataModel);

      this.server = apiModel.toServer({db, jwtSecret});

      await this.server.listen(3003);

      done();
    });
  });
  after(async () => {
    await this.server.close();
    // await this.server2.close();
    await mongoose.disconnect();
    await this.mongoServer.stop();
  });

  defaultTestSuite(3003);
});
