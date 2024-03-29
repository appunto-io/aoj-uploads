# aoj-uploads

Disclaimer : this library was build for and is used by [Appunto](https://www.appunto.io) for its own internal projets. It has bleeding edges. Use at you own risk.

## Concepts

`@appunto/aoj-uploads` provides file upload functionalities for `@appunto/api-on-json`.

The module exports the function `createUploadApiModel(options)` that created both a `DataModel` and `ApiModel` objects. These can be used as explained in `@appunto/api-on-json` documentation.

Actual file storage is done by a separated Handler object. Handler can be provided through `options` object. This allows library user to choose between different storage solutions (filesystem, OpenStack block storage, AWS S3, etc.).

A generator object can be provided to create file variants. This is useful for image resizing, etc.


## Installation

```
npm install @appunto/aoj-uploads
```

## API

### `createUploadApiModel`

The function accept a configuration object `options` and returns an object with two fields: `dataModel` and `apiModel`.

```js
const { dataModel, apiModel } = createUploadApiModel(options);
```

### Example

```js
const { Mongo }                = require('@appunto/api-on-json');
const { createUploadApiModel } = require('@appunto/aoj-uploads');

const { dataModel, apiModel } = createUploadApiModel({
  /*
   options, see below
  */
});

const db        = new Mongo(mongoUri);
const port      = 8080;
const jwtSecret = 'secret';

db.connect();
db.init(dataModel);

apiModel
  .toServer({db, jwtSecret})
  .listen(port);

```


#### options

Below you can find the list of options parameters and their default values.

```js
options = {
  /*
    API endpoint. Upload api is accessible at http(s)://<domain>/<apiName>.
    Example: https://localhost:8080/uploads

    If this is not defined, it defaults to the value of collection option
  */
  apiName : 'uploads',

  /*
    Name of the database table that stores file informations
  */
  collection : 'uploads',

  /*
    Accepted mime types or array of accepted mime types.
    Mime type filtering can be disabled with '*' (default).

    If a file with unsupported mime type is uploaded the server responds with
    a HTTP 415 error.

    Example : 'application/pdf'
    Example : ['image/png', 'image/jpeg']
  */
  accept : '*',

  /*
    Name of the form-data field that holds the file
  */
  fileField : 'file',

  /*
    Maximum file size in bytes. The default value ('*') disables size
    limitations. Files are nevertheless truncated at 500MB.

    If a file is larger than maxSize, a HTTP 413 error is generated.
  */
  maxSize : '*',

  /*
    If true, the file is served with 'Content-Disposition : Attachment' header.
    This implies that browser opens the file in another window or opens the 'save as' dialog.

    If false, the file is served with 'Content-Disposition : inline' header.
  */
  attachment : false,

  /*
    If true, looks for existing files with the same name and passes the existing storage names
    to handler.store. This should replace the existing files instead of creating new copies.
    Actual file replace implementation is left to handler instances.
  */
  replace : false,

  /*
    Handler object that implement the actual storage logic.

    See below for handler signature.

    The default handler uses local filesystem to store uploaded files.
  */
  handler : LocalFilesHandler,

  /*
    Options provided to handler.
  */
  handlerOptions : {},

  /*
    Optional variants generator. This is called before storing uploaded files.

    See below for signature.
  */
  generator : undefined,

  /*
    Options provided to generator
  */
  generatorOptions : {}
}
```

### Accessing the API

```
POST https://<host>/<apiName>

{
  "id" : "...",
  "name" : "filename.extension",
  "ownerId": null,
  "storageName": "...",
  "mimetype": "...",
  "size": 2399020,
  "createdAt": "2020-07-17T17:28:42.553Z",
  "updatedAt": "2020-07-17T17:28:42.553Z",
  variants : [{
    "variantId": "tiny",
    "name":"filename_tiny.extension",
    "storageName": "f5d40dd0-c852-11ea-9fbc-b9e17722a014",
    "mimetype": "image/png",
  }]
}
```

```
GET https://<host>/<apiName>/<id>

{
  same as POST
}
```

```
DELETE https://<host>/<apiName>/<id>

{}
```

```
GET https://<host>/<apiName>/<id>/binary

Returns file content
```

```
GET https://<host>/<apiName>/<id>/binary/<variantId>

Returns variant content
```

## Handlers

Handlers are objects with the following signature:

```js
handler = {
  // Store uploaded file
  store : async (uploadPath, options, name)  => storagePath,

  // Retrieve stored file content
  get   : async (storagePath, options) => content,

  // Delete stored file
  del   : async (storagePath, options) => void
}
```

`uploadPath` is the path to the uploaded file. This can be moved on a different directory or uploaded on a cloud service such as AWS S3 or some OpenStack provider.

`storagePath` is a `String` stored in database that should uniquely identify the stored file. This should be generated by `store` and is provided to `get` and `del`.

`options` implementation depending options.

`name` if provided, this should be the name of the stored file. Used when replace option is active.

### `LocalFilesHandler`

Stores files into local file system. Useful for local testing or single-server
configuration. Do not use this handler for K8s or AWS ElasticBeanStalk deployments.

```js
const { LocalFilesHandler } = require('@appunto/aoj-uploads');

const options = {
  // ...

  handler : LocalFilesHandler,
  handlerOptions : {
    // see below
  },

  // ...
};

// ...
```
#### `LocalFilesHandler` options

```js
const handlerOptions = {
  /*
    Path to the local directory where files should be stored.

    If not specified, 'del' and 'get' fails with an exception. 'store' does not fail but emits a warning in console. Uploaded files are stored into './'.
  */
  storagePath : undefined // REQUIRED
};
```

### `OvhObjectStorageHandler`

Stores files into OpenStack object storage provided by OVH.

```js
const { OvhObjectStorageHandler } = require('@appunto/aoj-uploads');

const options = {
  // ...

  handler : OvhObjectStorageHandler,
  handlerOptions : {
    // see below
  },

  // ...
};

// ...
```

#### `OvhObjectStorageHandler` options

```js
const handlerOptions = {
  /*
    OpenStack username created through OVH cloud console.

    WARNING: This is not the username that gives you access to the OVH mananger console.
  */
  ovhUsername : undefined, // REQUIRED

  /*
    OpenStack user password
  */
  ovhPassword : undefined, // REQUIRED

  /*
    ID of the OVH Cloud project. This can be found in Cloud section of OVH manager.
  */
  ovhTenantId : undefined, // REQUIRED

  /*
    The region where your project is hosted: GRA, SBG, etc..
  */
  ovhRegion : undefined, // REQUIRED

  /*
    The name of OpenStack container. This is the equivalent of bucket name in S3.
  */
  ovhContainer : undefined // REQUIRED
};
```


## Generators

Generator are functions with the following signature:

```js
generator = async (file, options) => ({
  variants : [{/* ... */}, /* ... */],
  cleanup : () => {/* ... */}
})
```

A generator accepts two arguments: `file` and `options`

`file` is an object with the following signature

```js
file = {
  name         : String // Name of the original file. Ex: flowers.jpeg,
  tempFilePath : String // Path to uploaded file
  mimetype     : String // Standard mimetype
}
```

`options` depends on actual generator implementation.

A generator should return an object with two fields: `variants` and `cleanup`.

`variants` is an array of object with the same signature of file, except that each object should contain one more field (`variantId`) that is used to discriminate between variants:

```js
variants = [
  {
    variantId    : String, // Identifies the variant. Ex: 'small', 'cropped', etc..
    name         : String, // Can be different from original name
    tempFilePath : String, // Path to variant file
    mimetype     : String  // Can be different from origin file
  },
  /// ...
]
```

`cleanup` is a function that is called after variants are stored. This should remove generated files, release resources, etc. It has no arguments and returns no value but can fail and throw an exception. This will not prevent files to be stored but a warning is emitted in console to prevent user that cleanup is not working.

### `ImageResizer`

Generic uploaded image resizer. It is a wrapper around the `sharp` library.

The generator fails with a 400 HTTP error if uploaded file is not an image. You should use the general `accept` option to filter mimetypes. This will generate a more meaningful 415 HTTP error.

```js
const { ImageResizer } = require('@appunto/aoj-uploads');

const options = {
  // ...

  generator : ImageResizer,
  generatorOptions : {
    sizes : [{
      id : 'small',
      width : 300,
      height : 300
    }]
  },

  // ...
};

// ...
```

#### `ImageResizer` options

```js
generatorOptions = {
  /*
    Array of size definition objects. Each element in the array will generate
    a variant.
  */
  sizes : []
}

```

A size definition object has the following signature:

```js
size = {
  /*
    Variant id. Ex: 'small', 'cropped', etc..
  */
  id : String

  /*
    Width and height. The resize behaviour depends on fit option.
  */
  width,
  height,

  /*
    One of 'cover', 'contain', 'fill', 'inside' or 'outside'.
    See sharp documentation for details:
    https://sharp.pixelplumbing.com/api-resize#resize
  */
  fit = 'inside',

  /*
    Resize position. Depends on fit.
    See sharp documentation for details:
    https://sharp.pixelplumbing.com/api-resize#resize
  */
  position = 'centre',

  /*
    Output format. One of 'jpeg', 'png', 'webp'.
    This defaults to input format, if this is a supported output format,
    otherwise 'jpeg' is used.
  */
  format = inputFormat || 'jpeg',

  /*
    Sharp output options. this object is provided as is to sharp 'toFormat'
    function. See sharp documentation for details:
    https://sharp.pixelplumbing.com/api-output#toformat
  */
  outputOptions = {},

  /*
    Mustache template that is used to generate the file name for each variant.
    The generator exposes three values:
       'name' : the original name
       'base' : the original name without extension
       'ext'  : original file name extension with dot.

    This can be useful to add prefix or change extension when output format is different from input. Ex: '{{ base }}_small.jpeg'.

    By default, the same name of the original file is used.
  */
  nameFormat = '{{ name }}'
}
```
