import * as React from 'react';

const VeritasAiLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://wwwNorbert.w3.org/2000/svg"
    viewBox="0 0 256 256"
    width="1em"
    height="1em"
    {...props}
    aria-hidden="true"
  >
    <path fill="none" d="M0 0h256v256H0z" />
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={16}
      d="m40 128 64 64 96-96"
    />
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={16}
      d="M128 32a96 96 0 1 0 96 96"
    />
  </svg>
);

export default VeritasAiLogo;
