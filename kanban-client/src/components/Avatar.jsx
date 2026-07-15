// Generates a consistent color from a name string
const colors = ['#14E0C4', '#3B82F6', '#9C8CFF', '#F5A623', '#EC5B87', '#63C99A'];

function colorFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function Avatar({ name, size = 32, live = false }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const bg = colorFromName(name || '?');

  return (
    <div className="relative flex-shrink-0" title={name}>
      <div
        className="rounded-full flex items-center justify-center font-medium"
        style={{
          width: size,
          height: size,
          background: bg + '33',
          color: bg,
          border: `1px solid ${bg}55`,
          fontSize: size * 0.38,
        }}
      >
        {initials}
      </div>
      {live && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-2"
          style={{
            width: size * 0.32,
            height: size * 0.32,
            background: '#14E0C4',
            borderColor: '#0B0E16',
          }}
        />
      )}
    </div>
  );
}

export default Avatar;