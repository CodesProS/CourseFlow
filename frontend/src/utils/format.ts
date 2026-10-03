const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "for", "in", "of", "on", "or", "the", "to", "with"]);
const ROMAN = /^(i|ii|iii|iv|v|vi)$/i;

// Catalog names are all caps ("PROGRAMMING I"); show them in title case.
export function formatCourseName(name: string): string {
    if (name !== name.toUpperCase()) return name;
    return name
        .toLowerCase()
        .split(" ")
        .map((word, i) => {
            if (ROMAN.test(word)) return word.toUpperCase();
            if (i > 0 && SMALL_WORDS.has(word)) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
}

// "3 credits", or "~3 credits" when the catalog had no credit count.
export function formatCredits(course: { credits: number; creditsEstimated?: boolean }, short = false): string {
    const unit = short ? "cr" : course.credits === 1 ? "credit" : "credits";
    return `${course.creditsEstimated ? "~" : ""}${course.credits} ${unit}`;
}
