import { MicroserviceFactory } from './microservice-provider';
import { MicroservicesNames } from './microservices-names.enum';

export const ExampleMicroservice = MicroserviceFactory(MicroservicesNames.EXAMPLE);
