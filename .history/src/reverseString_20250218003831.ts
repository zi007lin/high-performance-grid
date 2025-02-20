export function reverseString(str: string): string {
    return str.split('').reverse().join('');
}

export default reverseString;


export function reverseString2(s: string): string {
    if (s.length <= 1) {
        return s;
    }
    return reverseString(s.substring(1)) + s[0];
}
