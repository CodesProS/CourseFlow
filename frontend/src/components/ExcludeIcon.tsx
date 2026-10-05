// Circle with a slash: "don't suggest this". Inherits color from the text.
export default function ExcludeIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4 12 12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}
