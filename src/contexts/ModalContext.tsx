import { createContext, useContext, useState } from 'react';

interface ModalContextType {
  showCreateUserModal: boolean;
  openCreateUserModal: () => void;
  closeCreateUserModal: () => void;
  onUserCreated: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  const openCreateUserModal = () => setShowCreateUserModal(true);
  const closeCreateUserModal = () => setShowCreateUserModal(false);
  
  const onUserCreated = () => {
    // Trigger a refresh event that components can listen to
    window.dispatchEvent(new CustomEvent('userCreated'));
  };

  return (
    <ModalContext.Provider
      value={{
        showCreateUserModal,
        openCreateUserModal,
        closeCreateUserModal,
        onUserCreated,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
