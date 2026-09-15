/**
 * Conjunto mínimo de ícones. Traço 1.5, pontas e junções arredondadas,
 * `currentColor` para herdar a cor do texto — nunca carregam significado
 * sozinhos, sempre acompanham rótulo.
 */
type Props = { className?: string };

function Svg({ children, className }: Props & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "size-5"}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export const IconeUpload = (p: Props) => (
  <Svg {...p}>
    <path d="M12 16V4m0 0L8 8m4-4 4 4" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Svg>
);

export const IconeConferencia = (p: Props) => (
  <Svg {...p}>
    <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5" />
    <path d="M9 14l2 2 4-4" />
  </Svg>
);

export const IconeAchados = (p: Props) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const IconeDossie = (p: Props) => (
  <Svg {...p}>
    <path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
  </Svg>
);

export const IconeOk = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </Svg>
);

export const IconeAusente = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5" />
    <path d="M12 16.2h.01" />
  </Svg>
);

export const IconeRevisao = (p: Props) => (
  <Svg {...p}>
    <path d="M10.3 4.3 2.5 18a1.7 1.7 0 0 0 1.5 2.5h16a1.7 1.7 0 0 0 1.5-2.5L13.7 4.3a1.7 1.7 0 0 0-3 0Z" />
    <path d="M12 10v4" />
    <path d="M12 17.5h.01" />
  </Svg>
);

export const IconeErro = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6m0-6-6 6" />
  </Svg>
);

export const IconeSeta = (p: Props) => (
  <Svg {...p}>
    <path d="M5 12h14m0 0-5-5m5 5-5 5" />
  </Svg>
);

export const IconeChevron = (p: Props) => (
  <Svg {...p}>
    <path d="m7 10 5 5 5-5" />
  </Svg>
);

export const IconeDocumento = (p: Props) => (
  <Svg {...p}>
    <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </Svg>
);

export const IconeBalanca = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4v16M7 20h10" />
    <path d="M5 8h14l-3 5a3 3 0 0 1-8 0Z" />
  </Svg>
);

/* Ícones da identidade Amparo — mesmos traços da biblioteca Lucide. */

export const IconeInfo = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </Svg>
);

export const IconeTrofeu = (p: Props) => (
  <Svg {...p}>
    <path d="M8 3h8v4a4 4 0 0 1-8 0Z" />
    <path d="M8 5H4v1a4 4 0 0 0 4 4M16 5h4v1a4 4 0 0 1-4 4" />
    <path d="M12 11v5m-4 5h8m-6-5h4v5h-4Z" />
  </Svg>
);

export const IconeCalculadora = (p: Props) => (
  <Svg {...p}>
    <rect height="20" rx="2" width="16" x="4" y="2" />
    <line x1="8" x2="16" y1="6" y2="6" />
    <path d="M8 10h.01" />
    <path d="M12 10h.01" />
    <path d="M16 10h.01" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <line x1="16" x2="16" y1="14" y2="18" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
  </Svg>
);

export const IconeEscudo = (p: Props) => (
  <Svg {...p}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const IconeRemedio = (p: Props) => (
  <Svg {...p}>
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
    <path d="m8.5 8.5 7 7" />
  </Svg>
);
