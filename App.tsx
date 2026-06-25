import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { initSeedData } from "@/lib/cms-storage";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import Login from "./pages/Login";
import Movies from "./pages/Movies";
import Categories from "./pages/Categories";
import Users from "./pages/Users";
import Rails from "./pages/Rails";
import Home from "./pages/Home";
import Watch from "./pages/Watch";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function Protected({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/cms/movies" replace />;
  return children;
}

const App = () => {
  useEffect(() => { initSeedData(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner theme="dark" position="bottom-right" />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/watch/:slug" element={<Watch />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              <Route path="/cms" element={<Navigate to="/cms/movies" replace />} />
              <Route path="/cms/movies" element={<Protected><Movies /></Protected>} />
              <Route path="/cms/categories" element={<Protected><Categories /></Protected>} />
              <Route path="/cms/rails" element={<Protected><Rails /></Protected>} />
              <Route path="/cms/users" element={<Protected><Users /></Protected>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
