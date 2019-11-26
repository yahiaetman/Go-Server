import * as io from 'io-ts';
import * as c from './server-configuration.codec';

export type ServerConfiguration = io.TypeOf<typeof c.ServerConfiguration>;