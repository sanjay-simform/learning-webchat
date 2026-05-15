declare global {
  namespace Express {
    export interface Request {
      user: { id: string; username: string };
    }

    export namespace Multer {
      export interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
      }
    }
  }
}

export {};
