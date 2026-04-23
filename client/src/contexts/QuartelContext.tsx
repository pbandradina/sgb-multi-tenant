import React, { createContext, useContext, useState, useEffect } from "react";

interface QuartelContextType {
  quartelId: number | null;
  quartelNome: string | null;
  quartelSigla: string | null;
  setQuartel: (id: number, nome: string, sigla: string) => void;
  clearQuartel: () => void;
}

const QuartelContext = createContext<QuartelContextType>({
  quartelId: null,
  quartelNome: null,
  quartelSigla: null,
  setQuartel: () => {},
  clearQuartel: () => {},
});

export function QuartelProvider({ children }: { children: React.ReactNode }) {
  const [quartelId, setQuartelId] = useState<number | null>(() => {
    const stored = localStorage.getItem("sgb_quartel_id");
    return stored ? parseInt(stored) : null;
  });
  const [quartelNome, setQuartelNome] = useState<string | null>(() => {
    return localStorage.getItem("sgb_quartel_nome");
  });
  const [quartelSigla, setQuartelSigla] = useState<string | null>(() => {
    return localStorage.getItem("sgb_quartel_sigla");
  });

  const setQuartel = (id: number, nome: string, sigla: string) => {
    setQuartelId(id);
    setQuartelNome(nome);
    setQuartelSigla(sigla);
    localStorage.setItem("sgb_quartel_id", String(id));
    localStorage.setItem("sgb_quartel_nome", nome);
    localStorage.setItem("sgb_quartel_sigla", sigla);
  };

  const clearQuartel = () => {
    setQuartelId(null);
    setQuartelNome(null);
    setQuartelSigla(null);
    localStorage.removeItem("sgb_quartel_id");
    localStorage.removeItem("sgb_quartel_nome");
    localStorage.removeItem("sgb_quartel_sigla");
  };

  return (
    <QuartelContext.Provider value={{ quartelId, quartelNome, quartelSigla, setQuartel, clearQuartel }}>
      {children}
    </QuartelContext.Provider>
  );
}

export function useQuartel() {
  return useContext(QuartelContext);
}
