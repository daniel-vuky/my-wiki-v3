import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrefsProvider } from "./state/PrefsContext";
import { AuthProvider, useAuth } from "./state/AuthContext";
import SignIn from "./screens/SignIn";
import Home from "./screens/Home";
import Folder from "./screens/Folder";
import Editor from "./screens/Editor";
import Search from "./screens/Search";
import Tag from "./screens/Tag";
import AllNotes from "./screens/AllNotes";
import AllFolders from "./screens/AllFolders";
import FavouritePosts from "./screens/FavouritePosts";
import FavouriteFolders from "./screens/FavouriteFolders";
import type { JSX } from "react";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } });

function Guard({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/signin" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <PrefsProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/" element={<Guard><Home /></Guard>} />
              <Route path="/folder/:id" element={<Guard><Folder /></Guard>} />
              <Route path="/note/:id" element={<Guard><Editor /></Guard>} />
              <Route path="/search" element={<Guard><Search /></Guard>} />
              <Route path="/tag/:name" element={<Guard><Tag /></Guard>} />
              <Route path="/notes" element={<Guard><AllNotes /></Guard>} />
              <Route path="/folders" element={<Guard><AllFolders /></Guard>} />
              <Route path="/favourites/posts" element={<Guard><FavouritePosts /></Guard>} />
              <Route path="/favourites/folders" element={<Guard><FavouriteFolders /></Guard>} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </PrefsProvider>
    </QueryClientProvider>
  );
}
