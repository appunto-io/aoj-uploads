const fs       = require('fs');
const path     = require('path');
const tmp      = require('tmp');
const uuidv1   = require('uuid/v1');
const sharp    = require('sharp');
const Mustache = require('mustache');

const READ_FORMATS         = ['jpeg', 'png', 'webp', 'tiff', 'gif'];
const WRITE_FORMATS        = ['jpeg', 'png', 'webp'];
const DEFAULT_WRITE_FORMAT = 'jpeg';


const ImageResizer = async (file, options) => {
  const basename = path.basename(file.name);
  const extname  = path.extname(file.name);
  const filename = path.basename(file.name, extname);

  const { sizes = [] } = options;
  const variants = [];
  const tmpobj = tmp.dirSync();
  const originalFormat = file.mimetype.split('/')[1];
  let defaultOutputFormat = originalFormat;

  if(!READ_FORMATS.includes(originalFormat)) {
    throw `ImageResizer(): input file has unknown format ${file.mimetype}. Allowed formats are: ${READ_FORMATS.join(', ')}.`;
  }

  if(!WRITE_FORMATS.includes(defaultOutputFormat)) {
    defaultOutputFormat = DEFAULT_WRITE_FORMAT;
  }

  for(let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex++) {
    const size = sizes[sizeIndex];
    const {
      id,
      width,
      height,
      fit = 'inside',
      position = 'centre',
      format = defaultOutputFormat,
      outputOptions = {},
      nameFormat = '{{ name }}'
    } = size;

    if (!id) {
      console.warn(`ImageResizer(): each size specification shall provide an 'id' field: size ignored`);
      continue;
    }

    const uuid = uuidv1();
    const fileName = `${tmpobj.name}/${uuid}`;

    await sharp(file.tempFilePath)
      .rotate()
      .resize(width, height, {fit, position})
      .toFormat(format, outputOptions)
      .toFile(fileName);

    variants.push({
      variantId : id,
      mimetype : `image/${format}`,
      name : Mustache.render(nameFormat, {
        name : basename,
        ext  : extname,
        base : filename
      }),
      tempFilePath : fileName
    });
  }

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

module.exports = ImageResizer;
