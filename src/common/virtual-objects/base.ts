import { Schema } from 'mongoose';

export abstract class Base {
  _id?: Schema.Types.ObjectId;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: any;
}
