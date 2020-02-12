import * as io from 'io-ts';
import * as ioe from './io-ts.extensions';
import { Time } from './time.codec';

export const ServerConfiguration = io.interface(
  {
    host: ioe.withDefault(io.string, '0.0.0.0'),
    port: ioe.withDefault(io.number, 8080),
    pingInterval: ioe.withDefault(Time, 1000)
  },
  'ServerConfiguration'
);
