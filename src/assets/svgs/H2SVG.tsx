import { SVGProps } from './interfaces'

export const H2SVG: React.FC<SVGProps> = ({ color, height, width }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height={height}
      viewBox="0 96 960 960"
      width={width}
    >
      <path
        fill={color}
        d="M149.825 776Q137 776 128.5 767.375T120 746V406q0-12.75 8.675-21.375 8.676-8.625 21.5-8.625 12.825 0 21.325 8.625T180 406v140h180V406q0-12.75 8.675-21.375 8.676-8.625 21.5-8.625 12.825 0 21.325 8.625T420 406v340q0 12.75-8.675 21.375-8.676 8.625-21.5 8.625-12.825 0-21.325-8.625T360 746V606H180v140q0 12.75-8.675 21.375-8.676 8.625-21.5 8.625ZM570 776q-12.75 0-21.375-8.625T540 746V606q0-24.75 17.625-42.375T600 546h180V436H570q-12.75 0-21.375-8.675-8.625-8.676-8.625-21.5 0-12.825 8.625-21.325T570 376h210q24.75 0 42.375 17.625T840 436v110q0 24.75-17.625 42.375T780 606H600v110h210q12.75 0 21.375 8.675 8.625 8.676 8.625 21.5 0 12.825-8.625 21.325T810 776H570Z"
      />
    </svg>
  )
}