  /*****************************************
   * Data model
   */

  import { ApiModel, DataModel } from "@appunto/api-on-json";

  export declare function createUploadApiModel(options?: {
    apiName?: string;
    collection?: string;
    accept?: string | string[];
    fileField?: string;
    maxSize?: string | number;
    attachment?: boolean;
    handler?: any;
    handlerOptions?: { storagePath: string };
    generator?: (
      file: {
        name: string;
        tempFilePath: string;
        mimeType: string;
      },
      options?:{
        sizes: [
          ...{
            id: string;
            width: number;
            height: number;
            format: string;
          }
        ];}
    ) => {
      variant: {
        variantId: string;
        name: string;
        tempFilePath: string;
        mimetype: string;
      };
      cleanup: unknown;
    };
    generatorOptions?: {
      sizes: [
        ...{
          id: string;
          width: number;
          height: number;
          format: string;
        }
      ];
    };
  }): { dataModel: DataModel; apiModel: ApiModel };


export declare const LocalFilesHandler = {
   store:(uploadPath:string, options?:{storagePath?:string}) => {uuid} ,
   get:(storageName:string, options?:{storagePath?:string}) => {data} ,
   del:(uploadPath:string, options?:{storagePath?:string}) => {}
}

export declare function ImageResizer(file: {
  name: string;
  tempFilePath: string;
  mimeType: string;
}, options?:{
  sizes: [
    ...{
      id: string;
      width: number;
      height: number;
      format: string;
    }
  ];
}) : {
  variant: {
    variantId: string;
    name: string;
    tempFilePath: string;
    mimetype: string;
  };
  cleanup: unknown;
};