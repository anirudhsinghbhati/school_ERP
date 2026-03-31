function getPointPosition(index, value, total, max) {
  const xPadding = 30;
  const yPadding = 28;
  const width = 560;
  const height = 220;
  const innerWidth = width - xPadding * 2;
  const innerHeight = height - yPadding * 2;

  const x = xPadding + (total <= 1 ? 0 : (index / (total - 1)) * innerWidth);
  const y = yPadding + ((max - value) / max) * innerHeight;

  return { x, y };
}

export default function ProgressChart({ points }) {
  const normalized = points
    .map((point) => ({
      ...point,
      percentage: Number(point.percentage || 0),
    }))
    .filter((point) => Number.isFinite(point.percentage));

  if (normalized.length === 0) {
    return <p className="muted-text">No progress points yet for the selected student.</p>;
  }

  const maxScore = 100;
  const polylinePoints = normalized
    .map((point, index) => {
      const { x, y } = getPointPosition(index, point.percentage, normalized.length, maxScore);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="progress-chart-wrap">
      <svg viewBox="0 0 560 220" role="img" aria-label="Student progress chart" className="progress-chart">
        <rect x="0" y="0" width="560" height="220" rx="16" fill="#ffffff" />

        {[0, 25, 50, 75, 100].map((tick) => {
          const y = getPointPosition(0, tick, 1, maxScore).y;
          return (
            <g key={tick}>
              <line x1="30" y1={y} x2="530" y2={y} stroke="#e5ece8" strokeWidth="1" />
              <text x="6" y={y + 4} fontSize="10" fill="#708392">
                {tick}
              </text>
            </g>
          );
        })}

        <polyline points={polylinePoints} fill="none" stroke="#0e8a6a" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {normalized.map((point, index) => {
          const { x, y } = getPointPosition(index, point.percentage, normalized.length, maxScore);
          return (
            <g key={point.id || `${point.recorded_at}-${index}`}>
              <circle cx={x} cy={y} r="4.6" fill="#0a6d53" />
              <title>{`${point.subject_name}: ${point.percentage}%`}</title>
            </g>
          );
        })}
      </svg>

      <div className="chart-legend">
        {normalized.slice(-6).map((point, index) => (
          <span key={`${point.id || index}-legend`}>
            {point.subject_name}: {point.percentage}%
          </span>
        ))}
      </div>
    </div>
  );
}
