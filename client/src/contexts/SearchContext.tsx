import { createContext, useContext, ReactNode } from "react";

interface SearchContextType {
  triggerSearch: (term: string) => void;
  setSearchHandler: (handler: (term: string) => void) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  let searchHandler: ((term: string) => void) | null = null;

  const triggerSearch = (term: string) => {
    if (searchHandler) {
      searchHandler(term);
    }
  };

  const setSearchHandler = (handler: (term: string) => void) => {
    searchHandler = handler;
  };

  return (
    <SearchContext.Provider value={{ triggerSearch, setSearchHandler }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}