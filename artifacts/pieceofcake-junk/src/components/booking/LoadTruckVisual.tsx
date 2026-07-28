import { motion, AnimatePresence } from "framer-motion";

/**
 * Animated box-truck load gauge.
 * Junk silhouettes are revealed left-to-right by an animated clip rect,
 * a yellow gauge line rides the fill edge, and the truck settles on its
 * suspension as the load grows.
 */

// Cargo box interior bounds (SVG user units)
const BOX_X = 48;
const BOX_Y = 74;
const BOX_W = 360;
const BOX_H = 158;
const FLOOR_Y = BOX_Y + BOX_H;

const spring = { type: "spring" as const, stiffness: 110, damping: 16, mass: 0.9 };

type Props = {
  /** 0..1 portion of the truck that is full */
  fraction: number;
  /** e.g. "1/2 Load" */
  label: string;
};

/** A dense row of junk silhouettes standing on the cargo floor. */
function JunkPile() {
  return (
    <g>
      {/* stacked moving boxes */}
      <g fill="#6d4a9e">
        <rect x={BOX_X + 2} y={FLOOR_Y - 62} width={46} height={62} rx={3} />
        <rect x={BOX_X + 6} y={FLOOR_Y - 108} width={40} height={44} rx={3} fill="#8b6bbf" />
        <line x1={BOX_X + 2} y1={FLOOR_Y - 31} x2={BOX_X + 48} y2={FLOOR_Y - 31} stroke="#d8c9ef" strokeWidth={3} />
        <line x1={BOX_X + 26} y1={FLOOR_Y - 108} x2={BOX_X + 26} y2={FLOOR_Y - 64} stroke="#d8c9ef" strokeWidth={3} />
      </g>
      {/* rolled carpet leaning */}
      <g>
        <rect x={BOX_X + 52} y={FLOOR_Y - 128} width={16} height={128} rx={8} fill="#4a2a74" transform={`rotate(6 ${BOX_X + 60} ${FLOOR_Y})`} />
        <circle cx={BOX_X + 60} cy={FLOOR_Y - 122} r={8} fill="#8b6bbf" transform={`rotate(6 ${BOX_X + 60} ${FLOOR_Y})`} />
      </g>
      {/* armchair silhouette */}
      <g fill="#5b3a8e">
        <rect x={BOX_X + 76} y={FLOOR_Y - 58} width={58} height={26} rx={8} />
        <rect x={BOX_X + 76} y={FLOOR_Y - 96} width={18} height={64} rx={8} />
        <rect x={BOX_X + 120} y={FLOOR_Y - 74} width={14} height={42} rx={7} />
        <rect x={BOX_X + 80} y={FLOOR_Y - 32} width={8} height={32} />
        <rect x={BOX_X + 122} y={FLOOR_Y - 32} width={8} height={32} />
      </g>
      {/* garbage bags */}
      <g fill="#4a2a74">
        <ellipse cx={BOX_X + 158} cy={FLOOR_Y - 22} rx={22} ry={22} />
        <ellipse cx={BOX_X + 176} cy={FLOOR_Y - 14} rx={16} ry={14} />
        <path d={`M ${BOX_X + 152} ${FLOOR_Y - 40} l 6 -10 l 6 10 z`} fill="#6d4a9e" />
      </g>
      {/* old TV on a box */}
      <g>
        <rect x={BOX_X + 148} y={FLOOR_Y - 92} width={52} height={40} rx={4} fill="#6d4a9e" />
        <rect x={BOX_X + 154} y={FLOOR_Y - 86} width={30} height={28} rx={2} fill="#c9b6e8" />
        <circle cx={BOX_X + 192} cy={FLOOR_Y - 78} r={3} fill="#d8c9ef" />
        <circle cx={BOX_X + 192} cy={FLOOR_Y - 66} r={3} fill="#d8c9ef" />
      </g>
      {/* mattress leaning */}
      <g>
        <rect x={BOX_X + 206} y={FLOOR_Y - 138} width={30} height={138} rx={10} fill="#8b6bbf" transform={`rotate(-5 ${BOX_X + 221} ${FLOOR_Y})`} />
        <rect x={BOX_X + 212} y={FLOOR_Y - 128} width={18} height={118} rx={8} fill="none" stroke="#d8c9ef" strokeWidth={2.5} strokeDasharray="1 10" strokeLinecap="round" transform={`rotate(-5 ${BOX_X + 221} ${FLOOR_Y})`} />
      </g>
      {/* dresser */}
      <g fill="#5b3a8e">
        <rect x={BOX_X + 244} y={FLOOR_Y - 84} width={54} height={84} rx={4} />
        <line x1={BOX_X + 244} y1={FLOOR_Y - 56} x2={BOX_X + 298} y2={FLOOR_Y - 56} stroke="#c9b6e8" strokeWidth={2.5} />
        <line x1={BOX_X + 244} y1={FLOOR_Y - 28} x2={BOX_X + 298} y2={FLOOR_Y - 28} stroke="#c9b6e8" strokeWidth={2.5} />
        <circle cx={BOX_X + 271} cy={FLOOR_Y - 70} r={3} fill="#f0b429" />
        <circle cx={BOX_X + 271} cy={FLOOR_Y - 42} r={3} fill="#f0b429" />
        <circle cx={BOX_X + 271} cy={FLOOR_Y - 14} r={3} fill="#f0b429" />
      </g>
      {/* tires */}
      <g>
        <circle cx={BOX_X + 318} cy={FLOOR_Y - 16} r={16} fill="#3a2158" />
        <circle cx={BOX_X + 318} cy={FLOOR_Y - 16} r={7} fill="#6d4a9e" />
        <circle cx={BOX_X + 318} cy={FLOOR_Y - 44} r={16} fill="#4a2a74" />
        <circle cx={BOX_X + 318} cy={FLOOR_Y - 44} r={7} fill="#8b6bbf" />
      </g>
      {/* floor lamp */}
      <g>
        <rect x={BOX_X + 338} y={FLOOR_Y - 118} width={5} height={118} rx={2.5} fill="#5b3a8e" />
        <path d={`M ${BOX_X + 326} ${FLOOR_Y - 118} h 29 l -6 -22 h -17 z`} fill="#f0b429" />
        <rect x={BOX_X + 328} y={FLOOR_Y - 6} width={25} height={6} rx={3} fill="#4a2a74" />
      </g>
      {/* last box tucked at the end */}
      <g fill="#6d4a9e">
        <rect x={BOX_X + 348} y={FLOOR_Y - 54} width={12} height={54} rx={2} />
      </g>
    </g>
  );
}

export default function LoadTruckVisual({ fraction, label }: Props) {
  const fillW = Math.max(fraction * BOX_W, 6);
  // Suspension: truck settles as it loads up
  const settle = fraction * 5;

  return (
    <div className="select-none">
      <svg
        viewBox="0 0 640 330"
        className="w-full h-auto"
        role="img"
        aria-label={`Truck illustration showing ${label}`}
      >
        <defs>
          <clipPath id="junk-fill-clip">
            <motion.rect
              x={BOX_X}
              y={BOX_Y - 6}
              height={BOX_H + 6}
              initial={false}
              animate={{ width: fillW }}
              transition={spring}
            />
          </clipPath>
          <linearGradient id="box-sheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f6f2fd" />
          </linearGradient>
          <linearGradient id="cab-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b3a8e" />
            <stop offset="100%" stopColor="#4a2a74" />
          </linearGradient>
        </defs>

        {/* ground shadow */}
        <motion.ellipse
          cx={320}
          cy={296}
          ry={10}
          fill="#4a2a74"
          initial={false}
          animate={{ rx: 250 + fraction * 30, opacity: 0.10 + fraction * 0.08 }}
          transition={spring}
        />

        {/* whole truck settles on its suspension */}
        <motion.g initial={false} animate={{ y: settle }} transition={spring}>
          {/* chassis */}
          <rect x={36} y={232} width={520} height={22} rx={6} fill="#3a2158" />

          {/* cargo box */}
          <rect x={BOX_X - 12} y={BOX_Y - 16} width={BOX_W + 24} height={BOX_H + 26} rx={12} fill="url(#box-sheen)" stroke="#4a2a74" strokeWidth={5} />
          {/* interior floor line */}
          <line x1={BOX_X} y1={FLOOR_Y} x2={BOX_X + BOX_W} y2={FLOOR_Y} stroke="#e4dbf4" strokeWidth={3} />

          {/* junk, revealed by the animated clip */}
          <g clipPath="url(#junk-fill-clip)">
            <rect x={BOX_X} y={BOX_Y} width={BOX_W} height={BOX_H} fill="#efe8fa" />
            <JunkPile />
          </g>

          {/* fill-edge gauge line */}
          <motion.g initial={false} animate={{ x: fillW }} transition={spring}>
            <line
              x1={BOX_X}
              y1={BOX_Y - 14}
              x2={BOX_X}
              y2={FLOOR_Y}
              stroke="#f0b429"
              strokeWidth={4}
              strokeDasharray="7 7"
              strokeLinecap="round"
            />
            <path d={`M ${BOX_X - 9} ${BOX_Y - 26} l 9 12 l 9 -12 z`} fill="#f0b429" />
          </motion.g>

          {/* box branding */}
          <g>
            <circle cx={BOX_X + 6} cy={BOX_Y - 34} r={0} />
            <rect x={BOX_X - 12} y={BOX_Y - 16} width={BOX_W + 24} height={10} rx={5} fill="#4a2a74" />
          </g>

          {/* cab */}
          <g>
            <path
              d="M 432 232 L 432 96 Q 432 84 444 84 L 520 84 Q 530 84 536 94 L 574 160 Q 578 167 578 176 L 578 232 Z"
              fill="url(#cab-grad)"
              stroke="#3a2158"
              strokeWidth={4}
            />
            {/* windshield */}
            <path d="M 448 100 L 516 100 Q 522 100 526 106 L 552 152 L 448 152 Z" fill="#cfe3f7" stroke="#3a2158" strokeWidth={3} />
            {/* door line + handle */}
            <line x1={470} y1={160} x2={470} y2={228} stroke="#3a2158" strokeWidth={3} />
            <rect x={478} y={168} width={20} height={5} rx={2.5} fill="#c9b6e8" />
            {/* cake badge on the door */}
            <circle cx={505} cy={196} r={17} fill="#f0b429" />
            <path d="M 497 199 h 16 v 6 a 2 2 0 0 1 -2 2 h -12 a 2 2 0 0 1 -2 -2 z" fill="#4a2a74" />
            <path d="M 499 193 q 6 -5 12 0 l 0 6 h -12 z" fill="#ffffff" />
            <rect x={504} y={186} width={2.5} height={6} rx={1} fill="#4a2a74" />
            {/* headlight + bumper */}
            <rect x={568} y={206} width={12} height={14} rx={4} fill="#f0b429" />
            <rect x={556} y={228} width={30} height={12} rx={6} fill="#3a2158" />
          </g>

          {/* wheels */}
          {[132, 388, 508].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy={262} r={30} fill="#241536" />
              <circle cx={cx} cy={262} r={13} fill="#e4dbf4" />
              <circle cx={cx} cy={262} r={5} fill="#4a2a74" />
            </g>
          ))}
        </motion.g>

        {/* FULL badge celebration */}
        <AnimatePresence>
          {fraction >= 1 && (
            <motion.g
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              style={{ transformOrigin: "228px 40px" }}
            >
              <rect x={166} y={18} width={124} height={44} rx={22} fill="#f0b429" />
              <text x={228} y={47} textAnchor="middle" fontSize={22} fontWeight={900} fill="#3b2b00" fontFamily="inherit">
                FULL!
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}
