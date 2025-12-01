
import React, { createContext, useContext, useState, useEffect } from 'react';

interface UIContextType {
  isAnyModalOpen: boolean;
  setModalState: (id: string, isOpen: boolean) => void;
}

const UIContext = createContext<UIContextType>({
  isAnyModalOpen: false,
  setModalState: () => {},
});

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [openModals, setOpenModals] = useState<Set<string>>(new Set());

  const setModalState = (id: string, isOpen: boolean) => {
    setOpenModals(prev => {
        const newSet = new Set(prev);
        if (isOpen) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        return newSet;
    });
  };

  return (
    <UIContext.Provider value={{ isAnyModalOpen: openModals.size > 0, setModalState }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);

export const useHideSidebarOnModal = (isOpen: boolean) => {
    const { setModalState } = useUI();
    const id = React.useId();

    useEffect(() => {
        setModalState(id, isOpen);
        return () => setModalState(id, false);
    }, [isOpen, id, setModalState]);
};
