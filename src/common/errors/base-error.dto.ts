export interface BaseErrorDTO {
  name?: string;
  message?: string;
  cause?: unknown;
  data?: MetadataError;
  response?: {
    data?: MetadataError;
  };
}

interface MetadataError {
  message?: string;
  timestamp?: string;
  status?: string;
  error?: string;
  path?: string;
}

export const defaultError: BaseErrorDTO = {
  name: '',
  message: '',
  cause: {},
};
