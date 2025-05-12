import { ErrorBaseEnum } from './error-base.enums';
import { IError, IErrorPublic } from './error-base.types';

/**
 * Clase base para manejar errores y mantener un registro en un archivo JSON.
 */
export class ErrorBase {
  public errorGroup: string;
  public message: string;
  public code: string;
  public timestamp: string;
  public stack: string;
  private appId: string = ErrorBaseEnum.App;

  /**
   * Constructor para inicializar un error con un ID, mensaje y código.
   * @param errorGroup - El grupo de error.
   * @param code - El código del error.
   * @param error - El error original.
   */
  constructor(errorGroup: string, code: string, error: unknown) {
    this.errorGroup = errorGroup;
    this.message = this.extractMessage(error);
    this.code = `${this.appId}-${errorGroup}-${code}`;
    this.timestamp = new Date().toISOString();
    this.stack = this.extractStack(error);
  }

  /**
   * Extrae el mensaje del error original.
   * @param error - El error original.
   * @returns El mensaje del error.
   */
  private extractMessage(error: unknown): string {
    if (error instanceof ErrorBase) return error.message;
    if (typeof error === 'string' && error !== null) return String(error);
    if (typeof error === 'object' && error !== null) {
      if ((error as any)?.response?.data?.message) return String((error as any)?.response?.data?.message);
      if ((error as any)?.response?.message) return String((error as any)?.response?.message);
      if ((error as any)?.data?.message) return String((error as any)?.data?.message);
      if ((error as any)?.message) return String((error as any)?.message);
    }

    return '';
  }

  /**
   * Extrae la pila de errores del error original.
   * @param error - El error original.
   * @returns La pila de errores.
   */
  private extractStack(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      if ((error as any)?.response?.data?.stack) return String((error as any)?.response?.data?.stack);
      if ((error as any)?.response?.stack) return String((error as any)?.response?.stack);
      if ((error as any)?.data?.stack) return String((error as any)?.data?.stack);
      if ((error as any)?.stack) return String((error as any)?.stack);
    }

    return '';
  }

  /**
   * Método para obtener un objeto ErrorDTO.
   * @returns Un objeto ErrorDTO con el mensaje y el código del error.
   */
  public getErrorPublic(): IErrorPublic {
    return {
      message: this.message,
      code: this.code,
    };
  }

  /**
   * Método para obtener un objeto Error completo.
   * @returns Un objeto IError con todos los datos del error.
   */
  public getError(): IError {
    return {
      message: this.message,
      stack: this.stack,
      code: this.code,
      errorGroup: this.errorGroup,
      timestamp: this.timestamp,
    };
  }
}
