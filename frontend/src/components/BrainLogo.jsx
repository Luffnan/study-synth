export default function BrainLogo({ className = 'w-6 h-6', invert = true }) {
  return (
    <img
      src="/brain.png"
      alt="StudySynth"
      className={className}
      style={invert ? { filter: 'brightness(0) invert(1)' } : undefined}
    />
  );
}
