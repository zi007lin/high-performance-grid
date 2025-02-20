import { reverseString, reverseString2, generatePermutations } from '../src/reverseString';

test('reverseString', () => {
    debugger;
    expect(reverseString('hello')).toBe('olleh');
});

test('reverseString2', () => {
    debugger;
    expect(reverseString2('hello')).toBe('olleh');
});

test('generatePermutations', () => {
    debugger;
    expect(generatePermutations('abc')).toEqual(['abc', 'acb', 'bac', 'bca', 'cab', 'cba']);
});
