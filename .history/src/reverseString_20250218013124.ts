export function reverseString(str: string): string {
    return str.split('').reverse().join('');
}

export function reverseString2(str: string): string {
    if (str.length <= 1) {
        return str;
    }
    return reverseString2(str.substring(1)) + str[0];
}


/**
 * Generates all possible permutations of a given string
 * @param str - The input string to generate permutations from
 * @returns An array containing all possible permutations
 */
export function generatePermutations(str: string): string[] {
    // Base cases
    if (str.length <= 1) return [str];
    if (str.length === 2) return [str, str[1] + str[0]];

    const result: string[] = [];

    // Iterate through each character in the string
    for (let i = 0; i < str.length; i++) {
        const currentChar = str[i];

        // Get the string without the current character
        const remainingChars = str.slice(0, i) + str.slice(i + 1);

        // Recursively get permutations of the remaining characters
        const subPermutations = generatePermutations(remainingChars);

        // Add current character to the beginning of each sub-permutation
        for (const subPerm of subPermutations) {
            result.push(currentChar + subPerm);
        }
    }

    return result;
}
