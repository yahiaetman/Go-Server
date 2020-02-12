import * as io from 'io-ts';

/**
 * Create and io-ts type with a default value
 * @param {T} type the underlying type
 * @param {io.TypeOf<T>} defaultValue the default value
 * @return {io.Type<io.TypeOf<T>, io.OutputOf<T>, io.InputOf<T>>}
 */
export function withDefault<T extends io.Any>(
  type: T,
  defaultValue: io.TypeOf<T>
): io.Type<io.TypeOf<T>, io.OutputOf<T>, io.InputOf<T>> {
  return new io.Type(
    `withDefault(${type.name}, ${JSON.stringify(defaultValue)})`,
    type.is,
    (v, c) => type.validate(typeof v === 'undefined' ? defaultValue : v, c),
    type.encode
  );
}
