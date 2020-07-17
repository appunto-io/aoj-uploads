const OVHStorage = require('node-ovh-objectstorage');
const uuidv1     = require('uuid/v1');

const OvhObjectStorageHandler = {
  store : async (uploadPath, options) => {
    (names => {
      names.forEach(name => {
        if (!options[name]) {
          throw `OvhObjectStorageHandler.store(): Missing configuration parameter ${name}`;
        }
      });
    })(['ovhUsername', 'ovhPassword', 'ovhTenantId', 'ovhRegion', 'ovhContainer']);

    var config = {
      username : options.ovhUsername,
      password : options.ovhPassword,
      authURL  : 'https://auth.cloud.ovh.net/v3/auth',
      tenantId : options.ovhTenantId,
      region   : options.ovhRegion
    };

    const uuid    = uuidv1();
		const storage = new OVHStorage(config);

		await storage.connection();
    await storage.objects().save(uploadPath, `/${options.ovhContainer}/${uuid}`)

    return uuid;
  },

  get : async (storageName, options) => {
    (names => {
      names.forEach(name => {
        if (!options[name]) {
          throw `OvhObjectStorageHandler.store(): Missing configuration parameter ${name}`;
        }
      });
    })(['ovhUsername', 'ovhPassword', 'ovhTenantId', 'ovhRegion', 'ovhContainer']);

    var config = {
      username : options.ovhUsername,
      password : options.ovhPassword,
      authURL  : 'https://auth.cloud.ovh.net/v3/auth',
      tenantId : options.ovhTenantId,
      region   : options.ovhRegion
    };

		const storage = new OVHStorage(config);

		await storage.connection();
    const { content } = await storage.objects().get(`/${options.ovhContainer}/${storageName}`);

    return content;
  },

  del : async (storageName, options) => {
    (names => {
      names.forEach(name => {
        if (!options[name]) {
          throw `OvhObjectStorageHandler.store(): Missing configuration parameter ${name}`;
        }
      });
    })(['ovhUsername', 'ovhPassword', 'ovhTenantId', 'ovhRegion', 'ovhContainer']);

    var config = {
      username : options.ovhUsername,
      password : options.ovhPassword,
      authURL  : 'https://auth.cloud.ovh.net/v3/auth',
      tenantId : options.ovhTenantId,
      region   : options.ovhRegion
    };

		const storage = new OVHStorage(config);

		await storage.connection();
    await storage.objects().delete(`/${options.ovhContainer}/${storageName}`);
  }
};

module.exports = OvhObjectStorageHandler;
