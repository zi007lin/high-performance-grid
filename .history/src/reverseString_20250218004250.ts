export function reverseString(str: string): string {
    return str.split('').reverse().join('');
}

export function reverseString2(str: string): string {
    if (str.length <= 1) {
        return str;
    }
    return reverseString2(str.substring(1)) + str[0];
}
    