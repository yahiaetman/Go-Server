import * as t from '../../src/types/types';
import * as c from '../../src/types/codecs';
import { format } from '../../src/types/time.utils';

test('integers', () => {
  for (let mul = 1; mul < 1e10; mul *= 10) {
    for (let num = 0; num < 10; num++) {
      const input = num * mul;
      const result = c.Time.decode(input);
      expect(result._tag).toBe('Right');
      if (result._tag == 'Right') expect(result.right).toBe(input);
    }
  }
});

test('floats', () => {
  for (let input = 0; input < 100; input += Math.E) {
    const result = c.Time.decode(input);
    expect(result._tag).toBe('Right');
    if (result._tag == 'Right') expect(result.right).toBe(input);
  }
});

test('strings-seconds-only', () => {
  for (let input = 0; input < 60; input++) {
    const result = c.Time.decode(input.toString());
    expect(result._tag).toBe('Right');
    if (result._tag == 'Right') expect(result.right).toBe(input * 1000);
  }
});

test('strings-seconds-ms-only', () => {
  for (let input = 0; input < 100; input += Math.E) {
    const result = c.Time.decode(input.toString());
    expect(result._tag).toBe('Right');
    if (result._tag == 'Right')
      expect(result.right).toBe(Math.floor(input * 1000));
  }
});

test('strings-negative-seconds-ms-only', () => {
  for (let input = 1; input < 100; input += Math.E) {
    const result = c.Time.decode((-input).toString());
    expect(result._tag).toBe('Right');
    if (result._tag == 'Right')
      expect(result.right).toBe(-Math.floor(input * 1000));
  }
});

test('strings-minute-seconds', () => {
  for (let input = 0; input < 60; input++) {
    const result = c.Time.decode(`${59 - input}:${input}`);
    expect(result._tag).toBe('Right');
    if (result._tag == 'Right')
      expect(result.right).toBe(((59 - input) * 60 + input) * 1000);
  }
});

test('strings-mix', () => {
  for (let input = 1, sign = 1; input < 1e10; input *= Math.E, sign *= -1) {
    const result = c.Time.decode(format(sign * input));
    expect(result._tag).toBe('Right');
    if (result._tag == 'Right')
      expect(result.right).toBe(sign * Math.floor(input));
  }
});
