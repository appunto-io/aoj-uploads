const { DEFAULT_NAME } = require('./constants');

const uploadDataModel = (options = {}) => ({
  [options.collection || DEFAULT_NAME] : {
    schema : {
      'name'        : {type : 'String', required : true},
      'ownerId'     : {type : 'Id', collection : options.ownerCollection || 'accounts'},
      'storageName' : {type : 'String', required : true},
      'mime'        : {type : 'String'},
      'size'        : {type : 'Number'}
    }
  }
});

module.exports= {uploadDataModel};
