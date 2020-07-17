const fs     = require('fs');
const tmp    = require('tmp');
const uuidv1 = require('uuid/v1');

const DummyGenerator = async (file, options) => {
  const { variantIds = [] } = options;
  const variants = [];
  const tmpobj = tmp.dirSync();


  variantIds.forEach(variantId => {
    const uuid = uuidv1();

    fs.copyFileSync(file.tempFilePath, `${tmpobj.name}/${uuid}`);

    variants.push({
      variantId,
      name : `${variantId}_${file.name}`,
      tempFilePath : `${tmpobj.name}/${uuid}`
    });
  });

  return {
    variants,
    cleanup : () => {
      variants.forEach(variant => {
        fs.unlink(variant.tempFilePath, err => {});
      });
      tmpobj.removeCallback();
    }
  };
};


module.exports = DummyGenerator;
