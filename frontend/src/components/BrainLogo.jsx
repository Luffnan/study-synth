// Brain icon — traced from provided asset
export default function BrainLogo({ className = 'w-6 h-6' }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 12
           C50 12 44 10 38 13
           C32 16 28 22 27 27
           C22 26 17 29 15 34
           C13 39 15 45 19 48
           C15 51 13 57 16 62
           C19 67 25 69 30 67
           C30 72 34 77 40 79
           C46 81 50 78 50 78

           C50 78 54 81 60 79
           C66 77 70 72 70 67
           C75 69 81 67 84 62
           C87 57 85 51 81 48
           C85 45 87 39 85 34
           C83 29 78 26 73 27
           C72 22 68 16 62 13
           C56 10 50 12 50 12Z"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M50 15 L50 78" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M35 30 C32 35 33 42 38 45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 50 C27 55 30 62 35 63" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M65 30 C68 35 67 42 62 45" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 50 C73 55 70 62 65 63" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
