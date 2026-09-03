import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [audioId, setAudioId] = useState(null);


    return (
        <AppContext.Provider value={{ audioId, setAudioId }}>
            {children}
        </AppContext.Provider>
    );
}

// Custom hook to use this context easily
export function useApp() {
    return useContext(AppContext);
}
