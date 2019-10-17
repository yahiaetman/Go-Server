import * as io from 'io-ts';

export function withDefault<T extends io.Any>(type: T, defaultValue: io.TypeOf<T>): io.Type<io.TypeOf<T>, io.OutputOf<T>, io.InputOf<T>> {
    return new io.Type(
        `withDefault(${type.name}, ${JSON.stringify(defaultValue)})`,
        type.is,
        (v, c) => type.validate(typeof v === 'undefined' ? defaultValue : v, c),
        type.encode
    )
}