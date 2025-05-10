/**
 * Interfaz que define la estructura de un error.
 */
export type IError = {
  errorGroup: string;
  message: string;
  code: string;
  timestamp: string;
  stack: string;
};

/**
 * Interfaz que define la estructura de un error público.
 */
export type IErrorPublic = {
  message: string;
  code: string;
};
